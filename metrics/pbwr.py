"""Pass Block Win Rate, versions PFF et tracking (CLAUDE.md §5)."""

import polars as pl

LOSS_FLAGS = ["pff_hurryAllowed", "pff_hitAllowed", "pff_sackAllowed", "pff_beatenByDefender"]


def pff_loss() -> pl.Expr:
    """Snap perdu selon PFF : pression concédée (hurry, hit, sack) ou battu."""
    return pl.any_horizontal([pl.col(c).fill_null(0) == 1 for c in LOSS_FLAGS]).alias("pff_loss")


def tracking_loss(win_window: float) -> pl.Expr:
    """Snap perdu selon le tracking : le défenseur bloqué entre dans le rayon avant win_window."""
    return (pl.col("ttp").is_not_null() & (pl.col("ttp") <= win_window)).alias("tracking_loss")


def win_rate(df: pl.DataFrame, loss_col: str, by: list[str]) -> pl.DataFrame:
    """by + n (snaps où loss_col est connu) + value (1 − taux de perte)."""
    return (
        df.filter(pl.col(loss_col).is_not_null())
        .group_by(by)
        .agg(pl.len().alias("n"), (1 - pl.col(loss_col).cast(pl.Float64).mean()).alias("value"))
    )
