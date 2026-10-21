"""Serveur HTTP (stdlib) : API JSON + fichiers statiques du frontend.

Usage:
    python3 backend/server.py [--port 8000]

Puis ouvrir http://localhost:8000
"""
import argparse
import json
import os
import re
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # proposition/
DB_PATH = os.path.join(ROOT, "nfl.db")
FRONTEND = os.path.join(ROOT, "frontend")

# Explication grand public de chaque schéma de couverture
COVERAGE_EXPLAIN = {
    "Cover-0": "Marquage individuel partout, aucun défenseur en profondeur. Souvent accompagné d'un blitz.",
    "Cover-1": "Marquage individuel avec un seul défenseur libre en profondeur (free safety).",
    "Cover-2": "Deux défenseurs se partagent la profondeur du terrain, principe de zone.",
    "2-Man": "Deux défenseurs en profondeur, mais marquage individuel devant.",
    "Cover-3": "Trois défenseurs couvrent la profondeur, quatre défendent les zones courtes.",
    "Quarters": "Le terrain profond est divisé en quatre quarts, défense très prudente.",
    "Cover-6": "Moitié de terrain en quarts, l'autre moitié en Cover-2.",
    "Bracket": "Deux défenseurs encadrent un même receveur, dessus et dessous.",
    "Goal Line": "Défense spéciale près de la zone d'en-but.",
    "Red Zone": "Couverture spécifique à la zone rouge (proche de l'en-but).",
    "Prevent": "Défense très reculée en fin de match pour éviter le grand jeu.",
    "Miscellaneous": "Schéma qui n'entre dans aucune catégorie classique.",
}

# Couleurs officielles des 32 équipes NFL (primaire, secondaire)
TEAM_COLORS = {
    "ARI": ("#97233F", "#FFB612"), "ATL": ("#A71930", "#000000"),
    "BAL": ("#241773", "#9E7C0C"), "BUF": ("#00338D", "#C60C30"),
    "CAR": ("#0085CA", "#101820"), "CHI": ("#0B162A", "#C83803"),
    "CIN": ("#FB4F14", "#000000"), "CLE": ("#311D00", "#FF3C00"),
    "DAL": ("#003594", "#869397"), "DEN": ("#FB4F14", "#002244"),
    "DET": ("#0076B6", "#B0B7BC"), "GB":  ("#203731", "#FFB612"),
    "HOU": ("#03202F", "#A71930"), "IND": ("#002C5F", "#A2AAAD"),
    "JAX": ("#101820", "#D7A22A"), "KC":  ("#E31837", "#FFB81C"),
    "LA":  ("#003594", "#FFA300"), "LAC": ("#0080C6", "#FFC20E"),
    "LV":  ("#000000", "#A5ACAF"), "MIA": ("#008E97", "#FC4C02"),
    "MIN": ("#4F2683", "#FFC62F"), "NE":  ("#002244", "#C60C30"),
    "NO":  ("#D3BC8D", "#101820"), "NYG": ("#0B2265", "#A71930"),
    "NYJ": ("#125740", "#FFFFFF"), "PHI": ("#004C54", "#A5ACAF"),
    "PIT": ("#FFB612", "#101820"), "SF":  ("#AA0000", "#B3995D"),
    "SEA": ("#002244", "#69BE28"), "TB":  ("#D50A0A", "#34302B"),
    "TEN": ("#0C2340", "#4B92DB"), "WAS": ("#5A1414", "#FFB612"),
}


def team_color(abbr, which=0):
    c = TEAM_COLORS.get((abbr or "").upper())
    if not c:
        return "#888888"
    return c[which]


def connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def rows_to_dicts(cur):
    return [dict(r) for r in cur.fetchall()]


# ---- Handlers d'API ---------------------------------------------------------

