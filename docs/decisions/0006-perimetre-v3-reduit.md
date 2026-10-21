# 0006 — V3 réduite (consigne : terminer en 30 minutes maximum)

Date : 2026-10-21 · Statut : acceptée

## Livré
- **Module Scout** (`etl/scout.py`) : schéma Combine et connecteur.
  - Le jeu BDB 2027 n'est pas accessible : le connecteur renvoie une table vide et le statut « non disponible » s'affiche dans l'onglet Recruteur.
  - Colonnes à confirmer à la publication du jeu.
- **Badges** (`/api/players/{id}/badges`) :
  - top / bottom 10 % du poste (`badge_top_pct`, `badge_bottom_pct`, n ≥ `min_snaps_display`) ;
  - écart de contexte (switch, play action) ≥ `badge_context_gap_pts`, soit 15 pts (exemple du cahier), seuil ajouté à `thresholds.yaml` (**signalé**) ;
  - chaque badge affiche son n.
- **Rapport adverse PDF** : onglet « Rapport », export par l'impression du navigateur (feuille de style d'impression). Aucune dépendance ajoutée.
- **3D C10** : replay react-three-fiber avec trois caméras (derrière la ligne, vue du QB, All-22).
  - Optionnel : la 2D reste la vue par défaut.
  - Design inspiré de `proposition/frontend/field3d.js`, consulté en lecture seule.

## Reporté (écarts au cahier et à VISUALISATIONS.md)
- C11 cube espace-temps, C12 poche extrudée, C13 ghost replay.
- J6 première personne / WebXR, J7 duel en orbite.
- R4 Combine × match et R5 comparables : ils attendent les données BDB 2027.
- R6 fiche PDF recruteur, R7 nuage 3D, R8 avatars à l'échelle.
- Badge « ciblage » (blitz ou stunt plus fréquent que la moyenne du poste).
- Playlists partageables avec commentaires vocaux (texte seulement).
