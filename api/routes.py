"""Routes métier du MVP : Scout Card OL, jeux d'un chiffre, défaites, Play Lab."""

from datetime import date
from typing import Literal

import polars as pl
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api.filters import FilterParams, apply_filters, filter_params
from api.store import Store
from config.enums import OL_ALIGNMENTS
from metrics import duel, pbwr, pressure

router = APIRouter(prefix="/api")

Metric = Literal["pbwr_pff", "pbwr_tracking", "island", "ttp", "pressure_rate", "time_to_throw"]

# Français courant (CLAUDE.md §7) : libellé court, phrase d'aide visible avec le bouton « ? ».
DEFINITIONS = {
    "pbwr_pff": {
        "label": "Blocs réussis",
        "definition": "Part de ses actions de protection où il n'a laissé passer aucune pression "
        "et n'a pas été battu, selon les analystes vidéo (PFF).",
        "better": "high",
    },
    "pbwr_tracking": {
        "label": "Blocs réussis (capteurs)",
        "definition": "Même idée, mesurée par les capteurs GPS : son défenseur n'arrive pas à "
        "moins de {r} yard du quarterback dans les {w} premières secondes.",
        "better": "high",
    },
    "island": {
        "label": "Blocs réussis sans aide",
        "definition": "Blocs réussis quand aucun coéquipier ne vient l'aider sur son défenseur.",
        "better": "high",
    },
    "ttp": {
        "label": "Délai avant pression",
        "definition": "Quand son défenseur arrive près du quarterback (moins de {r} yard), "
        "combien de secondes après le début de l'action. Plus c'est long, mieux c'est.",
        "better": "high",
    },
    "pressure_rate": {
        "label": "Pressions laissées passer",
        "definition": "Part de ses actions où son défenseur a gêné, touché ou plaqué le "
        "quarterback. Plus c'est bas, mieux c'est.",
        "better": "low",
    },
    "time_to_throw": {
        "label": "Temps pour lancer",
        "definition": "Temps médian dont dispose le quarterback avant de lancer. Dépend surtout "
        "du quarterback : à lire à côté des blocs réussis.",
        "better": None,
    },
}


def get_store(request: Request) -> Store:
    return request.app.state.store


def _player_snaps(store: Store, nfl_id: int, f: FilterParams) -> pl.DataFrame:
    return apply_filters(store.snaps_ol.filter(pl.col("nflId") == nfl_id), f, store.filters)


def _metric_table(snaps: pl.DataFrame) -> pl.DataFrame:
    """Une ligne par joueur : valeur et n de chaque métrique."""
    by = ["nflId"]
    pff = pbwr.win_rate(snaps, "pff_loss", by).rename({"n": "pbwr_pff_n", "value": "pbwr_pff"})
    trk = pbwr.win_rate(snaps.filter(pl.col("has_tracking")), "tracking_loss", by).rename(
        {"n": "pbwr_tracking_n", "value": "pbwr_tracking"}
    )
    isl = pbwr.win_rate(snaps.filter(pl.col("island").fill_null(False)), "pff_loss", by).rename(
        {"n": "island_n", "value": "island"}
    )
    prs = pressure.pressure_rate(snaps, "pressure_allowed", by).rename(
        {"n": "pressure_rate_n", "value": "pressure_rate"}
    )
    med = snaps.group_by(by).agg(
        pl.col("ttp").median().alias("ttp"),
        pl.col("ttp").is_not_null().sum().alias("ttp_n"),
        pl.col("t_end").median().alias("time_to_throw"),
        pl.col("t_end").is_not_null().sum().alias("time_to_throw_n"),
    )
    out = pff
    for other in (trk, isl, prs, med):
        out = out.join(other, on=by, how="full", coalesce=True)
    return out


def _tier(population: pl.DataFrame, metric: str, value, n: int, store: Store) -> str | None:
    """top / bottom 10 % parmi les OL au-dessus de min_snaps_display, sous les mêmes filtres."""
    better = DEFINITIONS[metric]["better"]
    min_n = store.thresholds["min_snaps_display"]
    if better is None or value is None or n < min_n:
        return None
    pool = population.filter(pl.col(f"{metric}_n") >= min_n)[metric].drop_nulls()
    if pool.len() < 10:
        return None
    hi = pool.quantile(1 - store.thresholds["badge_top_pct"])
    lo = pool.quantile(store.thresholds["badge_bottom_pct"])
    good, bad = (value >= hi, value <= lo) if better == "high" else (value <= lo, value >= hi)
    return "top" if good else "bottom" if bad else None


