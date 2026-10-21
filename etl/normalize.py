"""Normalisation du tracking et des jeux (CLAUDE.md §4.2). Fonctions pures, sans I/O."""

import polars as pl

from config.enums import END_EVENTS, SNAP_EVENTS

FIELD_LENGTH = 120.0
FIELD_WIDTH = 53.3
PLAY_KEYS = ["gameId", "playId"]


def normalize_direction(df: pl.DataFrame) -> pl.DataFrame:
    """Retourne les jeux `left` pour que l'attaque aille toujours vers la droite."""
    left = pl.col("playDirection") == "left"
    return df.with_columns(
        pl.when(left).then(FIELD_LENGTH - pl.col("x")).otherwise(pl.col("x")).alias("x"),
        pl.when(left).then(FIELD_WIDTH - pl.col("y")).otherwise(pl.col("y")).alias("y"),
        pl.when(left).then((pl.col("o") + 180) % 360).otherwise(pl.col("o")).alias("o"),
        pl.when(left).then((pl.col("dir") + 180) % 360).otherwise(pl.col("dir")).alias("dir"),
    )


def snap_frames(df: pl.DataFrame) -> pl.DataFrame:
    """Image du snap par jeu : `ball_snap`, à défaut `autoevent_ballsnap` (décision 0002 §2)."""
    events = df.filter(pl.col("event").is_in(SNAP_EVENTS)).with_columns(
        pl.col("event").replace_strict(SNAP_EVENTS, range(len(SNAP_EVENTS))).alias("rank")
    )
    return (
        events.sort("rank", "frameId")
        .group_by(PLAY_KEYS, maintain_order=True)
        .agg(pl.col("frameId").first().alias("frame_snap"))
    )


def end_frames(df: pl.DataFrame) -> pl.DataFrame:
    """Fin de dropback : 1re image d'un événement de fin, sinon dernière image (décision 0004)."""
    return df.group_by(PLAY_KEYS).agg(
        pl.coalesce(
            pl.col("frameId").filter(pl.col("event").is_in(END_EVENTS)).min(),
            pl.col("frameId").max(),
        ).alias("frame_end")
    )


def add_time(df: pl.DataFrame) -> tuple[pl.DataFrame, pl.DataFrame]:
    """Ajoute `t` (s depuis le snap) et `frame_end`. Renvoie aussi les jeux exclus sans snap."""
    snaps = snap_frames(df)
    timed = (
        df.join(snaps, on=PLAY_KEYS, how="inner")
        .join(end_frames(df), on=PLAY_KEYS, how="left")
        .with_columns(((pl.col("frameId") - pl.col("frame_snap")) / 10).alias("t"))
    )
    excluded = df.select(PLAY_KEYS).unique().join(snaps, on=PLAY_KEYS, how="anti").sort(PLAY_KEYS)
    return timed, excluded


def parse_height(height: pl.Series) -> pl.Series:
    """« 6-4 » → 76 pouces."""
    parts = height.str.split_exact("-", 1)
    feet = parts.struct.field("field_0").cast(pl.Int64)
    inches = parts.struct.field("field_1").cast(pl.Int64)
    return (feet * 12 + inches).alias("height_in")


def add_situation(plays: pl.DataFrame) -> pl.DataFrame:
    """Yards jusqu'à l'en-but et écart de score, vus de l'attaque. Requiert `homeTeamAbbr`."""
    offense_home = pl.col("possessionTeam") == pl.col("homeTeamAbbr")
    return plays.with_columns(
        pl.when(pl.col("yardlineSide") == pl.col("possessionTeam"))
        .then(100 - pl.col("yardlineNumber"))
        .otherwise(pl.col("yardlineNumber"))
        .alias("yards_to_goal"),
        pl.when(offense_home)
        .then(pl.col("preSnapHomeScore") - pl.col("preSnapVisitorScore"))
        .otherwise(pl.col("preSnapVisitorScore") - pl.col("preSnapHomeScore"))
        .alias("score_diff"),
    )
