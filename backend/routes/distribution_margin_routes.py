from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.distribution_margin_service import (
    calculate_final_price,
    validate_distribution_split,
    calculate_distribution_components,
    build_order_margin_record,
)

router = APIRouter(prefix="/api/admin/distribution-margin", tags=["distribution-margin"])


class DistributionPreviewIn(BaseModel):
    vendor_price_tax_inclusive: float
    konekt_margin_pct: float = 20
    distribution_margin_pct: float = 10
    affiliate_pct: float = 0
    sales_pct: float = 0
    discount_pct: float = 0


class DistributionSettingsIn(BaseModel):
    konekt_margin_pct: float = 20
    distribution_margin_pct: float = 10
    affiliate_pct: float = 4
    sales_pct: float = 3
    discount_pct: float = 3
    attribution_window_days: int = 365
    minimum_payout: float = 50000


@router.post("/preview")
def preview_distribution(payload: DistributionPreviewIn):
    pricing = calculate_final_price(
        payload.vendor_price_tax_inclusive,
        payload.konekt_margin_pct,
        payload.distribution_margin_pct,
    )
    split = validate_distribution_split(
        payload.affiliate_pct,
        payload.sales_pct,
        payload.discount_pct,
        payload.distribution_margin_pct,
    )
    components = calculate_distribution_components(
        payload.vendor_price_tax_inclusive,
        payload.affiliate_pct,
        payload.sales_pct,
        payload.discount_pct,
    )
    return {
        "ok": True,
        "pricing": pricing,
        "split": split,
        "components": components,
    }


@router.get("/settings")
async def get_distribution_settings(request: Request):
    db = request.app.mongodb
    doc = await db.distribution_settings.find_one({"type": "global"}, {"_id": 0})
    if not doc:
        doc = {
            "type": "global",
            "konekt_margin_pct": 20,
            "distribution_margin_pct": 10,
            "affiliate_pct": 4,
            "sales_pct": 3,
            "discount_pct": 3,
            "attribution_window_days": 365,
            "minimum_payout": 50000,
        }
    return {"ok": True, "settings": doc}


@router.put("/settings")
async def save_distribution_settings(payload: DistributionSettingsIn, request: Request):
    db = request.app.mongodb
    split = validate_distribution_split(
        payload.affiliate_pct,
        payload.sales_pct,
        payload.discount_pct,
        payload.distribution_margin_pct,
    )
    if not split["is_valid"]:
        return {
            "ok": False,
            "error": f"Distribution split ({split['total_split_pct']}%) exceeds distribution margin ({split['distribution_margin_pct']}%)",
            "split": split,
        }

    doc = payload.dict()
    doc["type"] = "global"
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.distribution_settings.update_one(
        {"type": "global"},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "settings": doc, "split": split}
