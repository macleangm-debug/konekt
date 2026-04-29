"""Internal group deals + auto-suggest engine (Feb 2026).

Key concepts:
  * `funding_source = "vendor"` — deal shares cost with vendor (legacy default)
  * `funding_source = "internal"` — Konekt funds the entire discount from
    distributable-margin pool only, vendor cost unchanged. No protected margin touched.

Pool-cap policy:
  * Default cap = 20% of the product's distributable_margin_pct.
  * That means the internal discount per unit ≤ (distributable_pct × 0.20) × vendor_cost.

Endpoints (admin-only):
  POST /api/admin/group-deals/suggest        → returns ranked list of auto-suggested deals
  POST /api/admin/group-deals/bulk-create    → create N deals from the suggestion list
  GET  /api/admin/group-deals/audit-wiring   → verify active promos + deals use the right
                                               per-branch tier set (no leakage across
                                               Promotional Materials / Office Equipment / etc.)
"""
import os
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from services.settings_resolver import get_pricing_policy_tiers
from commission_margin_engine_service import resolve_tier

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/api/admin/group-deals", tags=["Admin Group Deals — Internal/Auto"])


async def _assert_admin(request: Request) -> dict:
    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Admin JWT required")
    try:
        payload = pyjwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    role = (payload.get("role") or "").lower()
    if not (payload.get("is_admin") or role in ("admin", "super_admin", "ops")):
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


# ---------- Models ----------

class SuggestParams(BaseModel):
    branch: Optional[str] = None          # filter — Promotional Materials / Office Equipment / etc.
    min_margin_pct: float = 10.0          # only suggest products with ≥ this total margin %
    pool_share_pct: float = 20.0          # % of distributable margin to give away per unit
    max_suggestions: int = 20
    min_display_target: int = 20          # minimum display target (units)


class BulkCreateEntry(BaseModel):
    product_id: str
    display_target: int
    vendor_threshold: Optional[int] = None   # ignored for internal deals
    duration_days: int = 14
    pool_share_pct: float = 20.0
    funding_source: str = "internal"        # "internal" | "vendor"


class BulkCreateRequest(BaseModel):
    entries: List[BulkCreateEntry]


# ---------- Suggest engine ----------

async def _suggest_for_product(p: dict, tier: dict, pool_share_pct: float) -> Optional[dict]:
    vendor_cost = float(p.get("vendor_cost") or 0)
    customer_price = float(p.get("customer_price") or p.get("base_price") or 0)
    if vendor_cost <= 0 or customer_price <= 0:
        return None

    total_margin_pct = float(tier.get("total_margin_pct", 0))
    distributable_pct = float(tier.get("distributable_margin_pct", 0))
    if distributable_pct <= 0:
        return None

    # Cap the discount at (pool_share_pct / 100) of the distributable pool
    max_discount_pct = distributable_pct * (pool_share_pct / 100.0)
    # Discount in absolute TZS per unit (on the customer_price)
    discount_amount = round(customer_price * (max_discount_pct / 100.0), 0)
    if discount_amount < 100:
        return None  # not worth surfacing

    discounted_price = round(customer_price - discount_amount, 0)
    # Safety: never let discounted_price drop below vendor_cost (protects margin)
    if discounted_price < vendor_cost:
        return None

    return {
        "product_id": p.get("id") or str(p.get("_id")),
        "product_name": p.get("name"),
        "product_image": p.get("image_url") or (p.get("images") or [None])[0] or "",
        "category": p.get("category") or p.get("category_name") or "",
        "branch": p.get("branch") or "Promotional Materials",
        "vendor_cost": vendor_cost,
        "current_customer_price": customer_price,
        "suggested_discounted_price": discounted_price,
        "suggested_discount_amount": discount_amount,
        "suggested_discount_pct": round(max_discount_pct, 2),
        "tier_label": tier.get("label"),
        "total_margin_pct": total_margin_pct,
        "distributable_margin_pct": distributable_pct,
        "pool_share_pct": pool_share_pct,
        "funding_source": "internal",
        # Customer-facing blurb — never leak internal pricing mechanics.
        "customer_description": (
            f"Team up with other buyers to unlock a special group price on "
            f"{p.get('name')}. When enough buyers commit, everyone pays the "
            f"discounted rate — saving TZS {discount_amount:,.0f} per unit."
        ),
        # Admin-only internal rationale (never displayed on the deal page).
        "reason": (
            f"Internal deal: fund {pool_share_pct:.0f}% of the "
            f"{distributable_pct:.0f}% distributable margin ({tier.get('label')})."
        ),
    }


