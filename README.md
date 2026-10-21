# 🏈 Trench Lab — NFL Linemen & Protection Analytics

> **L'outil d'analyse et d'aide à la décision NFL pour coachs, joueurs et recruteurs.**  
> *« Répondre en moins de 10 secondes à une question de coach, avec le jeu (tracking 2D/3D + vidéo) à l'appui. »*

---

## 📌 Présentation & Vision

Dans la NFL moderne, la bataille des tranchées (*The Trenches* — Offensive Line vs Defensive Line) détermine l'issue des matchs. Pourtant, les coachs et analystes doivent souvent composer avec des rapports statiques déconnectés de la vidéo ou des métriques génériques masquant la réalité du terrain.

**Trench Lab** comble ce fossé en croisant les données de positionnement spatial haute fréquence (**Next Gen Stats à 10 Hz**) et le charting d'experts (**Pro Football Focus**) sur le jeu de référence du **NFL Big Data Bowl** (8 557 jeux de passe, 122 matchs).

L'outil structure l'analyse en **3 niveaux hiérarchiques** :
1. **Niveau 1 — Fiches Joueurs & Tendances (*Scout Cards*)** : Synthèse d'efficacité et métriques avancées d'un lineman, filtrables instantanément par situation de jeu.
2. **Niveau 2 — Duels & Systèmes (*Matchups & Schémas*)** : Matrices d'affrontements directs OL × DL, efficacité des couvertures et vulnérabilités face aux paquets de pression / blitz.
3. **Niveau 3 — Laboratoire d'Action (*Play Lab*)** : Reconstitution du jeu image par image en 2D et 3D, effondrement dynamique de la poche, timeline synchronisée et moteur de diagnostic assisté.

---

## 🎯 Les 3 Profils Utilisateurs

Trench Lab adapte ses interfaces et ses métriques aux besoins spécifiques de chaque métier :

| Utilisateur | Question type | Réponse apportée par Trench Lab |
| :--- | :--- | :--- |
| **Coach OL / DL** | *« Pourquoi mon Left Tackle concède-t-il une pression à 2,1 s ? »* | Instant précis de défaite, diagnostic assisté (retard de set, perte de puissance, stunt), liste filtrée des jeux et timeline du duel. |
| **Coordinateur (OC / DC)** | *« Quel blitz génère une pression le plus rapidement sur 3rd & long ? »* | Classement des paquets de pression par Time-to-Pressure médian, heatmap Couverture × Situation et cartes d'origine des pressions par gap. |
| **Joueur** | *« Comment mon set se compare-t-il aux meilleurs tackles de la ligue ? »* | Carte joueur mobile épurée, comparaison graphique de la trajectoire des pieds face à l'élite et playlists annotées par le staff. |
| **Recruteur (Scout)** | *« Ce tackle de 315 lbs est-il capable de contenir des edge rushers rapides ? »* | Radar comparatif multi-joueurs, nuage de corrélation poids / vitesse adverse, badges de contexte et export de fiche PDF en un clic. |

---

## 🔬 Métriques Clés & Innovations

Toutes les métriques de Trench Lab sont fondées sur des règles physiques et géométriques rigoureuses définies dans [`config/thresholds.yaml`](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/config/thresholds.yaml) et documentées dans [`docs/metrics.md`](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/docs/metrics.md) :

- **Pass Block Win Rate (PBWR)** :
  - **Version PFF** : Taux de snaps sans pression concédée (`hurry`, `hit`, `sack` ou `beatenByDefender`).
  - **Version Tracking** : Capacité du bloqueur à maintenir le défenseur hors d'un rayon critique de 1,5 yd autour du QB pendant au moins 2,5 secondes.
