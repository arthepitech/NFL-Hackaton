import csv

import pytest

from config import enums, settings

EXPECTED_THRESHOLDS = {
    "pressure_radius_yd": 1.5,
    "win_window_s": 2.5,
    "fast_rusher_yd_s": 8.0,
    "fast_rusher_window_s": 1.5,
    "min_snaps_display": 100,
    "badge_top_pct": 0.10,
    "badge_bottom_pct": 0.10,
    "blitz_min_rushers": 5,
    "heavy_rusher_pct": 0.75,
    "set_window_s": 0.5,
    "set_min_retreat_yd": 0.2,
    "power_min_retreat_yd": 1.5,
    "power_min_rusher_speed_yd_s": 2.0,
    "badge_context_gap_pts": 0.15,
}


def test_thresholds_match_claude_md():
    assert settings.load_thresholds() == EXPECTED_THRESHOLDS


def test_thresholds_missing_key_raises(tmp_path):
    path = tmp_path / "t.yaml"
    path.write_text("pressure_radius_yd: 1.5\n")
    with pytest.raises(KeyError, match="win_window_s"):
        settings.load_thresholds(path)


def test_block_types_are_the_twelve_pff_codes():
    expected = {"PP", "PA", "SW", "CH", "PU", "BH", "PT", "UP", "PR", "SR", "CL", "NB"}
    assert expected == enums.BLOCK_TYPES


def test_unknown_value_raises():
    with pytest.raises(enums.UnknownCodedValueError, match="pff_blockType.*XX"):
        enums.validate_enum("pff_blockType", ["PP", "XX"])


def test_na_and_none_are_accepted():
    enums.validate_enum("pff_blockType", ["PP", "NA", None])


def test_unknown_column_raises():
    with pytest.raises(KeyError):
        enums.validate_enum("not_a_column", ["x"])


def test_role_casing_follows_data():
    # Décision 0002 §1 : casse réelle des fichiers BDB 2023.
    enums.validate_enum("pff_role", ["Pass Block", "Pass Rush", "Pass Route"])
    with pytest.raises(enums.UnknownCodedValueError):
        enums.validate_enum("pff_role", ["Pass block"])


def _column(path, name):
    with open(path, newline="") as f:
        return [row[name] for row in csv.DictReader(f)]


@pytest.mark.realdata
@pytest.mark.parametrize(
    ("filename", "column"),
    [
        ("pffScoutingData.csv", "pff_role"),
        ("pffScoutingData.csv", "pff_blockType"),
        ("plays.csv", "pff_passCoverage"),
        ("plays.csv", "pff_passCoverageType"),
        ("plays.csv", "passResult"),
        ("plays.csv", "dropBackType"),
    ],
)
def test_every_real_value_is_known(filename, column):
    enums.validate_enum(column, _column(settings.RAW_DIR / filename, column))