def api_games(con, _m):
    cur = con.execute(
        "SELECT gameId, week, gameDate, gameTimeEastern, homeTeamAbbr, visitorTeamAbbr "
        "FROM games ORDER BY week, gameId"
    )
    games = rows_to_dicts(cur)
    # groupe par semaine
    by_week = {}
    for g in games:
        by_week.setdefault(g["week"], []).append(g)
    return {"weeks": [{"week": w, "games": by_week[w]} for w in sorted(by_week)]}


def api_game_plays(con, m):
    gid = int(m.group("gameId"))
    cur = con.execute(
        "SELECT gameId, playId, quarter, down, yardsToGo, description, "
        "possessionTeam, defensiveTeam, passResult, playResult, "
        "offenseFormation, passCoverage, passCoverageType, "
        "preSnapHomeScore, preSnapVisitorScore, gameClock "
        "FROM plays WHERE gameId=? ORDER BY playId",
        (gid,),
    )
    plays = rows_to_dicts(cur)
    # indique si le tracking est disponible pour ce match
    has_tracking = con.execute(
        "SELECT 1 FROM tracking WHERE gameId=? LIMIT 1", (gid,)
    ).fetchone() is not None
    game = con.execute(
        "SELECT homeTeamAbbr, visitorTeamAbbr FROM games WHERE gameId=?", (gid,)
    ).fetchone()
    colors = {}
    if game:
        for t in (game["homeTeamAbbr"], game["visitorTeamAbbr"]):
            colors[t] = {"primary": team_color(t, 0), "secondary": team_color(t, 1)}
    return {"gameId": gid, "hasTracking": has_tracking, "plays": plays, "teamColors": colors}


def api_play_detail(con, m):
    gid, pid = int(m.group("gameId")), int(m.group("playId"))
    play = con.execute("SELECT * FROM plays WHERE gameId=? AND playId=?", (gid, pid)).fetchone()
    if not play:
        return None
    play = dict(play)
    play["coverageExplain"] = COVERAGE_EXPLAIN.get(play.get("passCoverage"), None)
    actors = rows_to_dicts(con.execute(
        "SELECT s.nflId, p.displayName, p.position, s.role, s.positionLinedUp, "
        "s.hit, s.hurry, s.sack "
        "FROM scouting s LEFT JOIN players p ON p.nflId = s.nflId "
        "WHERE s.gameId=? AND s.playId=?",
        (gid, pid),
    ))
    play["actors"] = actors
    return play


def api_play_tracking(con, m):
    gid, pid = int(m.group("gameId")), int(m.group("playId"))
    cur = con.execute(
        "SELECT t.frameId, t.nflId, t.team, t.jersey, t.x, t.y, t.s, t.event, "
        "p.displayName, p.position "
        "FROM tracking t LEFT JOIN players p ON p.nflId = t.nflId "
        "WHERE t.gameId=? AND t.playId=? ORDER BY t.frameId, t.nflId",
        (gid, pid),
    )
    rows = rows_to_dicts(cur)
    if not rows:
        return {"gameId": gid, "playId": pid, "frames": [], "note": "tracking non chargé pour ce match"}
    play = con.execute(
        "SELECT possessionTeam, defensiveTeam FROM plays WHERE gameId=? AND playId=?",
        (gid, pid),
    ).fetchone()
    possession = play["possessionTeam"] if play else None
    # regroupe par frame
    frames = {}
    for r in rows:
        fid = r["frameId"]
        frames.setdefault(fid, {"frameId": fid, "event": None, "players": []})
        if r["event"] and r["event"] != "None":
            frames[fid]["event"] = r["event"]
        side = "ball"
        if r["team"] == possession:
            side = "offense"
        elif r["team"] and r["team"] != "football":
            side = "defense"
        frames[fid]["players"].append({
            "nflId": r["nflId"], "team": r["team"], "jersey": r["jersey"],
            "x": r["x"], "y": r["y"], "s": r["s"], "side": side,
            "name": r["displayName"], "position": r["position"],
        })
    ordered = [frames[f] for f in sorted(frames)]
    defense = play["defensiveTeam"] if play else None
    return {
        "gameId": gid, "playId": pid,
        "possessionTeam": possession,
        "defensiveTeam": defense,
        "colors": {
            "offense": {"primary": team_color(possession, 0), "secondary": team_color(possession, 1)},
            "defense": {"primary": team_color(defense, 0), "secondary": team_color(defense, 1)},
        },
        "frames": ordered,
    }


