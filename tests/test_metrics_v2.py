import polars as pl
import pytest

from metrics import diagnosis, duel, gap, island, pressure_package, speed

THRESHOLDS = {
    "set_window_s": 0.5,
    "set_min_retreat_yd": 1.0,
    "power_min_retreat_yd": 1.5,
    "power_min_rusher_speed_yd_s": 2.0,
}


def test_island_ignores_standard_double_team_but_not_help():
    blocks = pl.DataFrame(
        {
            "gameId": [1] * 5,
            "playId": [1] * 5,
            "nflId": [10, 11, 12, 13, 14],
            "blockedId": [90, 90, 91, 91, None],
            "pff_blockType": ["PP", "PP", "PP", "CH", "PP"],
        }
    )
    out = island.island_flags(blocks).sort("nflId")
    # 10/11 : double équipe PP + PP → island selon la définition littérale (décision 0005 §2).
    # 12 : aidé par un chip (CH) de 13 → pas island. 13 : l'autre bloqueur (12) est en PP → island.
    assert out["island"].to_list() == [True, True, False, True, None]


def test_max_speed_in_window():
    tracking = pl.DataFrame(
        {
            "gameId": [1] * 5,
            "playId": [1] * 5,
            "nflId": [7] * 5,
            "t": [-0.1, 0.0, 0.5, 1.5, 1.6],
            "s": [9.0, 1.0, 6.0, 7.5, 9.5],
        }
    )
    rushers = pl.DataFrame({"gameId": [1], "playId": [1], "nflId": [7]})
    out = speed.max_speed(tracking, rushers, window=1.5)
    assert out["max_s"].to_list() == [7.5]


def test_play_packages():
    rush = pl.DataFrame(
        {
            "gameId": [1] * 5 + [1] * 6,
            "playId": [1] * 5 + [2] * 6,
            "nflId": list(range(5)) + list(range(6)),
            "pff_positionLinedUp": ["LEO", "DLT", "DRT", "REO", "MLB"]
            + ["LEO", "DLT", "DRT", "REO", "MLB", "SCBL"],
            "pressure_made": [False, True, False, False, False] + [False] * 6,
            "pff_sack": [0, 1, 0, 0, 0] + [0] * 6,
            "ttp": [None, 2.4, 3.0, None, None] + [None] * 6,
        }
    )
    out = pressure_package.play_packages(rush, blitz_min=5, package_max=6).sort("playId")
    assert out["n_rushers"].to_list() == [5, 6]
    assert out["blitz"].to_list() == [True, True]
    assert out["package"].to_list() == ["5", "6+"]
    assert out["pressure"].to_list() == [True, False]
    assert out["sack"].to_list() == [True, False]
    assert out["ttp"].to_list() == [2.4, None]
    assert out["alignments"][0] == "DLT · DRT · LEO · MLB · REO"
    assert pressure_package.package_label(3, 6) == "3 ou moins"


def _gap_tracking(rusher_y):
    """OL en ligne à x = 50 (LT y=30, LG 28, C 26, RG 24, RT 22), TE gauche y=32.
    Le rusher descend de x=53 à x=49 au milieu de y donné."""
    rows = []
    ol = {1: 30.0, 2: 28.0, 3: 26.0, 4: 24.0, 5: 22.0, 6: 32.0}
    for f, rx in enumerate([53, 52, 51, 50, 49]):
        t = f / 10
        for pid, y in ol.items():
            rows.append((1, 1, pid, f, t, 4, 50.0, y))
        rows.append((1, 1, 9, f, t, 4, float(rx), rusher_y))
    return pl.DataFrame(
        rows,
        schema=["gameId", "playId", "nflId", "frameId", "t", "frame_end", "x", "y"],
        orient="row",
    )


@pytest.mark.parametrize(
    ("y", "side", "gap_name"),
    [
        (27.0, "gauche", "A"),
        (29.0, "gauche", "B"),
        (31.0, "gauche", "C"),
        (33.0, "gauche", "Extérieur"),
        (25.0, "droite", "A"),
        (21.0, "droite", "Extérieur"),
    ],
)
def test_pressure_gap(y, side, gap_name):
    ol = pl.DataFrame(
        {"gameId": [1] * 6, "playId": [1] * 6, "nflId": [1, 2, 3, 4, 5, 6],
         "alignment": ["LT", "LG", "C", "RG", "RT", "TE-L"]}
    )  # fmt: skip
    rushers = pl.DataFrame({"gameId": [1], "playId": [1], "rusherId": [9]})
    out = gap.pressure_gaps(_gap_tracking(y), rushers, ol)
    assert out.select("side", "gap", "t_cross").row(0) == (side, gap_name, pytest.approx(0.3))


