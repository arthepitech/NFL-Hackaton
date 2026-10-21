"""Construit une base SQLite à partir des CSV NFL Big Data Bowl.

Usage:
    python3 pipeline/build_db.py [--games N] [--all-tracking]

Par défaut, charge toutes les tables statiques (games, players, plays, scouting)
et le tracking des N premiers matchs (N=4 par défaut) pour maîtriser la taille.
"""
import argparse
import csv
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)              # proposition/
WORKSPACE = os.path.dirname(ROOT)         # NFL-Hackaton/
DATA = os.path.join(WORKSPACE, "data")
DB_PATH = os.path.join(ROOT, "nfl.db")

# csv peut contenir de très grands champs (playDescription)
csv.field_size_limit(10_000_000)


def _num(v):
    """Convertit une valeur CSV en nombre, ou None si vide/NA."""
    if v is None or v == "" or v == "NA":
        return None
    try:
        f = float(v)
        return int(f) if f.is_integer() else f
    except ValueError:
        return None


def _txt(v):
    if v is None or v == "" or v == "NA":
        return None
    return v


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def create_schema(con):
    con.executescript(
        """
        DROP TABLE IF EXISTS games;
        DROP TABLE IF EXISTS players;
        DROP TABLE IF EXISTS plays;
        DROP TABLE IF EXISTS scouting;
        DROP TABLE IF EXISTS tracking;

        CREATE TABLE games (
            gameId INTEGER PRIMARY KEY,
            season INTEGER, week INTEGER,
            gameDate TEXT, gameTimeEastern TEXT,
            homeTeamAbbr TEXT, visitorTeamAbbr TEXT
        );
        CREATE TABLE players (
            nflId INTEGER PRIMARY KEY,
            displayName TEXT, position TEXT,
            height TEXT, weight INTEGER, college TEXT
        );
        CREATE TABLE plays (
            gameId INTEGER, playId INTEGER,
            quarter INTEGER, down INTEGER, yardsToGo INTEGER,
            description TEXT,
            possessionTeam TEXT, defensiveTeam TEXT,
            yardlineSide TEXT, yardlineNumber INTEGER,
            absoluteYardlineNumber INTEGER,
            gameClock TEXT,
            passResult TEXT, playResult INTEGER,
            offenseFormation TEXT, personnelO TEXT, personnelD TEXT,
            passCoverage TEXT, passCoverageType TEXT,
            preSnapHomeScore INTEGER, preSnapVisitorScore INTEGER,
            PRIMARY KEY (gameId, playId)
        );
        CREATE TABLE scouting (
            gameId INTEGER, playId INTEGER, nflId INTEGER,
            role TEXT, positionLinedUp TEXT,
            hit INTEGER, hurry INTEGER, sack INTEGER,
            hitAllowed INTEGER, hurryAllowed INTEGER, sackAllowed INTEGER
        );
        CREATE TABLE tracking (
            gameId INTEGER, playId INTEGER, nflId INTEGER,
            frameId INTEGER, team TEXT, jersey INTEGER,
            x REAL, y REAL, s REAL, dir REAL, o REAL, event TEXT
        );
        """
    )


def load_games(con):
    rows = [
        (
            _num(r["gameId"]), _num(r["season"]), _num(r["week"]),
            _txt(r["gameDate"]), _txt(r["gameTimeEastern"]),
            _txt(r["homeTeamAbbr"]), _txt(r["visitorTeamAbbr"]),
        )
        for r in read_csv(os.path.join(DATA, "games.csv"))
    ]
    con.executemany(
        "INSERT INTO games VALUES (?,?,?,?,?,?,?)", rows
    )
    print(f"  games: {len(rows)}")


def load_players(con):
    rows = [
        (
            _num(r["nflId"]), _txt(r["displayName"]), _txt(r["officialPosition"]),
            _txt(r["height"]), _num(r["weight"]), _txt(r["collegeName"]),
        )
        for r in read_csv(os.path.join(DATA, "players.csv"))
    ]
    con.executemany("INSERT OR IGNORE INTO players VALUES (?,?,?,?,?,?)", rows)
    print(f"  players: {len(rows)}")


