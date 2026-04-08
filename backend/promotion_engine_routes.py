"""
Phase 45 — Platform Promotions Engine Routes

Admin CRUD for promotions, pricing preview, safety validation.
Extends existing /api/promotion-engine/ prefix.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.platform_promotion_engine import (
    validate_promotion_safety,
    resolve_active_promotions,
    STACKING_POLICIES,
)

router = APIRouter(prefix="/api/promotion-engine", tags=["Promotion Engine"])


# ─── Models ───

class PromotionCreate(BaseModel):
    title: str
    scope: str = "global"          # global | category | product
    scope_target: Optional[str] = None
    promo_type: str = "percentage"  # percentage | fixed
    promo_value: float = 0
    stacking_policy: str = "no_stack"  # no_stack | cap_total | reduce_affiliate
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    status: str = "draft"          # draft | active | paused | ended


class PromotionUpdate(BaseModel):
    title: Optional[str] = None
    scope: Optional[str] = None
    scope_target: Optional[str] = None
    promo_type: Optional[str] = None
    promo_value: Optional[float] = None
    stacking_policy: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    status: Optional[str] = None


class SafetyPreviewRequest(BaseModel):
    vendor_price: float
    operational_margin_pct: float = 20
    distributable_margin_pct: float = 10
    promo_type: str = "percentage"
    promo_value: float = 0
    stacking_policy: str = "no_stack"
    affiliate_share_pct: float = 40
    sales_share_pct: float = 30
    discount_share_pct: float = 30


# ─── Helper ───

async def _get_margin_and_split(db):
    """Fetch current global margin rule and distribution split."""
    from services.margin_engine import resolve_margin_rule, get_split_settings

    rule = await resolve_margin_rule(db)
    split = await get_split_settings(db)
    return {
        "operational_margin_pct": rule.get("operational_margin_pct", 20),
        "distributable_margin_pct": rule.get("distributable_margin_pct", 10),
        "affiliate_share_pct": split.get("affiliate_share_pct", 40),
        "sales_share_pct": split.get("sales_share_pct", 30),
        "discount_share_pct": split.get("discount_share_pct", 30),
    }


# ─── CRUD ───

@router.post("/promotions")
async def create_promotion(payload: PromotionCreate, request: Request):
    db = request.app.mongodb

    if payload.stacking_policy not in STACKING_POLICIES:
        raise HTTPException(400, f"Invalid stacking_policy. Must be one of: {STACKING_POLICIES}")

    if payload.scope not in ("global", "category", "product"):
        raise HTTPException(400, "scope must be one of: global, category, product")

    if payload.scope != "global" and not payload.scope_target:
        raise HTTPException(400, "scope_target is required for non-global promotions")

    # If activating, run safety check against a representative product
    if payload.status == "active":
        config = await _get_margin_and_split(db)
        # Use a sample vendor price to validate
        sample_prices = [50000, 200000, 500000]
        for sp in sample_prices:
            check = validate_promotion_safety(
                vendor_price=sp,
                operational_margin_pct=config["operational_margin_pct"],
                distributable_margin_pct=config["distributable_margin_pct"],
                promo_type=payload.promo_type,
                promo_value=payload.promo_value,
                affiliate_share_pct=config["affiliate_share_pct"],
                sales_share_pct=config["sales_share_pct"],
                discount_share_pct=config["discount_share_pct"],
                stacking_policy=payload.stacking_policy,
            )
            if not check["safe"]:
                raise HTTPException(
                    400,
                    f"Unsafe promotion at vendor price TZS {sp:,.0f}: {check['blocked_reason']}. "
                    "Save as draft first and adjust the value."
                )

    now = datetime.now(timezone.utc)
    doc = {
        "id": f"promo_{now.strftime('%Y%m%d%H%M%S')}_{int(now.timestamp()) % 10000}",
        "title": payload.title,
        "scope": payload.scope,
        "scope_target": payload.scope_target,
        "promo_type": payload.promo_type,
        "promo_value": payload.promo_value,
        "stacking_policy": payload.stacking_policy,
        "starts_at": payload.starts_at,
        "ends_at": payload.ends_at,
        "status": payload.status,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.platform_promotions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/promotions")
async def list_promotions(request: Request):
    db = request.app.mongodb
    docs = await db.platform_promotions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@router.get("/promotions/{promo_id}")
async def get_promotion(promo_id: str, request: Request):
    db = request.app.mongodb
    doc = await db.platform_promotions.find_one({"id": promo_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Promotion not found")
    return doc


@router.put("/promotions/{promo_id}")
async def update_promotion(promo_id: str, payload: PromotionUpdate, request: Request):
    db = request.app.mongodb
    existing = await db.platform_promotions.find_one({"id": promo_id})
    if not existing:
        raise HTTPException(404, "Promotion not found")

    updates = {k: v for k, v in payload.dict().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    # If activating, run safety check
    new_status = updates.get("status", existing.get("status"))
    if new_status == "active":
        config = await _get_margin_and_split(db)
        pt = updates.get("promo_type", existing.get("promo_type", "percentage"))
        pv = updates.get("promo_value", existing.get("promo_value", 0))
        sp_policy = updates.get("stacking_policy", existing.get("stacking_policy", "no_stack"))

        for sp in [50000, 200000, 500000]:
            check = validate_promotion_safety(
                vendor_price=sp,
                operational_margin_pct=config["operational_margin_pct"],
                distributable_margin_pct=config["distributable_margin_pct"],
                promo_type=pt,
                promo_value=pv,
                affiliate_share_pct=config["affiliate_share_pct"],
                sales_share_pct=config["sales_share_pct"],
                discount_share_pct=config["discount_share_pct"],
                stacking_policy=sp_policy,
            )
            if not check["safe"]:
                raise HTTPException(
                    400,
                    f"Cannot activate: unsafe at vendor price TZS {sp:,.0f}. {check['blocked_reason']}"
                )

    await db.platform_promotions.update_one({"id": promo_id}, {"$set": updates})
    doc = await db.platform_promotions.find_one({"id": promo_id}, {"_id": 0})
    return doc


@router.delete("/promotions/{promo_id}")
async def delete_promotion(promo_id: str, request: Request):
    db = request.app.mongodb
    result = await db.platform_promotions.delete_one({"id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Promotion not found")
    return {"ok": True, "deleted": promo_id}


# ─── Safety Preview ───

@router.post("/preview")
async def preview_promotion_safety(payload: SafetyPreviewRequest, request: Request):
    """
    Live pricing preview for admin.
    Shows: standard price, promo price, discount, remaining margin,
    remaining distributable, sales/affiliate effect, safety status.
    """
    result = validate_promotion_safety(
        vendor_price=payload.vendor_price,
        operational_margin_pct=payload.operational_margin_pct,
        distributable_margin_pct=payload.distributable_margin_pct,
        promo_type=payload.promo_type,
        promo_value=payload.promo_value,
        affiliate_share_pct=payload.affiliate_share_pct,
        sales_share_pct=payload.sales_share_pct,
        discount_share_pct=payload.discount_share_pct,
        stacking_policy=payload.stacking_policy,
    )
    return result


@router.post("/preview-with-defaults")
async def preview_with_system_defaults(request: Request):
    """
    Preview using the system's actual margin rules and distribution split.
    Body: { vendor_price, promo_type, promo_value, stacking_policy }
    """
    db = request.app.mongodb
    body = await request.json()
    config = await _get_margin_and_split(db)

    result = validate_promotion_safety(
        vendor_price=float(body.get("vendor_price", 100000)),
        operational_margin_pct=config["operational_margin_pct"],
        distributable_margin_pct=config["distributable_margin_pct"],
        promo_type=body.get("promo_type", "percentage"),
        promo_value=float(body.get("promo_value", 0)),
        affiliate_share_pct=config["affiliate_share_pct"],
        sales_share_pct=config["sales_share_pct"],
        discount_share_pct=config["discount_share_pct"],
        stacking_policy=body.get("stacking_policy", "no_stack"),
    )
    result["system_config"] = config
    return result


# ─── Active Promos For Checkout ───

@router.get("/active")
async def get_active_promotions(request: Request, product_id: str = None, category: str = None):
    """
    Returns applicable active promotion(s) for a product.
    Used by all checkout flows (guest, in-account, affiliate, sales).
    """
    db = request.app.mongodb
    promos = await resolve_active_promotions(db, product_id=product_id, category=category)
    return promos
