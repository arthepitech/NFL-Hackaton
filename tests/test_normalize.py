import polars as pl
import pytest

from etl import normalize


def _frames(rows):
    cols = ["gameId", "playId", "nflId", "frameId", "playDirection", "x", "y", "o", "dir", "event"]
    return pl.DataFrame([dict(zip(cols, r, strict=True)) for r in rows], orient="row")


def test_left_plays_are_flipped():
    df = _frames(
        [
            (1, 1, 10, 1, "left", 30.0, 10.0, 90.0, 270.0, None),
            (1, 2, 10, 1, "right", 30.0, 10.0, 90.0, 270.0, None),
        ]
    )
    out = normalize.normalize_direction(df).sort("playId")
    assert out["x"].to_list() == [90.0, 30.0]
    assert out["y"].to_list() == pytest.approx([43.3, 10.0])
    assert out["o"].to_list() == [270.0, 90.0]
    assert out["dir"].to_list() == [90.0, 270.0]


def test_flip_wraps_angles_and_keeps_nulls():
    df = _frames([(1, 1, None, 1, "left", 0.0, 0.0, 270.0, None, None)])
    out = normalize.normalize_direction(df)
    assert out["o"][0] == 90.0
    assert out["dir"][0] is None


def test_snap_prefers_ball_snap_then_autoevent():
    df = _frames(
        [
            (1, 1, 10, 5, "right", 0, 0, 0, 0, "autoevent_ballsnap"),
            (1, 1, 10, 6, "right", 0, 0, 0, 0, "ball_snap"),
            (1, 2, 10, 4, "right", 0, 0, 0, 0, "autoevent_ballsnap"),
            (1, 3, 10, 4, "right", 0, 0, 0, 0, "pass_forward"),
        ]
    )
    snaps = normalize.snap_frames(df).sort("playId")
    assert snaps.rows() == [(1, 1, 6), (1, 2, 4)]


def test_end_frame_uses_first_end_event_else_last_frame():
    df = _frames(
        [
            (1, 1, 10, 3, "right", 0, 0, 0, 0, "ball_snap"),
            (1, 1, 10, 20, "right", 0, 0, 0, 0, "pass_forward"),
            (1, 1, 10, 25, "right", 0, 0, 0, 0, "qb_sack"),
            (1, 2, 10, 3, "right", 0, 0, 0, 0, "ball_snap"),
            (1, 2, 10, 30, "right", 0, 0, 0, 0, None),
        ]
    )
    ends = normalize.end_frames(df).sort("playId")
    assert ends.rows() == [(1, 1, 20), (1, 2, 30)]


def test_add_time_excludes_plays_without_snap():
    df = _frames(
        [
            (1, 1, 10, 6, "right", 0, 0, 0, 0, "ball_snap"),
            (1, 1, 10, 11, "right", 0, 0, 0, 0, None),
            (1, 9, 10, 1, "right", 0, 0, 0, 0, None),
        ]
    )
    timed, excluded = normalize.add_time(df)
    assert timed["t"].to_list() == [0.0, 0.5]
    assert timed["frame_end"].to_list() == [11, 11]
    assert excluded.rows() == [(1, 9)]


@pytest.mark.parametrize(("raw", "inches"), [("6-4", 76), ("6-0", 72), ("5-11", 71)])
def test_parse_height(raw, inches):
    assert normalize.parse_height(pl.Series([raw])).to_list() == [inches]


def test_yards_to_goal_and_score_diff():
    plays = pl.DataFrame(
        {
            "possessionTeam": ["DEN", "DEN", "LV"],
            "yardlineSide": ["DEN", "LV", "LV"],
            "yardlineNumber": [34, 12, 50],
            "preSnapHomeScore": [7, 7, 7],
            "preSnapVisitorScore": [10, 10, 10],
            "homeTeamAbbr": ["DEN", "DEN", "DEN"],
        }
    )
    out = normalize.add_situation(plays)
    assert out["yards_to_goal"].to_list() == [66, 12, 50]
    assert out["score_diff"].to_list() == [-3, -3, 3]
