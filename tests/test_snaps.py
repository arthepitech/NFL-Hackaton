import polars as pl
import pytest
from minidata import write_mini_dataset

from config import settings
from etl import build

GAME, PLAY = 2021101709, 1444
CROSBY, TE_CHIP, CENTER, DT = 47889, 47803, 52491, 40608


def test_snaps_on_mini_dataset(tmp_path):
    raw, out = tmp_path / "raw", tmp_path / "processed"
    write_mini_dataset(raw)
    report = build.run(raw, out)
    assert report["snaps_ol"] == 1
    assert report["snaps_dl"] == 1

    ol = pl.read_parquet(out / "snaps_ol.parquet")
    row = ol.row(0, named=True)
    # LT 10 : hurry concédé selon PFF ; tracking : rusher à 7 yd du QB, jamais dans le rayon.
    assert row["nflId"] == 10
    assert row["pff_loss"] is True
    assert row["pressure_allowed"] is True
    assert row["has_tracking"] is True
    assert row["ttp"] is None
    assert row["tracking_loss"] is False
    assert row["defeat_t"] is None
    assert row["t_end"] == pytest.approx(0.2)
    assert row["down"] == 3
    assert row["defensiveTeam"] == "LV"

    dl = pl.read_parquet(out / "snaps_dl.parquet")
    assert dl.select("nflId", "pressure_made", "ttp").rows() == [(20, True, None)]


@pytest.fixture(scope="module")
def real_snaps():
    path = settings.PROCESSED_DIR / "snaps_ol.parquet"
    if not path.exists():
        pytest.skip("lancer `make etl` d'abord")
    ol = pl.read_parquet(path).filter((pl.col("gameId") == GAME) & (pl.col("playId") == PLAY))
    dl = pl.read_parquet(settings.PROCESSED_DIR / "snaps_dl.parquet").filter(
        (pl.col("gameId") == GAME) & (pl.col("playId") == PLAY)
    )
    return ol, dl


@pytest.mark.realdata
def test_reference_play_crosby(real_snaps):
    ol, dl = real_snaps
    crosby = dl.filter(pl.col("nflId") == CROSBY).row(0, named=True)
    assert crosby["pressure_made"] is True
    # Crosby entre dans le rayon de 1,5 yd du QB avant le sack (t = 4,3 s).
    assert crosby["ttp"] == pytest.approx(4.2)
    # Aucun OL ne l'a en charge : le seul « bloqueur » est le chip du TE (rôle Pass Route).
    assert CROSBY not in ol["blockedId"].to_list()
    assert crosby["blocked_by"] == [TE_CHIP]


@pytest.mark.realdata
def test_reference_play_center_sack_allowed(real_snaps):
    ol, _ = real_snaps
    center = ol.filter(pl.col("nflId") == CENTER).row(0, named=True)
    assert center["blockedId"] == DT
    assert center["pff_loss"] is True
    assert center["t_end"] == pytest.approx(4.3)
    # Valeurs de non-régression (décision 0004) : défaite à 2,2 s, pression du DT à 4,1 s.
    assert center["defeat_t"] == pytest.approx(2.2)
    assert center["ttp"] == pytest.approx(4.1)
    assert center["tracking_loss"] is False


@pytest.mark.realdata
def test_reference_play_v2_package_gap_and_diagnosis(real_snaps):
    ol, dl = real_snaps
    packages = pl.read_parquet(settings.PROCESSED_DIR / "plays_rush.parquet").filter(
        (pl.col("gameId") == GAME) & (pl.col("playId") == PLAY)
    )
    assert packages.select("n_rushers", "package", "blitz", "pressure", "sack").row(0) == (
        4,
        "4",
        False,
        True,
        True,
    )
    assert packages["ttp"][0] == pytest.approx(4.1)
    # QB remonté devant sa ligne : gap lu au moment de la pression (décision 0005 §5).
    crosby = dl.filter(pl.col("nflId") == CROSBY).row(0, named=True)
    assert (crosby["side"], crosby["gap"]) == ("droite", "A")
    assert crosby["t_cross"] == pytest.approx(4.2)
    center = ol.filter(pl.col("nflId") == CENTER).row(0, named=True)
    assert center["cause"] == "Indéterminé"
    assert center["island"] is True