- **Time-to-Pressure (TTP)** : Premier instant $t$ (recalé à $t=0$ au snap) où un rusher pénètre le rayon critique du QB.
- **Instant de Défaite** : Détection géométrique précise de la rupture du bloc (franchissement de la ligne des épaules du bloqueur orientée vers le QB).
- **Island Win Rate** : Pourcentage de duels remportés en isolation stricte (sans aide de chip, double-team ou backfield pickup).
- **Surface & Stabilité de la Poche (C2)** : Calcul temps réel de l'enveloppe convexe formée par les 5 linemen et le QB pour quantifier la dégradation de la poche.
- **Diagnostic Assisté Explicable** : Algorithme identifiant les causes probables d'échec (*Retard de set*, *Dépassement en puissance*, *Stunt / Switch manqué*), validable ou corrigeable par le coach avec persistance en base locale (`club.duckdb`).
- **Indicateurs de Conférence** : Échantillon de snaps ($n$) systématiquement affiché, grisé sous le seuil de fiabilité ($n < 100$), et code couleur normé (vert = top 10 % ligue, rouge = bottom 10 %).

---

## 🖥️ Fonctionnalités & Visualisations

L'application intègre le catalogue complet de visualisations 2D et 3D :

### 1. Fiche Joueur (*Scout Card*)
- Fiche d'identité, gabarit, badges de performance relatifs et badges de contexte (écarts sur switch ou play-action).
- Tuiles de métriques interactives : **chaque chiffre est cliquable** et filtre directement la table des jeux correspondants.
- Barres de filtres situationnels instantanés (down, distance, quart-temps, score, formation, couverture, play action, type de dropback).

### 2. Duels & Systèmes (*Matchups*)
- **Matrice OL × DL (C4)** : Heatmap interactive croisant chaque bloqueur et rusher avec taux de victoire et volume.
- **Origine des Pressions (C5)** : Vue en surplomb de la ligne offensive matérialisant les failles par gap (A, B, C, extérieur).
- **Couverture × Situation (C6)** : Analyse d'efficacité par couverture (Cover-0 à Quarters) selon la distance requise.
- **Distribution des Blitz (C7)** : Boîtes à moustaches comparant la rapidité de pression selon le nombre d'hommes envoyés au rush.

### 3. Laboratoire d'Action (*Play Lab*)
- **Terrain 2D Animé (C1)** : Tracé fluide à 60 FPS sur Canvas des 22 joueurs et du ballon avec lecture, pause, ralenti et mise en exergue du duel.
- **Timeline Synchronisée (C3)** : Courbes D3 de distance au QB, vitesse en mph et angle d'épaules synchronisées avec le curseur de lecture.
- **Replay 3D Immersif (C10)** : Caméra libre et vues subjectives propulsées par Three.js / React Three Fiber.
- **Panneau de Diagnostic & Vidéo** : Intégration vidéo/tracking et annotation de playlists pour les séances vidéo d'équipe.

### 4. Espace Joueur & Espace Recruteur
- **Vue Joueur Mobile** : Graphiques de progression semaine par semaine et comparaison de sets de protection avec les références NFL.
- **Module Recruteur** : Radars comparatifs superposant jusqu'à 3 joueurs, nuage poids/vitesse et génération de rapport PDF imprimable.

---

## 🏗️ Architecture & Technologies

Le projet s'appuie sur une pile moderne garantissant performances analytiques et ergonomie :

```
NFL-Hackaton/
├── api/                 # Backend FastAPI (endpoints REST < 50ms, DuckDB, routes v1/v2/v3)
├── ui/                  # Frontend React 18, TypeScript, Vite, D3, Canvas 2D, Three.js
├── etl/                 # Pipeline Polars : ingestion, normalisation spatio-temporelle, Parquet
├── metrics/             # Moteurs de calcul purs (PBWR, TTP, poche, diagnostic, duels)
├── config/              # Valeurs codées (enums.py) et seuils métier (thresholds.yaml)
├── data/                # data/raw (CSV source BDB) et data/processed (fichiers Parquet optimisés)
├── docs/                # Spécifications, métriques, décisions d'architecture (ADR) et plans
└── tests/               # Suites de tests automatisés pytest (couverture ≥ 90%) et Vitest
```

