"""
Promotions CRUD Routes

Admin endpoints for creating, editing, listing, and managing promotions.
All validation is backend-first. Promotions consume ONLY from the promotion
allocation of the distributable pool.
"""
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/admin/promotions", tags=["Promotions"])


@router.get("")
async def list_promotions(request: Request, status: str = "all", scope: str = "all"):
    """List all promotions with optional filters."""
    db = request.app.mongodb
    from services.promotions_service import list_promotions as _list
    promos = await _list(db, status_filter=status, scope_filter=scope)
    return {"promotions": promos, "total": len(promos)}


@router.get("/{promo_id}")
async def get_promotion(promo_id: str, request: Request):
    """Get a single promotion."""
    db = request.app.mongodb
    from services.promotions_service import get_promotion as _get
    promo = await _get(db, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    return promo


@router.post("")
async def create_promotion(payload: dict, request: Request):
    """
    Create a new promotion.

    Body:
    {
        "name": "Summer Sale",
        "code": "SUMMER2026",
        "description": "20% off all products",
        "scope": "global",
        "discount_type": "percentage",
        "discount_value": 2,
        "stacking_rule": "no_stack",
        "start_date": "2026-01-01T00:00:00Z",
        "end_date": "2026-12-31T23:59:59Z",
        "max_total_uses": 100,
        "max_uses_per_customer": 1,
        "customer_message": "Enjoy 20% off!"
    }
    """
    db = request.app.mongodb
    from services.promotions_service import create_promotion as _create
    from services.settings_resolver import get_pricing_policy_tiers

    tiers = await get_pricing_policy_tiers(db)
    result = await _create(db, payload, tiers)
    if not result["success"]:
        raise HTTPException(status_code=422, detail={"errors": result["errors"]})
    response = result["promotion"]
    if result.get("warnings"):
        response = {**response, "_warnings": result["warnings"]}
    return response


@router.put("/{promo_id}")
async def update_promotion(promo_id: str, payload: dict, request: Request):
    """Update an existing promotion."""
    db = request.app.mongodb
    from services.promotions_service import update_promotion as _update
    from services.settings_resolver import get_pricing_policy_tiers

    tiers = await get_pricing_policy_tiers(db)
    result = await _update(db, promo_id, payload, tiers)
    if not result["success"]:
        raise HTTPException(status_code=422, detail={"errors": result["errors"]})
    return result["promotion"]


@router.post("/{promo_id}/deactivate")
async def deactivate_promotion(promo_id: str, request: Request):
    """Deactivate a promotion."""
    db = request.app.mongodb
    from services.promotions_service import deactivate_promotion as _deactivate
    result = await _deactivate(db, promo_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["errors"][0])
    return {"status": "deactivated"}


@router.post("/{promo_id}/activate")
async def activate_promotion(promo_id: str, request: Request):
    """Re-activate a promotion."""
    db = request.app.mongodb
    result = await db.promotions.update_one(
        {"id": promo_id, "status": {"$ne": "deleted"}},
        {"$set": {"status": "active"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    return {"status": "activated"}


@router.delete("/{promo_id}")
async def delete_promotion(promo_id: str, request: Request):
    """Soft-delete a promotion."""
    db = request.app.mongodb
    from services.promotions_service import delete_promotion as _delete
    result = await _delete(db, promo_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["errors"][0])
    return {"status": "deleted"}


@router.post("/validate-code")
async def validate_promo_code(payload: dict, request: Request):
    """
    Validate a promotion code for an order (customer-facing).
    Returns customer-safe output only.

    Body:
    {
        "code": "SUMMER2026",
        "customer_id": "cust-123",
        "line_items": [{"base_cost": 50000, "quantity": 2, "category_id": "cat-1"}],
        "has_affiliate": false,
        "has_referral": false
    }
    """
    db = request.app.mongodb
    from services.promotions_service import apply_promotion_to_order
    from services.settings_resolver import get_pricing_policy_tiers

    code = payload.get("code", "")
    if not code:
        raise HTTPException(status_code=400, detail="Promotion code is required")

    tiers = await get_pricing_policy_tiers(db)
    result = await apply_promotion_to_order(
        db,
        promo_code=code,
        customer_id=payload.get("customer_id", ""),
        line_items=payload.get("line_items", []),
        pricing_tiers=tiers,
        has_affiliate=payload.get("has_affiliate", False),
        has_referral=payload.get("has_referral", False),
    )
    return result


@router.get("/stats/summary")
async def promotion_stats(request: Request):
    """Get promotion usage statistics."""
    db = request.app.mongodb
    total = await db.promotions.count_documents({"status": {"$ne": "deleted"}})
    active = await db.promotions.count_documents({"status": "active"})
    inactive = await db.promotions.count_documents({"status": "inactive"})
    expired = await db.promotions.count_documents({"status": "expired"})
    total_uses = 0
    async for p in db.promotions.find({"status": {"$ne": "deleted"}}, {"current_uses": 1, "_id": 0}):
        total_uses += p.get("current_uses", 0)

    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "expired": expired,
        "total_uses": total_uses,
    }


# Customer-facing route (separate prefix)
customer_promo_router = APIRouter(prefix="/api/promotions", tags=["Promotions (Customer)"])


@customer_promo_router.post("/apply")
async def apply_promo_code_customer(payload: dict, request: Request):
    """
    Customer-facing endpoint to validate and apply a promotion code.
    Returns ONLY customer-safe information (no internal margins/pools).

    Body:
    {
        "code": "SUMMER2026",
        "customer_id": "cust-123",
        "line_items": [{"base_cost": 50000, "quantity": 2}]
    }
    """
    db = request.app.mongodb
    from services.promotions_service import apply_promotion_to_order
    from services.settings_resolver import get_pricing_policy_tiers

    code = payload.get("code", "")
    if not code:
        return {"valid": False, "reason": "Please enter a promotion code"}

    tiers = await get_pricing_policy_tiers(db)
    result = await apply_promotion_to_order(
        db,
        promo_code=code,
        customer_id=payload.get("customer_id", ""),
        line_items=payload.get("line_items", []),
        pricing_tiers=tiers,
        has_affiliate=payload.get("has_affiliate", False),
        has_referral=payload.get("has_referral", False),
    )

    # Ensure customer never sees internal pool math
    safe_result = {
        "valid": result["valid"],
        "reason": result.get("reason", ""),
    }
    if result["valid"]:
        safe_result["promo_code"] = result["promo_code"]
        safe_result["promo_name"] = result["promo_name"]
        safe_result["discount_amount"] = result["discount_amount"]
        safe_result["message"] = result["customer_message"]

    return safe_result
