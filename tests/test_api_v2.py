import pytest
from fastapi.testclient import TestClient
from minidata import write_mini_dataset

from api.main import create_app
from etl import build


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("api_v2")
    raw, out = tmp / "raw", tmp / "processed"
    write_mini_dataset(raw)
    build.run(raw, out)
    return TestClient(create_app(out))


def test_scout_card_has_island(client):
    m = client.get("/api/players/10/scout-card").json()["metrics"]
    assert m["island"] == {"value": 0.0, "n": 1, "low_sample": True, "tier": None}


def test_matchups_matrix_and_projection(client):
    body = client.get("/api/matchups", params={"team": "DEN", "opponent": "LV"}).json()
    assert [r["alignment"] for r in body["rows"]] == ["LT"]
    assert [c["name"] for c in body["cols"]] == ["Rusher"]
    assert body["cells"] == [
        {"blockerId": 10, "rusherId": 20, "n": 1, "win_rate": 0.0, "ttp": None}
    ]
    # ROLB habituel → affronte le LT (décision 0005 §10).
    assert body["projection"][0]["facing"] == "LT"
    assert body["projection"][0]["blockerId"] == 10
    clips = client.get("/api/matchups/duel", params={"blocker": 10, "rusher": 20}).json()
    assert len(clips) == 1


def test_protection_and_packages_and_coverage(client):
    prot = client.get("/api/protection", params={"team": "DEN"}).json()
    assert prot["positions"] == [{"alignment": "LT", "n": 1, "rate": 1.0}]
    assert prot["pressures"] == 1
    assert prot["gaps"] == [{"side": None, "gap": None, "n": 1, "ttp": None}]
    packs = client.get("/api/packages", params={"team": "LV"}).json()
    assert packs[0]["package"] == "3 ou moins"
    assert packs[0]["pressure_rate"] == 1.0
    cov = client.get("/api/coverage", params={"team": "LV", "down": [3], "distance": ["long"]})
    assert cov.json() == [
        {
            "coverage": "Cover-1",
            "situation": "3e & long",
            "n": 1,
            "yards_per_play": -3.0,
            "completion": None,
            "first_down_rate": 0.0,
        }
    ]
    assert client.get("/api/teams").json() == ["DEN"]


def test_paths(client):
    out = client.get("/api/players/10/paths", params={"mode": "all"}).json()
    assert out[0]["blocker"][0] == [0.0, 0.0]
    assert out[0]["rusher"][0] == [2.0, -0.0]
    assert out[0]["lost"] is True
    assert client.get("/api/players/10/paths").json() == []


def test_diagnosis_confirm_and_correct(client):
    d = client.get("/api/diagnosis/1/7/10").json()
    assert d["cause"] == "Indéterminé" and d["probable"] is True and d["tag"] is None
    tag = client.post("/api/diagnosis/1/7/10", json={"cause": "Set", "comment": "pieds"}).json()
    assert tag["proposed"] == "Indéterminé" and tag["cause"] == "Set"
    assert tag["confirmed"] is False
    assert client.get("/api/diagnosis/1/7/99").status_code == 404
    assert client.get("/api/tags").json()[:3] == ["Switch / stunt", "Set", "Puissance"]


def test_video_sync(client, monkeypatch):
    monkeypatch.setenv("VIDEO_BASE_URL", "https://video.club/")
    assert client.get("/api/video/1/7").json() == []
    out = client.put(
        "/api/video/1/7", json={"angle": "All-22", "url": "a.mp4", "snap_offset_s": 3.2}
    ).json()
    assert out == [{"angle": "All-22", "url": "https://video.club/a.mp4", "snap_offset_s": 3.2}]


def test_player_views(client):
    weekly = client.get("/api/players/10/weekly").json()
    assert weekly[0]["position_pbwr_pff"] == 0.0
    s = client.get("/api/players/10/set").json()
    assert s["alignment"] == "LT" and s["player"]["n"] == 1 and s["reference"] is None
    pid = client.post("/api/playlists", json={"name": "Jeudi", "player_id": 10}).json()["id"]
    item = client.post(
        f"/api/playlists/{pid}/items", json={"gameId": 1, "playId": 7, "nflId": 10, "t": 0.1}
    ).json()["id"]
    assert client.get("/api/playlists", params={"player": 10}).json()[0]["items"][0]["t"] == 0.1
    client.delete(f"/api/playlists/items/{item}")
    assert client.get("/api/playlists", params={"player": 10}).json()[0]["items"] == []


def test_recruiter_views(client):
    r = client.get("/api/radar", params={"ids": [10], "fast_speed": 0.5}).json()
    assert set(r["labels"]) == {"PP", "PA", "SW", "island", "fast", "heavy"}
    assert r["players"][0]["axes"]["PP"] == {"value": 0.0, "n": 1}
    assert r["players"][0]["axes"]["fast"]["n"] == 1
    assert client.get("/api/league", params={"metric": "pbwr_pff"}).json() == []
    assert client.get("/api/league", params={"metric": "nope"}).status_code == 422
    sc = client.get("/api/speed-scatter", params={"fast_speed": 0.5}).json()
    assert sc["points"][0]["weight"] == 310
    assert sc["configured_fast_speed"] == 8.0
