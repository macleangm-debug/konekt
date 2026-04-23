"""
Smart Promotion Engine — wired to the unified pricing_policy_tiers in Settings Hub.

How it works
------------
Each active product has a base_cost (vendor_cost). For each order line, we:
  1. Resolve the pricing tier by base_cost
  2. Compute distributable_pool = base_cost * tier.distributable_margin_pct
  3. Distribute that pool across {affiliate, promotion, sales, referral, reserve}
     by the tier's distribution_split percentages

A "promotion" is the admin's choice to convert some of those buckets into a
discount the customer sees. This engine:
  - Lets admin pick which buckets to "give away" (affiliate / referral / promotion
    / sales / reserve / — as a last resort — the protected platform margin)
  - Sales has a floor that's preserved for assisted-sales commissions (default 10%)
  - Computes the max TZS that can be safely discounted per product without
    eating into margins beyond what admin explicitly allowed
  - If admin enters a fixed TZS discount, we HONOUR the amount but SKIP products
    where the allowed pools cannot cover it (safer default)
  - Writes `active_promotion_id`, `promo_blocks.affiliate`, `promo_blocks.referral`
    flags so the affiliate Content Studio + referral checkout block these products
    during the promo window

Endpoints:
  GET    /api/admin/promotions                       — list all promotions
  GET    /api/admin/promotions/defaults              — fetch Settings Hub promo defaults
  PUT    /api/admin/promotions/defaults              — update defaults
  POST   /api/admin/promotions/preview               — margin-aware scope preview
  POST   /api/admin/promotions                       — create + activate
  POST   /api/admin/promotions/{id}/end              — end early (reverts prices)
  DELETE /api/admin/promotions/{id}                  — cancel/delete
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
import os
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

DEFAULTS_KEY = "promotion_engine_defaults"
DEFAULTS_INIT = {
    "_id": DEFAULTS_KEY,
    "sales_preserve_floor_pct": 10,   # 10% of sales pool always kept for assisted-sales
    "allow_eat_platform_margin": False,  # hard stop by default
    "default_pools": ["promotion", "reserve"],  # pools ticked by default in UI
}


# ── Tier resolver helper ────────────────────────────────────
async def _resolve_tier_for_cost(base_cost: float):
    from services.settings_resolver import get_pricing_policy_tiers
    from commission_margin_engine_service import resolve_tier
    tiers = await get_pricing_policy_tiers(db)
    return resolve_tier(float(base_cost or 0), tiers)


async def _load_defaults() -> dict:
    doc = await db.system_settings.find_one({"_id": DEFAULTS_KEY})
    if not doc:
        await db.system_settings.insert_one(DEFAULTS_INIT)
        return {k: v for k, v in DEFAULTS_INIT.items() if k != "_id"}
    doc.pop("_id", None)
    return doc


def _compute_max_giveaway_per_line(
    *,
    base_cost: float,
    tier: dict,
    pools: list[str],
    sales_preserve_floor_pct: float,
    allow_eat_platform_margin: bool,
    platform_eat_pct: float = 0.0,  # 0-100, how much of platform margin to consume when allowed
) -> dict:
    """How much TZS per unit can this promo pull from the specified pools.

    Returns dict: {
        max_giveaway, breakdown{pool: amount}, blocks{affiliate,referral},
        post_promo_margin, warns
    }
    """
    if not tier or base_cost <= 0:
        return {"max_giveaway": 0.0, "breakdown": {}, "blocks": {}, "post_promo_margin": 0.0, "warns": ["no_tier"]}

    distrib_pct = float(tier.get("distributable_margin_pct") or 0)
    protected_pct = float(tier.get("protected_platform_margin_pct") or 0)
    distributable_pool = base_cost * distrib_pct / 100.0
    protected_pool = base_cost * protected_pct / 100.0

    split = tier.get("distribution_split") or {}
    pool_amounts = {
        "affiliate": distributable_pool * float(split.get("affiliate_pct") or 0) / 100.0,
        "promotion": distributable_pool * float(split.get("promotion_pct") or 0) / 100.0,
        "sales":     distributable_pool * float(split.get("sales_pct") or 0) / 100.0,
        "referral":  distributable_pool * float(split.get("referral_pct") or 0) / 100.0,
        "reserve":   distributable_pool * float(split.get("reserve_pct") or 0) / 100.0,
    }

    breakdown: dict[str, float] = {}
    total = 0.0

    for p in pools:
        if p == "platform_margin":
            if allow_eat_platform_margin and platform_eat_pct > 0:
                amt = protected_pool * max(0.0, min(platform_eat_pct, 100.0)) / 100.0
                breakdown[p] = round(amt, 2)
                total += amt
            continue
        if p == "sales":
            # Apply preserve floor
            preserve = max(0.0, min(sales_preserve_floor_pct, 100.0)) / 100.0
            amt = pool_amounts["sales"] * (1 - preserve)
            breakdown["sales"] = round(amt, 2)
            total += amt
            continue
        if p in pool_amounts:
            amt = pool_amounts[p]
            breakdown[p] = round(amt, 2)
            total += amt

    # Post-promo margin = selling_price - base_cost - giveaway
    selling_price = base_cost * (1 + float(tier.get("total_margin_pct") or 0) / 100.0)
    post_promo_margin_abs = round(selling_price - base_cost - total, 2)
    post_promo_margin_pct = round(100 * post_promo_margin_abs / selling_price, 2) if selling_price else 0.0

    blocks = {
        "affiliate": "affiliate" in pools,
        "referral": "referral" in pools,
    }

    warns = []
    if "platform_margin" in pools:
        warns.append("eats_into_platform_margin")
    if post_promo_margin_abs < 0:
        warns.append("margin_would_go_negative")

    return {
        "max_giveaway": round(total, 2),
        "breakdown": breakdown,
        "blocks": blocks,
        "post_promo_margin_abs": post_promo_margin_abs,
        "post_promo_margin_pct": post_promo_margin_pct,
        "tier_label": tier.get("label") or "",
        "selling_price": round(selling_price, 2),
        "warns": warns,
    }


# ── Pydantic schemas ────────────────────────────────────────
class Scope(BaseModel):
    group_id: Optional[str] = ""
    category_id: Optional[str] = ""
    subcategory_id: Optional[str] = ""
    partner_id: Optional[str] = ""
    branch: Optional[str] = ""
    skus: Optional[List[str]] = None


class PromoBase(BaseModel):
    pools: List[Literal["promotion", "affiliate", "referral", "sales", "reserve", "platform_margin"]]
    pool_drawdown_pct: float = 100.0   # 0-100: how deep to pull from the allowed pools
    platform_eat_pct: float = 0.0      # how much of platform margin to eat (only if 'platform_margin' in pools)
    discount_tzs: float = 0.0          # fixed shilling discount per unit (0 = auto-max)


class PreviewPayload(PromoBase):
    scope: Scope


class CreatePayload(PreviewPayload):
    name: str
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    rounding: Literal["nearest_100", "nearest_500", "none"] = "nearest_100"


def _scope_query(scope: dict) -> dict:
    q: dict = {"is_active": True}
    if scope.get("group_id"):       q["group_id"] = scope["group_id"]
    if scope.get("category_id"):    q["category_id"] = scope["category_id"]
    if scope.get("subcategory_id"): q["subcategory_id"] = scope["subcategory_id"]
    if scope.get("partner_id"):     q["partner_id"] = scope["partner_id"]
    if scope.get("branch"):         q["branch"] = scope["branch"]
    if scope.get("skus"):           q["sku"] = {"$in": scope["skus"]}
    return q


def _round_price(price: float, rule: str) -> float:
    if price <= 0: return 0
    if rule == "nearest_100": return float(round(price / 100) * 100)
    if rule == "nearest_500": return float(round(price / 500) * 500)
    return float(round(price))


# ── Defaults endpoints ──────────────────────────────────────
@router.get("/defaults")
async def get_defaults(request: Request):
    await _assert_admin(request)
    return await _load_defaults()


@router.put("/defaults")
async def update_defaults(payload: dict, request: Request):
    await _assert_admin(request)
    clean = {}
    if "sales_preserve_floor_pct" in payload:
        v = float(payload["sales_preserve_floor_pct"] or 0)
        if not (0 <= v <= 100):
            raise HTTPException(status_code=400, detail="sales_preserve_floor_pct must be 0-100")
        clean["sales_preserve_floor_pct"] = v
    if "allow_eat_platform_margin" in payload:
        clean["allow_eat_platform_margin"] = bool(payload["allow_eat_platform_margin"])
    if "default_pools" in payload and isinstance(payload["default_pools"], list):
        clean["default_pools"] = payload["default_pools"]
    await db.system_settings.update_one({"_id": DEFAULTS_KEY}, {"$set": clean}, upsert=True)
    return await _load_defaults()


# ── Preview (margin-aware) ──────────────────────────────────
@router.post("/preview")
async def preview_promotion(payload: PreviewPayload, request: Request):
    await _assert_admin(request)
    defaults = await _load_defaults()
    if not payload.pools:
        raise HTTPException(status_code=400, detail="Pick at least one pool to draw from.")
    if "platform_margin" in payload.pools and not defaults.get("allow_eat_platform_margin"):
        raise HTTPException(
            status_code=400,
            detail="Platform-margin eating is disabled in Settings Hub → Promotion Engine Defaults.",
        )

    q = _scope_query(payload.scope.model_dump())
    cursor = db.products.find(q, {"_id": 0, "id": 1, "name": 1, "customer_price": 1, "base_price": 1, "vendor_cost": 1, "sku": 1})

    total_products = 0
    rev_before_sum = 0.0
    rev_after_sum = 0.0
    cost_sum = 0.0
    margin_before_sum = 0.0
    margin_after_sum = 0.0
    total_giveaway_sum = 0.0
    products_skipped_fixed_amount = 0
    products_negative_margin = 0
    samples: list[dict] = []
    blocks_affiliate = False
    blocks_referral = False

    async for p in cursor:
        total_products += 1
        price = float(p.get("customer_price") or p.get("base_price") or 0)
        cost = float(p.get("vendor_cost") or 0)
        rev_before_sum += price
        cost_sum += cost
        margin_before_sum += (price - cost)

        tier = await _resolve_tier_for_cost(cost)
        capacity = _compute_max_giveaway_per_line(
            base_cost=cost, tier=tier,
            pools=payload.pools,
            sales_preserve_floor_pct=float(defaults.get("sales_preserve_floor_pct") or 10),
            allow_eat_platform_margin=bool(defaults.get("allow_eat_platform_margin")),
            platform_eat_pct=payload.platform_eat_pct,
        )
        avail = capacity["max_giveaway"] * max(0.0, min(payload.pool_drawdown_pct, 100.0)) / 100.0

        # Fixed TZS: honor if coverable, otherwise skip
        if payload.discount_tzs > 0:
            if avail + 0.5 < payload.discount_tzs:
                products_skipped_fixed_amount += 1
                rev_after_sum += price
                margin_after_sum += (price - cost)
                continue
            actual = payload.discount_tzs
        else:
            actual = avail

        new_price = max(0.0, price - actual)
        rev_after_sum += new_price
        margin_after_sum += (new_price - cost)
        total_giveaway_sum += actual

        if new_price < cost:
            products_negative_margin += 1

        if capacity["blocks"].get("affiliate"): blocks_affiliate = True
        if capacity["blocks"].get("referral"):  blocks_referral = True

        if len(samples) < 6:
            samples.append({
                "name": p.get("name"),
                "sku": p.get("sku"),
                "tier": capacity.get("tier_label"),
                "current_price": price,
                "new_price": round(new_price, 2),
                "current_margin": round(price - cost, 2),
                "new_margin": round(new_price - cost, 2),
                "max_giveaway": capacity["max_giveaway"],
                "breakdown": capacity["breakdown"],
            })

    return {
        "products_matched": total_products,
        "products_skipped_fixed_amount": products_skipped_fixed_amount,
        "products_below_cost_after_promo": products_negative_margin,
        "revenue_before_per_unit_sum": round(rev_before_sum, 2),
        "revenue_after_per_unit_sum": round(rev_after_sum, 2),
        "total_discount_per_unit_sum": round(total_giveaway_sum, 2),
        "cost_total_per_unit_sum": round(cost_sum, 2),
        "current_margin_per_unit_sum": round(margin_before_sum, 2),
        "new_margin_per_unit_sum": round(margin_after_sum, 2),
        "margin_lost_per_unit_sum": round(margin_before_sum - margin_after_sum, 2),
        "current_avg_margin_pct": round(100 * margin_before_sum / rev_before_sum, 1) if rev_before_sum else 0.0,
        "new_avg_margin_pct": round(100 * margin_after_sum / rev_after_sum, 1) if rev_after_sum else 0.0,
        "blocks": {"affiliate": blocks_affiliate, "referral": blocks_referral},
        "samples": samples,
        "defaults_applied": {
            "sales_preserve_floor_pct": defaults.get("sales_preserve_floor_pct"),
            "allow_eat_platform_margin": defaults.get("allow_eat_platform_margin"),
            "platform_eat_pct": payload.platform_eat_pct,
            "pool_drawdown_pct": payload.pool_drawdown_pct,
        },
    }


# ── Create + activate ───────────────────────────────────────
@router.post("")
async def create_promotion(payload: CreatePayload, request: Request):
    admin = await _assert_admin(request)
    defaults = await _load_defaults()
    if not payload.pools:
        raise HTTPException(status_code=400, detail="Pick at least one pool to draw from.")
    if "platform_margin" in payload.pools and not defaults.get("allow_eat_platform_margin"):
        raise HTTPException(
            status_code=400,
            detail="Platform-margin eating disabled in Settings Hub.",
        )

    q = _scope_query(payload.scope.model_dump())
    matched_ids: list[str] = []
    per_product_discount: dict[str, float] = {}

    async for p in db.products.find(q, {"_id": 0, "id": 1, "customer_price": 1, "base_price": 1, "vendor_cost": 1}):
        price = float(p.get("customer_price") or p.get("base_price") or 0)
        cost = float(p.get("vendor_cost") or 0)
        tier = await _resolve_tier_for_cost(cost)
        capacity = _compute_max_giveaway_per_line(
            base_cost=cost, tier=tier,
            pools=payload.pools,
            sales_preserve_floor_pct=float(defaults.get("sales_preserve_floor_pct") or 10),
            allow_eat_platform_margin=bool(defaults.get("allow_eat_platform_margin")),
            platform_eat_pct=payload.platform_eat_pct,
        )
        avail = capacity["max_giveaway"] * max(0.0, min(payload.pool_drawdown_pct, 100.0)) / 100.0

        if payload.discount_tzs > 0:
            if avail + 0.5 < payload.discount_tzs:
                continue  # skip — pools can't cover the fixed amount
            actual = payload.discount_tzs
        else:
            actual = avail

        if actual <= 0: continue
        new_price = _round_price(max(0.0, price - actual), payload.rounding)
        if new_price >= price: continue

        matched_ids.append(p["id"])
        per_product_discount[p["id"]] = price - new_price

    promo_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    promo = {
        "id": promo_id,
        "name": payload.name,
        "scope": payload.scope.model_dump(),
        "pools": payload.pools,
        "pool_drawdown_pct": payload.pool_drawdown_pct,
        "platform_eat_pct": payload.platform_eat_pct,
        "discount_tzs_target": payload.discount_tzs,
        "rounding": payload.rounding,
        "start_date": payload.start_date or now[:10],
        "end_date": payload.end_date or None,
        "status": "active",
        "product_ids": matched_ids,
        "blocks": {
            "affiliate": "affiliate" in payload.pools,
            "referral": "referral" in payload.pools,
        },
        "created_by": admin.get("email") or admin.get("user_id") or "admin",
        "created_at": now,
    }
    await db.catalog_promotions.insert_one(promo)

    # Apply the discount and tag blocks for affiliate/referral channel gating
    applied = 0
    promo_blocks = {
        "affiliate": "affiliate" in payload.pools,
        "referral": "referral" in payload.pools,
    }
    for pid in matched_ids:
        prod = await db.products.find_one({"id": pid}, {"_id": 0, "customer_price": 1, "base_price": 1})
        if not prod: continue
        price = float(prod.get("customer_price") or prod.get("base_price") or 0)
        actual = per_product_discount[pid]
        new_price = _round_price(max(0.0, price - actual), payload.rounding)
        await db.products.update_one(
            {"id": pid},
            {"$set": {
                "original_price": price,
                "customer_price": new_price,
                "base_price": new_price,
                "active_promotion_id": promo_id,
                "active_promotion_label": payload.name,
                "promo_saves_tzs": price - new_price,
                "promo_blocks": promo_blocks,
            }},
        )
        applied += 1

    promo.pop("_id", None)
    promo["applied_count"] = applied
    return promo


# ── End / Delete ────────────────────────────────────────────
async def _revert_products(promo_id: str) -> int:
    reverted = 0
    async for p in db.products.find({"active_promotion_id": promo_id}, {"_id": 0, "id": 1, "original_price": 1}):
        orig = float(p.get("original_price") or 0)
        if orig <= 0: continue
        await db.products.update_one(
            {"id": p["id"]},
            {"$set": {"customer_price": orig, "base_price": orig},
             "$unset": {"original_price": "", "active_promotion_id": "",
                        "active_promotion_label": "", "promo_saves_tzs": "", "promo_blocks": ""}},
        )
        reverted += 1
    return reverted


@router.post("/{promo_id}/end")
async def end_promotion(promo_id: str, request: Request):
    await _assert_admin(request)
    promo = await db.catalog_promotions.find_one({"id": promo_id}, {"_id": 0})
    if not promo: raise HTTPException(status_code=404, detail="Promo not found")
    if promo.get("status") == "ended":
        return {"ok": True, "already_ended": True}
    reverted = await _revert_products(promo_id)
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
    promo = await db.catalog_promotions.find_one({"id": promo_id}, {"_id": 0})
    if promo and promo.get("status") == "active":
        await _revert_products(promo_id)
    await db.catalog_promotions.delete_one({"id": promo_id})
    return {"ok": True}


# ── Auto-expiry cron ────────────────────────────────────────
async def expire_due_promotions():
    today_iso = datetime.now(timezone.utc).date().isoformat()
    async for p in db.catalog_promotions.find(
        {"status": "active", "end_date": {"$ne": None, "$lt": today_iso}},
        {"_id": 0, "id": 1},
    ):
        try:
            reverted = await _revert_products(p["id"])
            await db.catalog_promotions.update_one({"id": p["id"]}, {"$set": {
                "status": "ended", "ended_at": datetime.now(timezone.utc).isoformat(),
                "products_reverted": reverted, "auto_ended": True,
            }})
        except Exception:
            pass
