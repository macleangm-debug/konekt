"""
Admin Promotions — bulk TZS-amount discount tool.
Lets admins apply a fixed-shilling discount across any slice of the catalog
(group / category / subcategory / vendor / explicit SKU list), with a live
margin preview BEFORE committing. Auto-expires on end_date.

Endpoints:
  GET    /api/admin/promotions                  — list all promotions
  POST   /api/admin/promotions/preview          — margin/revenue preview for a scope
  POST   /api/admin/promotions                  — create + activate
  POST   /api/admin/promotions/{id}/end         — end early (reverts prices)
  DELETE /api/admin/promotions/{id}             — cancel a never-activated promo
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime, timezone, date
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
import os
import asyncio
import jwt as pyjwt

JWT_SECRET = os.getenv("JWT_SECRET", "konekt-secret")

router = APIRouter(prefix="/api/admin/promotions", tags=["admin-promotions"])


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


mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]


def _scope_query(scope: dict) -> dict:
    """Build a Mongo filter from the scope dict."""
    q: dict = {"is_active": True}
    if scope.get("group_id"):
        q["group_id"] = scope["group_id"]
    if scope.get("category_id"):
        q["category_id"] = scope["category_id"]
    if scope.get("subcategory_id"):
        q["subcategory_id"] = scope["subcategory_id"]
    if scope.get("partner_id"):
        q["partner_id"] = scope["partner_id"]
    if scope.get("branch"):
        q["branch"] = scope["branch"]
    if scope.get("skus"):
        q["sku"] = {"$in": scope["skus"]}
    return q


class Scope(BaseModel):
    group_id: Optional[str] = ""
    category_id: Optional[str] = ""
    subcategory_id: Optional[str] = ""
    partner_id: Optional[str] = ""
    branch: Optional[str] = ""
    skus: Optional[List[str]] = None


class PreviewPayload(BaseModel):
    scope: Scope
    discount_tzs: float  # fixed shilling discount per unit (positive number)


class CreatePayload(BaseModel):
    name: str
    scope: Scope
    discount_tzs: float
    start_date: Optional[str] = ""  # ISO date or empty for "now"
    end_date: Optional[str] = ""    # ISO date or empty for "never"
    rounding: Literal["nearest_100", "nearest_500", "none"] = "nearest_100"
    clamp_floor_margin_pct: Optional[float] = 0  # refuse to apply if post-promo margin % falls below this


def _round_price(price: float, rule: str) -> float:
    if price <= 0:
        return 0
    if rule == "nearest_100":
        return float(round(price / 100) * 100)
    if rule == "nearest_500":
        return float(round(price / 500) * 500)
    return float(round(price))


@router.post("/preview")
async def preview_promotion(payload: PreviewPayload, request: Request):
    """Compute what the promo would do without applying it."""
    await _assert_admin(request)
    if payload.discount_tzs <= 0:
        raise HTTPException(status_code=400, detail="discount_tzs must be > 0")

    q = _scope_query(payload.scope.model_dump())
    total = 0
    rev_before = 0.0
    rev_after = 0.0
    cost_total = 0.0
    margin_before_total = 0.0
    margin_after_total = 0.0
    margin_violations = 0  # products that would sell at/below cost
    samples: list[dict] = []

    async for p in db.products.find(q, {"_id": 0, "id": 1, "name": 1, "customer_price": 1, "base_price": 1, "vendor_cost": 1, "sku": 1}):
        price = float(p.get("customer_price") or p.get("base_price") or 0)
        cost = float(p.get("vendor_cost") or 0)
        new_price = max(0.0, price - payload.discount_tzs)
        total += 1
        rev_before += price
        rev_after += new_price
        cost_total += cost
        margin_before_total += (price - cost)
        margin_after_total += (new_price - cost)
        if new_price <= cost:
            margin_violations += 1
        if len(samples) < 5:
            samples.append({
                "name": p.get("name"),
                "sku": p.get("sku"),
                "current_price": price,
                "new_price": new_price,
                "current_margin": price - cost,
                "new_margin": new_price - cost,
            })

    return {
        "products_matched": total,
        "revenue_before_per_unit_sum": round(rev_before, 2),
        "revenue_after_per_unit_sum": round(rev_after, 2),
        "total_discount_per_unit_sum": round(rev_before - rev_after, 2),
        "cost_total_per_unit_sum": round(cost_total, 2),
        "current_margin_per_unit_sum": round(margin_before_total, 2),
        "new_margin_per_unit_sum": round(margin_after_total, 2),
        "margin_lost_per_unit_sum": round(margin_before_total - margin_after_total, 2),
        "current_avg_margin_pct": round(100 * margin_before_total / rev_before, 1) if rev_before else 0,
        "new_avg_margin_pct": round(100 * margin_after_total / rev_after, 1) if rev_after else 0,
        "products_below_cost_after_promo": margin_violations,
        "samples": samples,
    }


@router.post("")
async def create_promotion(payload: CreatePayload, request: Request):
    admin = await _assert_admin(request)
    if payload.discount_tzs <= 0:
        raise HTTPException(status_code=400, detail="discount_tzs must be > 0")

    q = _scope_query(payload.scope.model_dump())
    matched_ids: list[str] = []
    async for p in db.products.find(q, {"_id": 0, "id": 1, "customer_price": 1, "base_price": 1, "vendor_cost": 1}):
        price = float(p.get("customer_price") or p.get("base_price") or 0)
        cost = float(p.get("vendor_cost") or 0)
        new_price = _round_price(max(0.0, price - payload.discount_tzs), payload.rounding)

        # Margin floor guard — skip items that would violate the floor
        if payload.clamp_floor_margin_pct and price > 0:
            min_margin_abs = cost * (payload.clamp_floor_margin_pct / 100.0)
            if new_price - cost < min_margin_abs:
                continue

        if new_price <= 0:
            continue
        matched_ids.append(p["id"])

    promo_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    promo = {
        "id": promo_id,
        "name": payload.name,
        "scope": payload.scope.model_dump(),
        "discount_tzs": payload.discount_tzs,
        "rounding": payload.rounding,
        "start_date": payload.start_date or now[:10],
        "end_date": payload.end_date or None,
        "status": "active",
        "product_ids": matched_ids,
        "created_by": admin.get("email") or admin.get("user_id") or "admin",
        "created_at": now,
    }
    await db.catalog_promotions.insert_one(promo)

    # Apply the discount — set original_price = current price, then reduce
    applied = 0
    for pid in matched_ids:
        p = await db.products.find_one({"id": pid}, {"_id": 0, "customer_price": 1, "base_price": 1})
        if not p:
            continue
        price = float(p.get("customer_price") or p.get("base_price") or 0)
        new_price = _round_price(max(0.0, price - payload.discount_tzs), payload.rounding)
        await db.products.update_one(
            {"id": pid},
            {"$set": {
                "original_price": price,
                "customer_price": new_price,
                "base_price": new_price,
                "active_promotion_id": promo_id,
                "active_promotion_label": payload.name,
                "promo_saves_tzs": price - new_price,
            }},
        )
        applied += 1

    promo.pop("_id", None)
    promo["applied_count"] = applied
    return promo


@router.post("/{promo_id}/end")
async def end_promotion(promo_id: str, request: Request):
    await _assert_admin(request)
    promo = await db.catalog_promotions.find_one({"id": promo_id}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Promo not found")
    if promo.get("status") == "ended":
        return {"ok": True, "already_ended": True}

    # Revert prices for every product still tagged to this promo
    reverted = 0
    async for p in db.products.find({"active_promotion_id": promo_id}, {"_id": 0, "id": 1, "original_price": 1}):
        orig = float(p.get("original_price") or 0)
        if orig <= 0:
            continue
        await db.products.update_one(
            {"id": p["id"]},
            {"$set": {"customer_price": orig, "base_price": orig},
             "$unset": {"original_price": "", "active_promotion_id": "", "active_promotion_label": "", "promo_saves_tzs": ""}},
        )
        reverted += 1

    await db.catalog_promotions.update_one({"id": promo_id}, {"$set": {
        "status": "ended", "ended_at": datetime.now(timezone.utc).isoformat(),
        "products_reverted": reverted,
    }})
    return {"ok": True, "reverted": reverted}


@router.get("")
async def list_promotions(request: Request):
    await _assert_admin(request)
    promos: list[dict] = []
    async for p in db.catalog_promotions.find({}, {"_id": 0}).sort("created_at", -1):
        promos.append(p)
    return {"promotions": promos}


@router.delete("/{promo_id}")
async def delete_promotion(promo_id: str, request: Request):
    await _assert_admin(request)
    # If still active, end it first
    promo = await db.catalog_promotions.find_one({"id": promo_id}, {"_id": 0})
    if promo and promo.get("status") == "active":
        # Revert inline
        async for p in db.products.find({"active_promotion_id": promo_id}, {"_id": 0, "id": 1, "original_price": 1}):
            orig = float(p.get("original_price") or 0)
            if orig > 0:
                await db.products.update_one(
                    {"id": p["id"]},
                    {"$set": {"customer_price": orig, "base_price": orig},
                     "$unset": {"original_price": "", "active_promotion_id": "", "active_promotion_label": "", "promo_saves_tzs": ""}},
                )
    await db.catalog_promotions.delete_one({"id": promo_id})
    return {"ok": True}


# ── Auto-expiry cron (called once per hour by a supervised task) ──
async def expire_due_promotions():
    """Revert any active promo whose end_date has passed."""
    today_iso = datetime.now(timezone.utc).date().isoformat()
    async for p in db.catalog_promotions.find({"status": "active", "end_date": {"$ne": None, "$lt": today_iso}}, {"_id": 0, "id": 1}):
        try:
            # Reuse end_promotion logic without HTTP
            reverted = 0
            async for prod in db.products.find({"active_promotion_id": p["id"]}, {"_id": 0, "id": 1, "original_price": 1}):
                orig = float(prod.get("original_price") or 0)
                if orig > 0:
                    await db.products.update_one(
                        {"id": prod["id"]},
                        {"$set": {"customer_price": orig, "base_price": orig},
                         "$unset": {"original_price": "", "active_promotion_id": "",
                                    "active_promotion_label": "", "promo_saves_tzs": ""}},
                    )
                    reverted += 1
            await db.catalog_promotions.update_one({"id": p["id"]}, {"$set": {
                "status": "ended", "ended_at": datetime.now(timezone.utc).isoformat(),
                "products_reverted": reverted, "auto_ended": True,
            }})
        except Exception:
            pass
