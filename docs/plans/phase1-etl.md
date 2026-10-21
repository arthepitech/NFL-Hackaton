# Plan — Phase 1 : ETL

**Question de coach servie** : « Puis-je faire confiance au chiffre ? » Chaque jeu est normalisé (attaque vers la droite, t = 0 au snap) et toutes ses valeurs codées sont valides, avant tout calcul.

## Champs sources (noms exacts)

| Fichier | Champs |
| --- | --- |
| `data/games.csv` | gameId, season, week, gameDate, homeTeamAbbr, visitorTeamAbbr |
| `data/plays.csv` | gameId, playId, quarter, down, yardsToGo, possessionTeam, defensiveTeam, yardlineSide, yardlineNumber, gameClock, preSnapHomeScore, preSnapVisitorScore, passResult, playResult, offenseFormation, personnelO, personnelD, defendersInBox, dropBackType, pff_playAction, pff_passCoverage, pff_passCoverageType, playDescription |
| `data/players.csv` | nflId, height (texte « 6-4 »), weight, birthDate, collegeName, officialPosition, displayName |
| `data/pffScoutingData.csv` | les 15 colonnes |
| `data/tracking/tracking_*.csv` | gameId, playId, nflId, frameId, team, playDirection, x, y, s, a, dis, o, dir, event |

**Champs dérivés** (calculés, jamais inventés) :

| Champ | Calcul |
| --- | --- |
| `height_in` | pieds × 12 + pouces, depuis `height` |
| `t` | (frameId − frame_snap) / 10 |
| `frame_end` | 1re image de fin de dropback (décision 0004) |
| `yards_to_goal` | 100 − yardlineNumber si yardlineSide = possessionTeam, sinon yardlineNumber |
| `score_diff` | score de l'attaque − score de la défense, via homeTeamAbbr |

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `etl/normalize.py` | Fonctions pures : `normalize_direction`, `snap_frames`, `end_frames`, `add_time`, `parse_height` |
| `etl/ingest.py` | Lecture des CSV (`NA` → null), validation des énumérations, écriture Parquet |
| `etl/build.py` | Orchestration (`python -m etl.build`) : `games`, `plays`, `players`, `pff`, `tracking/<gameId>.parquet`, `etl_report.json` |
| `config/settings.py` | Chemins surchargeables par variables d'environnement (Docker) |
| `tests/test_normalize.py` | Retournement, snap de repli, jeu sans snap exclu, hauteur |
| `tests/test_ingest.py` | Valeur codée inconnue → erreur, aller-retour Parquet sur mini-CSV |
| `tests/test_reference_play.py` | 2021101709 / 1444 : snap image 7, sack image 50 (4,3 s), Crosby LEO, chip du TE 47803 |

## Vérification
`make etl` produit `data/processed/` ; `make test` et `make lint` passent.
