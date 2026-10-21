"""Island Win Rate (CLAUDE.md §5) : snaps sans autre bloqueur d'aide sur le même défenseur."""

import polars as pl

from config.enums import HELP_BLOCK_TYPES


def island_flags(blocks: pl.DataFrame) -> pl.DataFrame:
    """blocks : gameId, playId, nflId, blockedId, pff_blockType (tous rôles, chips compris).

    island = aucun AUTRE joueur ne bloque le même défenseur en CH, BH, PU ou SW (décision 0005 §2).
    null si le bloqueur n'a pas de défenseur noté.
    """
    helpers = blocks.filter(pl.col("pff_blockType").is_in(HELP_BLOCK_TYPES)).select(
        "gameId", "playId", "blockedId", pl.col("nflId").alias("helperId")
    )
    helped = (
        blocks.filter(pl.col("blockedId").is_not_null())
        .join(helpers, on=["gameId", "playId", "blockedId"])
        .filter(pl.col("nflId") != pl.col("helperId"))
        .select("gameId", "playId", "nflId")
        .unique()
        .with_columns(pl.lit(True).alias("helped"))
    )
    return (
        blocks.join(helped, on=["gameId", "playId", "nflId"], how="left")
        .with_columns(
            pl.when(pl.col("blockedId").is_null())
            .then(None)
            .otherwise(pl.col("helped").is_null())
            .alias("island")
        )
        .drop("helped")
    )
