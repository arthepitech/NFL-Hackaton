"""Tables de snaps précalculées : une ligne par snap Pass Block (OL) et par snap Pass Rush (DL).

Les métriques sont calculées une fois par match puis stockées (cahier, « Architecture »).
"""

from pathlib import Path

import polars as pl

from config import settings
from config.enums import OL_ALIGNMENTS
from metrics import (
    defeat,
    diagnosis,
    duel,
    gap,
    island,
    pbwr,
    pressure,
    pressure_package,
    speed,
    ttp,
)

PAIR_KEYS = ["gameId", "playId", "blockerId", "rusherId"]
RUSH_KEYS = ["gameId", "playId", "rusherId"]

SITUATION = [
    "gameId",
    "playId",
    "week",
    "quarter",
    "gameClock",
    "down",
    "yardsToGo",
    "possessionTeam",
    "defensiveTeam",
    "score_diff",
    "yards_to_goal",
    "offenseFormation",
    "personnelO",
    "personnelD",
    "pff_passCoverage",
    "pff_playAction",
    "dropBackType",
    "passResult",
    "playResult",
    "playDescription",
]


def _play_times(tracking: pl.DataFrame) -> pl.DataFrame:
    """t_end : secondes entre le snap et la fin de dropback (temps avant la passe)."""
    return (
        tracking.filter(pl.col("frameId") == pl.col("frame_end"))
        .group_by("gameId", "playId")
        .agg(pl.col("t").first().alias("t_end"))
    )


def game_snaps(
    tracking: pl.DataFrame, pff: pl.DataFrame, th: dict
) -> tuple[pl.DataFrame, pl.DataFrame]:
    """Métriques par snap pour un match. `pff` : lignes de ce match, `th` : seuils."""
    qbs = pff.filter(pl.col("pff_role") == "Pass").select(
        "gameId", "playId", pl.col("nflId").alias("qbId")
    )
    blocks = pff.filter(pl.col("pff_role") == "Pass Block")
    pairs = blocks.filter(pl.col("pff_nflIdBlockedPlayer").is_not_null()).select(
        "gameId",
        "playId",
        pl.col("nflId").alias("blockerId"),
        pl.col("pff_nflIdBlockedPlayer").alias("rusherId"),
    )
    frames = duel.duel_frames(tracking, pairs, qbs)
    pair_metrics = ttp.time_to_pressure(frames, PAIR_KEYS, th["pressure_radius_yd"]).join(
        defeat.defeat_time(frames, PAIR_KEYS), on=PAIR_KEYS
    )
    pair_metrics = pair_metrics.join(
        duel.duel_features(frames, pair_metrics, th["set_window_s"]), on=PAIR_KEYS, how="left"
    ).with_columns(pl.lit(True).alias("has_tracking"))
    times = _play_times(tracking)

    # Tous les blocs notés (chips de TE / RB compris) : aide et nombre de bloqueurs par défenseur.
    all_blocks = pff.filter(pl.col("pff_nflIdBlockedPlayer").is_not_null()).select(
        "gameId", "playId", "nflId", pl.col("pff_nflIdBlockedPlayer").alias("blockedId"),
        "pff_blockType",
    )  # fmt: skip
    islands = island.island_flags(all_blocks).select("gameId", "playId", "nflId", "island")
    helpers = all_blocks.group_by("gameId", "playId", "blockedId").agg(
        pl.col("nflId").sort().alias("blocked_by"), pl.len().alias("n_blockers")
    )

    rush = pff.filter(pl.col("pff_role") == "Pass Rush").select(
        "gameId", "playId", pl.col("nflId").alias("rusherId"), "pff_positionLinedUp",
        "pff_hurry", "pff_hit", "pff_sack",
    )  # fmt: skip
    speeds = speed.max_speed(
        tracking, rush.select("gameId", "playId", pl.col("rusherId").alias("nflId")),
        th["fast_rusher_window_s"],
    ).rename({"nflId": "rusherId", "max_s": "rusher_speed"})  # fmt: skip

    ol = (
        blocks.rename({"nflId": "blockerId", "pff_nflIdBlockedPlayer": "rusherId"})
        .join(pair_metrics, on=PAIR_KEYS, how="left")
        .join(times, on=["gameId", "playId"], how="left")
        .join(speeds, on=RUSH_KEYS, how="left")
        .with_columns(
            pbwr.pff_loss(),
            pressure.pressure_allowed(),
            pl.col("has_tracking").fill_null(False),
        )
        .with_columns(
            pl.when(pl.col("has_tracking"))
            .then(pbwr.tracking_loss(th["win_window_s"]))
            .otherwise(None)
            .alias("tracking_loss")
        )
        .rename({"blockerId": "nflId", "rusherId": "blockedId"})
        .join(islands, on=["gameId", "playId", "nflId"], how="left")
        .join(
            helpers.select(
                "gameId",
                "playId",
                "blockedId",
                pl.col("n_blockers").alias("n_blockers_on_defender"),
            ),
            on=["gameId", "playId", "blockedId"],
            how="left",
        )  # fmt: skip
        .with_columns(pl.col("n_blockers_on_defender").fill_null(0))
        .with_columns(diagnosis.diagnose(th))
    )

    rush_ttp = ttp.time_to_pressure(
        duel.rusher_frames(tracking, rush.select(RUSH_KEYS), qbs), RUSH_KEYS,
        th["pressure_radius_yd"],
    ).with_columns(pl.lit(True).alias("has_tracking"))  # fmt: skip
    line = pff.filter(
        pl.col("pff_positionLinedUp").is_in(OL_ALIGNMENTS) & (pl.col("pff_role") == "Pass Block")
        | pl.col("pff_positionLinedUp").str.starts_with("TE")
    ).select("gameId", "playId", "nflId", pl.col("pff_positionLinedUp").alias("alignment"))
    dl = (
        rush.join(rush_ttp, on=RUSH_KEYS, how="left")
        .join(helpers.rename({"blockedId": "rusherId"}), on=RUSH_KEYS, how="left")
        .join(times, on=["gameId", "playId"], how="left")
        .join(speeds, on=RUSH_KEYS, how="left")
        .with_columns(
            pressure.pressure_made(),
            pl.col("has_tracking").fill_null(False),
            pl.col("n_blockers").fill_null(0),
        )
    )
    gaps = gap.pressure_gaps(
        tracking, dl.filter(pl.col("pressure_made")).select(*RUSH_KEYS, "ttp"), line
    ).select(*RUSH_KEYS, "side", "gap", "t_cross")
    dl = dl.join(gaps, on=RUSH_KEYS, how="left").rename({"rusherId": "nflId"})
    return ol, dl


