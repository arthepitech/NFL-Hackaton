"""Diagnostic assisté (cahier, Play Lab ; décision 0005 §6).

Règles explicables, appliquées aux snaps avec défaite (tracking) ou bloc perdu (PFF).
Le résultat est une cause *probable*, que le coach confirme ou corrige.
Aucune technique de rush n'est nommée (CLAUDE.md §4.4).
"""

import polars as pl

SWITCH, SET, POWER, UNKNOWN = "Switch / stunt", "Set", "Puissance", "Indéterminé"


def diagnose(th: dict) -> list[pl.Expr]:
    """Expressions `cause` et `reason` à appliquer sur les colonnes du snap OL."""
    concerned = pl.col("defeat_t").is_not_null() | pl.col("pff_loss")
    switch = (pl.col("pff_blockType") == "SW") & (pl.col("n_blockers_on_defender") != 1)
    set_rule = pl.col("outside_win").fill_null(False) & (
        pl.col("set_retreat") < th["set_min_retreat_yd"]
    ).fill_null(False)
    power = (
        (pl.col("power_retreat") >= th["power_min_retreat_yd"])
        & (pl.col("rusher_s_defeat") >= th["power_min_rusher_speed_yd_s"])
    ).fill_null(False)

    cause = (
        pl.when(~concerned).then(None)
        .when(switch).then(pl.lit(SWITCH))
        .when(set_rule).then(pl.lit(SET))
        .when(power).then(pl.lit(POWER))
        .otherwise(pl.lit(UNKNOWN))
    )  # fmt: skip
    reason = (
        pl.when(~concerned).then(None)
        .when(switch).then(pl.format(
            "Bloc noté « switch » et {} bloqueur(s) sur le défenseur.",
            pl.col("n_blockers_on_defender"),
        ))
        .when(set_rule).then(pl.format(
            "Gain à l'extérieur ; recul {} yd sur les {} premières s (attendu ≥ {} yd).",
            pl.col("set_retreat").round(1), pl.lit(th["set_window_s"]),
            pl.lit(th["set_min_retreat_yd"]),
        ))
        .when(power).then(pl.format(
            "Bloqueur repoussé de {} yd vers le QB, rusher encore à {} yd/s.",
            pl.col("power_retreat").round(1), pl.col("rusher_s_defeat").round(1),
        ))
        .otherwise(pl.lit("Aucune règle ne s'applique : à qualifier par le coach."))
    )  # fmt: skip
    return [cause.alias("cause"), reason.alias("reason")]
