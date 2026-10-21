FROM python:3.12-slim

# make pour lancer les cibles du Makefile dans le conteneur, curl pour le healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends make curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances depuis pyproject.toml (source unique, décision 0004 §5).
COPY pyproject.toml ./
COPY config ./config
COPY etl ./etl
COPY metrics ./metrics
COPY api ./api
RUN pip install --no-cache-dir -e ".[dev]"

# Les données ne sont jamais dans l'image : montées par docker-compose.
RUN mkdir -p /app/data/processed

EXPOSE 8000
HEALTHCHECK CMD curl -fs http://localhost:8000/health || exit 1
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
