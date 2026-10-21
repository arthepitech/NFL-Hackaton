# Changelog

## [Non publié]

### Modifié — Lisibilité et ergonomie (docs/plans/ux-simplification.md)
- Français courant partout (« actions », « blocs réussis », « délai avant pression »…), terme football entre parenthèses ; onglets renommés.
- Filtres : situations prêtes en un clic, filtres détaillés repliés par thème, filtres actifs en étiquettes retirables.
- Chaque chiffre : phrase d'aide « ? », « sur N actions », « Voir les actions ».
- Style modernisé (en-tête fixe, cartes, onglets en pastilles), aucun débordement horizontal sur téléphone.
- Listes avec recherche partout (joueurs, équipes par nom complet, filtres, duels, playlists) : saisie sans accents ni majuscules, clavier et tactile.
- Aucune règle de calcul modifiée.

### Ajouté — Phase 4 (V3 réduite, décision 0006)
- Module Scout : schéma et connecteur Combine (BDB 2027 indisponible, signalé).
- Badges top / bottom 10 % et écart de contexte (`badge_context_gap_pts`, seuil signalé).
- Rapport adverse exportable en PDF (impression navigateur).
- Replay 3D C10 (react-three-fiber), 2D par défaut.

### Ajouté — Phase 3 (V2)
- **Métriques** : Island Win Rate, vitesse du rusher, paquets de pression, gap d'origine des pressions, diagnostic assisté (règles explicables).
- **Données du staff** : `club.duckdb` (tags du coach, playlists, index vidéo).
- **API V2** : matchups et projection, protection, couvertures, paquets, trajectoires, diagnostic, vidéo, set, playlists, radar, ligue, nuage de vitesse.
- **Interface** :
  - onglet Matchups (C4–C7) ;
  - C8 et C9, radar R1 dans la Scout Card ;
  - diagnostic à confirmer ou corriger, synchronisation vidéo, playlists dans le Play Lab ;
  - J2, J4 et J5 côté joueur ;
  - onglet Recruteur (R1–R3).
- **Seuils signalés** dans `config/thresholds.yaml` : `heavy_rusher_pct`, `set_window_s`, `set_min_retreat_yd`, `power_min_retreat_yd`, `power_min_rusher_speed_yd_s`.

### Ajouté — Phase 2 (MVP)
- **Métriques** (`metrics/`) :
  - alignement bloqueur / rusher / QB image par image ;
  - TTP, instant de défaite, PBWR PFF et tracking, Pressure Rate.
- **Snaps précalculés** : `snaps_ol.parquet` et `snaps_dl.parquet`, générés par `make etl`.
- **`make check-metrics`** : recalcul indépendant sur 20 jeux au hasard, plus l'alerte d'écart PBWR PFF / tracking.
- **API** (`/api/meta`, `/api/players`, Scout Card, jeux d'un chiffre, défaites, semaines, jeu, duel) :
  - tous les filtres de situation ;
  - bornes des filtres dans `config/filters.yaml`.
- **Interface** :
  - Scout Card OL : chiffres cliquables, `n snaps`, grisé sous le seuil, top / bottom 10 % avec légende ;
  - filtres permanents et liste des défaites triées ;
  - Play Lab : C1 terrain animé, C2 poche, C3 timeline, J3 lecteur factice avec calque ;
  - J1 carte joueur mobile ;
  - liens directs (`?vue=playlab&match=…`).
- **Docker** : `api/Dockerfile`, `ui/Dockerfile`, `docker-compose.yml`, cibles `make docker-*`.
- **Décision 0004** : fenêtre de dropback, défaite par franchissement, filtres, Docker.

### Ajouté — Phase 1 (ETL)
- `etl/` : ingestion CSV → Parquet, normalisation `playDirection`, recalage sur le snap, validation des valeurs codées, rapport `etl_report.json`.
- Test de non-régression sur le jeu de référence 2021101709 / 1444 (sack de Crosby, table 2 de STRAIN).

### Ajouté — Phase 0
- `pyproject.toml`, `Makefile`, `config/enums.py`, `config/thresholds.yaml`, squelettes, UI Vite + React + TS + D3 + react-three-fiber, CI GitHub Actions.
- Décisions 0001 à 0003.

### Modifié
- `data/` ignoré par git et retiré de l'index.
- `config/settings.py` : chemins surchargeables par variables d'environnement (Docker).
