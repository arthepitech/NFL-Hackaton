# Visualisations 2D et 3D — Coach, Joueur, Recruteur

Chaque visuel répond à **une** question et se branche sur des champs réels (Big Data Bowl / PFF / NGS).
Règle d'or : **2D pour décider, 3D pour comprendre ou transmettre.** Le tracking NGS est en 2D (x, y au sol, pas de hauteur) : la 3D sert à la perspective et au temps, jamais à inventer une donnée verticale.

Légende des colonnes : **Q** = question à laquelle répond le visuel · **Données** = champs utilisés · **Outil** = bibliothèque conseillée.

---

## 1. Coach (OL / DL coach, coordinateurs)

### 1.1 Visuels 2D

| # | Visuel | Q | Données | Outil | Interaction |
| --- | --- | --- | --- | --- | --- |
| C1 | **Terrain animé vue de dessus** (22 joueurs + ballon) | Que s'est-il passé sur ce jeu ? | tracking x, y, o, dir, event | Canvas 2D | Lecture, pause, image par image, ralenti, duel mis en avant |
| C2 | **Poche dynamique** : polygone formé par les 5 OL + cercle de 1,5 yd autour du QB | Où et quand la poche s'effondre-t-elle ? | tracking OL + QB | Canvas 2D | Couleur du polygone selon sa surface (rétrécissement) |
| C3 | **Timeline du duel** : courbes distance rusher→QB, vitesse rusher, recul du bloqueur | À quelle seconde mon LT perd-il ? | tracking s, x, y ; instant de défaite calculé | D3 (lignes synchronisées) | Curseur lié au terrain C1 et à la vidéo |
| C4 | **Matrice de duels OL × DL** (heatmap) | Qui bat qui ? | pff_nflIdBlockedPlayer, pressions, TTP | D3 | Case = win rate + n ; clic = clips du duel |
| C5 | **Carte d'origine des pressions** : ligne vue de dessus, flèches par gap (A, B, C, extérieur) | Par où arrive la pression ? | position du rusher au franchissement des blocs | D3 / SVG | Épaisseur = fréquence, couleur = TTP |
| C6 | **Heatmap couverture × situation** | Quelle couverture encaisse sur 3rd & long ? | pff_passCoverage, down, yardsToGo, playResult | D3 | Bascule yards/jeu ↔ taux de 1st down |
| C7 | **Distribution du Time-to-Pressure** par paquet de pression (boîtes ou violons) | Quel blitz fait pression le plus vite ? | pff_role, nb de rushers, TTP | D3 / Plotly | Filtre par alignement des rushers |
| C8 | **Small multiples** : 12 mini-terrains, un par défaite du joueur, alignés sur le snap | Y a-t-il un schéma récurrent dans ses échecs ? | tracking des jeux perdus | Canvas 2D | Clic = ouvre C1 en grand |
| C9 | **Trajectoires superposées** (« spaghetti ») des rushers face à un même OL | Le rusher gagne-t-il dehors ou dedans ? | tracking rusher, normalisé sur la position de l'OL | D3 | Vert = bloc tenu, rouge = défaite |

### 1.2 Visuels 3D

| # | Visuel | Q | Données | Outil | Valeur ajoutée vs 2D |
| --- | --- | --- | --- | --- | --- |
| C10 | **Replay 3D avec caméras libres** : vue QB, vue derrière l'OL, vue All-22 | Comment le joueur *voyait* l'action ? | tracking + height/weight (gabarit des avatars) | react-three-fiber | Perspective du joueur, impossible en vue de dessus |
| C11 | **Cube espace-temps** : x, y au sol, temps en hauteur ; chaque joueur = un tube | Quand les trajectoires se croisent-elles (stunt, switch) ? | tracking x, y, t | three.js / deck.gl | Le croisement d'un stunt devient un nœud visible |
| C12 | **Effondrement de la poche en volume** : polygone C2 extrudé dans le temps | À quelle vitesse la poche se referme ? | tracking OL + QB | three.js | Un « entonnoir » qui se pince montre la seconde critique |
| C13 | **Ghost replay** : deux jeux superposés (réussi en bleu, raté en rouge) | Qu'est-ce qui change entre le stunt tenu et le stunt perdu ? | tracking de 2 jeux alignés sur le snap | react-three-fiber | Comparaison immédiate des écarts de placement |

---

## 2. Joueur

Le joueur consulte sur téléphone ou tablette, souvent seul. Peu de chiffres, beaucoup d'images de **lui-même**.

### 2.1 Visuels 2D

