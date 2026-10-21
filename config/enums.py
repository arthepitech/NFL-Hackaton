"""Valeurs codées PFF / BDB 2023 (CLAUDE.md §4.3, décision 0002).

Une valeur hors liste lève UnknownCodedValueError, jamais ignorée.
`NA` (ou None) signifie « champ non applicable au rôle » et est accepté.
"""

from collections.abc import Iterable

BLOCK_TYPES = frozenset({"PP", "PA", "SW", "CH", "PU", "BH", "PT", "UP", "PR", "SR", "CL", "NB"})

PASS_COVERAGES = frozenset(
    {
        "Cover-0",
        "Cover-1",
        "Cover-2",
        "2-Man",
        "Cover-3",
        "Quarters",
        "Cover-6",
        "Bracket",
        "Goal Line",
        "Red Zone",
        "Prevent",
        "Miscellaneous",
    }
)

# Casse réelle des fichiers (CLAUDE.md écrit « Pass block » : voir décision 0002 §1).
PFF_ROLES = frozenset({"Pass", "Pass Block", "Pass Route", "Pass Rush", "Coverage"})

PASS_COVERAGE_TYPES = frozenset({"Man", "Zone", "Other"})

PASS_RESULTS = frozenset({"C", "I", "S", "IN", "R"})

DROPBACK_TYPES = frozenset(
    {
        "TRADITIONAL",
        "SCRAMBLE",
        "DESIGNED_ROLLOUT_RIGHT",
        "DESIGNED_ROLLOUT_LEFT",
        "SCRAMBLE_ROLLOUT_RIGHT",
        "SCRAMBLE_ROLLOUT_LEFT",
        "DESIGNED_RUN",
        "UNKNOWN",
    }
)

# Ordre de préférence pour le recalage du temps (décision 0002 §2).
SNAP_EVENTS = ("ball_snap", "autoevent_ballsnap")

# Fin de dropback : borne de recherche de la pression et de la défaite (décision 0004 §1).
END_EVENTS = frozenset(
    {
        "pass_forward",
        "autoevent_passforward",
        "qb_sack",
        "qb_strip_sack",
        "run",
        "handoff",
        "lateral",
    }
)

# Alignements de la ligne offensive (pff_positionLinedUp).
OL_ALIGNMENTS = ("LT", "LG", "C", "RG", "RT")
OL_POSITIONS = frozenset({"T", "G", "C"})  # players.officialPosition

# Blocs d'aide pour l'Island Win Rate (CLAUDE.md §5).
HELP_BLOCK_TYPES = frozenset({"CH", "BH", "PU", "SW"})

# Projection des duels : alignement habituel du rusher → OL attendu (décision 0005 §10).
FACING_OL = {
    "LEO": "RT",
    "LE": "RT",
    "LOLB": "RT",
    "REO": "LT",
    "RE": "LT",
    "ROLB": "LT",
    "DLT": "RG",
    "NLT": "RG",
    "DRT": "LG",
    "NRT": "LG",
    "NT": "C",
}

MISSING = frozenset({"NA", ""})

ENUMS: dict[str, frozenset[str]] = {
    "pff_blockType": BLOCK_TYPES,
    "pff_passCoverage": PASS_COVERAGES,
    "pff_role": PFF_ROLES,
    "pff_passCoverageType": PASS_COVERAGE_TYPES,
    "passResult": PASS_RESULTS,
    "dropBackType": DROPBACK_TYPES,
}


class UnknownCodedValueError(ValueError):
    """Valeur codée absente de config/enums.py."""


def validate_enum(column: str, values: Iterable[str | None]) -> None:
    allowed = ENUMS[column]
    unknown = {v for v in values if v is not None and v not in MISSING and v not in allowed}
    if unknown:
        raise UnknownCodedValueError(f"{column}: valeurs inconnues {sorted(unknown)}")
