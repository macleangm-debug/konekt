"""Per-product price override — lets admins set a targeted discount or fixed
customer_price on a single product on top of bulk campaigns.
"""
import os
import jwt as pyjwt
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.settings_resolver import get_pricing_policy_tiers
from commission_margin_engine_service import resolve_tier

MONGO_URL = os.environ.get("MONGO_URL", "")
DB_NAME = os.environ.get("DB_NAME", "konekt_db")
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/api/admin/products", tags=["Admin Product Pricing"])


async def _assert_admin(request: Request) -> dict:
    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Admin JWT required")
    try:
        payload = pyjwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    role = (payload.get("role") or "").lower()
    is_admin = payload.get("is_admin") or role in ("admin", "super_admin", "ops")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


class SinglePriceOverride(BaseModel):
    mode: str  # "fixed" | "percentage_off" | "clear"
    value: Optional[float] = None  # fixed price OR discount %
    reason: Optional[str] = ""


class BulkPriceOverride(BaseModel):
    product_ids: List[str]
    mode: str  # "fixed" | "percentage_off" | "clear"
    value: Optional[float] = None
    reason: Optional[str] = ""


async def _find_product(product_id: str):
    from bson import ObjectId
    p = await db.products.find_one({"id": product_id})
    if not p:
        try:
            p = await db.products.find_one({"_id": ObjectId(product_id)})
        except Exception:
            pass
    return p


async def _resolve_base_from_tier(product: dict):
    """Compute the tier-derived base customer_price (before any override)."""
    tiers = await get_pricing_policy_tiers(db)
    cost = float(product.get("vendor_cost") or 0)
    tier = resolve_tier(cost, tiers)
    if not tier or cost <= 0:
        return float(product.get("base_price") or product.get("customer_price") or 0)
    margin_pct = float(tier.get("total_margin_pct", 0))
    return round(cost * (1 + margin_pct / 100.0), 0)


@router.post("/{product_id}/price-override")
async def set_single_price_override(
    product_id: str,
    payload: SinglePriceOverride,
    request: Request,
):
    admin = await _assert_admin(request)
    product = await _find_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    base = await _resolve_base_from_tier(product)

    if payload.mode == "clear":
        final_price = base
        override_doc = {
            "customer_price": final_price,
            "base_price": final_price,
            "customer_price_override": None,
            "price_override_mode": None,
            "price_override_value": None,
            "price_override_reason": None,
            "price_override_set_by": None,
            "price_override_set_at": None,
        }
    elif payload.mode == "fixed":
        if payload.value is None or payload.value <= 0:
            raise HTTPException(status_code=400, detail="Fixed price must be > 0")
        final_price = round(float(payload.value), 0)
        override_doc = {
            "customer_price": final_price,
            "base_price": base,  # preserve engine-calculated base for reference
            "customer_price_override": final_price,
            "price_override_mode": "fixed",
            "price_override_value": final_price,
            "price_override_reason": payload.reason or "",
            "price_override_set_by": admin.get("email") or admin.get("user_id") or "admin",
            "price_override_set_at": datetime.now(timezone.utc).isoformat(),
        }
    elif payload.mode == "percentage_off":
        if payload.value is None or payload.value < 0 or payload.value >= 100:
            raise HTTPException(status_code=400, detail="Discount must be between 0 and 99.99")
        final_price = round(base * (1 - float(payload.value) / 100.0), 0)
        override_doc = {
            "customer_price": final_price,
            "base_price": base,
            "customer_price_override": final_price,
            "price_override_mode": "percentage_off",
            "price_override_value": float(payload.value),
            "price_override_reason": payload.reason or "",
            "price_override_set_by": admin.get("email") or admin.get("user_id") or "admin",
            "price_override_set_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        raise HTTPException(status_code=400, detail="mode must be 'fixed', 'percentage_off', or 'clear'")

    await db.products.update_one({"_id": product["_id"]}, {"$set": override_doc})
    return {
        "success": True,
        "product_id": product.get("id") or str(product["_id"]),
        "base_price": base,
        "final_customer_price": override_doc["customer_price"],
        "override": {
            "mode": override_doc["price_override_mode"],
            "value": override_doc["price_override_value"],
        },
    }


@router.post("/bulk-price-override")
async def bulk_price_override(
    payload: BulkPriceOverride,
    request: Request,
):
    admin = await _assert_admin(request)
    if not payload.product_ids:
        raise HTTPException(status_code=400, detail="At least one product_id required")
    if payload.mode not in ("fixed", "percentage_off", "clear"):
        raise HTTPException(status_code=400, detail="Invalid mode")

    tiers = await get_pricing_policy_tiers(db)
    updated = 0
    skipped = 0

    for pid in payload.product_ids:
        product = await _find_product(pid)
        if not product:
            skipped += 1
            continue

        cost = float(product.get("vendor_cost") or 0)
        tier = resolve_tier(cost, tiers)
        if tier and cost > 0:
            margin_pct = float(tier.get("total_margin_pct", 0))
            base = round(cost * (1 + margin_pct / 100.0), 0)
        else:
            base = float(product.get("base_price") or product.get("customer_price") or 0)

        if payload.mode == "clear":
            final = base
            set_doc = {
                "customer_price": final,
                "base_price": final,
                "customer_price_override": None,
                "price_override_mode": None,
                "price_override_value": None,
                "price_override_reason": None,
                "price_override_set_by": None,
                "price_override_set_at": None,
            }
        elif payload.mode == "fixed":
            if payload.value is None or payload.value <= 0:
                raise HTTPException(status_code=400, detail="Fixed price must be > 0")
            final = round(float(payload.value), 0)
            set_doc = {
                "customer_price": final,
                "base_price": base,
                "customer_price_override": final,
                "price_override_mode": "fixed",
                "price_override_value": final,
                "price_override_reason": payload.reason or "",
                "price_override_set_by": admin.get("email") or "admin",
                "price_override_set_at": datetime.now(timezone.utc).isoformat(),
            }
        else:  # percentage_off
            if payload.value is None or payload.value < 0 or payload.value >= 100:
                raise HTTPException(status_code=400, detail="Discount must be between 0 and 99.99")
            final = round(base * (1 - float(payload.value) / 100.0), 0)
            set_doc = {
                "customer_price": final,
                "base_price": base,
                "customer_price_override": final,
                "price_override_mode": "percentage_off",
                "price_override_value": float(payload.value),
                "price_override_reason": payload.reason or "",
                "price_override_set_by": admin.get("email") or "admin",
                "price_override_set_at": datetime.now(timezone.utc).isoformat(),
            }

        await db.products.update_one({"_id": product["_id"]}, {"$set": set_doc})
        updated += 1

    return {"success": True, "updated": updated, "skipped": skipped}
