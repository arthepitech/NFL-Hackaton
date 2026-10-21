# Définitions des métriques

Référence : `CLAUDE.md` §5 et cahier des besoins, section « Définition des métriques ».
Seuils : `config/thresholds.yaml`. Chaque chiffre affiché porte son échantillon `n`, grisé sous `min_snaps_display`.

## Conventions communes
- **Normalisation** : jeux `playDirection == "left"` retournés, attaque vers la droite (§4.2).
- **Temps** : `t = (frameId − frame_snap) / 10` s.
  - `frame_snap` = `ball_snap`, à défaut `autoevent_ballsnap`.
  - Jeu sans snap : exclu des métriques tracking (24 jeux), conservé pour les métriques PFF (décision 0002 §2).
- **Fenêtre de dropback** : 0 < t ≤ `t_end`. `t_end` est le 1er événement de fin (passe, sack, course du QB…), sinon la dernière image (décision 0004 §1).
- **Unités** : yards, yards/s, secondes. mph à l'affichage uniquement (× 2,045).
- **Population de référence** (vert / rouge) : OL (`officialPosition` T, G, C) ayant au moins `min_snaps_display` snaps sous les mêmes filtres.
  - Top 10 % = `badge_top_pct`, bottom 10 % = `badge_bottom_pct`.
  - Pas de couleur si moins de 10 joueurs éligibles.

## Snap de protection (unité de compte OL)
Une ligne de `pffScoutingData.csv` avec `pff_role == "Pass Block"`. Défenseur bloqué : `pff_nflIdBlockedPlayer`. QB : `pff_role == "Pass"`.
Table : `data/processed/snaps_ol.parquet` (module `etl/snaps.py`).

| Métrique | Définition | Champs | Module | n affiché |
| --- | --- | --- | --- | --- |
| **Blocs gagnés (PFF)**, PBWR PFF | 1 − part des snaps avec `pff_hurryAllowed`, `pff_hitAllowed`, `pff_sackAllowed` ou `pff_beatenByDefender` = 1 | pffScoutingData | `metrics/pbwr.py` (`pff_loss`, `win_rate`) | snaps Pass Block |
| **Blocs gagnés (tracking)**, PBWR tracking | 1 − part des snaps où le défenseur bloqué entre à moins de `pressure_radius_yd` du QB avec t ≤ `win_window_s` | tracking x, y ; pff_nflIdBlockedPlayer | `metrics/pbwr.py` (`tracking_loss`) | snaps avec défenseur bloqué noté et tracking |
| **Temps avant pression**, TTP | 1er t de la fenêtre où la distance défenseur → QB < `pressure_radius_yd`. Carte : médiane | tracking x, y | `metrics/ttp.py` | snaps où la pression arrive |
| **Instant de défaite** | 1er t de la fenêtre où le défenseur **franchit** la ligne des épaules du bloqueur, perpendiculaire à l'axe bloqueur → QB. Null si déjà au-delà au snap (décision 0004 §2) | tracking x, y | `metrics/defeat.py` | liste des défaites |
| **Pressions concédées**, Pressure Rate | (hurry + hit + sack concédés) ÷ snaps. Drapeaux jamais cumulés sur une ligne (décision 0004 §3) | pff_*Allowed | `metrics/pressure.py` | snaps Pass Block |
| **Temps avant la passe** | médiane de `t_end`. Dépend du QB, affiché à côté du PBWR (cahier, « Dépendance au QB ») | tracking event | `etl/snaps.py` | snaps avec tracking |

## Snap de rush (DL)
Une ligne avec `pff_role == "Pass Rush"`. Table : `snaps_dl.parquet`.
- TTP du rusher : même définition, sur sa propre distance au QB.
- `pressure_made` : `pff_hurry`, `pff_hit` ou `pff_sack` = 1.
- `blocked_by` : tous les joueurs dont `pff_nflIdBlockedPlayer` le désigne, OL et chips de TE ou RB compris.

## Courbes du Play Lab (C3)
| Courbe | Calcul |
| --- | --- |
| Distance rusher → QB | √((x_R − x_QB)² + (y_R − y_QB)²) |
| Vitesse du rusher | `s`, affichée en mph |
| Profondeur bloqueur − QB | x_bloqueur − x_QB (yd), diminue quand le bloqueur recule |
| Angle épaules / course | écart 0–180° entre `o` du bloqueur et `dir` du rusher |
| Poche (C2) | enveloppe convexe des 5 OL et du QB ; couleur = surface ÷ surface maximale du dropback |

## Vérification
`make check-metrics` recalcule à la main (module csv, boucles Python, CSV bruts) PBWR PFF, TTP, instant de défaite et PBWR tracking sur 20 jeux tirés au hasard. Tout écart fait échouer la cible. Les écarts PBWR PFF / tracking de plus de 10 points sont listés en alerte, jamais supprimés.

## Limites connues (à valider avec le staff)
- **PBWR tracking ≈ 99 %, contre ≈ 90 % pour le PBWR PFF** sur l'ensemble des OL.
  - Avec 1,5 yd et 2,5 s, la pression arrive rarement aussi tôt : le TTP médian est de 3,1 s.
  - Résultat : 74 OL sur 180 éligibles en alerte d'écart. Le seuil `pressure_radius_yd` est une proposition du cahier, à calibrer sur clips.
- **Instant de défaite** : il se déclenche encore sur 32 % des snaps notés gagnés par PFF, contre 73 % des snaps perdus. Il mesure un franchissement géométrique, pas une défaite certaine : à valider sur clips.
