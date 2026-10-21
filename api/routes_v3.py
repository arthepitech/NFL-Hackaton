"""Routes V3 (périmètre réduit) : badges et statut du module Scout."""

import polars as pl
from fastapi import APIRouter, Depends

from api.filters import FilterParams
from api.routes import DEFINITIONS, get_store, scout_card
from api.store import Store
from etl import scout

router = APIRouter(prefix="/api")

RANKS = {"top": "Parmi les 10 % meilleurs", "bottom": "Parmi les 10 % moins bons"}
CONTEXTS = {"SW": "face aux échanges de défenseurs", "PA": "sur feinte de course"}


@router.get("/players/{nfl_id}/badges")
def badges(nfl_id: int, store: Store = Depends(get_store)):
    """Badges top / bottom 10 % du poste et écart de contexte, chacun avec son échantillon."""
    card = scout_card(nfl_id, FilterParams(), store)
    out = []
    for key, m in card["metrics"].items():
        if m["tier"]:
            out.append(
                {
                    "kind": m["tier"],
                    "label": f"{RANKS[m['tier']]} : {DEFINITIONS[key]['label']}",
                    "n": m["n"],
                }
            )
    snaps = store.snaps_ol.filter(pl.col("nflId") == nfl_id)
    overall = 1 - snaps["pff_loss"].cast(pl.Float64).mean() if snaps.height else None
    gap = store.thresholds["badge_context_gap_pts"]
    for block, label in CONTEXTS.items():
        ctx = snaps.filter(pl.col("pff_blockType") == block)
        if overall is None or ctx.is_empty():
            continue
        rate = 1 - ctx["pff_loss"].cast(pl.Float64).mean()
        if overall - rate >= gap:
            out.append(
                {
                    "kind": "bottom",
                    "label": f"Blocs réussis {label} : {rate:.0%} contre {overall:.0%} en général",
                    "n": ctx.height,
                }
            )
    return out


@router.get("/scout/status")
def scout_status(store: Store = Depends(get_store)):
    return scout.status(store.dir.parent / "combine")
