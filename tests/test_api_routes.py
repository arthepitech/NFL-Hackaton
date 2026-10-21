import polars as pl
import pytest
from fastapi.testclient import TestClient
from minidata import write_mini_dataset

from api.filters import FilterParams, apply_filters
from api.main import create_app
from config import settings
from etl import build


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("api")
    raw, out = tmp / "raw", tmp / "processed"
    write_mini_dataset(raw)
    build.run(raw, out)
    return TestClient(create_app(out))


def test_meta_exposes_thresholds_and_football_labels(client):
    meta = client.get("/api/meta").json()
    assert meta["thresholds"]["min_snaps_display"] == 100
    assert meta["options"]["distance"] == ["court", "moyen", "long"]
    assert meta["options"]["coverage"] == ["Cover-1"]
    assert "pbwr_pff" in meta["definitions"]
    assert "pff_" not in meta["definitions"]["pbwr_pff"]["label"]


def test_players_lists_offensive_linemen(client):
    players = client.get("/api/players").json()
    assert players == [{"nflId": 10, "name": "Tackle", "position": "T", "team": "DEN", "snaps": 1}]


def test_scout_card(client):
    card = client.get("/api/players/10/scout-card").json()
    assert card["player"]["alignment"] == "LT"
    assert card["player"]["height_in"] == 77
    m = card["metrics"]
    assert m["pbwr_pff"] == {"value": 0.0, "n": 1, "low_sample": True, "tier": None}
    assert m["pbwr_tracking"]["value"] == 1.0
    assert m["pressure_rate"]["value"] == 1.0
    assert m["ttp"]["n"] == 0 and m["ttp"]["value"] is None
    assert m["time_to_throw"]["value"] == pytest.approx(0.2)
    assert card["alerts"] == [
        {"kind": "pbwr_gap", "points": 100.0, "message": card["alerts"][0]["message"]}
    ]


def test_scout_card_filters_reduce_sample(client):
    card = client.get("/api/players/10/scout-card", params={"down": [1, 2]}).json()
    assert card["metrics"]["pbwr_pff"]["n"] == 0


def test_metric_plays_are_traceable(client):
    rows = client.get("/api/players/10/plays", params={"metric": "pbwr_pff"}).json()
    assert len(rows) == 1
    assert rows[0]["counted"] is True
    assert rows[0]["blockedName"] == "Rusher"
    assert client.get("/api/players/10/plays", params={"metric": "nope"}).status_code == 422


def test_defeats_and_weekly(client):
    assert client.get("/api/players/10/defeats").json() == []
    weekly = client.get("/api/players/10/weekly").json()
    assert weekly[0]["week"] == 6 and weekly[0]["n"] == 1


def test_play_and_duel(client):
    play = client.get("/api/plays/1/7").json()
    assert play["qbId"] == 30
    assert play["frames"][0]["t"] == 0.0
    assert play["positions"]["10"][0][:2] == [60.0, 33.3]
    assert play["blocks"] == [{"blockerId": 10, "rusherId": 20, "blockType": "PP"}]
    duel = client.get("/api/plays/1/7/duel", params={"blocker": 10, "rusher": 20}).json()
    assert [p["t"] for p in duel["series"]] == [0.0, 0.1, 0.2]
    assert duel["series"][0]["d_qb"] == pytest.approx(7.0)
    assert duel["markers"]["pass_forward"] == pytest.approx(0.2)
    assert client.get("/api/plays/1/99").status_code == 404
    assert client.get("/api/players/999/scout-card").status_code == 404


def test_apply_filters_buckets():
    df = pl.DataFrame(
        {
            "down": [3, 3, 1],
            "yardsToGo": [8, 2, 10],
            "quarter": [1, 2, 4],
            "score_diff": [-3, 10, 0],
            "yards_to_goal": [15, 60, 30],
            "offenseFormation": ["SHOTGUN"] * 3,
            "personnelO": ["x"] * 3,
            "personnelD": ["y"] * 3,
            "pff_passCoverage": ["Cover-1", "Cover-3", "Cover-1"],
            "pff_playAction": [0, 1, 0],
            "dropBackType": ["TRADITIONAL"] * 3,
            "defensiveTeam": ["LV", "KC", "LV"],
            "week": [1, 5, 8],
        }
    )
    cfg = settings.load_filters()

    def run(**kw):
        return apply_filters(df, FilterParams(**kw), cfg).height

    assert run() == 3
    assert run(down=[3], distance=["long"]) == 1
    assert run(score=["mene_1_8"]) == 1
    assert run(red_zone=True) == 1
    assert run(play_action=True) == 1
    assert run(coverage=["Cover-1"], opponent=["LV"], week_min=2) == 1
    assert run(quarter=[4], formation=["SHOTGUN"], personnel_o=["x"], personnel_d=["y"]) == 1
    assert run(dropback=["SCRAMBLE"], week_max=8) == 0