@router.post("/suggest")
async def suggest_group_deals(params: SuggestParams, request: Request):
    """Scans catalogue for products that can support an internal group deal
    and returns a ranked list. Does NOT persist anything."""
    await _assert_admin(request)

    # Pre-load per-branch tier sets
    tier_cache: dict = {}

    async def tiers_for(branch: str):
        if branch not in tier_cache:
            tier_cache[branch] = await get_pricing_policy_tiers(db, category=branch)
        return tier_cache[branch]

    q = {"is_active": True, "vendor_cost": {"$gt": 0}}
    if params.branch:
        q["branch"] = params.branch

    suggestions: List[dict] = []
    async for p in db.products.find(q):
        branch = p.get("branch") or p.get("category_name") or "default"
        tiers = await tiers_for(branch)
        tier = resolve_tier(float(p.get("vendor_cost") or 0), tiers)
        if not tier:
            continue
        if float(tier.get("total_margin_pct", 0)) < params.min_margin_pct:
            continue
        sugg = await _suggest_for_product(p, tier, params.pool_share_pct)
        if sugg:
            suggestions.append(sugg)

    # Rank: biggest percentage discount first (most attractive to buyers).
    # Falls back to absolute savings on ties.
    suggestions.sort(key=lambda s: (-s["suggested_discount_pct"], -s["suggested_discount_amount"]))
    suggestions = suggestions[: params.max_suggestions]

    return {
        "count": len(suggestions),
        "suggestions": suggestions,
        "params": params.model_dump(),
    }


# ---------- Bulk create ----------

