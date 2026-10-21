# Changelog

## [Non publié]

### Ajouté — Phase 2 (MVP)
- **Métriques** (`metrics/`) :
  - alignement bloqueur / rusher / QB image par image ;
  - TTP, instant de défaite, PBWR PFF et tracking, Pressure Rate.
- **Snaps précalculés** : `snaps_ol.parquet` et `snaps_dl.parquet`, générés par `make etl`.
- **`make check-metrics`** : recalcul indépendant sur 20 jeux au hasard, plus l'alerte d'écart PBWR PFF / tracking.
- **API** (`/api/meta`, `/api/players`, Scout Card, jeux d'un chiffre, défaites, semaines, jeu, duel) :
  - tous les filtres de situation ;
  - bornes des filtres dans `config/filters.yaml`.
- **Interface** :
  - Scout Card OL : chiffres cliquables, `n snaps`, grisé sous le seuil, top / bottom 10 % avec légende ;
  - filtres permanents et liste des défaites triées ;
  - Play Lab : C1 terrain animé, C2 poche, C3 timeline, J3 lecteur factice avec calque ;
  - J1 carte joueur mobile ;
  - liens directs (`?vue=playlab&match=…`).
- **Docker** : `api/Dockerfile`, `ui/Dockerfile`, `docker-compose.yml`, cibles `make docker-*`.
- **Décision 0004** : fenêtre de dropback, défaite par franchissement, filtres, Docker.

### Ajouté — Phase 1 (ETL)
- `etl/` : ingestion CSV → Parquet, normalisation `playDirection`, recalage sur le snap, validation des valeurs codées, rapport `etl_report.json`.
- Test de non-régression sur le jeu de référence 2021101709 / 1444 (sack de Crosby, table 2 de STRAIN).

### Ajouté — Phase 0
- `pyproject.toml`, `Makefile`, `config/enums.py`, `config/thresholds.yaml`, squelettes, UI Vite + React + TS + D3 + react-three-fiber, CI GitHub Actions.
- Décisions 0001 à 0003.

### Modifié
- `data/` ignoré par git et retiré de l'index.
- `config/settings.py` : chemins surchargeables par variables d'environnement (Docker).
