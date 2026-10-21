# Mission : construire « Trench Lab », l'outil d'analyse NFL pour coachs, joueurs et recruteurs

## Contexte
Tu travailles dans ce dépôt. Trois documents font foi, dans cet ordre de priorité :
1. `CLAUDE.md` : règles et process obligatoires. Tu les suis à la lettre.
2. `docs/cahier-des-besoins.md` : besoins fonctionnels, métriques, exigences priorisées.
3. `docs/VISUALISATIONS.md` : catalogue des visuels 2D/3D (C1–C13, J1–J7, R1–R8) et leur priorité.

Lis les trois en entier avant toute action. Ensuite, résume en 10 lignes maximum ce que tu as compris :
- les 3 niveaux ;
- les 3 publics ;
- l'ordre MVP → V2 → V3 ;
- les interdits sur les données.

Attends ma validation de ce résumé avant d'écrire du code.

## Données
- Jeu de prototype : NFL Big Data Bowl 2023 sur Kaggle (`nfl-big-data-bowl-2023`), téléchargé avec la CLI Kaggle (`kaggle competitions download -c nfl-big-data-bowl-2023`) dans `data/raw/`.
- Si les identifiants Kaggle manquent (`~/.kaggle/kaggle.json` ou `KAGGLE_USERNAME` / `KAGGLE_KEY`), arrête-toi et demande-les-moi. Ne contourne jamais ce blocage.
- Ne commite jamais les données. Ajoute `data/` au `.gitignore` dès la première étape.

## Déroulé imposé

### Phase 0 — Fondations
- Arborescence de la section 6 de `CLAUDE.md`.
- Outils du projet :
  - `pyproject.toml` (Python 3.12, Polars, DuckDB, FastAPI, pytest, ruff) ;
  - `ui/` en React + TypeScript (Vite), D3, react-three-fiber.
- `Makefile` avec les cibles `install`, `data`, `etl`, `test`, `lint`, `check-metrics`, `api`, `ui`.
- Configuration : `config/enums.py` et `config/thresholds.yaml`, avec les valeurs exactes de `CLAUDE.md`.
- CI GitHub Actions : lint + tests.

### Phase 1 — ETL
- Ingestion des CSV vers Parquet dans `data/processed/`.
- Normalisation `playDirection` et recalage du temps sur `ball_snap`.
- Jointures uniquement par `gameId` / `playId` / `nflId`.
- Validation des valeurs codées : une valeur inconnue lève une erreur.
- Tests, dont le jeu de référence Raiders–Broncos, semaine 6 2021 : sack de Maxx Crosby sur Teddy Bridgewater.

### Phase 2 — MVP
- Métriques : PBWR (version PFF et version tracking), Time-to-Pressure, instant de défaite, Pressure Rate.
- API FastAPI avec tous les filtres de situation.
- Interface :
  - Scout Card OL ;
  - visuels C1 (terrain animé), C2 (poche dynamique), C3 (timeline du duel) ;
  - liste des défaites triées ;
  - J1 (carte joueur) et J3 (clip + calque ; utilise un lecteur factice tant que la vidéo n'est pas branchée).
- Critère de sortie : chiffres identiques au recalcul manuel sur 20 jeux tirés au hasard. Le script de vérification est dans `make check-metrics`.
- **STOP** : présente-moi le MVP (captures d'écran + rapport `check-metrics`) et attends ma validation.

### Phase 3 — V2 (seulement après ma validation)
- Fonctionnalités V2 du cahier :
  - matrice OL × DL ;
  - couverture × situation ;
  - paquets de pression ;
  - diagnostic assisté avec confirmation et correction par le coach ;
  - interface de synchronisation vidéo.
- Visuels C4–C9, J2, J4, J5, R1–R3.
- **STOP** : présente, puis attends ma validation.

### Phase 4 — V3 (seulement après ma validation)
- Module Scout : Combine × match. Le jeu BDB 2027 n'est peut-être pas encore accessible ; dans ce cas, prépare le schéma et un connecteur vide, et signale-le.
- Badges, rapport PDF.
- Visuels 3D C10–C13, J6–J7, R7–R8, chacun avec son équivalent 2D par défaut.
- **STOP** : présente le bilan final.

## Règles de travail
- Pour chaque fonctionnalité, applique les 10 étapes de la section 2 de `CLAUDE.md` : plan dans `docs/plans/`, tests d'abord, etc.
- Tiens une liste de tâches à jour et coche au fur et à mesure.
- Commits atomiques en français, au format `feat(metrics): ajoute le Time-to-Pressure`.
- Si une donnée, un champ ou une règle manque ou se contredit : pose la question, n'invente rien.
- À la fin de chaque phase, fais un résumé de 5 lignes maximum :
  - ce qui est fait ;
  - ce qui reste ;
  - les écarts avec le cahier ;
  - les décisions prises, consignées dans `docs/decisions/`.

Commence maintenant par la lecture des trois documents et ton résumé.