@router.post("/bulk-create")
async def bulk_create_group_deals(body: BulkCreateRequest, request: Request):
    await _assert_admin(request)
    if not body.entries:
        raise HTTPException(status_code=400, detail="entries required")

    # Reuse per-branch tier cache
    tier_cache: dict = {}

    async def tiers_for(branch: str):
        if branch not in tier_cache:
            tier_cache[branch] = await get_pricing_policy_tiers(db, category=branch)
        return tier_cache[branch]

    created: List[dict] = []
    skipped: List[dict] = []

    for entry in body.entries:
        from bson import ObjectId
        product = await db.products.find_one({"id": entry.product_id})
        if not product:
            try:
                product = await db.products.find_one({"_id": ObjectId(entry.product_id)})
            except Exception:
                pass
        if not product:
            skipped.append({"product_id": entry.product_id, "reason": "not_found"})
            continue

        branch = product.get("branch") or product.get("category_name") or "default"
        tiers = await tiers_for(branch)
        tier = resolve_tier(float(product.get("vendor_cost") or 0), tiers)
        if not tier:
            skipped.append({"product_id": entry.product_id, "reason": "no_tier"})
            continue

        sugg = await _suggest_for_product(product, tier, entry.pool_share_pct)
        if not sugg:
            skipped.append({"product_id": entry.product_id, "reason": "pool_cap_too_small"})
            continue

        now = datetime.now(timezone.utc)
        deadline = now + timedelta(days=entry.duration_days)

        campaign = {
            "campaign_id": str(uuid4())[:8].upper(),
            "product_id": sugg["product_id"],
            "product_name": sugg["product_name"],
            "product_image": sugg["product_image"],
            # Customer-facing description — never leak margin mechanics.
            "description": sugg["customer_description"],
            # Admin-only rationale, kept out of the public payload.
            "internal_rationale": sugg["reason"],
            "category": sugg["category"],
            "branch": sugg["branch"],
            "vendor_cost": sugg["vendor_cost"],
            "original_price": sugg["current_customer_price"],
            "discounted_price": sugg["suggested_discounted_price"],
            "savings_amount": sugg["suggested_discount_amount"],
            "margin_per_unit": sugg["suggested_discounted_price"] - sugg["vendor_cost"],
            "margin_pct": round(
                ((sugg["suggested_discounted_price"] - sugg["vendor_cost"])
                 / sugg["suggested_discounted_price"]) * 100, 1,
            ),
            "display_target": entry.display_target,
            "vendor_threshold": entry.vendor_threshold or entry.display_target,
            "current_committed": 0,
            "buyer_count": 0,
            "duration_days": entry.duration_days,
            "deadline": deadline,
            # Internal funding — key field distinguishing from vendor-split deals
            "funding_source": entry.funding_source,
            "vendor_involved": entry.funding_source == "vendor",
            "internal_pool_share_pct": entry.pool_share_pct,
            "internal_pool_label": f"{sugg['distributable_margin_pct']:.0f}% distributable × {entry.pool_share_pct:.0f}%",
            "pricing_tier_label": sugg["tier_label"],
            "pricing_branch": sugg["branch"],
            "commission_mode": "none",
            "affiliate_share_pct": 0,
            "status": "active",
            "is_active": True,
            "threshold_met": False,
            "is_featured": False,
            "created_by": "auto_suggest",
            "auto_created": True,
            "created_at": now,
            "updated_at": now,
        }
        res = await db.group_deal_campaigns.insert_one(campaign)
        campaign["_id"] = str(res.inserted_id)
        created.append({
            "id": campaign["_id"],
            "campaign_id": campaign["campaign_id"],
            "product_name": campaign["product_name"],
            "original_price": campaign["original_price"],
            "discounted_price": campaign["discounted_price"],
            "savings_amount": campaign["savings_amount"],
            "funding_source": campaign["funding_source"],
            "branch": campaign["branch"],
        })

    return {"created": created, "skipped": skipped, "count_created": len(created), "count_skipped": len(skipped)}


# ---------- Audit wiring ----------

@router.get("/audit-wiring")
async def audit_pricing_wiring(request: Request):
    """Verify every active group deal + promotion is wired to the right per-branch tier.

    Returns a diagnostic report. No mutations.
    """
    await _assert_admin(request)
    issues: List[dict] = []
    healthy = 0

    # Scan group deals
    async for gd in db.group_deal_campaigns.find({"status": "active"}):
        product_id = gd.get("product_id")
        if not product_id:
            healthy += 1
            continue
        # Try multiple lookup strategies since IDs may be stringified ObjectIds
        product = await db.products.find_one({"id": product_id})
        if not product:
            from bson import ObjectId
            try:
                product = await db.products.find_one({"_id": ObjectId(product_id)})
            except Exception:
                pass
        if not product:
            # Also try by slug if product_id looks like a slug
            product = await db.products.find_one({"slug": product_id})
        if not product:
            issues.append({"type": "group_deal", "campaign_id": gd.get("campaign_id"), "issue": "product_not_found", "product_id": product_id})
            continue

        product_branch = product.get("branch") or "default"
        deal_branch = gd.get("pricing_branch") or gd.get("branch")
        if deal_branch and deal_branch != product_branch:
            issues.append({
                "type": "group_deal",
                "campaign_id": gd.get("campaign_id"),
                "issue": "branch_mismatch",
                "deal_branch": deal_branch,
                "product_branch": product_branch,
            })
        else:
            healthy += 1

    # Scan promotions
    async for promo in db.promotions.find({"is_active": True}):
        scope_cat = promo.get("scope", {}).get("category_id") or promo.get("category_id")
        if not scope_cat:
            continue
        # Best-effort: check that all products in scope share a branch
        sample = await db.products.find_one({"category_id": scope_cat}, {"branch": 1})
        if sample and promo.get("pricing_branch") and promo["pricing_branch"] != sample.get("branch"):
            issues.append({
                "type": "promotion",
                "promo_id": str(promo.get("_id")),
                "issue": "branch_mismatch",
                "promo_branch": promo.get("pricing_branch"),
                "product_branch": sample.get("branch"),
            })
        else:
            healthy += 1

    return {
        "healthy_count": healthy,
        "issues_count": len(issues),
        "issues": issues,
        "verdict": "ok" if not issues else "branch_mismatch_detected",
    }



