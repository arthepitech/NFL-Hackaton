"""Chemins et seuils du projet (décision 0001 pour l'emplacement des données)."""

import os
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
# Surchargeables pour Docker (décision 0004 §5).
RAW_DIR = Path(os.environ.get("DATA_RAW_PATH", ROOT / "data"))  # lecture seule
TRACKING_DIR = RAW_DIR / "tracking"  # lecture seule
PROCESSED_DIR = Path(os.environ.get("DATA_PROCESSED_PATH", RAW_DIR / "processed"))
THRESHOLDS_PATH = ROOT / "config" / "thresholds.yaml"
FILTERS_PATH = ROOT / "config" / "filters.yaml"

THRESHOLD_KEYS = (
    "pressure_radius_yd",
    "win_window_s",
    "fast_rusher_yd_s",
    "fast_rusher_window_s",
    "min_snaps_display",
    "badge_top_pct",
    "badge_bottom_pct",
    "blitz_min_rushers",
    "heavy_rusher_pct",
    "set_window_s",
    "set_min_retreat_yd",
    "power_min_retreat_yd",
    "power_min_rusher_speed_yd_s",
    "badge_context_gap_pts",
)


def load_thresholds(path: Path = THRESHOLDS_PATH) -> dict[str, float]:
    data = yaml.safe_load(path.read_text())
    missing = [k for k in THRESHOLD_KEYS if k not in data]
    if missing:
        raise KeyError(f"seuils manquants dans {path.name}: {missing}")
    return {k: data[k] for k in THRESHOLD_KEYS}


def load_filters(path: Path = FILTERS_PATH) -> dict:
    return yaml.safe_load(path.read_text())
