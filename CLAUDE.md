# CLAUDE.md — Outil d'analyse coach NFL (Trench Lab)

Ce fichier fixe les règles que Claude Code suit **à la lettre** sur ce projet.
Référence fonctionnelle : le cahier des besoins « Outil d'analyse coach NFL ».
En cas de conflit entre une demande ponctuelle et ces règles, Claude Code s'arrête et demande.

---

## 1. Mission

Construire un outil qui répond en moins de 10 secondes à une question de coach, avec le jeu (tracking + vidéo) à l'appui.
Trois niveaux, toujours dans cet ordre : **Niveau 1 Scout Card → Niveau 2 Matchups → Niveau 3 Play Lab**.
Trois utilisateurs : coach (OL/DL, coordinateurs), joueur, recruteur.

---

## 2. Process obligatoire (à suivre dans l'ordre, sans sauter d'étape)

Pour **chaque** fonctionnalité :

1. **Lire** la section correspondante du cahier des besoins et ce fichier.
2. **Reformuler** en une phrase la question de coach à laquelle la fonctionnalité répond.
3. **Lister les champs sources** utilisés (nom exact de colonne, fichier). Si un champ n'existe pas, le dire et proposer un calcul depuis le tracking. Ne jamais inventer un champ.
4. **Écrire le plan** (fichiers touchés, fonctions, tests) dans `docs/plans/<feature>.md` et attendre validation si la tâche touche plus de 3 fichiers.
5. **Écrire les tests d'abord** (`tests/`), dont au moins un test sur un jeu réel connu du jeu de données.
6. **Implémenter** le calcul dans `metrics/` (logique pure, sans I/O).
7. **Exposer** via l'API (`api/`), puis l'interface (`ui/`).
8. **Vérifier** : `make test`, `make lint`, `make check-metrics` passent ; capture d'écran de la vue pour toute modification d'interface.
9. **Mettre à jour** `docs/metrics.md` (définition) et `CHANGELOG.md`.
10. **Résumer** en 5 lignes max : ce qui a été fait, ce qui reste, les écarts avec le cahier.

Une étape échouée = on corrige avant de passer à la suivante. Jamais de `--no-verify`, jamais de test désactivé pour faire passer la CI.

---

## 3. Ordre de livraison

| Version | Périmètre | Condition pour passer à la suivante |
| --- | --- | --- |
| MVP | Scout Card OL (PBWR, TTP, Pressure Rate), filtres de situation, terrain animé d'un jeu, liste des défaites triées | Chiffres identiques au recalcul manuel sur 20 jeux tirés au hasard |
| V2 | Matrice OL × DL, tableau couverture × situation, paquets de pression, synchro vidéo, diagnostic assisté | Validation par un coach sur 10 clips |
| V3 | Module Scout (Combine × match), radars comparatifs, badges, rapport adverse PDF | Revue recruteur |

Ne jamais commencer une version tant que la précédente n'est pas validée.

---

## 4. Données — règles strictes

### 4.1 Sources et clés
- Fichiers : `games.csv`, `plays.csv`, `players.csv`, `pffScoutingData.csv`, `tracking_*.csv` (Big Data Bowl 2023 pour le prototype).
- Jointures **uniquement** par `gameId`, `playId`, `nflId` (+ `frameId` pour le tracking).
- Jointure nflverse : `gameId`/`playId` ↔ `old_game_id`/`play_id`.
- Les données brutes dans `data/raw/` sont **en lecture seule**. Toute transformation écrit dans `data/processed/` en Parquet.

### 4.2 Normalisation (obligatoire avant tout calcul)
- Retourner les jeux où `playDirection == "left"` pour que l'attaque aille toujours vers la droite :
  `x' = 120 - x`, `y' = 53.3 - y`, `o' = (o + 180) % 360`, `dir' = (dir + 180) % 360`.
- Recaler le temps sur le snap : `t = (frameId - frame_snap) / 10` secondes (événement `ball_snap`).
- Unités internes : yards, yards/s, secondes. Conversion en mph **uniquement à l'affichage** (`mph = yd/s × 2.045`).

### 4.3 Valeurs codées
- `pff_blockType` : PP, PA, SW, CH, PU, BH, PT, UP, PR, SR, CL, NB. PA = protection sur play action, **pas** une technique.
- `pff_passCoverage` : Cover-0, Cover-1, Cover-2, 2-Man, Cover-3, Quarters, Cover-6, Bracket, Goal Line, Red Zone, Prevent, Miscellaneous.
- `pff_role` : Pass, Pass block, Pass route, Pass rush, Coverage.
- Ces listes vivent dans `config/enums.py`. Une valeur inconnue lève une erreur, elle n'est jamais ignorée en silence.

### 4.4 Interdits
- Inventer une technique de rush (spin, bull rush…) ou un nom de stunt : **aucun champ ne les fournit**.
- Considérer hurry/hit/sack comme horodatés : ce sont des indicateurs par jeu.
- Coder un seuil en dur dans le code métier.
- Commiter des données PFF/NGS ou des clips vidéo.

