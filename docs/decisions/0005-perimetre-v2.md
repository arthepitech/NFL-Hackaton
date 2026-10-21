# 0005 — Choix de périmètre et de calcul pour la V2

Date : 2026-10-21 · Statut : acceptée (consigne : « continue », sans arbitrage demandé)

## 1. Radar R1 en V2
- `VISUALISATIONS.md` §5 et le prompt de mission placent R1–R3 en V2. `CLAUDE.md` §3 place les « radars comparatifs » en V3.
- **Choix** : on suit le prompt, document le plus récent et le plus précis. R1, R2 et R3 sont livrés en V2.
- La V3 garde les badges, R4–R8 et le PDF.

## 2. Island Win Rate
- Définition littérale de `CLAUDE.md` §5 : PBWR PFF limité aux snaps où **aucun autre** joueur ne bloque le même défenseur avec un bloc `CH`, `BH`, `PU` ou `SW`.
- Les chips des TE et RB (`pff_role = Pass Route`) comptent comme aide.
- Une double équipe `PP` + `PP` reste « island » selon la définition. À revoir avec le staff.

## 3. Rusher rapide, rusher lourd
- **Rapide** : vitesse max (`s`) sur [0, `fast_rusher_window_s`] ≥ `fast_rusher_yd_s`. Curseur réglable dans l'interface (R3).
- **Lourd** : aucune valeur dans le cahier. On ajoute `heavy_rusher_pct: 0.75` à `config/thresholds.yaml`, soit le quart supérieur des poids des rushers du jeu de données (≥ 285 lbs en 2021).
- Modification de `thresholds.yaml` **signalée**.

## 4. Paquets de pression
- Nombre de rushers = compte de `pff_role = Pass Rush` sur le jeu. Blitz si ≥ `blitz_min_rushers`.
- Paquets affichés : « 3 ou moins », 4, 5, « 6+ » (cahier : « de 3 à 6 rushers et plus »).
- La borne 6 est dans `config/filters.yaml` (`package_max`).
- TTP du jeu = plus petit TTP parmi ses rushers.

## 5. Origine des pressions (C5)
- Pour chaque rusher crédité d'une pression PFF : 1re image de la fenêtre où il atteint la profondeur moyenne des 5 OL (« franchit la ligne de blocs »).
- Le gap est lu sur les positions `y` des OL à cette image :
  - **A** : entre C et G ;
  - **B** : entre G et T ;
  - **C** : entre T et le TE attaché du même côté (`TE-*`) ;
  - **Extérieur** : au-delà, ou au-delà du T s'il n'y a pas de TE.
- Côté gauche ou droit vu de l'attaque.
- Sans franchissement, par exemple quand le QB est remonté devant sa ligne (jeu de référence 1444), le gap est lu au moment où le rusher entre dans le rayon de pression (TTP).
- Ni franchissement ni TTP : gap « non mesurable ».

## 6. Diagnostic assisté (cahier, Niveau 3)
- Règles explicables appliquées aux snaps avec défaite (tracking) ou bloc perdu (PFF). Ordre de priorité : Switch, puis Set, puis Puissance. Sinon « indéterminé ».
  - **Switch / stunt** : `pff_blockType = SW`, et le défenseur bloqué a 0 ou ≥ 2 bloqueurs notés.
  - **Set** : le rusher gagne à l'extérieur (au moment de la défaite, plus loin latéralement du QB que le bloqueur) et le bloqueur a reculé de moins de `set_min_retreat_yd` pendant les `set_window_s` premières secondes.
  - **Puissance** : l'écart de profondeur bloqueur − QB a diminué d'au moins `power_min_retreat_yd` entre le snap et la défaite (bloqueur repoussé dans son QB), et le rusher garde au moins `power_min_rusher_speed_yd_s` à cet instant.
- Les seuils sont ajoutés à `config/thresholds.yaml` (signalé), marqués « proposition », et calés sur les distributions observées (voir section 9).
- Affiché comme « cause probable ». Le coach confirme ou corrige, et sa correction devient un tag réutilisable.
- Aucun nom de technique de rush n'est produit (`CLAUDE.md` §4.4).

## 7. Persistance club
- Tags du coach, playlists et index vidéo vont dans `data/processed/club.duckdb` : DuckDB, déjà dans la stack, jamais commité.
- Pas de nouvelle dépendance.

## 8. Synchronisation vidéo
- **Index** : un clip par (gameId, playId, angle) avec son URL et `snap_offset_s`, le temps du snap dans le clip.
- Le lecteur se cale sur `snap_offset_s + t`. Le coach règle l'offset en arrêtant la vidéo sur le snap puis en cliquant « Caler sur le snap ».
- **Précision** : ±1 image du tracking (0,1 s) tant que la vidéo est à 10 images/s ou plus.
- Sans vidéo branchée, le lecteur factice du MVP reste affiché.
- Base d'URL du système vidéo : variable `VIDEO_BASE_URL` dans `.env`, jamais commitée.

## 9. Calage des seuils (distributions 2021 S1–S8, snaps OL avec défaite tracking)
- **Recul du bloqueur sur 0,5 s**, tackles : quartiles 0,20 / 0,39 / 0,56 yd.
  - `set_min_retreat_yd = 0.2`, le quartile bas.
  - La valeur initiale de 1,0 yd classait presque toute défaite à l'extérieur en « Set ».
- **Recul vers le QB entre le snap et la défaite** : 3e quartile 1,54 yd. On garde `power_min_retreat_yd = 1.5`.
- **Vitesse du rusher à la défaite** : 1er décile 1,6 yd/s, médiane 3,2. On garde `power_min_rusher_speed_yd_s = 2.0`.
- **Vitesse max des edge rushers sur [0, 1,5 s]** : médiane 4,0 yd/s, 9e décile 5,4, 99e centile 6,3, max 7,6.
  - **`fast_rusher_yd_s = 8.0` (18 mph) n'est atteint sur aucun snap.**
  - La valeur de `CLAUDE.md` n'est pas modifiée.
  - Le curseur R3 et l'axe « rusher rapide » du radar sont réglables dans l'interface, avec la distribution affichée, comme le demande le cahier (« curseur calé sur la distribution réelle »).
  - **À arbitrer par le staff** : une valeur autour de 5,4 yd/s (≈ 11 mph, 9e décile des edges) rendrait l'axe exploitable.

## 9 bis. Mesure du recul pour « Puissance »
- Le déplacement propre du bloqueur sur l'axe x a été écarté. Le recul normal d'un set de passe atteint 2 à 3 yd, et ce critère classait 8 175 snaps en « Puissance ».
- Mesure retenue : la réduction de l'écart de profondeur bloqueur − QB, soit la courbe « Profondeur bloqueur − QB » de la timeline C3.
- Limite connue : un QB qui remonte dans la poche réduit aussi cet écart. À revoir sur clips.

## 10. Projection des duels (C4)
L'alignement habituel d'un rusher, soit le mode de `pff_positionLinedUp`, désigne l'OL qu'il affronte, vu de la défense : la gauche de la défense fait face à la droite de l'attaque.
- LEO, LE, LOLB → RT ;
- REO, RE, ROLB → LT ;
- DLT, NLT → RG ;
- DRT, NRT → LG ;
- NT → C.

Les autres alignements (LB, DB) n'ont pas d'OL attendu.
