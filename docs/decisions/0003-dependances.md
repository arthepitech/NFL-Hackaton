# 0003 — Dépendances hors stack §6

Date : 2026-10-21 · Statut : acceptée

| Dépendance | Raison |
| --- | --- |
| `pyarrow` | Écriture et lecture Parquet dans `data/processed/` (§4.1), utilisée par Polars et DuckDB |
| `pyyaml` | Lecture de `config/thresholds.yaml` (§5) |
| `uvicorn` | Serveur ASGI pour FastAPI (`make api`) |
| `pytest-cov` | Seuil de couverture ≥ 90 % (§8) |
| `ruff` | Lint et formatage Python (`make lint`) |
| `httpx` | Requis par `fastapi.testclient` |
| `three` | Moteur 3D sous `@react-three/fiber` (dépendance de pair obligatoire) |
| `oxlint` | Lint TypeScript, fourni par le gabarit Vite actuel, à la place d'ESLint prévu au plan Phase 0 |
| `vitest`, `jsdom`, `@testing-library/react` | Tests UI (§8) |

## Note outillage
- `npm install` avec npm 10.8.2 (version système) plante dans la résolution des peer deps (`Cannot read properties of null (reading 'edgesOut')`).
- Le lockfile a donc été généré avec npm 11 (`npx npm@11 install`).
- `npm ci` fonctionne ensuite avec npm 10. `make install` et la CI utilisent `npm ci`.
