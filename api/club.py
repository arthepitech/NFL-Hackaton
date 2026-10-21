"""Données du staff (tags du coach, playlists, index vidéo) : DuckDB local, jamais commité.

Fichier : data/processed/club.duckdb (décision 0005 §7).
"""

from pathlib import Path

import duckdb

SCHEMA = """
CREATE SEQUENCE IF NOT EXISTS seq_playlist;
CREATE SEQUENCE IF NOT EXISTS seq_item;
CREATE TABLE IF NOT EXISTS coach_tags (
    gameId BIGINT, playId BIGINT, nflId BIGINT,
    proposed VARCHAR, cause VARCHAR, comment VARCHAR, author VARCHAR,
    updated_at TIMESTAMP DEFAULT current_timestamp,
    PRIMARY KEY (gameId, playId, nflId)
);
CREATE TABLE IF NOT EXISTS playlists (
    id BIGINT PRIMARY KEY DEFAULT nextval('seq_playlist'),
    name VARCHAR, player_id BIGINT, author VARCHAR,
    created_at TIMESTAMP DEFAULT current_timestamp
);
CREATE TABLE IF NOT EXISTS playlist_items (
    id BIGINT PRIMARY KEY DEFAULT nextval('seq_item'),
    playlist_id BIGINT, gameId BIGINT, playId BIGINT, nflId BIGINT,
    t DOUBLE, comment VARCHAR
);
CREATE TABLE IF NOT EXISTS video_clips (
    gameId BIGINT, playId BIGINT, angle VARCHAR, url VARCHAR, snap_offset_s DOUBLE,
    PRIMARY KEY (gameId, playId, angle)
);
"""


class Club:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.con = duckdb.connect(str(path))
        self.con.execute(SCHEMA)

    def _rows(self, sql: str, params: list) -> list[dict]:
        cur = self.con.execute(sql, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, r, strict=True)) for r in cur.fetchall()]

    # --- Diagnostic : le coach confirme ou corrige la cause probable ---
    def set_tag(self, game_id, play_id, nfl_id, *, proposed, cause, comment, author) -> None:
        self.con.execute(
            "INSERT OR REPLACE INTO coach_tags "
            "(gameId, playId, nflId, proposed, cause, comment, author, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, current_timestamp)",
            [game_id, play_id, nfl_id, proposed, cause, comment, author],
        )

    def get_tag(self, game_id, play_id, nfl_id) -> dict | None:
        rows = self._rows(
            "SELECT proposed, cause, comment, author, cause = proposed AS confirmed "
            "FROM coach_tags WHERE gameId = ? AND playId = ? AND nflId = ?",
            [game_id, play_id, nfl_id],
        )
        return rows[0] if rows else None

    def tag_names(self) -> list[str]:
        return [r["cause"] for r in self._rows("SELECT DISTINCT cause FROM coach_tags", [])]

    # --- Playlists annotées (J5) ---
    def create_playlist(self, name: str, *, player_id: int, author: str) -> int:
        return self.con.execute(
            "INSERT INTO playlists (name, player_id, author) VALUES (?, ?, ?) RETURNING id",
            [name, player_id, author],
        ).fetchone()[0]

    def add_item(self, playlist_id, *, game_id, play_id, nfl_id, t, comment) -> int:
        return self.con.execute(
            "INSERT INTO playlist_items (playlist_id, gameId, playId, nflId, t, comment) "
            "VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
            [playlist_id, game_id, play_id, nfl_id, t, comment],
        ).fetchone()[0]

    def delete_item(self, item_id: int) -> None:
        self.con.execute("DELETE FROM playlist_items WHERE id = ?", [item_id])

    def playlists(self, *, player_id: int) -> list[dict]:
        lists = self._rows(
            "SELECT id, name, author FROM playlists WHERE player_id = ? ORDER BY id", [player_id]
        )
        for p in lists:
            p["items"] = self._rows(
                "SELECT id, gameId, playId, nflId, t, comment FROM playlist_items "
                "WHERE playlist_id = ? ORDER BY id",
                [p["id"]],
            )
        return lists

    # --- Index vidéo (synchro sur le snap, décision 0005 §8) ---
    def set_clip(self, game_id, play_id, *, angle, url, snap_offset_s) -> None:
        self.con.execute(
            "INSERT OR REPLACE INTO video_clips VALUES (?, ?, ?, ?, ?)",
            [game_id, play_id, angle, url, snap_offset_s],
        )

    def clips(self, game_id, play_id) -> list[dict]:
        return self._rows(
            "SELECT angle, url, snap_offset_s FROM video_clips "
            "WHERE gameId = ? AND playId = ? ORDER BY angle",
            [game_id, play_id],
        )
