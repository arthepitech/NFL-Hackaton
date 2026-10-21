"""Time-to-Pressure (CLAUDE.md §5) : 1er t où la distance rusher → QB < pressure_radius_yd."""

import polars as pl


def time_to_pressure(frames: pl.DataFrame, keys: list[str], radius: float) -> pl.DataFrame:
    """frames : sortie de duel_frames / rusher_frames. ttp = null si aucune pression."""
    hit = pl.col("in_window") & (pl.col("d_qb") < radius)
    return frames.group_by(keys).agg(pl.col("t").filter(hit).min().alias("ttp"))
