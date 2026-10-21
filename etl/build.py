"""ETL : CSV bruts (lecture seule) → Parquet dans data/processed/. `python -m etl.build`."""

import json
import sys
from pathlib import Path

from config import settings
from etl import ingest, normalize, snaps


def run(raw_dir: Path, out_dir: Path) -> dict:
    (out_dir / "tracking").mkdir(parents=True, exist_ok=True)

    games = ingest.read_games(raw_dir / "games.csv")
    plays = ingest.read_plays(raw_dir / "plays.csv").join(
        games.select("gameId", "season", "week", "homeTeamAbbr", "visitorTeamAbbr"),
        on="gameId",
        how="left",
    )
    plays = normalize.add_situation(plays)
    players = ingest.read_players(raw_dir / "players.csv")
    players = players.with_columns(normalize.parse_height(players["height"]))
    pff = ingest.read_pff(raw_dir / "pffScoutingData.csv")

    games.write_parquet(out_dir / "games.parquet")
    plays.write_parquet(out_dir / "plays.parquet")
    players.write_parquet(out_dir / "players.parquet")
    pff.write_parquet(out_dir / "pff.parquet")

    excluded = []
    files = sorted((raw_dir / "tracking").glob("tracking_*.csv"))
    for path in files:
        raw = ingest.read_tracking(path)
        timed, missing = normalize.add_time(normalize.normalize_direction(raw))
        game_id = path.stem.removeprefix("tracking_")
        timed.drop("time").write_parquet(out_dir / "tracking" / f"{game_id}.parquet")
        excluded.extend(missing.rows())
        print(f"tracking {game_id}: {timed.height} lignes", file=sys.stderr)

    ol, dl = snaps.build_snaps(out_dir, settings.load_thresholds())

    report = {
        "plays": plays.height,
        "pff_rows": pff.height,
        "players": players.height,
        "tracking_games": len(files),
        "snaps_ol": ol.height,
        "snaps_dl": dl.height,
        "plays_without_snap": [list(r) for r in excluded],
    }
    (out_dir / "etl_report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":  # pragma: no cover
    result = run(settings.RAW_DIR, settings.PROCESSED_DIR)
    print(json.dumps({k: v for k, v in result.items() if k != "plays_without_snap"}))
    print(f"jeux sans snap exclus du tracking : {len(result['plays_without_snap'])}")
