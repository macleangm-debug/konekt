from datetime import datetime
from fastapi import APIRouter, Request
from promotion_engine_service import calculate_safe_promotion_budget

router = APIRouter(prefix="/api/promotion-engine", tags=["Promotion Engine"])

@router.post("/preview")
async def preview_promotion(payload: dict):
    return calculate_safe_promotion_budget(
        base_amount=payload.get("base_amount", 0),
        company_markup_percent=payload.get("company_markup_percent", 20),
        extra_sell_percent=payload.get("extra_sell_percent", 10),
    )

@router.post("/campaigns")
async def create_campaign(payload: dict, request: Request):
    db = request.app.mongodb
    doc = {
        "title": payload.get("title", ""),
        "scope_type": payload.get("scope_type", "service_group"),
        "scope_key": payload.get("scope_key", ""),
        "promo_type": payload.get("promo_type", "safe_distribution"),
        "discount_percent": float(payload.get("discount_percent", 0) or 0),
        "affiliate_enabled": bool(payload.get("affiliate_enabled", True)),
        "visible_to_all_affiliates": bool(payload.get("visible_to_all_affiliates", True)),
        "starts_at": payload.get("starts_at"),
        "ends_at": payload.get("ends_at"),
        "status": payload.get("status", "active"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.promotion_campaigns.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

@router.get("/campaigns")
async def list_campaigns(request: Request):
    db = request.app.mongodb
    docs = await db.promotion_campaigns.find({}).sort("created_at", -1).to_list(length=500)
    out = []
    for d in docs:
        d["id"] = str(d["_id"])
        del d["_id"]
        out.append(d)
    return out
