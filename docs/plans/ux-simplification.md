# Plan — Simplification du vocabulaire et de l'interface

**Question servie** : « Je comprends chaque écran sans connaître le jargon ni les colonnes de données. »

## Principes
- Français courant d'abord, terme football ensuite si utile, entre parenthèses : « Échange de défenseurs (stunt) ».
- Chaque chiffre : une phrase lisible, son échantillon « sur N actions », un bouton « ? » qui donne la définition.
- **Filtres** :
  - situations prêtes en un clic (présélections) ;
  - filtres détaillés repliés dans « Plus de filtres », rangés par thème ;
  - filtres actifs affichés en étiquettes retirables.
  - Tous les filtres de CLAUDE.md §7 restent disponibles.
- Aucune donnée ni règle de calcul ne change : seuls les libellés et la mise en page changent.

## Correspondance des termes

| Avant | Après |
| --- | --- |
| Scout Card / Matchups / Play Lab / Carte joueur / Recruteur / Rapport | Fiche joueur / Duels et adversaire / Revoir une action / Mon suivi / Recrutement / Rapport de match |
| snaps | actions |
| Blocs gagnés (PFF) / (tracking) / seul (island) | Blocs réussis / Blocs réussis (capteurs) / Blocs réussis sans aide |
| Pressions concédées / Temps avant la passe | Pressions laissées passer / Temps pour lancer |
| Down, Dropback, Personnel off./déf. | Tentative, Type de lancer, Joueurs en attaque / en défense |
| Set / Puissance / Switch / stunt | Placement trop lent (set) / Repoussé en force / Échange de défenseurs (stunt) |

## Fichiers
`ui/src/format.ts` (libellés), `ui/src/components/FiltersBar.tsx` (présélections + panneau), `MetricTile.tsx` (aide « ? »), `App.tsx` (onglets), `index.css` (style), libellés des définitions dans `api/routes.py` et `api/routes_v2.py`, textes des composants. Tests UI mis à jour, captures d'écran.
