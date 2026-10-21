"""Origine des pressions par gap (cahier, carte de protection ; décision 0005 §5)."""

import polars as pl

KEYS = ["gameId", "playId"]


def pressure_gaps(tracking: pl.DataFrame, rushers: pl.DataFrame, ol: pl.DataFrame) -> pl.DataFrame:
    """rushers : gameId, playId, rusherId (+ ttp optionnel). ol : gameId, playId, nflId, alignment.

    Gap lu à la 1re image (0 < t ≤ t_end) où le rusher atteint la profondeur moyenne des 5 OL.
    Sans franchissement (QB remonté devant sa ligne), gap lu au moment de la pression (ttp).
    Attaque vers la droite : la gauche de l'attaque est en +y.
    """
    if "ttp" not in rushers.columns:
        rushers = rushers.with_columns(pl.lit(None, dtype=pl.Float64).alias("ttp"))
    pos = tracking.select(*KEYS, "nflId", "frameId", "x", "y")
    line = (
        pos.join(ol, on=[*KEYS, "nflId"])
        .group_by(*KEYS, "frameId")
        .agg(
            pl.col("x").filter(~pl.col("alignment").str.starts_with("TE")).mean().alias("line_x"),
            *[
                pl.col("y").filter(pl.col("alignment") == a).first().alias(a)
                for a in ("LT", "LG", "C", "RG", "RT")
            ],
            pl.col("y").filter(pl.col("alignment").str.contains(r"^TE-.*L$")).max().alias("TE_L"),
            pl.col("y").filter(pl.col("alignment").str.contains(r"^TE-.*R$")).min().alias("TE_R"),
        )
    )
    window = tracking.select(*KEYS, "nflId", "frameId", "t", "frame_end").rename(
        {"nflId": "rusherId"}
    )
    frames = (
        rushers.join(window, on=[*KEYS, "rusherId"])
        .join(pos.rename({"nflId": "rusherId"}), on=[*KEYS, "rusherId", "frameId"])
        .join(line, on=[*KEYS, "frameId"])
        .filter((pl.col("t") > 0) & (pl.col("frameId") <= pl.col("frame_end")))
        .filter((pl.col("x") <= pl.col("line_x")) | ((pl.col("t") - pl.col("ttp")).abs() < 0.05))
        .sort("frameId")
        .group_by(*KEYS, "rusherId")
        .first()
    )
    y, left = pl.col("y"), pl.col("y") >= pl.col("C")
    gap_left = (
        pl.when(y <= pl.col("LG")).then(pl.lit("A"))
        .when(y <= pl.col("LT")).then(pl.lit("B"))
        .when(pl.col("TE_L").is_not_null() & (y <= pl.col("TE_L"))).then(pl.lit("C"))
        .otherwise(pl.lit("Extérieur"))
    )  # fmt: skip
    gap_right = (
        pl.when(y >= pl.col("RG")).then(pl.lit("A"))
        .when(y >= pl.col("RT")).then(pl.lit("B"))
        .when(pl.col("TE_R").is_not_null() & (y >= pl.col("TE_R"))).then(pl.lit("C"))
        .otherwise(pl.lit("Extérieur"))
    )  # fmt: skip
    crossed = frames.select(
        *KEYS,
        "rusherId",
        pl.col("t").alias("t_cross"),
        pl.when(left).then(pl.lit("gauche")).otherwise(pl.lit("droite")).alias("side"),
        pl.when(left).then(gap_left).otherwise(gap_right).alias("gap"),
    )
    return rushers.drop("ttp").join(crossed, on=[*KEYS, "rusherId"], how="left")
