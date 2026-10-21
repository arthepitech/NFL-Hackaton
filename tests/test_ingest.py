import json

import polars as pl
import pytest
from minidata import write_mini_dataset

from config.enums import UnknownCodedValueError
from etl import build, ingest


def test_unknown_block_type_raises(tmp_path):
    write_mini_dataset(tmp_path, block_type="ZZ")
    with pytest.raises(UnknownCodedValueError, match="ZZ"):
        ingest.read_pff(tmp_path / "pffScoutingData.csv")


def test_build_writes_parquet_and_report(tmp_path):
    raw, out = tmp_path / "raw", tmp_path / "processed"
    write_mini_dataset(raw)
    report = build.run(raw, out)

    plays = pl.read_parquet(out / "plays.parquet")
    assert plays["week"].to_list() == [6]
    assert plays["score_diff"].to_list() == [-7]

    players = pl.read_parquet(out / "players.parquet")
    assert players.filter(pl.col("nflId") == 10)["height_in"].to_list() == [77]

    tracking = pl.read_parquet(out / "tracking" / "1.parquet")
    lt = tracking.filter(pl.col("nflId") == 10).sort("frameId")
    assert lt["x"].to_list() == [60.0, 60.0, 60.0]  # 120 − 60
    assert lt["t"].to_list() == [0.0, 0.1, 0.2]
    assert lt["frame_end"].unique().to_list() == [3]

    assert report == json.loads((out / "etl_report.json").read_text())
    assert report["plays_without_snap"] == []
    assert report["tracking_games"] == 1
