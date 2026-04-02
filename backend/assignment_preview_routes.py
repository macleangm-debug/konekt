"""
Assignment Preview Routes — Admin endpoints for:
  - Previewing ranked vendor candidates for a product (before assignment)
  - Explaining stored assignment reasoning for an order (after assignment)
  - Listing recent assignment decisions
"""
from fastapi import APIRouter, HTTPException, Request, Query
from services.stock_first_assignment_service import get_product_candidates_preview
from services.assignment_decision_service import (
    get_assignment_explanation,
    list_assignment_decisions,
)

router = APIRouter(prefix="/api/admin/assignment", tags=["Assignment Admin"])


@router.get("/candidates/{product_id}")
async def preview_candidates(
    product_id: str,
    quantity: int = Query(1, ge=1),
    request: Request = None,
):
    """
    Preview ranked vendor candidates for a product without making an assignment.
    Shows stock availability, tiers, eligibility, and warnings.
    """
    db = request.app.mongodb
    result = await get_product_candidates_preview(db, product_id, quantity)
    return result


@router.get("/explain/{order_id}")
async def explain_assignment(order_id: str, request: Request = None):
    """
    Show the stored assignment decision for an order.
    Returns the full audit record: engine used, candidates, chosen vendor,
    reason code, fallback reason, item-level assignments, and timestamp.
    """
    db = request.app.mongodb
    decision = await get_assignment_explanation(db, order_id)
    if not decision:
        raise HTTPException(status_code=404, detail="No assignment decision found for this order")
    return decision


@router.get("/decisions")
async def list_decisions(
    limit: int = Query(50, ge=1, le=200),
    engine: str = Query(None),
    request: Request = None,
):
    """
    List recent assignment decisions, optionally filtered by engine type.
    Engine types: stock_first_product, promo_capability, service_capability_performance,
                  manual_override, fallback_item_vendor, fallback_product_catalog
    """
    db = request.app.mongodb
    decisions = await list_assignment_decisions(db, limit=limit, engine_filter=engine)
    return decisions
