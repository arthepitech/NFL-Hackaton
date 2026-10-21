# 🏈 Trench Lab

> **Outil d'analyse NFL pour coachs, joueurs et recruteurs (Big Data Bowl 2023).**  
> *« Répondre en moins de 10 secondes à une question de coach, avec le jeu (tracking 2D/3D + vidéo) à l'appui. »*

🌐 **Application en ligne (Vercel)** : [https://nfl-hackaton-gsednkmqk-arthepitechs-projects.vercel.app/](https://nfl-hackaton-gsednkmqk-arthepitechs-projects.vercel.app/)  
⚙️ **Backend API (Render)** : [https://nfl-hackaton.onrender.com](https://nfl-hackaton.onrender.com)

> ⏳ *Note : Sur le plan gratuit Render, le serveur s'endort après 15 min d'inactivité et peut mettre ~30 à 45 secondes à se réveiller au premier appel. En cas de latence, vous pouvez également lancer le projet en local.*

---

## 🎬 Démonstration

Une vidéo complète de démonstration de l'application est disponible dans le dossier [`demo/`](demo/) :  
👉 **[`demo/trench-lab-demo.mp4`](demo/trench-lab-demo.mp4)**

---

## 📌 Présentation

**Trench Lab** croise le tracking spatial haute fréquence (**Next Gen Stats à 10 Hz**) et le charting d'experts (**Pro Football Focus**) sur 8 557 jeux de passe de la NFL pour analyser en profondeur les duels de la ligne offensive et défensive (*The Trenches*).

L'outil s'adresse à trois profils :
- **Coachs (OL / DL, Coordinateurs)** : diagnostic technique précis, tendances adverses, efficacité des blitz et des couvertures.
- **Joueurs** : auto-analyse, progression hebdomadaire, comparaison de sets de protection avec l'élite de la ligue.
- **Recruteurs** : radars comparatifs, corrélation poids / vitesse adverse, exports PDF en un clic.

---

## ⚡ Ce que l'application permet de faire

1. **Fiche Joueur (*Scout Card*)** :
   - Métriques avancées : **PBWR** (PFF et tracking), **Time-to-Pressure (TTP)**, **Instant de défaite géométrique**, **Island Win Rate** (duels 1v1 sans aide), taux de pressions.
   - Filtres situationnels instantanés : down, distance, quart-temps, score, formation, couverture, play-action, type de dropback.
   - Chiffres cliquables pour afficher et rejouer la liste des jeux correspondants.

2. **Duels & Systèmes (*Matchups*)** :
   - **Matrice OL × DL** : heatmap interactive des affrontements directs avec taux de victoires et volumes.
   - **Origine des pressions** : cartographie des brèches par gap (A, B, C, extérieur).
   - **Couvertures & Blitz** : efficacité par couverture défensive et rapidité de pression selon la taille des paquets de rushers.

3. **Laboratoire d'Action (*Play Lab*)** :
   - **Terrain 2D animé (Canvas 60 FPS)** : tracé fluide des 22 joueurs et du ballon avec lecture, pause, ralenti et zoom sur le duel.
   - **Timeline du duel (D3)** : courbes synchronisées de distance au QB, vitesse en mph et angle d'épaules.
   - **Effondrement de la poche** : calcul en temps réel du polygone formé par les linemen et alertes sur le rayon critique du QB.
   - **Diagnostic assisté explicable** : identification de la cause probable d'une défaite (*Retard de set*, *Perte de puissance*, *Stunt manqué*), validable ou corrigeable par le coach.
   - **Replay 3D immersif** : perspective du joueur et caméra libre propulsées par Three.js / React Three Fiber.
   - **Playlists vidéo** : séquences sauvegardées et annotées pour les réunions tactiques.

---

## 🚀 Lancer l'application

### Prérequis
- **Python 3.12** et **Node.js 20+**
- Les fichiers CSV du Big Data Bowl 2023 dans `data/` (`games.csv`, `plays.csv`, `players.csv`, `pffScoutingData.csv`, `tracking/`).

### Démarrage rapide

```bash
./start.sh            # Installe si besoin, lance l'ETL si besoin, démarre l'API et l'interface
./start.sh --docker   # Même chose via Docker Compose
./start.sh --etl      # Force la régénération des fichiers Parquet précalculés
```

L'interface s'ouvre sur **http://localhost:5173** (API sur le port **8000**).  
`Ctrl+C` arrête l'ensemble des services.

### Commandes utiles

```bash
make status         # Affiche l'état des ports 8000 (API) et 5173 (UI)
make stop           # Coupe proprement l'API et l'interface (local et Docker)
make re             # Arrête tout puis relance
make test           # Lance les tests unitaires et d'intégration (pytest + vitest)
make lint           # Vérifie le formatage et le typage du code
make check-metrics  # Recalcule les métriques sur 20 jeux tirés au sort
```

---

## ☁️ Déploiement Cloud

Pour déployer le backend sur **Render** et le frontend sur **Vercel** sans exposer les données privées sur GitHub, consultez le guide dédié :  
👉 **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**