def test_pressure_gap_falls_back_on_pressure_time():
    # QB remonté devant sa ligne : le rusher l'atteint sans franchir la profondeur des OL.
    tracking = _gap_tracking(31.0).with_columns(
        pl.when(pl.col("nflId") == 9).then(pl.lit(51.0)).otherwise(pl.col("x")).alias("x")
    )
    ol = pl.DataFrame(
        {"gameId": [1] * 6, "playId": [1] * 6, "nflId": [1, 2, 3, 4, 5, 6],
         "alignment": ["LT", "LG", "C", "RG", "RT", "TE-L"]}
    )  # fmt: skip
    rushers = pl.DataFrame({"gameId": [1], "playId": [1], "rusherId": [9], "ttp": [0.2]})
    out = gap.pressure_gaps(tracking, rushers, ol)
    assert out.select("side", "gap", "t_cross").row(0) == ("gauche", "C", pytest.approx(0.2))


def test_pressure_gap_not_measurable_without_crossing():
    tracking = _gap_tracking(27.0).with_columns(
        pl.when(pl.col("nflId") == 9).then(pl.lit(60.0)).otherwise(pl.col("x")).alias("x")
    )
    ol = pl.DataFrame(
        {"gameId": [1] * 5, "playId": [1] * 5, "nflId": [1, 2, 3, 4, 5],
         "alignment": ["LT", "LG", "C", "RG", "RT"]}
    )  # fmt: skip
    rushers = pl.DataFrame({"gameId": [1], "playId": [1], "rusherId": [9]})
    assert gap.pressure_gaps(tracking, rushers, ol)["gap"].to_list() == [None]


def _duel(blocker_x, rusher_y, qb_x=45.0):
    rows = []
    for f, bx in enumerate(blocker_x):
        t = f / 10
        rows += [
            (1, 1, 1, f, t, 20, 45.0 if qb_x is None else qb_x, 26.0, 0.0, 0.0, 0.0),
            (1, 1, 2, f, t, 20, bx, 22.0, 0.0, 90.0, 0.0),
            (1, 1, 3, f, t, 20, bx + 1.0 - 0.3 * f, rusher_y, 4.0, 0.0, 270.0),
        ]
    cols = ["gameId", "playId", "nflId", "frameId", "t", "frame_end", "x", "y", "s", "o", "dir"]
    tracking = pl.DataFrame(rows, schema=cols, orient="row")
    pairs = pl.DataFrame({"gameId": [1], "playId": [1], "blockerId": [2], "rusherId": [3]})
    qbs = pl.DataFrame({"gameId": [1], "playId": [1], "qbId": [1]})
    return duel.duel_frames(tracking, pairs, qbs)


def test_duel_features():
    frames = _duel([50.0 - 0.1 * f for f in range(12)], rusher_y=20.0)
    defeats = pl.DataFrame(
        {"gameId": [1], "playId": [1], "blockerId": [2], "rusherId": [3], "defeat_t": [1.0]}
    )
    f = duel.duel_features(frames, defeats, set_window=0.5).row(0, named=True)
    assert f["set_retreat"] == pytest.approx(0.5)
    assert f["power_retreat"] == pytest.approx(1.0)
    assert f["rusher_s_defeat"] == pytest.approx(4.0)
    assert f["outside_win"] is True


def test_diagnose_priorities_and_reasons():
    df = pl.DataFrame(
        {
            "pff_blockType": ["SW", "PP", "PP", "PP", "PP"],
            "n_blockers_on_defender": [2, 1, 1, 1, 1],
            "defeat_t": [1.0, 1.0, 2.0, 2.0, None],
            "pff_loss": [True, True, True, False, False],
            "set_retreat": [1.5, 0.4, 1.5, 1.5, None],
            "outside_win": [True, True, False, False, None],
            "power_retreat": [0.0, 0.0, 2.0, 0.5, None],
            "rusher_s_defeat": [3.0, 3.0, 3.0, 3.0, None],
        }
    )
    out = df.with_columns(diagnosis.diagnose(THRESHOLDS))
    assert out["cause"].to_list() == ["Switch / stunt", "Set", "Puissance", "Indéterminé", None]
    assert "recul 0.4 yd" in out["reason"][1]
