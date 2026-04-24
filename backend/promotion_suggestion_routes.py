"""
Promotion Suggestion Engine — AI-style assistant for standard promotions.
─────────────────────────────────────────────────────────────────────────
Admin picks "Suggest 5 promotions" → backend walks the catalog, applies
the tiered-margin engine, and returns N actionable promotion proposals
with per-product expected profit / savings for the buyer.

Unlike the group-deal sibling this does NOT require a min-quantity gate —
suggestions are pure "% off" or "flat TZS off" that the admin can one-click
publish as a `platform_promotions` row.

Public contract:
  POST /api/admin/promotions/suggest  body:
    {
      "branch":           "Promotional Materials" | "Office Equipment" | ...
      "min_margin_pct":   10,              // only suggest products with ≥ this total margin %
      "pool_share_pct":   35,              // % of distributable margin to pass to buyer
      "max_suggestions":  5,               // how many suggestions to return
      "product_ids":      null | [id,...]  // optional: only suggest for these products
      "promo_style":      "percentage"     // "percentage" | "flat_off"
    }
  → { "suggestions": [ {product_id, product_name, current_customer_price,
                         suggested_promo_price, discount_amount, discount_pct,
                         pool_share_pct, tier_label, expected_platform_profit,
                         promo_style, suggested_duration_days, headline }, ... ] }

  POST /api/admin/promotions/bulk-create  body:
    { "entries": [ { "product_id": "...", "discount_pct": 12,
                     "discount_amount": 0, "duration_days": 14 }, ... ] }
  → { "created_count": N, "promotions": [...] }
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin/promotions", tags=["Promotion Suggestions"])

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "konekt_db")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

_security = HTTPBearer(auto_error=False)


# ──────────── Auth (admin-only) ────────────

async def _require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    # Reuse server.get_admin_user's validator by passing the credentials through.
    from server import get_admin_user
    return await get_admin_user(credentials)


# ──────────── Tier engine (same math as group-deal suggester) ────────────

async def _tier_for_branch(branch: str) -> dict:
    """Look up the active tier for a branch from admin_settings.pricing_policy_tiers."""
    settings = await db.admin_settings.find_one({"key": "pricing_policy_tiers"})
    if not settings:
        return {
            "label": "Default",
            "total_margin_pct": 15.0,
            "distributable_margin_pct": 10.0,
        }
    branches = (settings.get("value") or {}).get("branches") or {}
    branch_cfg = branches.get(branch) or branches.get("default") or {}
    tiers = branch_cfg.get("tiers") or []
    # Pick the active tier — first one flagged active, or the first tier.
    active = next((t for t in tiers if t.get("is_active")), tiers[0] if tiers else None)
    if not active:
        return {"label": "Default", "total_margin_pct": 15.0, "distributable_margin_pct": 10.0}
    return {
        "label": active.get("label") or active.get("name") or "Tier",
        "total_margin_pct": float(active.get("total_margin_pct") or 0),
        "distributable_margin_pct": float(active.get("distributable_margin_pct") or 0),
    }


def _suggest_for_product(
    p: dict, tier: dict, pool_share_pct: float, promo_style: str
) -> Optional[dict]:
    vendor_cost = float(p.get("vendor_cost") or 0)
    customer_price = float(p.get("customer_price") or p.get("base_price") or 0)
    if vendor_cost <= 0 or customer_price <= 0:
        return None

    total_margin_pct = tier["total_margin_pct"]
    distributable_pct = tier["distributable_margin_pct"]
    if distributable_pct <= 0:
        return None

    # Cap the discount at (pool_share_pct / 100) of the distributable pool.
    max_discount_pct = distributable_pct * (pool_share_pct / 100.0)
    discount_amount = round(customer_price * (max_discount_pct / 100.0), 0)
    if discount_amount < 100:  # not worth surfacing
        return None

    promo_price = round(customer_price - discount_amount, 0)
    # Safety: never let the promo price dip below vendor cost (protects core margin).
    if promo_price <= vendor_cost:
        return None

    # Platform kept margin per unit after the promo is applied
    expected_platform_profit = round(promo_price - vendor_cost, 0)

    # Round the percentage to a whole number for cleaner promo labels (e.g. 12% off)
    round_pct = round(max_discount_pct)

    # Generate a punchy customer-facing headline
    if promo_style == "percentage":
        headline = f"{round_pct}% off {p.get('name')}"
    else:
        headline = f"TZS {int(discount_amount):,} off {p.get('name')}"

    return {
        "product_id": p.get("id") or str(p.get("_id")),
        "product_name": p.get("name"),
        "product_image": p.get("image_url") or (p.get("images") or [None])[0] or "",
        "category": p.get("category") or p.get("category_name") or "",
        "branch": p.get("branch") or "Promotional Materials",
        "vendor_cost": vendor_cost,
        "current_customer_price": customer_price,
        "suggested_promo_price": promo_price,
        "discount_amount": discount_amount,
        "discount_pct": round_pct,
        "pool_share_pct": pool_share_pct,
        "tier_label": tier["label"],
        "total_margin_pct": total_margin_pct,
        "distributable_margin_pct": distributable_pct,
        "expected_platform_profit": expected_platform_profit,
        "promo_style": promo_style,
        "suggested_duration_days": 14,
        "headline": headline,
        # Hidden admin reasoning — kept separate from any customer-visible fields.
        "internal_rationale": (
            f"Pool-share {pool_share_pct:.0f}% of the {distributable_pct:.0f}% "
            f"distributable margin for {tier['label']} tier → {round_pct}% off "
            f"preserves ~{expected_platform_profit:,.0f} TZS platform profit/unit."
        ),
    }


# ──────────── Models ────────────


class SuggestParams(BaseModel):
    branch: Optional[str] = None
    min_margin_pct: float = 10.0
    pool_share_pct: float = 35.0
    max_suggestions: int = 5
    product_ids: Optional[List[str]] = None
    promo_style: str = "percentage"  # "percentage" | "flat_off"


class BulkEntry(BaseModel):
    product_id: str
    discount_pct: float = 0.0
    discount_amount: float = 0.0
    duration_days: int = 14
    promo_style: str = "percentage"
    headline: Optional[str] = None


class BulkCreateRequest(BaseModel):
    entries: List[BulkEntry]


# ──────────── Endpoints ────────────


@router.post("/suggest")
async def suggest_promotions(params: SuggestParams, user: dict = Depends(_require_admin)):
    """Return up to `max_suggestions` AI-style promotion proposals."""

    query: dict = {"is_active": True, "status": {"$ne": "archived"}}
    if params.branch:
        query["branch"] = params.branch
    if params.product_ids:
        query["id"] = {"$in": params.product_ids}

    suggestions: List[dict] = []
    async for p in db.products.find(query, {"_id": 0}).limit(500):
        # Skip products whose total margin % doesn't clear the floor
        p_margin = float(p.get("pricing_total_margin_pct") or 0)
        if p_margin and p_margin < params.min_margin_pct:
            continue

        branch = p.get("branch") or "Promotional Materials"
        tier = await _tier_for_branch(branch)
        if tier["total_margin_pct"] < params.min_margin_pct:
            # Tier doesn't meet the admin's minimum — skip.
            continue

        sugg = _suggest_for_product(p, tier, params.pool_share_pct, params.promo_style)
        if sugg:
            suggestions.append(sugg)
        if len(suggestions) >= params.max_suggestions:
            break

    # Rank by expected platform profit descending so the admin sees the
    # highest-profit promos first.
    suggestions.sort(key=lambda s: s["expected_platform_profit"], reverse=True)
    suggestions = suggestions[: params.max_suggestions]

    return {
        "count": len(suggestions),
        "suggestions": suggestions,
        "parameters": params.model_dump(),
    }


@router.post("/bulk-create")
async def bulk_create_promotions(req: BulkCreateRequest, user: dict = Depends(_require_admin)):
    """One-shot publish the selected suggestions as active promotions.

    Each entry is saved to `platform_promotions` with `status=active`.
    The enrichment service will automatically attach these to matching
    products on the next `/api/public-marketplace/products` call.
    """
    if not req.entries:
        raise HTTPException(400, "No entries provided")

    now = datetime.now(timezone.utc)
    created: List[dict] = []
    for e in req.entries:
        product = await db.products.find_one({"id": e.product_id}, {"_id": 0})
        if not product:
            continue

        promo_id = f"promo_{now.strftime('%Y%m%d%H%M%S')}_{str(uuid4())[:6]}"
        promo_type = "percentage" if e.promo_style == "percentage" else "flat_off"
        promo_value = e.discount_pct if promo_type == "percentage" else e.discount_amount

        doc = {
            "id": promo_id,
            "title": e.headline or f"{int(e.discount_pct)}% off {product.get('name')}",
            "promo_type": promo_type,
            "promo_value": promo_value,
            "target_product_ids": [e.product_id],
            "target_scope": "product",
            "status": "active",
            "is_active": True,
            "starts_at": now,
            "ends_at": now + timedelta(days=e.duration_days or 14),
            "created_by": user.get("email") or user.get("id") or "ai-assistant",
            "created_at": now,
            "source": "ai_suggestion",
        }
        await db.platform_promotions.insert_one(doc)
        # Strip the _id that insert_one mutated onto the dict.
        doc.pop("_id", None)
        # Convert datetimes to iso strings for the response only.
        doc["starts_at"] = doc["starts_at"].isoformat()
        doc["ends_at"] = doc["ends_at"].isoformat()
        doc["created_at"] = doc["created_at"].isoformat()
        created.append(doc)

    return {"created_count": len(created), "promotions": created}
