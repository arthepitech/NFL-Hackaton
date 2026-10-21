"""Pressure Rate (CLAUDE.md §5) : (hurry + hit + sack) ÷ snaps.

Les drapeaux ne se cumulent jamais sur une ligne (décision 0004 §3) : somme = indicateur.
"""

import polars as pl


def _any(cols: list[str], name: str) -> pl.Expr:
    return pl.any_horizontal([pl.col(c).fill_null(0) == 1 for c in cols]).alias(name)


def pressure_allowed() -> pl.Expr:
    return _any(["pff_hurryAllowed", "pff_hitAllowed", "pff_sackAllowed"], "pressure_allowed")


def pressure_made() -> pl.Expr:
    return _any(["pff_hurry", "pff_hit", "pff_sack"], "pressure_made")


def pressure_rate(df: pl.DataFrame, flag_col: str, by: list[str]) -> pl.DataFrame:
    return df.group_by(by).agg(
        pl.len().alias("n"), pl.col(flag_col).cast(pl.Float64).mean().alias("value")
    )
