PY      := .venv/bin/python
DATA    := data
N_TRACKING := 122

.PHONY: install data etl test lint check-metrics api ui

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
