# 0004 — Fenêtre d'analyse, instant de défaite, filtres

Date : 2026-10-21 · Statut : acceptée (à revoir avec le staff)

## 1. Fin de dropback
- Après la passe, tous les joueurs courent vers le ballon : un rusher « dépasse » alors son bloqueur sans que ce soit une défaite.
- TTP, instant de défaite et PBWR tracking ne sont donc cherchés que sur `0 < t ≤ t_end`.
- `t_end` est la 1re image portant un événement de fin de dropback, présent dans les données : `pass_forward`, `autoevent_passforward`, `qb_sack`, `qb_strip_sack`, `run`, `handoff`, `lateral`. Liste dans `config/enums.py` (`END_EVENTS`).
- Sans aucun de ces événements, `t_end` est la dernière image du tracking.
- Le PBWR tracking applique en plus `t ≤ win_window_s`.

## 2. Instant de défaite
- `CLAUDE.md` : « premier t où le rusher dépasse les épaules du bloqueur dans l'axe du QB ».
- Mise en œuvre :
  - u = vecteur unitaire bloqueur → QB ;
  - défaite = 1re image où (rusher − bloqueur) · u > 0, autrement dit le rusher a franchi la ligne des épaules, perpendiculaire à l'axe bloqueur → QB.
- « Dépasser » suppose un franchissement. Si le rusher est déjà au-delà de la ligne au snap, la défaite est **non mesurable** (null), et non comptée comme une défaite.
  - Cas typique : DL aligné à l'intérieur du tackle sur un jeu sous le centre, où l'axe tackle → QB est presque latéral.
  - Sans cette règle, 19 % des snaps avaient une « défaite » à 0,2 s ou moins (constat sur captures du 2026-10-21).
- `o` (orientation) n'est **pas** utilisé dans ce calcul. Il sert seulement à l'angle d'épaules de la timeline C3.
- À valider sur clips.

## 3. Pressure Rate
- Les drapeaux hurry, hit, sack et beaten ne se cumulent jamais sur une même ligne (vérifié sur 46 057 snaps Pass Block et 36 362 snaps Pass Rush).
- La somme vaut donc l'indicateur par snap.

## 4. Seuils de filtres
- Distance (≤ 3, 4–6, ≥ 7), écarts de score et red zone (20 yards) ne sont pas des seuils de métrique.
- Ils vivent dans `config/filters.yaml` et ne sont jamais codés en dur. `config/thresholds.yaml` n'est pas modifié.

## 5. Docker
- Le modèle fourni dans `inspiration/` est adapté :
  - données montées depuis `./data` en lecture seule, et `./data/processed` en écriture ;
  - dépendances installées depuis `pyproject.toml` (pas de `requirements.txt` en double) ;
  - pas de mypy, qui n'est pas dans la stack (`make lint` = ruff).
