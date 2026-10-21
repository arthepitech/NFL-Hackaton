FROM python:3.12-slim

# Dépendances système minimales (build C pour packages éventuels, curl pour healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des dépendances Python avec cache Docker optimisé
COPY api/requirements.txt api/requirements-dev.txt /app/
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Création des dossiers cibles
RUN mkdir -p /app/data/raw /app/data/processed /app/docs /app/config

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