---

## 5. Métriques — définitions de référence

Tous les seuils sont dans `config/thresholds.yaml` :

```yaml
pressure_radius_yd: 1.5      # proposition, à valider avec le staff
win_window_s: 2.5            # standard ESPN PBWR/PRWR
fast_rusher_yd_s: 8.0        # ≈ 18 mph, curseur réglable
fast_rusher_window_s: 1.5
min_snaps_display: 100
badge_top_pct: 0.10
badge_bottom_pct: 0.10
blitz_min_rushers: 5
```

| Métrique | Définition | Module |
| --- | --- | --- |
| PBWR (PFF) | 1 − snaps avec `pff_hurryAllowed`/`pff_hitAllowed`/`pff_sackAllowed`/`pff_beatenByDefender` ÷ snaps `Pass block` | `metrics/pbwr.py` |
| PBWR (tracking) | Part des snaps où le défenseur bloqué n'entre pas dans `pressure_radius_yd` avant `win_window_s` | `metrics/pbwr.py` |
| Time-to-Pressure | Premier `t` où distance rusher→QB < `pressure_radius_yd` | `metrics/ttp.py` |
| Instant de défaite | Premier `t` où le rusher dépasse les épaules du bloqueur dans l'axe du QB | `metrics/defeat.py` |
| Pressure Rate | (hurry + hit + sack) ÷ snaps | `metrics/pressure.py` |
| Island Win Rate | PBWR sur snaps sans autre bloqueur (CH, BH, PU, SW) sur le même défenseur | `metrics/island.py` |
| Nb de rushers / blitz | Compte `pff_role == "Pass rush"` ; blitz si ≥ `blitz_min_rushers` | `metrics/pressure_package.py` |
| Vitesse rusher | max(`s`) sur `[0, fast_rusher_window_s]` | `metrics/speed.py` |

Toute nouvelle métrique : définition dans `docs/metrics.md`, test unitaire, test sur jeu réel, affichage de l'échantillon `n`.

---

## 6. Architecture du dépôt

```
data/raw/            # lecture seule
data/processed/      # Parquet générés
config/              # enums.py, thresholds.yaml
etl/                 # ingestion, normalisation, jointures
metrics/             # calculs purs, testés
api/                 # FastAPI
ui/                  # React + D3 (2D), react-three-fiber (3D)
tests/               # pytest + tests UI
docs/                # metrics.md, plans/, decisions/
```

Stack imposée : Python 3.12, Polars, DuckDB (prototype) / PostgreSQL (club), FastAPI, React + TypeScript, D3, Canvas 2D, react-three-fiber. Toute nouvelle dépendance se justifie dans `docs/decisions/`.

---

## 7. Interface — règles

- **Vocabulaire football**, jamais de nom de colonne brut à l'écran (« Pression concédée », pas `pff_hurryAllowed`).
- **Chaque chiffre est cliquable** et ouvre la liste des jeux qui le composent.
- **Échantillon visible** : `n snaps` à côté de chaque pourcentage ; grisé sous `min_snaps_display`.
- **Filtres permanents** : down, distance (≤3 / 4–6 / ≥7), quart-temps, score, zone, formation, personnel, couverture, play action, dropBackType, adversaire, période.
- **Couleurs** : vert = top 10 %, rouge = bottom 10 %, neutre sinon. Jamais de couleur sans légende.
- **Tablette d'abord** : cibles tactiles ≥ 44 px, mode sombre, lisible à 1 m.
- **Performance** : réponse API < 2 s, animation terrain à 10 images/s minimum sans saccade.
- Le diagnostic assisté affiche « cause probable » et propose au coach de **confirmer / corriger**. Jamais présenté comme certain.

---

## 8. Tests et qualité

- Couverture ≥ 90 % sur `metrics/` et `etl/`.
- Tests de non-régression sur un jeu de référence : Raiders–Broncos, semaine 6 2021, sack de Maxx Crosby sur Teddy Bridgewater (cité dans STRAIN) — vérifier TTP, instant de défaite et bloqueur responsable.
- `make check-metrics` compare PBWR PFF et PBWR tracking ; écart > 10 points sur un joueur = alerte dans le rapport, pas suppression.
- Toute vue modifiée : capture d'écran jointe à la PR.

---

## 9. Sécurité et licences

- Données PFF et NGS sous licence : accès par rôle, jamais exposées hors staff, jamais dans les logs.
- BDB : usage non commercial dans le cadre Kaggle.
- Les secrets (clés API, accès vidéo) dans `.env`, jamais commités.

---

## 10. Ce que Claude Code ne fait jamais

- Sauter une étape du process (section 2).
- Inventer une donnée, un champ, une valeur codée ou un chiffre.
- Modifier `data/raw/`, `config/thresholds.yaml` ou `docs/metrics.md` sans le signaler explicitement dans le résumé.
- Passer à la version suivante sans validation.
- Présenter un diagnostic comme une certitude.
