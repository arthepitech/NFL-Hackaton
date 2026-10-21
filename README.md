# Trench Lab

Outil d'analyse NFL pour coachs, joueurs et recruteurs (Big Data Bowl 2023). Règles du projet : `CLAUDE.md`.

## Lancer

Prérequis : Python 3.12, Node 20, et les CSV du Big Data Bowl 2023 dans `data/` (`games.csv`, `plays.csv`, `players.csv`, `pffScoutingData.csv`, `tracking/`).

```bash
./start.sh            # installe si besoin, lance l'ETL si besoin, démarre l'API et l'interface
./start.sh --docker   # même chose avec docker compose
./start.sh --etl      # force la regénération de data/processed/
```

L'interface s'ouvre sur http://localhost:5173 (API sur le port 8000). Ctrl+C arrête tout.

```bash
make stop     # ferme l'API et l'interface (ports 8000 et 5173), en local comme sous Docker
make re       # arrête tout puis relance
make status   # montre ce qui tourne
```

## Vérifier

```bash
make test && make lint && make check-metrics
```
