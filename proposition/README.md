# NFL Play Explorer

Interface grand public pour explorer les données NFL Big Data Bowl 2021.
Visualise les actions de jeu en animation, les schémas défensifs et les
leaders de la pression défensive — sans jargon technique.

## Pourquoi cette stack ?

L'environnement n'a **ni Node.js ni packages Python tiers**. Le projet est donc
100% **Python standard library** : aucun `pip install`, aucun build step.

- Pipeline : `csv` + `sqlite3`
- Backend : `http.server` (API JSON + fichiers statiques)
- Frontend : HTML / CSS / JavaScript vanilla
- Visualisation 3D : **Three.js** chargé via CDN (import map), donc toujours
  aucun build ni `npm install`. Nécessite un accès internet au premier chargement
  pour récupérer Three.js depuis unpkg.com.

## Design

- Fond **noir** sur tout le site.
- Accents aux **couleurs officielles de la NFL** (rouge du bouclier, bleu marine, or).
- Dans la vue 3D, chaque équipe est colorée avec sa **couleur officielle réelle**
  (ex. Tampa Bay en rouge, Dallas en bleu marine).

## Démarrage

```bash
# 1. Construire la base (charge les CSV dans SQLite + le tracking de 3-4 matchs)
python3 pipeline/build_db.py --games 4

# 2. Lancer le serveur
python3 backend/server.py --port 8000

# 3. Ouvrir http://localhost:8000
```

Options du pipeline :
- `--games N` : nombre de matchs dont charger le tracking (défaut 4)
- `--all-tracking` : charge le tracking des 122 matchs (plusieurs Go, lent)

Le tracking n'est chargé que pour un sous-ensemble de matchs par défaut, car
10 Hz × 22 joueurs × toutes les actions représente énormément de lignes.
Les matchs sans tracking affichent quand même toutes leurs actions et stats,
mais pas l'animation.

## Les 3 vues

1. **Matchs** — choisis une semaine et un match, parcours les actions, puis
   rejoue l'action en **3D** sur un terrain NFL. Les joueurs sont modélisés en
   volume, colorés aux couleurs réelles des deux équipes, le ballon est animé.
   Caméra orbitale : glisse pour pivoter, molette pour zoomer, bouton 🎥 pour
   basculer entre vue aérienne, vue tactique et vue latérale.
2. **Défense** — distribution des schémas de couverture d'une équipe, chacun
   expliqué en langage simple, avec taux de yards concédés.
3. **Pression** — classement des joueurs qui mettent le plus de pression
   (hits + hurries + sacks).

## Structure

```
proposition/
├── specs/              # PRD + architecture
├── pipeline/build_db.py
├── backend/server.py
├── frontend/           # index.html, app.js, field3d.js, style.css
├── nfl.db              # généré par le pipeline
└── README.md
```
