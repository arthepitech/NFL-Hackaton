# Plan — Phase 3 : V2 (Matchups, diagnostic, vidéo, joueur, recruteur)

## Questions de coach

| Visuel / fonction | Question |
| --- | --- |
| C4 Matrice OL × DL | « Qui bat qui, et qui va-t-on affronter ? » |
| C5 Origine des pressions | « Par où arrive la pression sur notre ligne ? » |
| C6 Couverture × situation | « Quelle couverture encaisse sur 3rd & long ? » |
| C7 Paquets de pression | « Quel blitz fait pression le plus vite ? » |
| C8 Small multiples | « Y a-t-il un schéma récurrent dans ses défaites ? » |
| C9 Spaghetti | « Le rusher gagne-t-il dehors ou dedans ? » |
| Diagnostic assisté | « Pourquoi mon LT est-il battu ? » (cause probable, confirmée par le coach) |
| Synchro vidéo | « Montre-moi le clip calé sur le snap » |
| J2 Progression | « Est-ce que je progresse ? » |
| J4 Mes pieds vs référence | « Que fait le meilleur que je ne fais pas ? » |
| J5 Playlist | « Que dois-je revoir avant jeudi ? » |
| R1 Radar | « Quel est son profil ? » |
| R2 Beeswarm | « Où se situe-t-il dans la ligue ? » |
| R3 Poids × win rate face aux rushers rapides | « Un tackle de 315 lbs tient-il la vitesse ? » |

## Champs sources
- pffScoutingData : pff_role, pff_positionLinedUp, pff_blockType, pff_nflIdBlockedPlayer, pff_*Allowed, pff_beatenByDefender, pff_hurry/hit/sack.
- plays : down, yardsToGo, pff_passCoverage, passResult, playResult, defensiveTeam, possessionTeam, week.
- players : weight, officialPosition, displayName.
- tracking : x, y, s, o, dir, t.
- Absents, calculés depuis le tracking : vitesse du rusher, gap d'origine, recul du bloqueur, côté de la défaite.
- **EPA** : nflverse non joint, la colonne n'est pas affichée (écart signalé).

## Fichiers

| Couche | Fichiers |
| --- | --- |
| Calcul pur | `metrics/island.py`, `metrics/speed.py`, `metrics/pressure_package.py`, `metrics/gap.py`, `metrics/diagnosis.py` (+ caractéristiques du duel dans `metrics/duel.py`) |
| ETL | `etl/snaps.py` enrichi (island, vitesse et poids du rusher, caractéristiques du diagnostic, gaps) ; `plays_rush.parquet` (1 ligne par jeu de passe : paquet, pression, TTP) |
| Config | `config/thresholds.yaml` (+ heavy_rusher_pct, seuils diagnostic : signalé), `config/filters.yaml` (+ package_max), `config/enums.py` (+ HELP_BLOCK_TYPES, FACING_OL, DIAGNOSIS_CAUSES) |
| API | `api/club.py` (DuckDB : tags, playlists, vidéo), `api/routes_v2.py` (matchups, protection, couvertures, paquets, chemins, diagnostic, vidéo, progression, set, radar, beeswarm, vitesse) |
| UI | onglet Matchups (C4–C7), Scout Card (Island, C8, C9, R1), Play Lab (diagnostic, synchro vidéo), Carte joueur (J2, J4, J5), onglet Recruteur (R1–R3) |
| Tests | `tests/test_metrics_v2.py`, `tests/test_api_v2.py`, `tests/test_club.py`, tests UI |
