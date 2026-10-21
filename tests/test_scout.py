import polars as pl
import pytest

from etl import scout


def test_connector_empty_when_bdb2027_absent(tmp_path):
    out = scout.load_combine(tmp_path / "absent")
    assert out.height == 0
    assert out.schema == scout.COMBINE_SCHEMA
    assert scout.status(tmp_path / "absent") == {
        "available": False,
        "message": scout.UNAVAILABLE,
        "columns": list(scout.COMBINE_SCHEMA),
    }


def test_connector_reads_and_validates(tmp_path):
    (tmp_path / "combine.csv").write_text(
        "nflId,season,officialPosition,heightIn,weightLb,fortyYd,tenYdSplit,benchReps,"
        "verticalIn,broadIn,threeCone,shuttle\n"
        "1,2025,T,77,315,5.1,1.75,28,30,110,7.6,4.6\n"
    )
    out = scout.load_combine(tmp_path)
    assert out.height == 1 and out["fortyYd"][0] == 5.1
    assert scout.status(tmp_path)["available"] is True


def test_connector_rejects_missing_column(tmp_path):
    (tmp_path / "combine.csv").write_text("nflId,season\n1,2025\n")
    with pytest.raises(ValueError, match="colonnes manquantes"):
        scout.load_combine(tmp_path)


def test_percentile_vs_position():
    pool = pl.DataFrame({"officialPosition": ["T"] * 4, "fortyYd": [5.0, 5.2, 5.4, 5.6]})
    # 40 yards : plus bas = meilleur.
    assert scout.percentile(pool, "T", "fortyYd", 5.1, lower_is_better=True) == 0.75
