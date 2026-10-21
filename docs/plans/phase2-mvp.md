# Plan — Phase 2 : MVP (Scout Card OL + Play Lab)

## Questions de coach
| Fonctionnalité | Question |
| --- | --- |
| Scout Card OL | « Mon LT tient-il ses blocs, et en combien de temps la pression arrive-t-elle sur lui ? » |
| Filtres | « Et sur 3rd & long, face au Cover-1, en red zone ? » |
| Liste des défaites | « Montre-moi ses défaites, de la plus rapide à la plus lente. » |
| C1 / C2 / C3 | « À quelle seconde perd-il, et où la poche s'effondre-t-elle ? » |
| J1 | (joueur) « Où j'en suis cette semaine ? » |
| J3 | (joueur) « Où mon set a-t-il été trop court ? » |

## Champs sources
- `pff.parquet` : pff_role, pff_positionLinedUp, pff_hurryAllowed, pff_hitAllowed, pff_sackAllowed, pff_beatenByDefender, pff_nflIdBlockedPlayer, pff_blockType, pff_hurry, pff_hit, pff_sack.
- `tracking/<gameId>.parquet` (normalisé) : x, y, s, o, dir, t, frame_end, event.
- `plays.parquet` : situation (down, yardsToGo, quarter, score_diff, yards_to_goal, offenseFormation, personnelO, personnelD, pff_passCoverage, pff_playAction, dropBackType, defensiveTeam, week).
- `players.parquet` : displayName, officialPosition, height_in, weight, birthDate, collegeName.
- Champs absents, calculés depuis le tracking : TTP, instant de défaite, PBWR tracking, temps avant la passe (`t_end`).

## Fichiers

| Couche | Fichiers |
| --- | --- |
| Calcul pur | `metrics/duel.py` (images bloqueur / rusher / QB alignées), `metrics/ttp.py`, `metrics/defeat.py`, `metrics/pbwr.py`, `metrics/pressure.py` |
| Stockage | `etl/snaps.py` : `snaps_ol.parquet` (1 ligne par snap Pass Block) et `snaps_dl.parquet` (1 ligne par snap Pass Rush) ; branché dans `etl/build.py` |
| Vérification | `etl/check_metrics.py` : recalcul indépendant (module `csv`, boucles Python, CSV bruts) sur 20 jeux au hasard, plus l'alerte d'écart PBWR PFF / tracking > 10 points ; rapport `docs/reports/check-metrics.md` |
| API | `api/main.py`, `api/store.py` (chargement Parquet), `api/filters.py`, `api/routes.py` |
| UI | `ui/src/api.ts`, `ui/src/components/{FiltersBar,ScoutCard,MetricTile,PlayList,DefeatList,FieldCanvas,DuelTimeline,PlayLab,FakeVideo,PlayerCard}.tsx` |
| Tests | `tests/test_metrics_*.py` (unitaires et jeu 1444), `tests/test_snaps.py`, `tests/test_api_routes.py`, `tests/test_check_metrics.py`, `ui/src/**/*.test.tsx` |
| Docker | `Dockerfile` (API), `ui/Dockerfile`, `docker-compose.yml`, cibles `docker-*` du Makefile |

## Règles d'affichage appliquées
- `n snaps` à côté de chaque pourcentage, grisé sous `min_snaps_display`.
- Vert (top 10 %) et rouge (bottom 10 %) calculés parmi les OL ayant au moins `min_snaps_display` snaps sous les mêmes filtres, avec une légende toujours visible.
- Chaque chiffre est cliquable et ouvre la liste des jeux. Chaque ligne de défaite ouvre le Play Lab à l'instant de la défaite.
- Le temps avant la passe s'affiche à côté du PBWR (cahier, « Dépendance au QB »).
- Écart PBWR PFF / tracking > 10 points : alerte visible sur la carte, rien n'est supprimé.
