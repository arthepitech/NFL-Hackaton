"""`make check-metrics` : critère de sortie du MVP (CLAUDE.md §3 et §8).

1. Recalcul manuel indépendant (module csv, boucles Python, CSV bruts) sur N jeux tirés au
   hasard, comparé aux valeurs stockées dans snaps_ol.parquet. N'importe ni etl/ ni metrics/.
2. Écart PBWR PFF / PBWR tracking > 10 points sur un joueur : alerte, jamais suppression.
"""

import argparse
import csv
import math
import random
import sys
import time
from pathlib import Path

import polars as pl

from config import settings
from config.enums import END_EVENTS, OL_ALIGNMENTS, SNAP_EVENTS

LOSS_FLAGS = ["pff_hurryAllowed", "pff_hitAllowed", "pff_sackAllowed", "pff_beatenByDefender"]
GAP_ALERT_POINTS = 10  # CLAUDE.md §8
TOLERANCE = 1e-6


def _rows(path: Path, game_id: str, play_id: str) -> list[dict]:
    with open(path, newline="") as f:
        return [r for r in csv.DictReader(f) if r["gameId"] == game_id and r["playId"] == play_id]


def manual_play(raw_dir: Path, game_id: str, play_id: str, radius: float, window: float) -> dict:
    """Recalcul « à la main » des snaps Pass Block d'un jeu. Clé : nflId du bloqueur."""
    pff = _rows(raw_dir / "pffScoutingData.csv", game_id, play_id)
    frames = _rows(raw_dir / "tracking" / f"tracking_{game_id}.csv", game_id, play_id)

    snap = None
    for event in SNAP_EVENTS:
        ids = [int(r["frameId"]) for r in frames if r["event"] == event]
        if ids:
            snap = min(ids)
            break
    ends = [int(r["frameId"]) for r in frames if r["event"] in END_EVENTS]
    end = min(ends) if ends else max((int(r["frameId"]) for r in frames), default=None)

    pos: dict[tuple[str, int], tuple[float, float]] = {}
    for r in frames:
        x, y = float(r["x"]), float(r["y"])
        if r["playDirection"] == "left":
            x, y = 120 - x, 53.3 - y
        pos[(r["nflId"], int(r["frameId"]))] = (x, y)

    qb = next((r["nflId"] for r in pff if r["pff_role"] == "Pass"), None)
    out = {}
    for r in pff:
        if r["pff_role"] != "Pass Block":
            continue
        result = {
            "pff_loss": any(r[c] == "1" for c in LOSS_FLAGS),
            "ttp": None,
            "defeat_t": None,
            "tracking_loss": None,
        }
        rusher = r["pff_nflIdBlockedPlayer"]
        if snap is not None and rusher != "NA" and qb is not None:
            seen = False
            crossed_at_snap = False
            for frame in range(snap, end + 1):
                b, d, q = (pos.get((pid, frame)) for pid in (r["nflId"], rusher, qb))
                if b is None or d is None or q is None:
                    continue
                axis = (q[0] - b[0], q[1] - b[1])
                past = (d[0] - b[0]) * axis[0] + (d[1] - b[1]) * axis[1] > 0
                if frame == snap:
                    crossed_at_snap = past
                    continue
                seen = True
                t = (frame - snap) / 10
                if result["ttp"] is None and math.dist(d, q) < radius:
                    result["ttp"] = t
                if result["defeat_t"] is None and past and not crossed_at_snap:
                    result["defeat_t"] = t
            if seen:
                result["tracking_loss"] = result["ttp"] is not None and result["ttp"] <= window
        out[int(r["nflId"])] = result
    return out


def _same(a, b) -> bool:
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, bool) or isinstance(b, bool):
        return bool(a) == bool(b)
    return abs(a - b) < TOLERANCE


def compare_sample(raw_dir: Path, snaps: pl.DataFrame, plays: list, thresholds: dict) -> dict:
    checked, mismatches = 0, []
    for game_id, play_id in plays:
        manual = manual_play(
            raw_dir,
            str(game_id),
            str(play_id),
            thresholds["pressure_radius_yd"],
            thresholds["win_window_s"],
        )
        stored = snaps.filter((pl.col("gameId") == game_id) & (pl.col("playId") == play_id))
        for row in stored.iter_rows(named=True):
            expected = manual.get(row["nflId"])
            checked += 1
            for field in ("pff_loss", "ttp", "defeat_t", "tracking_loss"):
                if expected is None or not _same(expected[field], row[field]):
                    mismatches.append(
                        {
                            "gameId": game_id,
                            "playId": play_id,
                            "nflId": row["nflId"],
                            "champ": field,
                            "stocké": row[field],
                            "manuel": None if expected is None else expected[field],
                        }
                    )
        if len(manual) != stored.height:
            mismatches.append({"gameId": game_id, "playId": play_id, "champ": "nb_snaps"})
    return {"plays": len(plays), "snaps": checked, "mismatches": mismatches}


