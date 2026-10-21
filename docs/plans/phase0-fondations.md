# Plan — Phase 0 : Fondations

**Question de coach servie** : aucune directement. On pose le socle pour que chaque chiffre de la Scout Card soit reproductible, testé et paramétré.

## Champs sources
Aucun calcul en Phase 0. `config/enums.py` reprend les valeurs observées dans `data/`, voir `docs/decisions/0002`.

## Fichiers créés

| Fichier | Contenu |
| --- | --- |
| `pyproject.toml` | Python 3.12. Dépendances : polars, duckdb, pyarrow, pyyaml, fastapi, uvicorn. Dev : pytest, pytest-cov, ruff, httpx. Config ruff et pytest (`--cov-fail-under=90` sur `metrics/` et `etl/`) |
| `Makefile` | Cibles `install`, `data`, `etl`, `test`, `lint`, `check-metrics`, `api`, `ui` |
| `config/__init__.py`, `config/enums.py` | `BLOCK_TYPES`, `PASS_COVERAGES`, `PFF_ROLES`, `PASS_RESULTS`, `PASS_COVERAGE_TYPES`, `DROPBACK_TYPES`, `SNAP_EVENTS`, et `validate_enum(col, values)`, qui lève `UnknownCodedValueError` |
| `config/thresholds.yaml` | Valeurs exactes de `CLAUDE.md` §5 |
| `config/settings.py` | `load_thresholds()`, chemins `data/`, `data/tracking/`, `data/processed/` (décision 0001) |
| `etl/`, `metrics/`, `api/` | `__init__.py` vides |
| `tests/test_config.py` | Seuils = valeurs §5 ; valeur inconnue lève une erreur ; `NA` accepté ; toutes les valeurs réelles de `pffScoutingData.csv` et `plays.csv` passent (test sur données réelles, ignoré si `data/` est absent, comme en CI) |
| `ui/` | Vite + React + TypeScript, d3, three, @react-three/fiber, mode sombre par défaut, page vide « Trench Lab » |
| `.github/workflows/ci.yml` | Job Python (ruff + pytest) et job UI (`npm ci`, `tsc`, `eslint`, `vitest`) |
| `docs/metrics.md`, `CHANGELOG.md` | Squelettes |
| `docs/decisions/0003-dependances.md` | Justifie pyarrow (écriture Parquet) et pyyaml (lecture des seuils), absents de la stack de §6 |

## Décisions dans ce plan
- Les tests sur données réelles sont marqués `@pytest.mark.realdata`. La CI n'a pas les données sous licence : ils y sont ignorés, et ils tournent en local.
- `make data` vérifie la présence de `data/` : 4 CSV et 122 fichiers dans `data/tracking/`. Il ne télécharge rien (décision 0001).

## Vérification
`make install && make lint && make test` passent ; `make ui` démarre.
`make check-metrics` reste une cible qui échoue explicitement (« pas encore implémenté ») jusqu'à la Phase 2.