| # | Visuel | Q | Données | Outil | Interaction |
| --- | --- | --- | --- | --- | --- |
| J1 | **Carte joueur mobile** : 3 chiffres max (PBWR, TTP, tendance) + badge | Où j'en suis cette semaine ? | métriques niveau 1 | React | Balayage d'une semaine à l'autre |
| J2 | **Courbe de progression** semaine par semaine, avec moyenne du poste | Est-ce que je progresse ? | PBWR / Pressure Rate par `week` | D3 | Clic sur un point = clips de la semaine |
| J3 | **Clip + calque tracking** : la vidéo avec sa trajectoire et celle du rusher dessinées par-dessus | Où mon set a-t-il été trop court ? | vidéo + tracking | Canvas sur vidéo HTML5 | Ralenti, image par image |
| J4 | **Mes pieds vs la référence** : trajectoire de son set comparée à celle d'un tackle d'élite du jeu de données sur le même type de rush | Que fait le meilleur que je ne fais pas ? | tracking x, y des 1,5 premières secondes | D3 | Choix du joueur de référence |
| J5 | **Playlist annotée par le coach** | Que dois-je revoir avant jeudi ? | clips + tags du coach | React | Lecture enchaînée, commentaires vocaux |

### 2.2 Visuels 3D

| # | Visuel | Q | Données | Outil | Valeur ajoutée |
| --- | --- | --- | --- | --- | --- |
| J6 | **Replay à la première personne** depuis sa position (casque VR ou écran) | Qu'est-ce que je vois au snap ? | tracking + gabarits | react-three-fiber + WebXR | Travail de lecture (alignements, stunts) hors terrain |
| J7 | **Duel 3D en orbite** : lui et son rusher seuls, caméra tournante | Mon angle d'épaules était-il bon ? | tracking x, y, o | react-three-fiber | L'orientation `o` devient lisible en 3D |

---

## 3. Recruteur (Scout)

Le recruteur compare des profils : il lui faut des **distributions** et des **comparables**, pas des jeux isolés.

### 3.1 Visuels 2D

| # | Visuel | Q | Données | Outil | Interaction |
| --- | --- | --- | --- | --- | --- |
| R1 | **Radar comparatif** (prospect vs moyenne du poste vs joueur cible) | Quel est son profil ? | win rates par contexte (PP, PA, SW, island, rusher rapide) | D3 | Jusqu'à 3 joueurs superposés |
| R2 | **Beeswarm de percentiles** : un point par joueur du poste, le prospect en couleur | Où se situe-t-il dans la ligue ? | toutes métriques niveau 1 | D3 | Survol = nom, n snaps |
| R3 | **Nuage poids × win rate face aux rushers rapides** | Un tackle de 315 lbs tient-il la vitesse ? | players.weight, PBWR filtré sur vitesse rusher ≥ seuil | D3 / Plotly | Curseur de vitesse en mph |
| R4 | **Combine vs match** : barres appariées (mesure Combine en percentile / rendement en match) | Ses mesures annoncent-elles son rendement ? | Combine tracking (BDB 2027) + métriques match | D3 | Tri par écart |
| R5 | **Joueurs comparables** : liste des 5 profils les plus proches avec mini-radars | À qui ressemble-t-il ? | vecteur de métriques + gabarit | D3 | Clic = Scout Card du comparable |
| R6 | **Fiche export PDF** une page | Que présenter au GM ? | niveau 1 + R1 + R2 | React → PDF | Génération 1 clic |

### 3.2 Visuels 3D

| # | Visuel | Q | Données | Outil | Valeur ajoutée |
| --- | --- | --- | --- | --- | --- |
| R7 | **Nuage 3D** : poids × vitesse du rusher affronté × PBWR | Existe-t-il une zone de rupture pour ce gabarit ? | players.weight, vitesse rusher, PBWR | Plotly 3D / deck.gl | Montre l'interaction de deux facteurs à la fois |
| R8 | **Avatar gabarit à l'échelle** : prospect et titulaire côte à côte | Comment se compare-t-il physiquement ? | height, weight, envergure Combine si dispo | react-three-fiber | Lecture instantanée du gabarit |

---

## 4. Règles de design communes

- **Un visuel = une question.** Le titre du visuel est la réponse (« Le LT perd à 2,1 s face aux rushs extérieurs »), pas le sujet.
- **Échantillon toujours affiché** (`n snaps`), grisé sous le seuil minimal.
- **Code couleur unique** dans tout l'outil : vert = top 10 %, rouge = bottom 10 %, bleu = équipe, orange = adversaire, gris = contexte.
- **Tout est relié** : un clic sur un point, une case ou une barre ouvre les jeux correspondants dans le Play Lab (C1 + vidéo).
- **Temps synchronisé** : terrain, timeline et vidéo partagent un seul curseur.
- **3D optionnelle** : toute vue 3D a son équivalent 2D, et la 2D est la vue par défaut.
- **Accessibilité** : couleurs testées daltonisme, textes ≥ 14 px sur tablette.

---

## 5. Priorisation

| Priorité | Coach | Joueur | Recruteur |
| --- | --- | --- | --- |
| MVP | C1, C2, C3 | J1, J3 | — |
| V2 | C4, C5, C6, C7, C8, C9 | J2, J4, J5 | R1, R2, R3 |
| V3 | C10, C11, C12, C13 | J6, J7 | R4, R5, R6, R7, R8 |