# ---------- Vendor-driven deal suggester ----------

class VendorDealSuggestParams(BaseModel):
    product_id: str
    vendor_best_price: float
    vendor_min_quantity: Optional[int] = None
    customer_share_pct: float = 50.0   # % of vendor savings passed to customer


@router.post("/suggest-from-vendor")
async def suggest_from_vendor(payload: VendorDealSuggestParams, request: Request):
    """Vendor-driven group deal suggester.

    Given a vendor's best unit price (when they commit to a min quantity),
    return a suggested discounted_price + display_target so admin can review
    and publish in one click.

    Math:
      saving_per_unit = current_customer_price - vendor_best_price
      customer_discount = saving_per_unit × (customer_share_pct / 100)
      discounted_price = current_customer_price - customer_discount
      display_target = vendor_min_quantity (or fallback to 30)
    """
    await _assert_admin(request)

    product = await db.products.find_one({"id": payload.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    current_price = float(product.get("customer_price") or product.get("base_price") or 0)
    vendor_cost_baseline = float(product.get("vendor_cost") or 0)
    vbp = float(payload.vendor_best_price or 0)
    if vbp <= 0:
        raise HTTPException(status_code=400, detail="vendor_best_price must be > 0")
    if current_price <= 0:
        raise HTTPException(status_code=400, detail="Product has no current customer price")
    if vbp >= current_price:
        raise HTTPException(status_code=400, detail="Vendor best price must be below current selling price")

    # Saving = how much cheaper the vendor sold vs current vendor cost
    # If vbp ≥ baseline cost, the saving is computed off current_price instead.
    if vendor_cost_baseline > 0 and vbp < vendor_cost_baseline:
        vendor_saving_per_unit = vendor_cost_baseline - vbp
    else:
        vendor_saving_per_unit = current_price - vbp

    share = max(0.0, min(float(payload.customer_share_pct or 0), 90.0)) / 100.0
    customer_discount = round(vendor_saving_per_unit * share, 0)
    discounted_price = max(round(current_price - customer_discount, 0), vbp + 100)
    discount_amount = round(current_price - discounted_price, 0)
    discount_pct = round((discount_amount / current_price) * 100, 1) if current_price else 0

    margin_per_unit = discounted_price - vbp
    margin_pct = round((margin_per_unit / discounted_price) * 100, 1) if discounted_price else 0

    target = int(payload.vendor_min_quantity or 30)
    target = max(target, 20)

    return {
        "product_id": payload.product_id,
        "product_name": product.get("name"),
        "current_customer_price": current_price,
        "current_vendor_cost": vendor_cost_baseline,
        "vendor_best_price": vbp,
        "suggested_discounted_price": discounted_price,
        "suggested_discount_amount": discount_amount,
        "suggested_discount_pct": discount_pct,
        "suggested_display_target": target,
        "margin_per_unit_at_deal": margin_per_unit,
        "margin_pct_at_deal": margin_pct,
        "customer_share_pct": payload.customer_share_pct,
    }
