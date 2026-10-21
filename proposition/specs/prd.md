# PRD — NFL Play Explorer

## Problème
Les données NFL Big Data Bowl sont riches (tracking 10 Hz, scouting PFF) mais
illisibles pour un public non expert. Il faut une interface qui raconte le jeu
de façon visuelle et intuitive.

## Public cible
Grand public amateur de football US, pas d'analystes. Doit comprendre sans jargon.

## Fonctionnalités clés
1. Explorer les matchs par semaine, avec contexte familier (équipes, score).
2. Rejouer une action (play) en animation sur un terrain, joueur par joueur.
3. Comprendre les schémas défensifs expliqués en langage simple.
4. Voir qui met le plus de pression (leaderboard pass rush).

## Critères de succès
- L'animation d'un play se charge et se joue de façon fluide.
- Aucun identifiant technique brut exposé sans nom lisible.
- Tourne localement sans dépendance externe (Python seul).

## Hors périmètre (v1)
- Authentification
- Déploiement cloud
- Modèles prédictifs / ML