def api_team_coverage(con, m):
    team = m.group("team").upper()
    cur = con.execute(
        "SELECT passCoverage, passCoverageType, COUNT(*) AS n, "
        "SUM(CASE WHEN passResult='C' THEN 1 ELSE 0 END) AS completions, "
        "AVG(playResult) AS avgYards "
        "FROM plays WHERE defensiveTeam=? AND passCoverage IS NOT NULL "
        "GROUP BY passCoverage ORDER BY n DESC",
        (team,),
    )
    data = rows_to_dicts(cur)
    for d in data:
        d["coverageExplain"] = COVERAGE_EXPLAIN.get(d["passCoverage"])
        d["avgYards"] = round(d["avgYards"], 1) if d["avgYards"] is not None else None
    return {"team": team, "coverage": data}


def api_leaderboard_pressure(con, _m):
    cur = con.execute(
        "SELECT p.nflId, p.displayName, p.position, "
        "SUM(COALESCE(s.hit,0)) AS hits, "
        "SUM(COALESCE(s.hurry,0)) AS hurries, "
        "SUM(COALESCE(s.sack,0)) AS sacks, "
        "SUM(COALESCE(s.hit,0)+COALESCE(s.hurry,0)+COALESCE(s.sack,0)) AS pressure "
        "FROM scouting s JOIN players p ON p.nflId = s.nflId "
        "WHERE s.role='Pass Rush' "
        "GROUP BY s.nflId HAVING pressure > 0 "
        "ORDER BY pressure DESC LIMIT 25"
    )
    return {"leaderboard": rows_to_dicts(cur)}


ROUTES = [
    (re.compile(r"^/api/games$"), api_games),
    (re.compile(r"^/api/games/(?P<gameId>\d+)/plays$"), api_game_plays),
    (re.compile(r"^/api/plays/(?P<gameId>\d+)/(?P<playId>\d+)/tracking$"), api_play_tracking),
    (re.compile(r"^/api/plays/(?P<gameId>\d+)/(?P<playId>\d+)$"), api_play_detail),
    (re.compile(r"^/api/teams/(?P<team>[A-Za-z]+)/coverage$"), api_team_coverage),
    (re.compile(r"^/api/leaderboard/pressure$"), api_leaderboard_pressure),
]

STATIC_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # silencieux

    def _send_json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_static(self, path):
        # sécurité: empêche la traversée de répertoire
        rel = path.lstrip("/")
        if rel == "" or rel == "/":
            rel = "index.html"
        full = os.path.normpath(os.path.join(FRONTEND, rel))
        if not full.startswith(FRONTEND) or not os.path.isfile(full):
            self.send_error(404, "Not found")
            return
        ext = os.path.splitext(full)[1]
        ctype = STATIC_TYPES.get(ext, "application/octet-stream")
        with open(full, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            con = connect()
            try:
                for pattern, handler in ROUTES:
                    match = pattern.match(path)
                    if match:
                        result = handler(con, match)
                        if result is None:
                            self._send_json({"error": "not found"}, 404)
                        else:
                            self._send_json(result)
                        return
                self._send_json({"error": "unknown endpoint"}, 404)
            except Exception as exc:  # renvoie l'erreur en JSON pour le debug
                self._send_json({"error": str(exc)}, 500)
            finally:
                con.close()
            return

        self._send_static(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    if not os.path.exists(DB_PATH):
        raise SystemExit(
            f"Base introuvable: {DB_PATH}\n"
            "Lance d'abord: python3 pipeline/build_db.py"
        )
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"NFL Play Explorer -> http://localhost:{args.port}")
    print("Ctrl+C pour arrêter.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt.")
        server.shutdown()


if __name__ == "__main__":
    main()
