# Architecture — NFL Play Explorer

Interface grand public pour explorer les données NFL Big Data Bowl 2021 (Semaines 1-8).
Objectif : rendre les données de tracking et de scouting lisibles et agréables pour un public non expert.

## Contrainte technique

L'environnement ne dispose ni de Node.js ni de packages Python tiers.
Choix : **100% Python standard library** (zéro `pip install`).

- Stockage : `sqlite3` (stdlib)
- Backend : `http.server` (stdlib) exposant une API JSON + serveur de fichiers statiques
- Frontend : HTML / CSS / JavaScript vanilla (Canvas pour l'animation de terrain)
- Pipeline : `csv` + `sqlite3` (stdlib)

## Flux de données

```
data/*.csv  ──►  pipeline/build_db.py  ──►  proposition/nfl.db (SQLite)
                                                   │
                                      backend/server.py (API JSON)
                                                   │
                                      frontend/ (HTML/CSS/JS, Canvas)
```

Le tracking brut (10 Hz × 22 joueurs) est volumineux. Le pipeline pré-agrège :
- Les frames d'un play sont stockées compactées (une ligne par frame avec positions de tous les acteurs) à la demande.
- Une table `plays` enrichie (coverage, résultat, formation, équipes).

## Tables SQLite

- `games(gameId, season, week, gameDate, homeTeamAbbr, visitorTeamAbbr)`
- `players(nflId, displayName, position, height, weight, college)`
- `plays(gameId, playId, quarter, down, yardsToGo, description, possessionTeam, defensiveTeam, passResult, playResult, offenseFormation, passCoverage, passCoverageType, preSnapHomeScore, preSnapVisitorScore)`
- `scouting(gameId, playId, nflId, role, positionLinedUp, hit, hurry, sack, hitAllowed, hurryAllowed, sackAllowed)`
- `tracking(gameId, playId, nflId, frameId, team, x, y, s, event)` — seulement pour les games chargés

Pour maîtriser la taille, le pipeline ne charge le tracking que d'un sous-ensemble de games par défaut (configurable).

## API Endpoints

| Route | Description |
|-------|-------------|
| `GET /api/games` | Matchs groupés par semaine |
| `GET /api/games/{gameId}/plays` | Plays d'un match |
| `GET /api/plays/{gameId}/{playId}` | Détail play + acteurs |
| `GET /api/plays/{gameId}/{playId}/tracking` | Frames de tracking |
| `GET /api/teams/{team}/coverage` | Distribution couverture |
| `GET /api/leaderboard/pressure` | Top pass rushers |

## Vues frontend

1. **Match Explorer** — choix semaine / match, liste des plays
2. **Play Visualizer** — animation Canvas frame-by-frame sur terrain NFL
3. **Coverage Breakdown** — stats de couverture par équipe
4. **Pressure Meter** — leaderboard pass rush

## Structure

```
proposition/
├── specs/
├── pipeline/build_db.py
├── backend/server.py
├── frontend/{index.html, app.js, style.css}
├── nfl.db            (généré)
└── README.md
```