### Stack Technique

- **Traitement & Données** : Python 3.12, [Polars](https://pola.rs/) (manipulation vectorielle haute performance), [DuckDB](https://duckdb.org/) (analytique embarquée), [PyArrow](https://arrow.apache.org/) (format Parquet).
- **API & Serveur** : [FastAPI](https://fastapi.tiangolo.com/), Uvicorn.
- **Frontend** : [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/).
- **Visualisations** : [D3.js](https://d3js.org/) (graphiques, radars, timelines), Canvas 2D natif (terrain animé), [React Three Fiber](https://r3f.docs.pmnd.rs/) / Three.js (replays 3D).
- **Qualité de code** : [Ruff](https://astral.sh/ruff) (linter & formateur Python ultra-rapide), [pytest](https://docs.pytest.org/) (couverture > 90%), ESLint.
- **Conteneurisation** : Docker, Docker Compose.

---

## 🚀 Démarrage Rapide

### Prérequis
- **Python 3.12**
- **Node.js 20+** et npm
- Données du **NFL Big Data Bowl 2023** placées dans le dossier `data/` :
  - `games.csv`, `plays.csv`, `players.csv`, `pffScoutingData.csv`
  - Dossier `tracking/` contenant les fichiers `tracking_week_*.csv` (ou équivalents découpés par match)

---

### Option A — Démarrage Automatique (Recommandé)

Le script `start.sh` gère automatiquement l'environnement virtuel, l'installation des dépendances, la compilation de l'ETL si nécessaire, et démarre l'API ainsi que l'interface :

```bash
# Démarrage en local (ouvre automatiquement http://localhost:5173)
./start.sh

# Forcer la réindexation complète de l'ETL
./start.sh --etl

# Lancer sous Docker
./start.sh --docker
```

---

### Option B — Commandes Manuelles via Makefile

```bash
# 1. Installation de l'environnement Python et des dépendances UI
make install

# 2. Vérification de la présence des fichiers de données
make data

# 3. Lancement du pipeline ETL (génération des fichiers Parquet optimisés)
make etl

# 4. Démarrage des serveurs
make api   # Lance l'API FastAPI sur http://localhost:8000
make ui    # Lance l'UI Vite sur http://localhost:5173
```

---

### Gestion des Processus

Pour gérer les serveurs en cours d'exécution :

```bash
make status   # Affiche l'état des ports 8000 (API) et 5173 (UI)
make stop     # Coupe proprement l'API et l'interface (local et Docker)
make re       # Arrête tout et redémarre à zéro
```

---

## 🧪 Tests & Assurance Qualité

Le projet applique des règles de qualité strictes définies dans [`CLAUDE.md`](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/CLAUDE.md) :

```bash
# Lancer les tests unitaires et d'intégration (couverture ≥ 90% requise)
make test

# Contrôler le formatage et le typage (Ruff + TypeScript + ESLint)
make lint

# Vérifier la validité des métriques (recalcul indépendant sur 20 jeux tirés au sort)
make check-metrics
```

> [!NOTE]
> **Test de non-régression clé** : Le jeu de référence Semaine 6 2021 (Raiders vs Broncos, sack de Maxx Crosby sur Teddy Bridgewater) fait l'objet d'un test systématique validant le TTP, l'instant de défaite et le bloqueur désigné responsable.

---

## 📖 Documentation Détaillée

- 📋 [Cahier des besoins fonctionnels](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/docs/cahier-des-besoins.md)
- 📊 [Catalogue des visualisations 2D et 3D](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/docs/VISUALISATIONS.md)
- 📐 [Guide de calcul des métriques](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/docs/metrics.md)
- 📜 [Règles de développement et charte projet](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/CLAUDE.md)
- 📝 [Journal des modifications (Changelog)](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/CHANGELOG.md)
- 🏛️ [Décisions d'architecture (ADR)](file:///c:/Users/Arthaud/NFL/NFL-Hackaton/docs/decisions/)

