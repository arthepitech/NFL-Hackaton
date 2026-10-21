"""Instant de défaite (CLAUDE.md §5, décision 0004 §2)."""

import polars as pl


def defeat_time(frames: pl.DataFrame, keys: list[str]) -> pl.DataFrame:
    """1er t de la fenêtre où le rusher franchit la ligne des épaules du bloqueur.

    « Dépasser » suppose un franchissement : si le rusher est déjà au-delà au snap (t = 0),
    la défaite n'est pas mesurable et vaut null.
    """
    lost = pl.col("in_window") & pl.col("past_shoulders")
    at_snap = (pl.col("t") == 0) & pl.col("past_shoulders")
    return frames.group_by(keys).agg(
        pl.when(at_snap.any())
        .then(None)
        .otherwise(pl.col("t").filter(lost).min())
        .alias("defeat_t")
    )
