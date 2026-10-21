#!/usr/bin/env bash
# Lance Trench Lab : installation si besoin, ETL si besoin, API + interface, ouverture du navigateur.
# Usage : ./start.sh            (local)
#         ./start.sh --docker   (docker compose)
#         ./start.sh --etl      (force la regénération de data/processed/)
#         NO_BROWSER=1 ./start.sh  (sans ouvrir le navigateur)
# Ctrl+C arrête tout.
set -euo pipefail
cd "$(dirname "$0")"

API_PORT=8000
UI_PORT=5173
URL="http://localhost:${UI_PORT}"
MODE=local
FORCE_ETL=0
for arg in "$@"; do
  case "$arg" in
    --docker) MODE=docker ;;
    --etl) FORCE_ETL=1 ;;
    -h | --help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "Option inconnue : $arg" >&2; exit 1 ;;
  esac
done

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

wait_for() { # url, nom, délai max (s)
  for _ in $(seq 1 "$3"); do
    curl -sf "$1" >/dev/null 2>&1 && return 0
    sleep 1
  done
  fail "$2 ne répond pas sur $1"
}

open_browser() {
  if command -v xdg-open >/dev/null; then xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v open >/dev/null; then open "$URL"
  fi
}

# ETL nécessaire si data/processed est absent ou plus ancien que les données ou les seuils.
needs_etl() {
  [ "$FORCE_ETL" = 1 ] && return 0
  local marker=data/processed/snaps_ol.parquet
  [ -f "$marker" ] || return 0
  [ -n "$(find data/*.csv data/tracking config/thresholds.yaml config/filters.yaml \
    -newer "$marker" -print -quit 2>/dev/null)" ]
}

step "Vérification des données"
make -s data || fail "Les CSV du Big Data Bowl 2023 doivent être dans data/ (voir docs/decisions/0001)."

for p in "$API_PORT" "$UI_PORT"; do
  port_busy "$p" && fail "Le port $p est déjà utilisé. Libère-le avec : make stop"
done

if [ "$MODE" = docker ]; then
  command -v docker >/dev/null || fail "Docker n'est pas installé."
  step "Construction des images"
  docker compose build
  if needs_etl; then step "ETL (≈ 10 s)"; docker compose run --rm api python -m etl.build; fi
  step "Démarrage (API + interface)"
  docker compose up -d
  cleanup() { trap - EXIT INT TERM; step "Arrêt"; docker compose down; }
  trap cleanup EXIT INT TERM
else
  if [ ! -x .venv/bin/python ] || [ ! -d ui/node_modules ]; then
    step "Installation (une seule fois)"
    make install
  fi
  if needs_etl; then
    step "ETL (≈ 10 s, détail dans data/processed/etl.log)"
    mkdir -p data/processed
    .venv/bin/python -m etl.build 2>data/processed/etl.log | tail -1
  fi

  step "Démarrage de l'API (port $API_PORT)"
  mkdir -p data/processed
  .venv/bin/python -m uvicorn api.main:app --port "$API_PORT" >data/processed/api.log 2>&1 &
  API_PID=$!
  step "Démarrage de l'interface (port $UI_PORT)"
  (cd ui && exec npx vite --port "$UI_PORT" --strictPort) >data/processed/ui.log 2>&1 &
  UI_PID=$!
  cleanup() {
    trap - EXIT INT TERM
    step "Arrêt"
    kill "$API_PID" "$UI_PID" 2>/dev/null || true
    wait 2>/dev/null || true
  }
  trap cleanup EXIT INT TERM
fi

wait_for "http://localhost:${API_PORT}/health" "L'API" 60
wait_for "$URL" "L'interface" 60
printf '\n\033[1;32m✓ Trench Lab est prêt : %s\033[0m\n' "$URL"
echo "  Journaux : data/processed/api.log et data/processed/ui.log (ou : make docker-logs)"
echo "  Ctrl+C pour tout arrêter."
[ -n "${NO_BROWSER:-}" ] || open_browser

if [ "$MODE" = docker ]; then
  docker compose logs -f
else
  wait
fi
