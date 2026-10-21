"""Alignement image par image bloqueur / rusher / QB sur le tracking normalisé. Calcul pur."""

import polars as pl

POS = ["gameId", "playId", "nflId", "frameId", "t", "frame_end", "x", "y", "s", "o", "dir"]


def _player(tracking: pl.DataFrame, id_col: str, prefix: str) -> pl.DataFrame:
    cols = {"nflId": id_col, "x": f"{prefix}_x", "y": f"{prefix}_y", "s": f"{prefix}_s"}
    cols |= {"o": f"{prefix}_o", "dir": f"{prefix}_dir"}
    return tracking.select(POS).rename(cols)


def _with_qb(frames: pl.DataFrame, tracking: pl.DataFrame, qbs: pl.DataFrame) -> pl.DataFrame:
    qb = _player(tracking, "qbId", "qb").select(
        "gameId", "playId", "qbId", "frameId", "qb_x", "qb_y"
    )
    return frames.join(qbs, on=["gameId", "playId"]).join(
        qb, on=["gameId", "playId", "qbId", "frameId"]
    )


def _common(frames: pl.DataFrame) -> pl.DataFrame:
    return frames.with_columns(
        ((pl.col("r_x") - pl.col("qb_x")) ** 2 + (pl.col("r_y") - pl.col("qb_y")) ** 2)
        .sqrt()
        .alias("d_qb"),
        ((pl.col("t") > 0) & (pl.col("frameId") <= pl.col("frame_end"))).alias("in_window"),
    )


def rusher_frames(tracking: pl.DataFrame, rushers: pl.DataFrame, qbs: pl.DataFrame) -> pl.DataFrame:
    """rushers : gameId, playId, rusherId. Renvoie d_qb et la vitesse du rusher par image."""
    r = _player(tracking, "rusherId", "r")
    frames = rushers.join(r, on=["gameId", "playId", "rusherId"])
    return _common(_with_qb(frames, tracking, qbs))


def duel_frames(tracking: pl.DataFrame, pairs: pl.DataFrame, qbs: pl.DataFrame) -> pl.DataFrame:
    """pairs : gameId, playId, blockerId, rusherId. qbs : gameId, playId, qbId.

    Colonnes calculées :
    - d_qb : distance rusher → QB (yd)
    - past_shoulders : le rusher a franchi la ligne des épaules du bloqueur, perpendiculaire
      à l'axe bloqueur → QB (décision 0004 §2)
    - depth_gap : profondeur bloqueur − QB (yd), diminue quand le bloqueur recule
    - shoulder_angle : écart (0–180°) entre l'orientation du bloqueur et la direction du rusher
    """
    b = _player(tracking, "blockerId", "b").drop("t", "frame_end")
    r = _player(tracking, "rusherId", "r")
    frames = pairs.join(r, on=["gameId", "playId", "rusherId"]).join(
        b, on=["gameId", "playId", "blockerId", "frameId"]
    )
    frames = _common(_with_qb(frames, tracking, qbs))
    ux, uy = pl.col("qb_x") - pl.col("b_x"), pl.col("qb_y") - pl.col("b_y")
    proj = (pl.col("r_x") - pl.col("b_x")) * ux + (pl.col("r_y") - pl.col("b_y")) * uy
    diff = (pl.col("b_o") - pl.col("r_dir")).abs() % 360
    return frames.with_columns(
        (proj > 0).alias("past_shoulders"),
        (pl.col("b_x") - pl.col("qb_x")).alias("depth_gap"),
        pl.when(diff > 180).then(360 - diff).otherwise(diff).alias("shoulder_angle"),
    )


def duel_features(frames: pl.DataFrame, defeats: pl.DataFrame, set_window: float) -> pl.DataFrame:
    """Caractéristiques du diagnostic par duel (décision 0005 §6).

    defeats : clés du duel + defeat_t. Renvoie :
    - set_retreat : recul du bloqueur (yd, axe x) entre le snap et t = set_window
    - power_retreat : baisse de l'écart de profondeur bloqueur − QB entre le snap et la défaite
      (le bloqueur est repoussé vers son QB). Le recul normal du set, qui suit le dropback du
      QB, ne compte pas.
    - rusher_s_defeat : vitesse du rusher à la défaite (yd/s)
    - outside_win : à la défaite, le rusher est plus loin latéralement du QB que le bloqueur
    """
    keys = ["gameId", "playId", "blockerId", "rusherId"]
    snap = frames.filter(pl.col("t").abs() < 0.05).select(
        *keys, pl.col("b_x").alias("b_x0"), pl.col("depth_gap").alias("gap0")
    )
    at_set = frames.filter((pl.col("t") - set_window).abs() < 0.05).select(
        *keys, pl.col("b_x").alias("b_x_set")
    )
    at_defeat = (
        frames.join(defeats.select(*keys, "defeat_t"), on=keys)
        .filter((pl.col("t") - pl.col("defeat_t")).abs() < 0.05)
        .select(
            *keys,
            pl.col("depth_gap").alias("gap_d"),
            pl.col("r_s").alias("rusher_s_defeat"),
            ((pl.col("r_y") - pl.col("qb_y")).abs() > (pl.col("b_y") - pl.col("qb_y")).abs()).alias(
                "outside_win"
            ),
        )
    )
    return (
        defeats.select(keys)
        .join(snap, on=keys, how="left")
        .join(at_set, on=keys, how="left")
        .join(at_defeat, on=keys, how="left")
        .select(
            *keys,
            (pl.col("b_x0") - pl.col("b_x_set")).alias("set_retreat"),
            (pl.col("gap0") - pl.col("gap_d")).alias("power_retreat"),
            "rusher_s_defeat",
            "outside_win",
        )
    )