def pbwr_gaps(snaps: pl.DataFrame, players: pl.DataFrame, min_snaps: int) -> pl.DataFrame:
    """Joueurs OL dont |PBWR PFF − PBWR tracking| > 10 points (n ≥ min_snaps)."""
    ol = snaps.filter(pl.col("pff_positionLinedUp").is_in(OL_ALIGNMENTS) & pl.col("has_tracking"))
    by = ol.group_by("nflId").agg(
        pl.len().alias("n"),
        (100 * (1 - pl.col("pff_loss").cast(pl.Float64).mean())).alias("pbwr_pff"),
        (100 * (1 - pl.col("tracking_loss").cast(pl.Float64).mean())).alias("pbwr_tracking"),
    )
    return (
        by.filter(pl.col("n") >= min_snaps)
        .with_columns((pl.col("pbwr_tracking") - pl.col("pbwr_pff")).alias("ecart"))
        .filter(pl.col("ecart").abs() > GAP_ALERT_POINTS)
        .join(players.select("nflId", "displayName"), on="nflId", how="left")
        .sort("ecart", descending=True)
    )


def render(result: dict, gaps: pl.DataFrame, n_players: int, seed: int) -> str:
    lines = [
        "# Rapport check-metrics",
        "",
        f"Graine du tirage : {seed}",
        "",
        "## 1. Recalcul manuel indépendant",
        "",
        f"- Jeux tirés au hasard : {result['plays']}",
        f"- Snaps Pass Block comparés : {result['snaps']}",
        f"- Écarts : {len(result['mismatches'])}",
        "",
    ]
    for m in result["mismatches"][:50]:
        lines.append(f"  - {m}")
    lines += [
        "",
        f"## 2. Écart PBWR PFF / tracking > {GAP_ALERT_POINTS} points",
        "",
        f"{gaps.height} joueurs OL en alerte sur {n_players} éligibles. Alerte, pas suppression.",
        "",
        "| Joueur | n snaps | PBWR PFF | PBWR tracking | Écart (pts) |",
        "| --- | --- | --- | --- | --- |",
    ]
    for r in gaps.iter_rows(named=True):
        lines.append(
            f"| {r['displayName']} | {r['n']} | {r['pbwr_pff']:.1f} % "
            f"| {r['pbwr_tracking']:.1f} % | {r['ecart']:+.1f} |"
        )
    return "\n".join(lines) + "\n"


def run(raw_dir: Path, out_dir: Path, n_plays: int, seed: int) -> tuple[dict, str]:
    thresholds = settings.load_thresholds()
    snaps = pl.read_parquet(out_dir / "snaps_ol.parquet")
    keys = snaps.select("gameId", "playId").unique().sort("gameId", "playId").rows()
    sample = random.Random(seed).sample(keys, min(n_plays, len(keys)))
    result = compare_sample(raw_dir, snaps, sample, thresholds)

    players = pl.read_parquet(out_dir / "players.parquet")
    min_snaps = thresholds["min_snaps_display"]
    gaps = pbwr_gaps(snaps, players, min_snaps)
    eligible = (
        snaps.filter(pl.col("pff_positionLinedUp").is_in(OL_ALIGNMENTS) & pl.col("has_tracking"))
        .group_by("nflId")
        .len()
        .filter(pl.col("len") >= min_snaps)
        .height
    )
    report = render(result, gaps, eligible, seed)
    (out_dir / "reports").mkdir(exist_ok=True)
    (out_dir / "reports" / "check-metrics.md").write_text(report)
    return result, report


def main(argv: list[str] | None = None) -> int:  # pragma: no cover
    parser = argparse.ArgumentParser()
    parser.add_argument("--plays", type=int, default=20)
    parser.add_argument("--seed", type=int, default=int(time.time()))
    args = parser.parse_args(argv)
    result, report = run(settings.RAW_DIR, settings.PROCESSED_DIR, args.plays, args.seed)
    print(report)
    return 1 if result["mismatches"] else 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
