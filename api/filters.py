"""Filtres de situation permanents (CLAUDE.md §7). Bornes dans config/filters.yaml."""

import polars as pl
from fastapi import Query
from pydantic import BaseModel


class FilterParams(BaseModel):
    down: list[int] = []
    distance: list[str] = []
    quarter: list[int] = []
    score: list[str] = []
    red_zone: bool | None = None
    formation: list[str] = []
    personnel_o: list[str] = []
    personnel_d: list[str] = []
    coverage: list[str] = []
    play_action: bool | None = None
    dropback: list[str] = []
    opponent: list[str] = []
    week_min: int | None = None
    week_max: int | None = None


def filter_params(
    down: list[int] = Query([]),
    distance: list[str] = Query([]),
    quarter: list[int] = Query([]),
    score: list[str] = Query([]),
    red_zone: bool | None = None,
    formation: list[str] = Query([]),
    personnel_o: list[str] = Query([]),
    personnel_d: list[str] = Query([]),
    coverage: list[str] = Query([]),
    play_action: bool | None = None,
    dropback: list[str] = Query([]),
    opponent: list[str] = Query([]),
    week_min: int | None = None,
    week_max: int | None = None,
) -> FilterParams:
    return FilterParams(**locals())


def _buckets(col: str, names: list[str], bounds: dict) -> pl.Expr:
    return pl.any_horizontal([pl.col(col).is_between(bounds[n][0], bounds[n][1]) for n in names])


def apply_filters(df: pl.DataFrame, f: FilterParams, cfg: dict) -> pl.DataFrame:
    cond = [pl.lit(True)]
    simple = {
        "down": "down",
        "quarter": "quarter",
        "formation": "offenseFormation",
        "personnel_o": "personnelO",
        "personnel_d": "personnelD",
        "coverage": "pff_passCoverage",
        "dropback": "dropBackType",
        "opponent": "defensiveTeam",
    }
    for param, col in simple.items():
        values = getattr(f, param)
        if values:
            cond.append(pl.col(col).is_in(values))
    if f.distance:
        cond.append(_buckets("yardsToGo", f.distance, cfg["distance_buckets"]))
    if f.score:
        cond.append(_buckets("score_diff", f.score, cfg["score_buckets"]))
    if f.red_zone is not None:
        cond.append((pl.col("yards_to_goal") <= cfg["red_zone_yards"]) == f.red_zone)
    if f.play_action is not None:
        cond.append((pl.col("pff_playAction") == 1) == f.play_action)
    if f.week_min is not None:
        cond.append(pl.col("week") >= f.week_min)
    if f.week_max is not None:
        cond.append(pl.col("week") <= f.week_max)
    return df.filter(pl.all_horizontal(cond))