def load_plays(con):
    rows = []
    for r in read_csv(os.path.join(DATA, "plays.csv")):
        rows.append((
            _num(r["gameId"]), _num(r["playId"]),
            _num(r["quarter"]), _num(r["down"]), _num(r["yardsToGo"]),
            _txt(r["playDescription"]),
            _txt(r["possessionTeam"]), _txt(r["defensiveTeam"]),
            _txt(r["yardlineSide"]), _num(r["yardlineNumber"]),
            _num(r["absoluteYardlineNumber"]),
            _txt(r["gameClock"]),
            _txt(r["passResult"]), _num(r["playResult"]),
            _txt(r["offenseFormation"]), _txt(r["personnelO"]), _txt(r["personnelD"]),
            _txt(r["pff_passCoverage"]), _txt(r["pff_passCoverageType"]),
            _num(r["preSnapHomeScore"]), _num(r["preSnapVisitorScore"]),
        ))
    con.executemany(
        "INSERT OR IGNORE INTO plays VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        rows,
    )
    print(f"  plays: {len(rows)}")


def load_scouting(con):
    rows = []
    for r in read_csv(os.path.join(DATA, "pffScoutingData.csv")):
        rows.append((
            _num(r["gameId"]), _num(r["playId"]), _num(r["nflId"]),
            _txt(r["pff_role"]), _txt(r["pff_positionLinedUp"]),
            _num(r["pff_hit"]), _num(r["pff_hurry"]), _num(r["pff_sack"]),
            _num(r["pff_hitAllowed"]), _num(r["pff_hurryAllowed"]), _num(r["pff_sackAllowed"]),
        ))
    con.executemany(
        "INSERT INTO scouting VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows
    )
    print(f"  scouting: {len(rows)}")


def load_tracking(con, game_ids):
    total = 0
    for gid in game_ids:
        path = os.path.join(DATA, "tracking", f"tracking_{gid}.csv")
        if not os.path.exists(path):
            print(f"  (tracking manquant pour {gid})")
            continue
        rows = []
        for r in read_csv(path):
            rows.append((
                _num(r["gameId"]), _num(r["playId"]), _num(r["nflId"]),
                _num(r["frameId"]), _txt(r["team"]), _num(r["jerseyNumber"]),
                _num(r["x"]), _num(r["y"]), _num(r["s"]),
                _num(r["dir"]), _num(r["o"]), _txt(r["event"]),
            ))
        con.executemany(
            "INSERT INTO tracking VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows
        )
        total += len(rows)
        print(f"  tracking {gid}: {len(rows)} frames")
    print(f"  tracking total: {total}")


def create_indexes(con):
    con.executescript(
        """
        CREATE INDEX idx_plays_game ON plays(gameId);
        CREATE INDEX idx_scouting_play ON scouting(gameId, playId);
        CREATE INDEX idx_tracking_play ON tracking(gameId, playId);
        CREATE INDEX idx_tracking_game ON tracking(gameId);
        """
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=4,
                    help="Nombre de matchs dont charger le tracking (défaut 4)")
    ap.add_argument("--all-tracking", action="store_true",
                    help="Charger le tracking de TOUS les matchs (volumineux)")
    args = ap.parse_args()

    if not os.path.isdir(DATA):
        print(f"ERREUR: dossier data introuvable: {DATA}", file=sys.stderr)
        sys.exit(1)

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    con = sqlite3.connect(DB_PATH)
    print("Construction de la base...")
    create_schema(con)
    load_games(con)
    load_players(con)
    load_plays(con)
    load_scouting(con)

    all_games = [row[0] for row in con.execute(
        "SELECT gameId FROM games ORDER BY week, gameId"
    ).fetchall()]
    game_ids = all_games if args.all_tracking else all_games[: args.games]
    print(f"Chargement tracking pour {len(game_ids)} match(s)...")
    load_tracking(con, game_ids)

    create_indexes(con)
    con.commit()
    con.close()
    size_mb = os.path.getsize(DB_PATH) / 1e6
    print(f"Terminé -> {DB_PATH} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
