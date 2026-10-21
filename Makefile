PY      := .venv/bin/python
DATA    := data
N_TRACKING := 122

.PHONY: install data etl test lint check-metrics api ui start

install:
	python3.12 -m venv .venv
	$(PY) -m pip install -q --upgrade pip
	$(PY) -m pip install -q -e ".[dev]"
	cd ui && npm ci

# Pas de téléchargement : les données sont fournies dans data/ (décision 0001).
data:
	@for f in games plays players pffScoutingData; do \
	  test -f $(DATA)/$$f.csv || { echo "manquant : $(DATA)/$$f.csv"; exit 1; }; done
	@n=$$(ls $(DATA)/tracking/tracking_*.csv 2>/dev/null | wc -l); \
	  test $$n -eq $(N_TRACKING) || { echo "tracking : $$n fichiers, $(N_TRACKING) attendus"; exit 1; }
	@echo "données OK : 4 CSV + $(N_TRACKING) fichiers tracking"

etl: data
	$(PY) -m etl.build

test:
	$(PY) -m pytest
	cd ui && npm run typecheck && npm test

lint:
	$(PY) -m ruff check .
	$(PY) -m ruff format --check .
	cd ui && npm run lint

check-metrics:
	$(PY) -m etl.check_metrics --plays 20

api:
	$(PY) -m uvicorn api.main:app --reload

ui:
	cd ui && npm run dev

# Tout lancer d'un coup (installation et ETL si besoin) : voir start.sh
start:
	./start.sh

# --- Gestion des serveurs : make stop / make re / make status ---
PORTS := 8000 5173
.PHONY: stop re status

# Libère les ports de l'API (8000) et de l'interface (5173), en local comme sous Docker.
stop:
	@if command -v docker >/dev/null 2>&1 && [ -n "$$(docker compose ps -q 2>/dev/null)" ]; then \
	  echo "Arrêt des conteneurs Docker…"; docker compose down; fi
	@for p in $(PORTS); do \
	  pids=$$( (lsof -ti tcp:$$p 2>/dev/null || fuser $$p/tcp 2>/dev/null) | tr -s ' ' '\n' | sort -u); \
	  if [ -n "$$pids" ]; then kill $$pids 2>/dev/null; echo "port $$p libéré"; \
	  else echo "port $$p déjà libre"; fi; \
	done
	@sleep 1
	@for p in $(PORTS); do \
	  pids=$$(lsof -ti tcp:$$p 2>/dev/null); \
	  if [ -n "$$pids" ]; then kill -9 $$pids 2>/dev/null; echo "port $$p : arrêt forcé"; fi; \
	done

# Arrête tout puis relance (installation et ETL si besoin).
re: stop start

# Ce qui tourne sur les ports de Trench Lab.
status:
	@for p in $(PORTS); do \
	  if curl -sf -o /dev/null "http://localhost:$$p$$( [ $$p = 8000 ] && echo /health )"; then \
	    echo "port $$p : en marche"; \
	  elif lsof -ti tcp:$$p >/dev/null 2>&1; then echo "port $$p : occupé (ne répond pas)"; \
	  else echo "port $$p : libre"; fi; \
	done

# --- Docker (modèle : inspiration/Makefile_docker, décision 0004 §5) ---
.PHONY: docker-build docker-up docker-down docker-etl docker-test docker-lint docker-check-metrics docker-shell docker-logs

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-etl:
	docker compose run --rm api python -m etl.build

docker-test:
	docker compose run --rm api pytest

docker-lint:
	docker compose run --rm api ruff check .

docker-check-metrics:
	docker compose run --rm api python -m etl.check_metrics --plays 20

docker-shell:
	docker compose exec api /bin/bash

docker-logs:
	docker compose logs -f
