import polars as pl
import pytest

from metrics import defeat, duel, pbwr, pressure, ttp

KEYS = ["gameId", "playId", "blockerId", "rusherId"]


def _tracking(positions, frame_end=6, snap_frame=1):
    """positions : {nflId: [(x, y), ...]} une entrée par image à partir de l'image 1."""
    rows = []
    for nfl_id, path in positions.items():
        for i, (x, y) in enumerate(path, start=1):
            rows.append(
                {
                    "gameId": 1,
                    "playId": 1,
                    "nflId": nfl_id,
                    "frameId": i,
                    "t": (i - snap_frame) / 10,
                    "frame_end": frame_end,
                    "x": float(x),
                    "y": float(y),
                    "s": float(i),
                    "o": 90.0,
                    "dir": 270.0,
                }
            )
    return pl.DataFrame(rows)


# QB fixe en x=50. Bloqueur fixe en x=53. Le rusher part de x=56 et avance de 1 yd par image.
QB, OL, DL = 1, 2, 3
POSITIONS = {
    QB: [(50, 26)] * 8,
    OL: [(53, 26)] * 8,
    DL: [(56 - i, 26.5) for i in range(8)],
}
PAIRS = pl.DataFrame({"gameId": [1], "playId": [1], "blockerId": [OL], "rusherId": [DL]})
QBS = pl.DataFrame({"gameId": [1], "playId": [1], "qbId": [QB]})


@pytest.fixture
def frames():
    return duel.duel_frames(_tracking(POSITIONS), PAIRS, QBS)


def test_duel_frames_geometry(frames):
    f = frames.sort("frameId")
    assert f["d_qb"][0] == pytest.approx((6**2 + 0.5**2) ** 0.5)
    assert f["depth_gap"].to_list()[:2] == [3.0, 3.0]
    assert f["shoulder_angle"][0] == pytest.approx(180.0)
    # Image 5 : rusher en x=52, derrière la ligne des épaules du bloqueur (x=53) côté QB.
    assert f.filter(pl.col("frameId") == 4)["past_shoulders"][0] is False
    assert f.filter(pl.col("frameId") == 5)["past_shoulders"][0] is True
    # Fenêtre : 0 < t ≤ t_end (frame_end = 6).
    assert f.filter(pl.col("in_window"))["frameId"].to_list() == [2, 3, 4, 5, 6]


def test_time_to_pressure(frames):
    # d < 1.5 dès que le rusher est en x ≤ 51.4 → image 6 (x=51 → d≈1.118), t = 0.5.
    out = ttp.time_to_pressure(frames, KEYS, radius=1.5)
    assert out["ttp"].to_list() == [pytest.approx(0.5)]


def test_no_pressure_after_end_of_dropback():
    frames = duel.duel_frames(_tracking(POSITIONS, frame_end=4), PAIRS, QBS)
    assert ttp.time_to_pressure(frames, KEYS, radius=1.5)["ttp"].to_list() == [None]
    assert defeat.defeat_time(frames, KEYS)["defeat_t"].to_list() == [None]


def test_defeat_time(frames):
    assert defeat.defeat_time(frames, KEYS)["defeat_t"].to_list() == [pytest.approx(0.4)]


def test_defeat_needs_a_crossing_from_the_snap():
    # Rusher déjà au-delà des épaules au snap (aligné à l'intérieur, axe bloqueur → QB latéral) :
    # aucun franchissement possible, défaite non mesurable (décision 0004 §2).
    pos = {QB: [(50, 26)] * 3, OL: [(53, 26)] * 3, DL: [(52, 20), (52, 20), (51, 26)]}
    frames = duel.duel_frames(_tracking(pos, frame_end=3), PAIRS, QBS)
    assert defeat.defeat_time(frames, KEYS)["defeat_t"].to_list() == [None]


def test_rusher_frames_and_ttp():
    rushers = pl.DataFrame({"gameId": [1], "playId": [1], "rusherId": [DL]})
    frames = duel.rusher_frames(_tracking(POSITIONS), rushers, QBS)
    out = ttp.time_to_pressure(frames, ["gameId", "playId", "rusherId"], radius=1.5)
    assert out["ttp"].to_list() == [pytest.approx(0.5)]


def test_pbwr_pff_loss_flag():
    df = pl.DataFrame(
        {
            "pff_hurryAllowed": [0, 1, 0, 0, 0],
            "pff_hitAllowed": [0, 0, 1, 0, 0],
            "pff_sackAllowed": [0, 0, 0, 1, 0],
            "pff_beatenByDefender": [0, 0, 0, 0, 1],
        }
    )
    assert df.select(pbwr.pff_loss())["pff_loss"].to_list() == [False, True, True, True, True]


def test_tracking_loss_uses_win_window():
    df = pl.DataFrame({"ttp": [None, 1.0, 2.5, 2.6]})
    out = df.select(pbwr.tracking_loss(win_window=2.5))["tracking_loss"].to_list()
    assert out == [False, True, True, False]


def test_win_rate_counts_n_and_ignores_null():
    df = pl.DataFrame({"nflId": [7, 7, 7, 7, 8], "loss": [True, False, False, None, False]})
    out = pbwr.win_rate(df, "loss", by=["nflId"]).sort("nflId")
    assert out.rows() == [(7, 3, pytest.approx(2 / 3)), (8, 1, 1.0)]


def test_pressure_flags_and_rate():
    df = pl.DataFrame(
        {
            "nflId": [7, 7, 7, 7],
            "pff_hurryAllowed": [1, 0, 0, 0],
            "pff_hitAllowed": [0, 1, 0, 0],
            "pff_sackAllowed": [0, 0, 0, 0],
            "pff_hurry": [None, None, None, None],
        }
    )
    flagged = df.with_columns(pressure.pressure_allowed())
    assert flagged["pressure_allowed"].to_list() == [True, True, False, False]
    out = pressure.pressure_rate(flagged, "pressure_allowed", by=["nflId"])
    assert out.rows() == [(7, 4, 0.5)]
    rush = pl.DataFrame({"pff_hurry": [1, 0], "pff_hit": [0, 0], "pff_sack": [0, 1]})
    assert rush.select(pressure.pressure_made())["pressure_made"].to_list() == [True, True]
