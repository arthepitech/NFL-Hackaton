import pytest

from api.club import Club


@pytest.fixture
def club(tmp_path):
    return Club(tmp_path / "club.duckdb")


def test_coach_tag_confirm_then_correct(club):
    assert club.get_tag(1, 7, 10) is None
    club.set_tag(1, 7, 10, proposed="Set", cause="Set", comment="", author="coach OL")
    assert club.get_tag(1, 7, 10)["cause"] == "Set"
    club.set_tag(1, 7, 10, proposed="Set", cause="Pieds lents", comment="revoir", author="coach OL")
    tag = club.get_tag(1, 7, 10)
    assert (tag["cause"], tag["proposed"], tag["confirmed"]) == ("Pieds lents", "Set", False)
    # La correction devient un tag réutilisable.
    assert "Pieds lents" in club.tag_names()


def test_playlists(club):
    pid = club.create_playlist("Avant jeudi", player_id=44832, author="coach OL")
    item = club.add_item(pid, game_id=1, play_id=7, nfl_id=10, t=2.2, comment="Set trop court")
    club.add_item(pid, game_id=1, play_id=8, nfl_id=10, t=None, comment="")
    lists = club.playlists(player_id=44832)
    assert [p["name"] for p in lists] == ["Avant jeudi"]
    assert [i["playId"] for i in lists[0]["items"]] == [7, 8]
    club.delete_item(item)
    assert [i["playId"] for i in club.playlists(player_id=44832)[0]["items"]] == [8]
    assert club.playlists(player_id=1) == []


def test_video_index(club):
    assert club.clips(1, 7) == []
    club.set_clip(1, 7, angle="All-22", url="clips/1_7_all22.mp4", snap_offset_s=3.4)
    club.set_clip(1, 7, angle="All-22", url="clips/1_7_all22.mp4", snap_offset_s=3.5)
    assert club.clips(1, 7) == [
        {"angle": "All-22", "url": "clips/1_7_all22.mp4", "snap_offset_s": 3.5}
    ]
