"""Lecture des CSV BDB 2023 et validation des valeurs codées (CLAUDE.md §4.3)."""

from pathlib import Path

import polars as pl

from config.enums import validate_enum

NULLS = ["NA"]

PFF_FLAGS = [
    "pff_hit",
    "pff_hurry",
    "pff_sack",
    "pff_beatenByDefender",
    "pff_hitAllowed",
    "pff_hurryAllowed",
    "pff_sackAllowed",
    "pff_backFieldBlock",
]


def _validate(df: pl.DataFrame, columns: list[str]) -> pl.DataFrame:
    for col in columns:
        validate_enum(col, df[col].unique().to_list())
    return df


def read_games(path: Path) -> pl.DataFrame:
    return pl.read_csv(path, null_values=NULLS)


def read_plays(path: Path) -> pl.DataFrame:
    df = pl.read_csv(path, null_values=NULLS, schema_overrides={"gameClock": pl.Utf8})
    return _validate(df, ["passResult", "pff_passCoverage", "pff_passCoverageType", "dropBackType"])


def read_players(path: Path) -> pl.DataFrame:
    return pl.read_csv(path, null_values=NULLS)


def read_pff(path: Path) -> pl.DataFrame:
    df = pl.read_csv(
        path,
        null_values=NULLS,
        schema_overrides={c: pl.Int8 for c in PFF_FLAGS} | {"pff_nflIdBlockedPlayer": pl.Int64},
    )
    return _validate(df, ["pff_role", "pff_blockType"])


def read_tracking(path: Path) -> pl.DataFrame:
    df = pl.read_csv(
        path,
        null_values=NULLS,
        schema_overrides={"nflId": pl.Int64, "jerseyNumber": pl.Int64, "time": pl.Utf8},
    )
    # Le tracking BDB écrit l'absence d'événement « None ».
    return df.with_columns(
        pl.when(pl.col("event") == "None").then(None).otherwise(pl.col("event")).alias("event")
    )