@router.get("/meta")
def meta(store: Store = Depends(get_store)):
    th = store.thresholds
    plays = store.plays

    def opts(col):
        return sorted(plays[col].drop_nulls().unique().to_list())

    return {
        "thresholds": th,
        "definitions": {
            k: {
                **v,
                "definition": v["definition"].format(
                    r=th["pressure_radius_yd"], w=th["win_window_s"]
                ),
            }
            for k, v in DEFINITIONS.items()
        },
        "options": {
            "down": opts("down"),
            "distance": list(store.filters["distance_buckets"]),
            "quarter": opts("quarter"),
            "score": list(store.filters["score_buckets"]),
            "formation": opts("offenseFormation"),
            "personnel_o": opts("personnelO"),
            "personnel_d": opts("personnelD"),
            "coverage": opts("pff_passCoverage"),
            "dropback": opts("dropBackType"),
            "opponent": opts("defensiveTeam"),
            "week": opts("week"),
        },
    }


@router.get("/players")
def players(store: Store = Depends(get_store)):
    snaps = store.snaps_ol.filter(pl.col("nflId").is_in(store.ol_ids))
    by = snaps.group_by("nflId").agg(
        pl.len().alias("snaps"), pl.col("possessionTeam").mode().first().alias("team")
    )
    rows = by.join(store.players, on="nflId").sort("displayName")
    return [
        {
            "nflId": r["nflId"],
            "name": r["displayName"],
            "position": r["officialPosition"],
            "team": r["team"],
            "snaps": r["snaps"],
        }
        for r in rows.iter_rows(named=True)
    ]


def _player_or_404(store: Store, nfl_id: int) -> dict:
    rows = store.players.filter(pl.col("nflId") == nfl_id)
    if rows.is_empty():
        raise HTTPException(404, "joueur inconnu")
    return rows.row(0, named=True)


def _age(birth: str | None, ref: date) -> int | None:
    if not birth:
        return None
    b = date.fromisoformat(birth)
    return ref.year - b.year - ((ref.month, ref.day) < (b.month, b.day))


@router.get("/players/{nfl_id}/scout-card")
def scout_card(
    nfl_id: int, f: FilterParams = Depends(filter_params), store: Store = Depends(get_store)
):
    player = _player_or_404(store, nfl_id)
    all_snaps = apply_filters(
        store.snaps_ol.filter(pl.col("nflId").is_in(store.ol_ids)), f, store.filters
    )
    population = _metric_table(all_snaps)
    mine = _player_snaps(store, nfl_id, f)
    row = population.filter(pl.col("nflId") == nfl_id)
    values = row.row(0, named=True) if row.height else {}
    min_n = store.thresholds["min_snaps_display"]
    metrics = {}
    for m in DEFINITIONS:
        value, n = values.get(m), values.get(f"{m}_n") or 0
        metrics[m] = {
            "value": value,
            "n": n,
            "low_sample": n < min_n,
            "tier": _tier(population, m, value, n, store),
        }
    alerts = []
    pff_v, trk_v = metrics["pbwr_pff"]["value"], metrics["pbwr_tracking"]["value"]
    if pff_v is not None and trk_v is not None and abs(trk_v - pff_v) * 100 > 10:
        pts = round((trk_v - pff_v) * 100, 1)
        alerts.append(
            {
                "kind": "pbwr_gap",
                "points": pts,
                "message": "Les analystes vidéo et les capteurs ne sont pas d'accord "
                f"({pts:+.1f} points "
                f"sur {metrics['pbwr_pff']['n']} actions) : à vérifier sur les vidéos.",
            }
        )
    alignments = mine["pff_positionLinedUp"].drop_nulls()
    return {
        "player": {
            "nflId": nfl_id,
            "name": player["displayName"],
            "position": player["officialPosition"],
            "alignment": alignments.mode().sort()[0] if alignments.len() else None,
            "height_in": player["height_in"],
            "weight": player["weight"],
            "age": _age(player["birthDate"], store.season_start),
            "college": player["collegeName"],
            "team": mine["possessionTeam"].mode().sort()[0] if mine.height else None,
        },
        "metrics": metrics,
        "alerts": alerts,
    }


