# Tâches — Trench Lab

## Phase 0 — Fondations
- [x] Lecture CLAUDE.md, cahier des besoins, VISUALISATIONS ; résumé
- [x] Données : données laissées dans `data/`, `.gitignore`, retrait de l'index git (décision 0001)
- [x] Profilage des données et écarts consignés (décision 0002)
- [x] Plan Phase 0 (`docs/plans/phase0-fondations.md`)
- [x] Validation du plan Phase 0 (consigne : décider seul, comparer aux données)
- [x] `pyproject.toml` + `Makefile`
- [x] `config/enums.py`, `config/thresholds.yaml` + tests
- [x] Squelette `etl/`, `metrics/`, `api/`, `tests/`
- [x] `ui/` Vite + React + TS + D3 + r3f
- [x] CI GitHub Actions
- [x] Résumé Phase 0

## Phase 1 — ETL
- [x] Plan (`docs/plans/phase1-etl.md`)
- [x] Ingestion CSV → Parquet
- [x] Normalisation `playDirection` + recalage sur le snap (+ fin de dropback)
- [x] Validation des valeurs codées
- [x] Test de référence : 2021101709 / 1444 (Crosby)

## Phase 2 — MVP
- [x] Plan (`docs/plans/phase2-mvp.md`) et décision 0004
- [x] Métriques : PBWR PFF + tracking, TTP, instant de défaite, Pressure Rate
- [x] Snaps précalculés (`snaps_ol`, `snaps_dl`)
- [x] `make check-metrics` : 0 écart sur 20 jeux (109 snaps)
- [x] API + filtres (réponses < 50 ms)
- [x] UI : Scout Card OL, filtres, liste des défaites, C1, C2, C3, J1, J3
- [x] Captures d'écran
- [x] Docker (compose API + UI)
- [x] Validation du MVP (commit du propriétaire)

## Phase 3 — V2 (après validation)
- [x] R1 en V2 (décision 0005 §1)
- [x] Matrice OL × DL, couverture × situation, paquets de pression, diagnostic assisté, synchro vidéo
- [x] Visuels C4–C9, J2, J4, J5, R1–R3

## Phase 4 — V3 (après validation)
Périmètre réduit à la demande du propriétaire (≈ 30 min) :
- [x] Module Scout : schéma + connecteur vide (BDB 2027 non accessible)
- [x] Badges top / bottom 10 % + écart de contexte
- [x] Rapport adverse PDF (impression navigateur)
- [x] 3D C10 (replay) avec 2D par défaut
- Reportés : C11–C13, J6–J7, R4–R8
