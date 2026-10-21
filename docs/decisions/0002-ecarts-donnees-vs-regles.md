# 0002 — Écarts entre les données réelles et les règles écrites

Date : 2026-10-21 · Statut : acceptée. Consigne : « fais tes propres recherches pour comparer ».

Constats faits par profilage complet de `data/`. La documentation Kaggle n'est pas lisible sans compte : la référence est donc le contenu réel des fichiers, recoupé avec le papier STRAIN.

## 1. Casse de `pff_role`
- Les données contiennent : `Pass` (8 557), `Pass Block` (46 057), `Pass Route` (39 513), `Pass Rush` (36 362), `Coverage` (57 765).
- `CLAUDE.md` §4.3 écrit `Pass block`, `Pass route`, `Pass rush`.
- **Décision** : `config/enums.py` reprend la casse des données. Une comparaison insensible à la casse masquerait de vraies valeurs inconnues.
- `CLAUDE.md` n'est pas modifié : correction suggérée au propriétaire.

## 2. Événement de snap
- Sur 8 557 jeux, 8 532 ont `ball_snap`, 1 n'a que `autoevent_ballsnap` et 24 n'ont aucun événement de snap.
- Sur ces 24 jeux, le ballon est déjà en mouvement à l'image 1 (`s` entre 1,4 et 4,5 yd/s) : le tracking commence après le snap.
- **Décision** :
  - on prend `ball_snap`, à défaut `autoevent_ballsnap` ;
  - sans snap, le jeu est **exclu des métriques tracking**, car son instant 0 serait inventé, et listé dans le rapport ETL ;
  - il reste compté dans les métriques PFF.

## 3. Valeurs `NA`
- `NA` est la valeur normale des champs hors rôle, par exemple `pff_blockType` d'un rusher.
- Elle est convertie en `null` et acceptée par la validation. Toute autre valeur inconnue lève `UnknownCodedValueError`.

## 4. Valeurs atypiques présentes
- `down = 0` sur 35 jeux.
- `quarter = 5` (prolongation) sur 98 jeux.
- `dropBackType` vaut `NA` sur 528 jeux et `UNKNOWN` sur 1 jeu.
- Ces valeurs sont conservées et exposées telles quelles.

## 5. Bloqueurs hors OL
- Des joueurs en `Pass Route` portent un `pff_blockType` (CH, SR) et un `pff_nflIdBlockedPlayer` : c'est le chip d'un TE ou d'un RB avant sa route.
- Ils comptent comme « autre bloqueur » pour l'Island Win Rate, mais pas comme snaps `Pass Block` du PBWR.

## 6. Jeu de référence (§8)
- Identifié par correspondance exacte avec la table 2 de STRAIN (arXiv 2305.10262). Crosby est à x = 67,68, y = 29,89 à l'image 7 (`ball_snap`), et `qb_sack` tombe à l'image 50.
- Identifiants : `gameId 2021101709`, `playId 1444`, 2e quart-temps à 6:04. Crosby `47889` (alignement LEO), Bridgewater `41258`.
- Temps snap → sack : (50 − 7) / 10 = 4,3 s. Le papier écrit « 4,4 s », probablement par comptage inclusif ; le projet applique la formule de §4.2.
- **Bloqueur** :
  - aucun OL n'a Crosby pour `pff_nflIdBlockedPlayer` ;
  - seul le TE `47803` (TE-R, rôle `Pass Route`, `CH`) le touche ;
  - le sack est partagé avec le DT `40608`. Le seul `pff_sackAllowed = 1` du jeu est celui du C `52491`, face à ce DT. Aucun bloqueur n'est donc crédité du sack de Crosby.
- Le test vérifie ces faits. Le « bloqueur responsable » attendu est le TE en chip, pas un OL.
