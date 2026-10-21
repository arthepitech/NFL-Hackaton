"""Vitesse du rusher (CLAUDE.md §5) : max(s) sur [0, fast_rusher_window_s]."""

import polars as pl


def max_speed(tracking: pl.DataFrame, players: pl.DataFrame, window: float) -> pl.DataFrame:
    """players : gameId, playId, nflId. Renvoie max_s (yd/s), null sans image dans la fenêtre."""
    keys = ["gameId", "playId", "nflId"]
    in_window = (pl.col("t") >= 0) & (pl.col("t") <= window + 1e-9)
    return (
        players.join(tracking.select(*keys, "t", "s"), on=keys, how="left")
        .group_by(keys)
        .agg(pl.col("s").filter(in_window).max().alias("max_s"))
    )
