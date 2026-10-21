# 0001 — Source des données : dossier local `data/`

Date : 2026-10-21 · Statut : acceptée

## Contexte
- Le prompt prévoyait un téléchargement via la CLI Kaggle, et `CLAUDE.md` §4.1 un dossier `data/raw/`.
- Consigne du propriétaire (2026-10-21) : « tout se trouve dans `data` ». Les fichiers BDB 2023 sont déjà présents : 4 CSV à la racine de `data/` et 122 matchs dans `data/tracking/`.

## Décision
- Pas de téléchargement Kaggle. `make data` vérifie seulement la présence des fichiers : 4 CSV et 122 tracking.
- Le rôle de « données brutes » (§4.1) est tenu par `data/*.csv` et `data/tracking/*.csv`, laissés en place et **en lecture seule**.
- Les chemins sont centralisés dans `config/settings.py` :
  - `RAW_DIR = data/` ;
  - `TRACKING_DIR = data/tracking/` ;
  - `PROCESSED_DIR = data/processed/` (Parquet).
- `data/` est ignoré par git, et les CSV sont retirés de l'index (`git rm --cached`, changement indexé, non commité).

## En suspens
- Les CSV restent dans l'historique git et sur GitHub (commit `e47acde`).
- Pour les purger, il faut réécrire l'historique (`git filter-repo`) puis faire un force-push. L'opération est irréversible et touche un dépôt partagé : elle attend la décision du propriétaire.
