"""Module Scout (V3) : connecteur Combine du Big Data Bowl 2027.

Le jeu BDB 2027 (tracking du Combine 2023-2025) n'est pas accessible dans ce dépôt : le schéma
est posé et le connecteur renvoie une table vide, signalée comme indisponible. Aucun chiffre
n'est inventé. Colonnes à confirmer à la publication officielle du jeu de données.
"""

from pathlib import Path

import polars as pl

COMBINE_SCHEMA = {
    "nflId": pl.Int64,
    "season": pl.Int64,
    "officialPosition": pl.Utf8,
    "heightIn": pl.Float64,
    "weightLb": pl.Float64,
    "fortyYd": pl.Float64,
    "tenYdSplit": pl.Float64,
    "benchReps": pl.Float64,
    "verticalIn": pl.Float64,
    "broadIn": pl.Float64,
    "threeCone": pl.Float64,
    "shuttle": pl.Float64,
}
UNAVAILABLE = "Données Combine (BDB 2027) non disponibles : module Scout en attente."


def load_combine(directory: Path) -> pl.DataFrame:
    path = directory / "combine.csv"
    if not path.exists():
        return pl.DataFrame(schema=COMBINE_SCHEMA)
    df = pl.read_csv(path, null_values=["NA"])
    missing = [c for c in COMBINE_SCHEMA if c not in df.columns]
    if missing:
        raise ValueError(f"combine.csv : colonnes manquantes {missing}")
    return df.select([pl.col(c).cast(t) for c, t in COMBINE_SCHEMA.items()])


def status(directory: Path) -> dict:
    available = (directory / "combine.csv").exists()
    return {
        "available": available,
        "message": "Données Combine chargées." if available else UNAVAILABLE,
        "columns": list(COMBINE_SCHEMA),
    }


def percentile(
    pool: pl.DataFrame, position: str, column: str, value: float, *, lower_is_better: bool
) -> float:
    """Part des joueurs du poste que le prospect dépasse sur une mesure."""
    values = pool.filter(pl.col("officialPosition") == position)[column].drop_nulls()
    beaten = (values > value).sum() if lower_is_better else (values < value).sum()
    return beaten / values.len()