def _rows(store: Store, snaps: pl.DataFrame, counted: pl.Expr) -> list[dict]:
    names = store.players.select(
        pl.col("nflId").alias("blockedId"), pl.col("displayName").alias("blockedName")
    )
    out = snaps.with_columns(counted.fill_null(False).alias("counted")).join(
        names, on="blockedId", how="left"
    )
    cols = [
        "gameId",
        "playId",
        "week",
        "defensiveTeam",
        "quarter",
        "gameClock",
        "down",
        "yardsToGo",
        "playDescription",
        "pff_positionLinedUp",
        "pff_blockType",
        "blockedId",
        "blockedName",
        "pff_loss",
        "pressure_allowed",
        "ttp",
        "defeat_t",
        "t_end",
        "cause",
        "reason",
        "counted",
    ]
    return out.select(cols).to_dicts()


@router.get("/players/{nfl_id}/plays")
def metric_plays(
    nfl_id: int,
    metric: Metric,
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Les jeux qui composent un chiffre de la Scout Card (CLAUDE.md §7)."""
    _player_or_404(store, nfl_id)
    snaps = _player_snaps(store, nfl_id, f)
    if metric == "pbwr_pff":
        snaps, counted = snaps.sort("pff_loss", descending=True), pl.col("pff_loss")
    elif metric == "pbwr_tracking":
        snaps = snaps.filter(pl.col("has_tracking")).sort("tracking_loss", descending=True)
        counted = pl.col("tracking_loss")
    elif metric == "island":
        snaps = snaps.filter(pl.col("island").fill_null(False)).sort("pff_loss", descending=True)
        counted = pl.col("pff_loss")
    elif metric == "ttp":
        snaps, counted = snaps.filter(pl.col("ttp").is_not_null()).sort("ttp"), pl.lit(True)
    elif metric == "pressure_rate":
        snaps = snaps.sort("pressure_allowed", descending=True)
        counted = pl.col("pressure_allowed")
    else:
        snaps, counted = snaps.filter(pl.col("t_end").is_not_null()).sort("t_end"), pl.lit(True)
    return _rows(store, snaps, counted)


@router.get("/players/{nfl_id}/defeats")
def defeats(
    nfl_id: int,
    confirmed: bool = False,
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Défaites triées par instant de défaite. confirmed : seulement celles notées par PFF."""
    _player_or_404(store, nfl_id)
    snaps = _player_snaps(store, nfl_id, f).filter(pl.col("defeat_t").is_not_null())
    if confirmed:
        snaps = snaps.filter(pl.col("pff_loss"))
    return _rows(store, snaps.sort("defeat_t", "gameId", "playId"), pl.col("pff_loss"))


@router.get("/players/{nfl_id}/weekly")
def weekly(nfl_id: int, store: Store = Depends(get_store)):
    """J1 / J2 : PBWR, temps avant pression et pressions par semaine, avec moyenne du poste."""
    player = _player_or_404(store, nfl_id)
    same = store.players.filter(pl.col("officialPosition") == player["officialPosition"])
    position = (
        store.snaps_ol.filter(pl.col("nflId").is_in(same["nflId"].to_list()))
        .group_by("week")
        .agg((1 - pl.col("pff_loss").cast(pl.Float64).mean()).alias("position_pbwr_pff"))
    )
    snaps = store.snaps_ol.filter(pl.col("nflId") == nfl_id)
    out = snaps.group_by("week").agg(
        pl.len().alias("n"),
        (1 - pl.col("pff_loss").cast(pl.Float64).mean()).alias("pbwr_pff"),
        pl.col("ttp").median().alias("ttp"),
        pl.col("ttp").is_not_null().sum().alias("ttp_n"),
        pl.col("pressure_allowed").cast(pl.Float64).mean().alias("pressure_rate"),
    )
    return out.join(position, on="week", how="left").sort("week").to_dicts()


@router.get("/plays/{game_id}/{play_id}")
def play(game_id: int, play_id: int, store: Store = Depends(get_store)):
    """Play Lab C1/C2 : positions normalisées des 22 joueurs et du ballon."""
    tracking = store.tracking(game_id, play_id)
    if tracking.is_empty():
        raise HTTPException(404, "jeu sans tracking (absent ou sans snap)")
    meta = store.plays.filter((pl.col("gameId") == game_id) & (pl.col("playId") == play_id))
    pff = store.snaps_ol.filter((pl.col("gameId") == game_id) & (pl.col("playId") == play_id))
    from_pff = store.pff.filter((pl.col("gameId") == game_id) & (pl.col("playId") == play_id))
    frames = (
        tracking.select("frameId", pl.col("t").round(1), "event").unique("frameId").sort("frameId")
    )
    tracking = tracking.sort("frameId")
    positions = {}
    players = []
    roles = {r["nflId"]: r for r in from_pff.iter_rows(named=True)}
    names = dict(store.players.select("nflId", "displayName").iter_rows())
    for key, grp in tracking.group_by("nflId", maintain_order=True):
        nfl_id = key[0]
        pid = "ball" if nfl_id is None else str(nfl_id)
        positions[pid] = [
            [round(x, 2), round(y, 2), None if o is None else round(o, 1), round(s, 2)]
            for x, y, o, s in grp.select("x", "y", "o", "s").iter_rows()
        ]
        role = roles.get(nfl_id, {})
        players.append(
            {
                "id": pid,
                "name": names.get(nfl_id, "Ballon"),
                "jersey": grp["jerseyNumber"][0],
                "team": grp["team"][0],
                "role": role.get("pff_role"),
                "alignment": role.get("pff_positionLinedUp"),
            }
        )
    qb = from_pff.filter(pl.col("pff_role") == "Pass")["nflId"]
    row = meta.row(0, named=True) if meta.height else {}
    return {
        "meta": {
            k: row.get(k)
            for k in (
                "gameId",
                "playId",
                "playDescription",
                "quarter",
                "gameClock",
                "down",
                "yardsToGo",
                "possessionTeam",
                "defensiveTeam",
                "passResult",
            )
        },
        "frames": frames.to_dicts(),
        "frame_end": tracking["frame_end"][0],
        "players": players,
        "positions": positions,
        "qbId": qb[0] if qb.len() else None,
        "ol": pff.filter(pl.col("pff_positionLinedUp").is_in(OL_ALIGNMENTS))["nflId"].to_list(),
        "blocks": pff.filter(pl.col("blockedId").is_not_null())
        .select(
            pl.col("nflId").alias("blockerId"),
            pl.col("blockedId").alias("rusherId"),
            pl.col("pff_blockType").alias("blockType"),
        )
        .to_dicts(),
    }


@router.get("/plays/{game_id}/{play_id}/duel")
def duel_timeline(
    game_id: int,
    play_id: int,
    blocker: int = Query(...),
    rusher: int = Query(...),
    store: Store = Depends(get_store),
):
    """Timeline C3 : distance rusher → QB, vitesse du rusher, recul du bloqueur, angle."""
    tracking = store.tracking(game_id, play_id)
    snaps = store.snaps_ol.filter(
        (pl.col("gameId") == game_id)
        & (pl.col("playId") == play_id)
        & (pl.col("nflId") == blocker)
        & (pl.col("blockedId") == rusher)
    )
    qb = store.pff.filter(
        (pl.col("gameId") == game_id)
        & (pl.col("playId") == play_id)
        & (pl.col("pff_role") == "Pass")
    )
    if tracking.is_empty() or snaps.is_empty() or qb.is_empty():
        raise HTTPException(404, "duel introuvable")
    pairs = pl.DataFrame(
        {"gameId": [game_id], "playId": [play_id], "blockerId": [blocker], "rusherId": [rusher]}
    )
    qbs = pl.DataFrame({"gameId": [game_id], "playId": [play_id], "qbId": [qb["nflId"][0]]})
    frames = duel.duel_frames(tracking, pairs, qbs).sort("frameId")
    events = tracking.filter(pl.col("event").is_not_null()).unique("event").sort("frameId")
    stored = snaps.row(0, named=True)
    markers = {e: round(t, 1) for e, t in events.select("event", "t").iter_rows()}
    markers |= {"snap": 0.0, "defeat": stored["defeat_t"], "pressure": stored["ttp"]}
    return {
        "series": frames.select(
            pl.col("t").round(1),
            pl.col("d_qb").round(2),
            pl.col("r_s").round(2).alias("rusher_s"),
            pl.col("depth_gap").round(2),
            pl.col("shoulder_angle").round(1),
            pl.col("b_x").round(2).alias("blocker_x"),
            pl.col("b_y").round(2).alias("blocker_y"),
            pl.col("r_x").round(2).alias("rusher_x"),
            pl.col("r_y").round(2).alias("rusher_y"),
        ).to_dicts(),
        "markers": markers,
        "t_end": stored["t_end"],
        "pff_loss": stored["pff_loss"],
    }
