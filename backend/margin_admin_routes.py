"""
Margin Admin Routes — View/edit global tiers, test pricing resolution.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import Optional

from services.tiered_margin_engine import (
    get_global_tiers, save_global_tiers, resolve_price,
    resolve_service_sell_price, DEFAULT_GLOBAL_TIERS,
)

router = APIRouter(prefix="/api/admin/margins", tags=["Margin Engine"])


class TierItem(BaseModel):
    min: float
    max: float
    type: str = "percentage"  # percentage | fixed | hybrid
    value: float = 0
    percent: float = 0
    fixed: float = 0
    label: str = ""


class GlobalTiersUpdate(BaseModel):
    tiers: list


class PriceResolveRequest(BaseModel):
    base_price: float
    product_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    category_id: Optional[str] = None
    group: Optional[str] = None


class ServicePriceRequest(BaseModel):
    vendor_cost: float
    margin_percent: float


@router.get("/global")
async def get_global_margin_tiers(request: Request):
    """View current global margin tiers."""
    db = request.app.mongodb
    tiers = await get_global_tiers(db)
    return {"scope": "global", "tiers": tiers, "defaults": DEFAULT_GLOBAL_TIERS}


@router.put("/global")
async def update_global_margin_tiers(payload: GlobalTiersUpdate, request: Request):
    """Update global margin tiers."""
    db = request.app.mongodb
    await save_global_tiers(db, payload.tiers)
    return {"ok": True, "tiers": payload.tiers}


@router.post("/resolve")
async def resolve_pricing(payload: PriceResolveRequest, request: Request):
    """Test pricing resolution through the override hierarchy."""
    db = request.app.mongodb
    result = await resolve_price(
        db,
        payload.base_price,
        product_id=payload.product_id,
        subcategory_id=payload.subcategory_id,
        category_id=payload.category_id,
        group=payload.group,
    )
    return result


@router.post("/resolve-service")
async def resolve_service_pricing(payload: ServicePriceRequest, request: Request):
    """Resolve service sell price from vendor cost + margin %."""
    sell = resolve_service_sell_price(payload.vendor_cost, payload.margin_percent)
    return {"vendor_cost": payload.vendor_cost, "margin_percent": payload.margin_percent, "sell_price": sell}


@router.post("/preview")
async def preview_all_tiers(request: Request):
    """Preview pricing for sample amounts across all tiers."""
    db = request.app.mongodb
    tiers = await get_global_tiers(db)
    sample_prices = [1000, 5000, 10000, 25000, 50000, 100000, 200000, 500000, 1000000, 5000000]
    results = []
    for price in sample_prices:
        r = await resolve_price(db, price)
        results.append({
            "base_price": price,
            "final_price": r["final_price"],
            "margin": round(r["final_price"] - price, 2),
            "margin_pct": round((r["final_price"] - price) / price * 100, 1) if price else 0,
            "tier": r.get("tier", {}).get("label", ""),
            "resolved_from": r["resolved_from"],
        })
    return {"tiers": tiers, "preview": results}
