"""Jeu de référence CLAUDE.md §8 : sack de Maxx Crosby sur Teddy Bridgewater (décision 0002 §6)."""

import polars as pl
import pytest

from config import settings
from etl import ingest, normalize

GAME, PLAY = 2021101709, 1444
CROSBY, BRIDGEWATER, TE_CHIP = 47889, 41258, 47803

pytestmark = pytest.mark.realdata


@pytest.fixture(scope="module")
def tracking():
    raw = ingest.read_tracking(settings.TRACKING_DIR / f"tracking_{GAME}.csv")
    play = raw.filter(pl.col("playId") == PLAY)
    timed, excluded = normalize.add_time(normalize.normalize_direction(play))
    assert excluded.height == 0
    return timed


def test_snap_and_sack_frames(tracking):
    crosby = tracking.filter(pl.col("nflId") == CROSBY)
    snap = crosby.filter(pl.col("t") == 0)
    assert snap["frameId"].to_list() == [7]
    sack = crosby.filter(pl.col("event") == "qb_sack")
    assert sack["frameId"].to_list() == [50]
    assert sack["t"].to_list() == pytest.approx([4.3])
    assert crosby["frame_end"].unique().to_list() == [50]


def test_raw_coordinates_match_strain_table_2():
    raw = ingest.read_tracking(settings.TRACKING_DIR / f"tracking_{GAME}.csv")
    row = raw.filter(
        (pl.col("playId") == PLAY) & (pl.col("nflId") == CROSBY) & (pl.col("frameId") == 7)
    )
    assert row.select("x", "y", "s", "o", "dir").row(0) == (67.68, 29.89, 0.34, 124.86, 88.21)
    assert row["playDirection"][0] == "left"


def test_normalized_offense_goes_right(tracking):
    snap = tracking.filter(pl.col("t") == 0)
    qb_x = snap.filter(pl.col("nflId") == BRIDGEWATER)["x"][0]
    crosby_x = snap.filter(pl.col("nflId") == CROSBY)["x"][0]
    assert crosby_x == pytest.approx(120 - 67.68)
    assert crosby_x > qb_x


def test_pff_charting_of_the_sack():
    pff = ingest.read_pff(settings.RAW_DIR / "pffScoutingData.csv").filter(
        (pl.col("gameId") == GAME) & (pl.col("playId") == PLAY)
    )
    crosby = pff.filter(pl.col("nflId") == CROSBY)
    assert crosby.select("pff_role", "pff_positionLinedUp", "pff_sack").row(0) == (
        "Pass Rush",
        "LEO",
        1,
    )
    on_crosby = pff.filter(pl.col("pff_nflIdBlockedPlayer") == CROSBY)
    assert on_crosby.select("nflId", "pff_role", "pff_blockType").rows() == [
        (TE_CHIP, "Pass Route", "CH")
    ]
    # Aucun bloqueur n'est crédité du sack de Crosby :
    # le seul sack concédé est celui du C sur le DT.
    allowed = pff.filter(pl.col("pff_sackAllowed") == 1)
    assert allowed.select("nflId", "pff_positionLinedUp", "pff_nflIdBlockedPlayer").rows() == [
        (52491, "C", 40608)
    ]
