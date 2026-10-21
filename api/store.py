"""Accès en lecture aux Parquet de data/processed/ (chargés une fois, filtrés en mémoire)."""

from datetime import date
from functools import cached_property
from pathlib import Path

import polars as pl

from api.club import Club
from config import settings
from config.enums import OL_POSITIONS


class Store:
    def __init__(self, processed_dir: Path):
        self.dir = processed_dir
        self.thresholds = settings.load_thresholds()
        self.filters = settings.load_filters()

    @cached_property
    def snaps_ol(self) -> pl.DataFrame:
        return pl.read_parquet(self.dir / "snaps_ol.parquet")

    @cached_property
    def snaps_dl(self) -> pl.DataFrame:
        return pl.read_parquet(self.dir / "snaps_dl.parquet")

    @cached_property
    def pff(self) -> pl.DataFrame:
        return pl.read_parquet(self.dir / "pff.parquet")

    @cached_property
    def players(self) -> pl.DataFrame:
        return pl.read_parquet(self.dir / "players.parquet")

    @cached_property
    def plays(self) -> pl.DataFrame:
        return pl.read_parquet(self.dir / "plays.parquet")

    @cached_property
    def plays_rush(self) -> pl.DataFrame:
        return pl.read_parquet(self.dir / "plays_rush.parquet")

    @cached_property
    def club(self) -> Club:
        return Club(self.dir / "club.duckdb")

    @cached_property
    def season_start(self) -> date:
        games = pl.read_parquet(self.dir / "games.parquet")
        return games["gameDate"].str.strptime(pl.Date, "%m/%d/%Y").min()

    @cached_property
    def ol_ids(self) -> list[int]:
        ol = self.players.filter(pl.col("officialPosition").is_in(OL_POSITIONS))
        return ol["nflId"].to_list()

    def tracking(self, game_id: int, play_id: int) -> pl.DataFrame:
        path = self.dir / "tracking" / f"{game_id}.parquet"
        if not path.exists():
            return pl.DataFrame()
        return pl.read_parquet(path).filter(pl.col("playId") == play_id)
