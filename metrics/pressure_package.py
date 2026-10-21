"""Nombre de rushers et paquets de pression (CLAUDE.md §5, décision 0005 §4)."""

import polars as pl


def package_label(n: int, package_max: int) -> str:
    if n <= 3:
        return "3 ou moins"
    if n >= package_max:
        return f"{package_max}+"
    return str(n)


def play_packages(rush: pl.DataFrame, blitz_min: int, package_max: int) -> pl.DataFrame:
    """rush : 1 ligne par rusher (pff_role = Pass Rush) avec pressure_made, pff_sack, ttp.

    Une ligne par jeu : n_rushers, blitz, package, alignments, pressure, sack, ttp (plus rapide).
    """
    return (
        rush.group_by("gameId", "playId")
        .agg(
            pl.len().alias("n_rushers"),
            pl.col("pff_positionLinedUp").sort().str.join(" · ").alias("alignments"),
            pl.col("pressure_made").any().alias("pressure"),
            (pl.col("pff_sack").fill_null(0) == 1).any().alias("sack"),
            pl.col("ttp").min().alias("ttp"),
        )
        .with_columns(
            (pl.col("n_rushers") >= blitz_min).alias("blitz"),
            pl.col("n_rushers")
            .map_elements(lambda n: package_label(n, package_max), return_dtype=pl.Utf8)
            .alias("package"),
        )
    )