def build_snaps(out_dir: Path, thresholds: dict) -> tuple[pl.DataFrame, pl.DataFrame]:
    pff = pl.read_parquet(out_dir / "pff.parquet")
    plays = pl.read_parquet(out_dir / "plays.parquet").select(SITUATION)
    weights = pl.read_parquet(out_dir / "players.parquet").select("nflId", "weight")
    ols, dls = [], []
    for path in sorted((out_dir / "tracking").glob("*.parquet")):
        tracking = pl.read_parquet(path)
        game_id = tracking["gameId"][0]
        ol, dl = game_snaps(tracking, pff.filter(pl.col("gameId") == game_id), thresholds)
        ols.append(ol)
        dls.append(dl)
    keys = ["gameId", "playId"]
    ol = (
        pl.concat(ols, how="diagonal_relaxed")
        .join(plays, on=keys, how="left")
        .join(
            weights.rename({"nflId": "blockedId", "weight": "rusher_weight"}),
            on="blockedId",
            how="left",
        )
    )
    dl = (
        pl.concat(dls, how="diagonal_relaxed")
        .join(plays, on=keys, how="left")
        .join(weights, on="nflId", how="left")
    )
    packages = pressure_package.play_packages(
        dl, thresholds["blitz_min_rushers"], settings.load_filters()["package_max"]
    ).join(plays, on=keys, how="left")
    ol.write_parquet(out_dir / "snaps_ol.parquet")
    dl.write_parquet(out_dir / "snaps_dl.parquet")
    packages.write_parquet(out_dir / "plays_rush.parquet")
    return ol, dl
