"""Routes V2 : Matchups (C4–C7), chemins (C8–C9), diagnostic, vidéo, joueur (J2–J5),
recruteur (R1–R3). Décision 0005."""

import os
from collections import defaultdict

import polars as pl
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from api.filters import FilterParams, apply_filters, filter_params
from api.routes import _metric_table, _player_or_404, _rows, get_store
from api.store import Store
from config.enums import FACING_OL, OL_ALIGNMENTS
from metrics import diagnosis

router = APIRouter(prefix="/api")

LEFT_SIDE = {"LT", "LG"}
RADAR_AXES = {
    "PP": "Protection standard",
    "PA": "Play action",
    "SW": "Switch / stunt",
    "island": "Seul (island)",
    "fast": "Face à un rusher rapide",
    "heavy": "Face à un rusher lourd",
}


def _q(values, q: float):
    s = pl.Series(values, dtype=pl.Float64).drop_nulls()
    return None if s.is_empty() else s.quantile(q)


def _win(df: pl.DataFrame) -> tuple[float | None, int]:
    n = df.height
    return (None if n == 0 else 1 - df["pff_loss"].cast(pl.Float64).mean()), n


def _names(store: Store) -> dict[int, str]:
    return dict(store.players.select("nflId", "displayName").iter_rows())


@router.get("/teams")
def teams(store: Store = Depends(get_store)):
    return sorted(store.plays["possessionTeam"].drop_nulls().unique().to_list())


