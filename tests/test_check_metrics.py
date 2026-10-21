import polars as pl
from minidata import write_mini_dataset

from etl import build, check_metrics


def _built(tmp_path):
    raw, out = tmp_path / "raw", tmp_path / "processed"
    write_mini_dataset(raw)
    build.run(raw, out)
    return raw, out


def test_manual_recompute_matches_pipeline(tmp_path):
    raw, out = _built(tmp_path)
    result, report = check_metrics.run(raw, out, n_plays=20, seed=1)
    assert result == {"plays": 1, "snaps": 1, "mismatches": []}
    assert "Écarts : 0" in report
    assert (out / "reports" / "check-metrics.md").exists()


def test_tampered_value_is_detected(tmp_path):
    raw, out = _built(tmp_path)
    snaps = pl.read_parquet(out / "snaps_ol.parquet").with_columns(pl.lit(1.0).alias("ttp"))
    snaps.write_parquet(out / "snaps_ol.parquet")
    result, _ = check_metrics.run(raw, out, n_plays=20, seed=1)
    assert [m["champ"] for m in result["mismatches"]] == ["ttp"]


def test_pbwr_gap_alert():
    snaps = pl.DataFrame(
        {
            "nflId": [1] * 4 + [2] * 4,
            "pff_positionLinedUp": ["LT"] * 8,
            "has_tracking": [True] * 8,
            "pff_loss": [True, True, False, False] + [False] * 4,
            "tracking_loss": [False] * 8,
        }
    )
    players = pl.DataFrame({"nflId": [1, 2], "displayName": ["A", "B"]})
    gaps = check_metrics.pbwr_gaps(snaps, players, min_snaps=4)
    assert gaps.select("displayName", "ecart").rows() == [("A", 50.0)]
    report = check_metrics.render({"plays": 0, "snaps": 0, "mismatches": [{"x": 1}]}, gaps, 2, 0)
    assert "| A | 4 | 50.0 % | 100.0 % | +50.0 |" in report