# --- C4 : matrice de duels OL × DL ---
@router.get("/matchups")
def matchups(
    team: str,
    opponent: str | None = None,
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Lignes : OL de `team`. Colonnes : rushers affrontés. Case : n, win rate, TTP médian."""
    snaps = apply_filters(
        store.snaps_ol.filter(
            (pl.col("possessionTeam") == team)
            & pl.col("pff_positionLinedUp").is_in(OL_ALIGNMENTS)
            & pl.col("blockedId").is_not_null()
        ),
        f,
        store.filters,
    )
    if opponent:
        snaps = snaps.filter(pl.col("defensiveTeam") == opponent)
    names = _names(store)
    order = {a: i for i, a in enumerate(OL_ALIGNMENTS)}
    rows = (
        snaps.group_by("nflId")
        .agg(pl.len().alias("n"), pl.col("pff_positionLinedUp").mode().first().alias("alignment"))
        .sort("n", descending=True)
        .head(8)
        .to_dicts()
    )
    rows.sort(key=lambda r: (order.get(r["alignment"], 9), -r["n"]))
    row_ids = [r["nflId"] for r in rows]
    cols = (
        snaps.filter(pl.col("nflId").is_in(row_ids))
        .group_by("blockedId")
        .agg(pl.len().alias("n"), pl.col("defensiveTeam").mode().first().alias("team"))
        .sort("n", descending=True)
        .head(12)
        .to_dicts()
    )
    col_ids = [c["blockedId"] for c in cols]
    cells = (
        snaps.filter(pl.col("nflId").is_in(row_ids) & pl.col("blockedId").is_in(col_ids))
        .group_by("nflId", "blockedId")
        .agg(
            pl.len().alias("n"),
            (1 - pl.col("pff_loss").cast(pl.Float64).mean()).alias("win_rate"),
            pl.col("ttp").median().alias("ttp"),
        )
        .rename({"nflId": "blockerId", "blockedId": "rusherId"})
        .to_dicts()
    )
    rows = [{**r, "name": names.get(r["nflId"])} for r in rows]
    return {
        "rows": rows,
        "cols": [
            {
                "nflId": c["blockedId"],
                "name": names.get(c["blockedId"]),
                "team": c["team"],
                "n": c["n"],
            }
            for c in cols
        ],
        "cells": cells,
        "projection": _projection(store, team, opponent, rows) if opponent else [],
    }


def _projection(store: Store, team: str, opponent: str, rows: list[dict]) -> list[dict]:
    """Duels attendus : alignement habituel des rushers adverses → OL en face (décision 0005 §10)."""
    rushers = (
        store.snaps_dl.filter(pl.col("defensiveTeam") == opponent)
        .group_by("nflId")
        .agg(pl.len().alias("snaps"), pl.col("pff_positionLinedUp").mode().first().alias("usual"))
        .sort("snaps", descending=True)
        .head(10)
    )
    starters = {}
    for r in rows:
        starters.setdefault(r["alignment"], r)
    names = _names(store)
    out = []
    for r in rushers.iter_rows(named=True):
        facing = FACING_OL.get(r["usual"])
        ol = starters.get(facing)
        out.append(
            {
                "rusherId": r["nflId"],
                "rusher": names.get(r["nflId"]),
                "usual": r["usual"],
                "snaps": r["snaps"],
                "facing": facing,
                "blockerId": ol["nflId"] if ol else None,
                "blocker": ol["name"] if ol else None,
            }
        )
    return out


@router.get("/matchups/duel")
def matchup_duel(
    blocker: int,
    rusher: int,
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Tous les clips d'un duel, triés par instant de défaite (les défaites d'abord)."""
    snaps = apply_filters(
        store.snaps_ol.filter((pl.col("nflId") == blocker) & (pl.col("blockedId") == rusher)),
        f,
        store.filters,
    ).sort(pl.col("defeat_t").is_null(), "defeat_t")
    return _rows(store, snaps, pl.col("pff_loss"))


# --- C5 : carte de protection de l'unité ---
@router.get("/protection")
def protection(
    team: str, f: FilterParams = Depends(filter_params), store: Store = Depends(get_store)
):
    ol = apply_filters(
        store.snaps_ol.filter(
            (pl.col("possessionTeam") == team) & pl.col("pff_positionLinedUp").is_in(OL_ALIGNMENTS)
        ),
        f,
        store.filters,
    )
    positions = (
        ol.group_by("pff_positionLinedUp")
        .agg(pl.len().alias("n"), pl.col("pressure_allowed").cast(pl.Float64).mean().alias("rate"))
        .rename({"pff_positionLinedUp": "alignment"})
        .to_dicts()
    )
    dl = apply_filters(
        store.snaps_dl.filter((pl.col("possessionTeam") == team) & pl.col("pressure_made")),
        f,
        store.filters,
    )
    gaps = (
        dl.group_by("side", "gap")
        .agg(pl.len().alias("n"), pl.col("ttp").median().alias("ttp"))
        .sort("n", descending=True)
        .to_dicts()
    )
    return {"positions": positions, "gaps": gaps, "pressures": dl.height}


# --- C6 : couverture × situation ---
def _situation(cfg: dict) -> pl.Expr:
    dist = pl.lit(None, dtype=pl.Utf8)
    for name, (lo, hi) in reversed(list(cfg["distance_buckets"].items())):
        dist = pl.when(pl.col("yardsToGo").is_between(lo, hi)).then(pl.lit(name)).otherwise(dist)
    return pl.format("{}e & {}", pl.col("down"), dist).alias("situation")


@router.get("/coverage")
def coverage(
    team: str | None = None,
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Par couverture et situation : yards par jeu, complétion, 1st down concédé (team = défense).

    EPA non disponible : nflverse n'est pas joint (écart signalé).
    """
    plays = store.plays.filter(pl.col("down") > 0)
    if team:
        plays = plays.filter(pl.col("defensiveTeam") == team)
    plays = apply_filters(plays, f, store.filters)
    attempts = pl.col("passResult").is_in(["C", "I", "IN"])
    return (
        plays.with_columns(_situation(store.filters))
        .group_by("pff_passCoverage", "situation", "down")
        .agg(
            pl.len().alias("n"),
            pl.col("playResult").mean().alias("yards_per_play"),
            (pl.col("passResult") == "C")
            .filter(attempts)
            .cast(pl.Float64)
            .mean()
            .alias("completion"),
            (pl.col("playResult") >= pl.col("yardsToGo"))
            .cast(pl.Float64)
            .mean()
            .alias("first_down_rate"),
        )
        .rename({"pff_passCoverage": "coverage"})
        .sort("coverage", "down", "situation")
        .drop("down")
        .to_dicts()
    )


# --- C7 : paquets de pression ---
@router.get("/packages")
def packages(
    team: str | None = None,
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Par paquet (nombre de rushers) : taux de pression, de sack, TTP médian et distribution."""
    plays = store.plays_rush
    if team:
        plays = plays.filter(pl.col("defensiveTeam") == team)
    plays = apply_filters(plays, f, store.filters)
    out = []
    for (label,), g in plays.group_by("package", maintain_order=True):
        ttps = g["ttp"].drop_nulls()
        top = g.group_by("alignments").len().sort("len", descending=True).head(3).iter_rows()
        out.append(
            {
                "package": label,
                "n": g.height,
                "pressure_rate": g["pressure"].cast(pl.Float64).mean(),
                "sack_rate": g["sack"].cast(pl.Float64).mean(),
                "blitz": bool(g["blitz"].any()),
                "ttp_median": ttps.median(),
                "ttp_quartiles": [_q(ttps, q) for q in (0.1, 0.25, 0.5, 0.75, 0.9)],
                "ttp_n": ttps.len(),
                "alignments": [{"alignments": a, "n": n} for a, n in top],
            }
        )

    def rank(label: str) -> int:
        return 0 if label == "3 ou moins" else int(label.rstrip("+"))

    return sorted(out, key=lambda p: rank(p["package"]))


# --- C8 / C9 : trajectoires normalisées sur le bloqueur ---
@router.get("/players/{nfl_id}/paths")
def paths(
    nfl_id: int,
    mode: str = Query("defeats", pattern="^(defeats|all)$"),
    limit: int = Query(12, ge=1, le=300),
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Trajectoires bloqueur et rusher, origine = bloqueur au snap, extérieur = +y.

    defeats : les défaites les plus rapides (C8). all : tous les duels (C9).
    """
    _player_or_404(store, nfl_id)
    snaps = apply_filters(
        store.snaps_ol.filter(
            (pl.col("nflId") == nfl_id) & pl.col("has_tracking") & pl.col("blockedId").is_not_null()
        ),
        f,
        store.filters,
    )
    if mode == "defeats":
        snaps = snaps.filter(pl.col("defeat_t").is_not_null()).sort("defeat_t")
    snaps = snaps.head(limit)
    by_game = defaultdict(list)
    for r in snaps.iter_rows(named=True):
        by_game[r["gameId"]].append(r)
    out = []
    for game_id, rows in by_game.items():
        tracking = pl.read_parquet(store.dir / "tracking" / f"{game_id}.parquet").filter(
            pl.col("t") >= 0
        )
        for r in rows:
            play = tracking.filter(
                (pl.col("playId") == r["playId"]) & (pl.col("frameId") <= pl.col("frame_end"))
            )
            b = play.filter(pl.col("nflId") == nfl_id).sort("frameId")
            d = play.filter(pl.col("nflId") == r["blockedId"]).sort("frameId")
            if b.is_empty() or d.is_empty():
                continue
            x0, y0 = b["x"][0], b["y"][0]
            # Extérieur = +y : côté gauche (LT, LG) déjà en +y, côté droit retourné.
            sign = 1 if r["pff_positionLinedUp"] in LEFT_SIDE else -1

            def rel(df, x0=x0, y0=y0, sign=sign):
                return [
                    [round(x - x0, 2), round((y - y0) * sign, 2)]
                    for x, y in df.select("x", "y").iter_rows()
                ]

            out.append(
                {
                    "gameId": game_id,
                    "playId": r["playId"],
                    "week": r["week"],
                    "defensiveTeam": r["defensiveTeam"],
                    "lost": r["pff_loss"],
                    "defeat_t": r["defeat_t"],
                    "blockedId": r["blockedId"],
                    "blocker": rel(b),
                    "rusher": rel(d),
                }
            )
    return out


# --- Diagnostic assisté : cause probable, confirmée ou corrigée par le coach ---
class TagIn(BaseModel):
    cause: str
    comment: str = ""
    author: str = "coach"


def _snap(store: Store, game_id: int, play_id: int, nfl_id: int) -> dict:
    rows = store.snaps_ol.filter(
        (pl.col("gameId") == game_id) & (pl.col("playId") == play_id) & (pl.col("nflId") == nfl_id)
    )
    if rows.is_empty():
        raise HTTPException(404, "snap de protection inconnu")
    return rows.row(0, named=True)


@router.get("/diagnosis/{game_id}/{play_id}/{nfl_id}")
def get_diagnosis(game_id: int, play_id: int, nfl_id: int, store: Store = Depends(get_store)):
    s = _snap(store, game_id, play_id, nfl_id)
    th = store.thresholds
    return {
        "cause": s["cause"],
        "reason": s["reason"],
        "probable": True,
        "features": {
            "Recul sur les premières secondes (yd)": s["set_retreat"],
            "Bloqueur repoussé vers le QB (yd)": s["power_retreat"],
            "Vitesse du rusher à la défaite (yd/s)": s["rusher_s_defeat"],
            "Gain à l'extérieur": s["outside_win"],
            "Bloqueurs sur le défenseur": s["n_blockers_on_defender"],
        },
        "rules": {
            "Switch / stunt": "Bloc noté switch et 0 ou 2+ bloqueurs sur le défenseur.",
            "Set": f"Gain à l'extérieur et recul < {th['set_min_retreat_yd']} yd en "
            f"{th['set_window_s']} s.",
            "Puissance": f"Bloqueur repoussé de ≥ {th['power_min_retreat_yd']} yd vers le QB, "
            f"rusher ≥ {th['power_min_rusher_speed_yd_s']} yd/s.",
        },
        "tag": store.club.get_tag(game_id, play_id, nfl_id),
    }


@router.post("/diagnosis/{game_id}/{play_id}/{nfl_id}")
def set_diagnosis(
    game_id: int, play_id: int, nfl_id: int, body: TagIn, store: Store = Depends(get_store)
):
    s = _snap(store, game_id, play_id, nfl_id)
    store.club.set_tag(
        game_id, play_id, nfl_id,
        proposed=s["cause"], cause=body.cause, comment=body.comment, author=body.author,
    )  # fmt: skip
    return store.club.get_tag(game_id, play_id, nfl_id)


@router.get("/tags")
def tags(store: Store = Depends(get_store)):
    base = [diagnosis.SWITCH, diagnosis.SET, diagnosis.POWER]
    return base + sorted(t for t in store.club.tag_names() if t not in base)


# --- Synchronisation vidéo (décision 0005 §8) ---
class ClipIn(BaseModel):
    angle: str
    url: str
    snap_offset_s: float


@router.get("/video/{game_id}/{play_id}")
def video(game_id: int, play_id: int, store: Store = Depends(get_store)):
    base = os.environ.get("VIDEO_BASE_URL", "")
    return [
        {
            **c,
            "url": c["url"] if "://" in c["url"] or not base else f"{base.rstrip('/')}/{c['url']}",
        }
        for c in store.club.clips(game_id, play_id)
    ]


@router.put("/video/{game_id}/{play_id}")
def set_video(game_id: int, play_id: int, body: ClipIn, store: Store = Depends(get_store)):
    store.club.set_clip(
        game_id, play_id, angle=body.angle, url=body.url, snap_offset_s=body.snap_offset_s
    )
    return video(game_id, play_id, store)


# --- J4 : mes pieds vs la référence ---
def _mean_set(store: Store, nfl_id: int, alignment: str, window: float) -> dict:
    snaps = store.snaps_ol.filter(
        (pl.col("nflId") == nfl_id)
        & (pl.col("pff_positionLinedUp") == alignment)
        & pl.col("has_tracking")
    ).select("gameId", "playId")
    sign = 1 if alignment in LEFT_SIDE else -1
    parts = []
    for (game_id,), g in snaps.group_by("gameId"):
        t = pl.read_parquet(store.dir / "tracking" / f"{game_id}.parquet").filter(
            (pl.col("nflId") == nfl_id)
            & pl.col("playId").is_in(g["playId"].to_list())
            & (pl.col("t") >= 0)
            & (pl.col("t") <= window + 1e-9)
        )
        parts.append(
            t.sort("frameId").with_columns(
                (pl.col("x") - pl.col("x").first().over("playId")).alias("dx"),
                ((pl.col("y") - pl.col("y").first().over("playId")) * sign).alias("dy"),
            )
        )
    if not parts:
        return {"n": 0, "path": []}
    all_ = pl.concat(parts).with_columns(pl.col("t").round(1))
    path = (
        all_.group_by("t")
        .agg(pl.col("dx").mean(), pl.col("dy").mean(), pl.col("dx").std().alias("sx"))
        .sort("t")
    )
    return {"n": snaps.height, "path": path.to_dicts()}


@router.get("/players/{nfl_id}/set")
def set_path(nfl_id: int, reference: int | None = None, store: Store = Depends(get_store)):
    """Trajectoire moyenne du set sur [0, fast_rusher_window_s], extérieur = +y."""
    _player_or_404(store, nfl_id)
    mine = store.snaps_ol.filter(pl.col("nflId") == nfl_id)
    alignment = mine["pff_positionLinedUp"].mode().sort()[0]
    window = store.thresholds["fast_rusher_window_s"]
    if reference is None:
        # Référence par défaut : meilleur PBWR PFF au même alignement (≥ min_snaps_display).
        pool = store.snaps_ol.filter(
            (pl.col("pff_positionLinedUp") == alignment) & (pl.col("nflId") != nfl_id)
        )
        table = _metric_table(pool).filter(
            pl.col("pbwr_pff_n") >= store.thresholds["min_snaps_display"]
        )
        best = table.sort("pbwr_pff", descending=True).head(1)
        reference = best["nflId"][0] if best.height else None
    names = _names(store)
    return {
        "alignment": alignment,
        "window_s": window,
        "player": {
            "nflId": nfl_id,
            "name": names.get(nfl_id),
            **_mean_set(store, nfl_id, alignment, window),
        },
        "reference": None
        if reference is None
        else {
            "nflId": reference,
            "name": names.get(reference),
            **_mean_set(store, reference, alignment, window),
        },
    }


# --- J5 : playlists annotées ---
class PlaylistIn(BaseModel):
    name: str
    player_id: int
    author: str = "coach"


class ItemIn(BaseModel):
    gameId: int
    playId: int
    nflId: int
    t: float | None = None
    comment: str = ""


@router.get("/playlists")
def get_playlists(player: int, store: Store = Depends(get_store)):
    return store.club.playlists(player_id=player)


@router.post("/playlists")
def create_playlist(body: PlaylistIn, store: Store = Depends(get_store)):
    return {
        "id": store.club.create_playlist(body.name, player_id=body.player_id, author=body.author)
    }


@router.post("/playlists/{playlist_id}/items")
def add_item(playlist_id: int, body: ItemIn, store: Store = Depends(get_store)):
    item = store.club.add_item(
        playlist_id, game_id=body.gameId, play_id=body.playId, nfl_id=body.nflId,
        t=body.t, comment=body.comment,
    )  # fmt: skip
    return {"id": item}


@router.delete("/playlists/items/{item_id}")
def delete_item(item_id: int, store: Store = Depends(get_store)):
    store.club.delete_item(item_id)
    return {"ok": True}


# --- R1 : radar comparatif ---
def _heavy_lbs(store: Store) -> float:
    weights = store.snaps_dl.select("nflId", "weight").unique("nflId")["weight"]
    return weights.quantile(store.thresholds["heavy_rusher_pct"])


def _axes(snaps: pl.DataFrame, fast: float, heavy: float) -> dict:
    subsets = {
        "PP": snaps.filter(pl.col("pff_blockType") == "PP"),
        "PA": snaps.filter(pl.col("pff_blockType") == "PA"),
        "SW": snaps.filter(pl.col("pff_blockType") == "SW"),
        "island": snaps.filter(pl.col("island").fill_null(False)),
        "fast": snaps.filter(pl.col("rusher_speed") >= fast),
        "heavy": snaps.filter(pl.col("rusher_weight") >= heavy),
    }
    out = {}
    for k, df in subsets.items():
        value, n = _win(df)
        out[k] = {"value": value, "n": n}
    return out


@router.get("/radar")
def radar(
    ids: list[int] = Query(...),
    fast_speed: float | None = None,
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Win rate (PBWR PFF) par contexte de bloc, jusqu'à 3 joueurs + moyenne du poste."""
    fast = fast_speed if fast_speed is not None else store.thresholds["fast_rusher_yd_s"]
    heavy = _heavy_lbs(store)
    snaps = apply_filters(store.snaps_ol, f, store.filters)
    players = []
    for nfl_id in ids[:3]:
        p = _player_or_404(store, nfl_id)
        players.append(
            {
                "nflId": nfl_id,
                "name": p["displayName"],
                "position": p["officialPosition"],
                "axes": _axes(snaps.filter(pl.col("nflId") == nfl_id), fast, heavy),
            }
        )
    position = players[0]["position"] if players else "T"
    same = store.players.filter(pl.col("officialPosition") == position)["nflId"].to_list()
    return {
        "labels": RADAR_AXES,
        "fast_speed": fast,
        "heavy_lbs": heavy,
        "players": players,
        "position_average": {
            "position": position,
            "axes": _axes(snaps.filter(pl.col("nflId").is_in(same)), fast, heavy),
        },
    }


# --- R2 : beeswarm de percentiles ---
@router.get("/league")
def league(
    metric: str = "pbwr_pff",
    position: str | None = None,
    f: FilterParams = Depends(filter_params),
    store: Store = Depends(get_store),
):
    """Une valeur par OL au-dessus de min_snaps_display, avec son percentile dans le poste."""
    ids = store.players.filter(pl.col("nflId").is_in(store.ol_ids))
    if position:
        ids = ids.filter(pl.col("officialPosition") == position)
    snaps = apply_filters(
        store.snaps_ol.filter(pl.col("nflId").is_in(ids["nflId"].to_list())), f, store.filters
    )
    table = _metric_table(snaps)
    if metric not in table.columns:
        raise HTTPException(422, "métrique inconnue")
    eligible = table.filter(
        (pl.col(f"{metric}_n") >= store.thresholds["min_snaps_display"])
        & pl.col(metric).is_not_null()
    ).with_columns((pl.col(metric).rank("average") / pl.len()).alias("percentile"))
    return (
        eligible.join(ids.select("nflId", "displayName", "officialPosition"), on="nflId")
        .select(
            "nflId",
            pl.col("displayName").alias("name"),
            pl.col("officialPosition").alias("position"),
            pl.col(metric).alias("value"),
            pl.col(f"{metric}_n").alias("n"),
            "percentile",
        )
        .sort("value")
        .to_dicts()
    )


# --- R3 : poids × win rate face aux rushers rapides ---
@router.get("/speed-scatter")
def speed_scatter(
    fast_speed: float | None = None,
    position: str = "T",
    store: Store = Depends(get_store),
):
    fast = fast_speed if fast_speed is not None else store.thresholds["fast_rusher_yd_s"]
    ids = store.players.filter(pl.col("officialPosition") == position)
    snaps = store.snaps_ol.filter(
        pl.col("nflId").is_in(ids["nflId"].to_list()) & (pl.col("rusher_speed") >= fast)
    )
    by = snaps.group_by("nflId").agg(
        pl.len().alias("n"), (1 - pl.col("pff_loss").cast(pl.Float64).mean()).alias("win_rate")
    )
    points = (
        by.join(ids.select("nflId", "displayName", "weight"), on="nflId")
        .rename({"displayName": "name"})
        .sort("weight")
        .to_dicts()
    )
    edges = store.snaps_dl.filter(
        pl.col("pff_positionLinedUp").is_in(["LEO", "REO", "LE", "RE", "LOLB", "ROLB"])
    )["rusher_speed"].drop_nulls()
    return {
        "fast_speed": fast,
        "configured_fast_speed": store.thresholds["fast_rusher_yd_s"],
        "points": points,
        "edge_speed_quantiles": {str(q): _q(edges, q) for q in (0.5, 0.75, 0.9, 0.95, 0.99)},
        "edge_speed_max": edges.max() if edges.len() else None,
        "snaps_at_or_above": snaps.height,
    }
