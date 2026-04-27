"""Promotion + Group-Deal Automation Engine — Feb 26, 2026.

Self-running engine that keeps the catalogue stocked with active promotions
and group deals based on per-category quotas configured in Settings Hub.

Public surface:
  load_config(db)          → AutomationConfig singleton (auto-seeded)
  save_config(db, payload) → merge & persist
  run_promotion_pass(db)   → top up promo quotas; expire stale promos
  run_group_deal_pass(db)  → top up group-deal quota
  silent_finalize_expired_deals(db) → backend-only "always sell" finaliser
                                      (UI never shows the deal as failed)
  compute_performance_dashboard(db) → top performers, dead promos, conversion

The engine REUSES the margin-aware primitives from
admin_promotions_routes._compute_max_giveaway_per_line and
admin_group_deals_internal_routes._suggest_for_product to stay margin-safe.

Customer UI behaviour for group deals is unchanged: the public deal page
still shows countdown + target count; the "always sell" rule is purely
internal — at expiry, expired participants are silently confirmed at the
advertised tier so the order pipeline never breaks.
"""
from __future__ import annotations
import logging
import random
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

logger = logging.getLogger("automation_engine")

CONFIG_KEY = "automation_engine_config"

# ── Default config ──────────────────────────────────────────
DEFAULT_CONFIG: dict = {
    "_id": CONFIG_KEY,
    "enabled": False,  # master toggle — off until admin opts in

    "promotions": {
        "enabled": True,
        "cadence": "daily",  # promos always run daily
        "per_category_quota": 20,
        "category_overrides": {},  # {"Stationery": 0} disables that category
        "discount_pool_share_pct": 60,  # % of distributable margin to give away
        "exploration_ratio_pct": 30,    # 30% explorers, 70% winners
        "default_duration_days": 7,
        "rounding": "nearest_100",
        "min_giveaway_tzs": 200,        # skip products where pool can't fund > 200 TZS
    },

    "group_deals": {
        "enabled": True,
        "cadence": "weekly",  # "daily" | "every_3_days" | "weekly"
        "target_count": 25,
        "min_count": 20,
        "max_count": 30,
        "default_duration_days": 14,
        "discount_pool_share_pct": 20,
        "default_display_target": 20,
        "default_funding_source": "internal",  # "internal" | "vendor"
        "always_fulfill_silent": True,  # silent "sell regardless" rule
    },

    "margin_pools": {  # pools the engine may draw from
        "promotion": True,
        "referral": True,
        "sales": True,
        "affiliate": True,
        "reserve": False,
        "platform_margin": False,
    },

    "scoring_weights": {
        "revenue_pct": 50,
        "conversion_pct": 30,
        "margin_pct": 20,
    },

    "expiry_rules": {
        "max_age_days": 30,
        "fifo_when_over_quota": True,
    },

    # KONEKT continuous all-year promo — read by Content Studio template
    # endpoint to overlay a "save TZS X" badge on every product that doesn't
    # already have a more specific active_promotion_id. Pricing-engine bound:
    # the saving comes from a configurable share of the product's promotion
    # pool inside its distributable margin.
    "continuous_promo": {
        "enabled": True,
        "code": "KONEKT",
        "pool_share_pct": 100,
    },

    "last_run": {
        "promotions_at": None,
        "group_deals_at": None,
        "deal_finalize_at": None,
    },
}


# ── Config CRUD ─────────────────────────────────────────────
async def load_config(db) -> dict:
    doc = await db.system_settings.find_one({"_id": CONFIG_KEY})
    if not doc:
        await db.system_settings.insert_one(dict(DEFAULT_CONFIG))
        return {k: v for k, v in DEFAULT_CONFIG.items() if k != "_id"}
    doc.pop("_id", None)
    # Merge with defaults so new keys appear after upgrades
    merged = _merge_defaults(DEFAULT_CONFIG, doc)
    merged.pop("_id", None)
    return merged


def _merge_defaults(defaults: dict, existing: dict) -> dict:
    out = dict(defaults)
    for k, v in (existing or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge_defaults(out[k], v)
        else:
            out[k] = v
    return out


async def save_config(db, payload: dict) -> dict:
    """Merge incoming payload into the singleton; return updated config."""
    current = await load_config(db)
    merged = _merge_defaults(current, payload or {})
    merged["_id"] = CONFIG_KEY
    await db.system_settings.update_one(
        {"_id": CONFIG_KEY}, {"$set": merged}, upsert=True
    )
    merged.pop("_id", None)
    return merged


def _selected_pools(margin_pools: dict) -> list[str]:
    """Return the pool list (e.g. ['promotion', 'referral']) marked True."""
    return [k for k in ("promotion", "referral", "sales", "affiliate", "reserve",
                         "platform_margin") if margin_pools.get(k)]


# ── Scoring ─────────────────────────────────────────────────
async def _score_products(db, category: Optional[str] = None,
                           lookback_days: int = 30,
                           weights: dict | None = None) -> list[dict]:
    """Rank products by weighted blend of revenue, conversion, and margin signal.

    Best-effort: products without sales data score 0 on revenue/conversion but
    can still surface via the random-explorer pool.

    Returns list of {product_id, score, signals}. Sorted by score DESC.
    """
    weights = weights or {"revenue_pct": 50, "conversion_pct": 30, "margin_pct": 20}
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    cutoff_iso = cutoff.isoformat()

    # 1) Revenue + order count per product (from orders + guest orders)
    # We aggregate from orders.items[].product_id when present.
    revenue_by_pid: dict[str, float] = {}
    orders_by_pid: dict[str, int] = {}

    pipeline = [
        {"$match": {"$or": [
            {"created_at": {"$gte": cutoff_iso}},
            {"created_at": {"$gte": cutoff}},
        ]}},
        {"$project": {"items": 1, "line_items": 1}},
    ]
    try:
        async for o in db.orders.aggregate(pipeline):
            items = o.get("items") or o.get("line_items") or []
            for it in items:
                pid = it.get("product_id") or it.get("id")
                if not pid:
                    continue
                qty = float(it.get("quantity") or 1)
                price = float(it.get("unit_price") or it.get("price") or 0)
                revenue_by_pid[pid] = revenue_by_pid.get(pid, 0) + price * qty
                orders_by_pid[pid] = orders_by_pid.get(pid, 0) + 1
    except Exception as e:
        logger.warning("revenue aggregation failed: %s", e)

    # 2) Build product list (filtered by category/branch)
    q = {"is_active": True}
    if category:
        q["$or"] = [{"branch": category}, {"category": category},
                     {"category_name": category}]

    products: list[dict] = []
    async for p in db.products.find(
        q,
        {"_id": 0, "id": 1, "name": 1, "branch": 1, "category": 1,
         "category_name": 1, "vendor_cost": 1, "customer_price": 1,
         "base_price": 1, "view_count": 1, "active_promotion_id": 1,
         "sku": 1},
    ):
        products.append(p)

    if not products:
        return []

    # 3) Normalise signals
    rev_max = max((revenue_by_pid.get(p["id"], 0) for p in products), default=0) or 1
    conv_signals = {}
    for p in products:
        pid = p["id"]
        views = float(p.get("view_count") or 0) or 1.0
        conv_signals[pid] = orders_by_pid.get(pid, 0) / views
    conv_max = max(conv_signals.values(), default=0) or 1

    margin_signals = {}
    for p in products:
        pid = p["id"]
        cost = float(p.get("vendor_cost") or 0)
        price = float(p.get("customer_price") or p.get("base_price") or 0)
        margin_signals[pid] = max(0.0, price - cost)
    margin_max = max(margin_signals.values(), default=0) or 1

    w_rev = float(weights.get("revenue_pct", 50)) / 100
    w_conv = float(weights.get("conversion_pct", 30)) / 100
    w_marg = float(weights.get("margin_pct", 20)) / 100

    scored: list[dict] = []
    for p in products:
        pid = p["id"]
        rev_n = revenue_by_pid.get(pid, 0) / rev_max
        conv_n = conv_signals.get(pid, 0) / conv_max
        marg_n = margin_signals.get(pid, 0) / margin_max
        score = w_rev * rev_n + w_conv * conv_n + w_marg * marg_n
        scored.append({
            "product_id": pid,
            "name": p.get("name"),
            "branch": p.get("branch") or p.get("category_name") or p.get("category"),
            "score": round(score, 4),
            "revenue_30d": revenue_by_pid.get(pid, 0),
            "orders_30d": orders_by_pid.get(pid, 0),
            "active_promotion_id": p.get("active_promotion_id"),
            "sku": p.get("sku"),
        })
    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored


# ── Promotion pass ──────────────────────────────────────────
async def _list_categories(db) -> list[str]:
    cats: set[str] = set()
    async for p in db.products.find(
        {"is_active": True},
        {"_id": 0, "branch": 1, "category_name": 1, "category": 1},
    ):
        c = p.get("branch") or p.get("category_name") or p.get("category")
        if c:
            cats.add(c)
    return sorted(cats)


async def _active_promo_count(db, category: str) -> int:
    """Count active OR pending engine promotions whose scope.branch == category.

    We count drafts toward the quota so the engine doesn't keep generating
    duplicates while the admin is still reviewing them.
    """
    return await db.catalog_promotions.count_documents({
        "status": {"$in": ["active", "draft"]},
        "auto_created": True,
        "$or": [
            {"scope.branch": category},
            {"scope.category_id": category},
        ],
    })


async def _create_engine_promotion(db, product: dict, config: dict) -> Optional[dict]:
    """Create a single-product auto-engine promotion AS A DRAFT.

    The draft does NOT modify the product price or the active_promotion_id —
    it only records the engine's suggestion. An admin must approve the draft
    via /api/admin/automation/drafts/{id}/approve before the promo goes live
    and the product price is rewritten.
    """
    from admin_promotions_routes import (
        _resolve_tier_for_cost,
        _compute_max_giveaway_per_line,
        _round_price,
    )

    cost = float(product.get("vendor_cost") or 0)
    price = float(product.get("customer_price") or product.get("base_price") or 0)
    if cost <= 0 or price <= 0:
        return None

    tier = await _resolve_tier_for_cost(cost)
    if not tier:
        return None

    pools = _selected_pools(config.get("margin_pools", {}))
    if not pools:
        return None

    capacity = _compute_max_giveaway_per_line(
        base_cost=cost,
        tier=tier,
        pools=pools,
        sales_preserve_floor_pct=10.0,
        allow_eat_platform_margin=False,
    )
    pool_share = float(config["promotions"].get("discount_pool_share_pct", 60)) / 100
    avail = capacity["max_giveaway"] * pool_share
    min_floor = float(config["promotions"].get("min_giveaway_tzs", 200))
    if avail < min_floor:
        return None

    rounding = config["promotions"].get("rounding", "nearest_100")
    new_price = _round_price(max(0.0, price - avail), rounding)
    if new_price >= price:
        return None

    # Per-pool capacity snapshot — admin sees what each pool can fund and
    # how much of it the engine actually used. The "all_pools" capacity
    # tells admin what's possible if they opt into reserve / platform margin.
    all_pools_capacity = _compute_max_giveaway_per_line(
        base_cost=cost,
        tier=tier,
        pools=["promotion", "referral", "sales", "affiliate", "reserve"],
        sales_preserve_floor_pct=10.0,
        allow_eat_platform_margin=False,
    )
    distributable_tzs = cost * float(tier.get("distributable_margin_pct") or 0) / 100.0
    split = tier.get("distribution_split") or {}
    per_pool_capacity = {
        "promotion": round(distributable_tzs * float(split.get("promotion_pct") or 0) / 100.0, 2),
        "referral": round(distributable_tzs * float(split.get("referral_pct") or 0) / 100.0, 2),
        "sales": round(distributable_tzs * float(split.get("sales_pct") or 0) / 100.0 * 0.9, 2),  # 10% preserve
        "affiliate": round(distributable_tzs * float(split.get("affiliate_pct") or 0) / 100.0, 2),
        "reserve": round(distributable_tzs * float(split.get("reserve_pct") or 0) / 100.0, 2),
    }
    # Per-pool "used" — distribute the actual giveaway proportionally to
    # each enabled pool's capacity inside the selected pool set.
    used_total = price - new_price
    enabled_capacity_sum = sum(per_pool_capacity.get(p, 0) for p in pools) or 1
    per_pool_used = {
        p: round(used_total * (per_pool_capacity.get(p, 0) / enabled_capacity_sum), 2)
        for p in pools
    }
    # Margin headroom — selling price minus cost minus total used.
    post_promo_margin = round(new_price - cost, 2)
    post_promo_margin_pct = round((post_promo_margin / new_price) * 100, 1) if new_price else 0

    promo_id = str(uuid4())
    now = datetime.now(timezone.utc)
    duration = int(config["promotions"].get("default_duration_days", 7))
    end_date = (now + timedelta(days=duration)).date().isoformat()
    branch = product.get("branch") or product.get("category_name") or product.get("category") or ""

    promo = {
        "id": promo_id,
        "name": f"Auto · {product.get('name') or 'Promotion'}",
        "scope": {
            "skus": [product.get("sku")] if product.get("sku") else [],
            "branch": branch,
        },
        "pools": pools,
        "pool_drawdown_pct": pool_share * 100,
        "platform_eat_pct": 0,
        "discount_tzs_target": 0,
        "rounding": rounding,
        "start_date": now.date().isoformat(),
        "end_date": end_date,
        # Drafts are NOT active. They wait for admin approval before going live.
        "status": "draft",
        "kind": "promotion",
        "product_ids": [product["id"]],
        # Snapshot the price math so admin sees exactly what will happen.
        "preview": {
            "kind": "promotion",
            "product_id": product["id"],
            "product_name": product.get("name"),
            "product_image": product.get("image_url") or product.get("hero_image"),
            "category": branch,
            # Pricing-engine source-of-truth fields
            "vendor_cost": cost,
            "current_price": price,
            "suggested_price": new_price,
            "save_tzs": price - new_price,
            "save_pct": round((price - new_price) / price * 100, 1) if price else 0,
            "duration_days": duration,
            "tier_label": tier.get("label") or tier.get("name") or tier.get("tier_label"),
            "tier_total_margin_pct": tier.get("total_margin_pct") or 0,
            "distributable_margin_pct": tier.get("distributable_margin_pct") or 0,
            "distributable_margin_tzs": round(distributable_tzs, 2),
            "distribution_split": split,
            "per_pool_capacity_tzs": per_pool_capacity,
            "per_pool_used_tzs": per_pool_used,
            "max_safe_giveaway_tzs": round(capacity["max_giveaway"], 2),
            "max_aggressive_giveaway_tzs": round(all_pools_capacity["max_giveaway"], 2),
            "post_promo_margin_tzs": post_promo_margin,
            "post_promo_margin_pct": post_promo_margin_pct,
            "pool_share_pct": float(config["promotions"].get("discount_pool_share_pct", 60)),
        },
        "blocks": {
            "affiliate": "affiliate" in pools,
            "referral": "referral" in pools,
            "sales": "sales" in pools,
            "reserve": "reserve" in pools,
        },
        "created_by": "automation_engine",
        "created_at": now.isoformat(),
        "auto_created": True,
        "engine_origin": "automation",
        # Open promo by default — no code required at checkout. Admin can
        # set `code` during approval to turn it into a campaign code.
        "code": "",
        "promo_code_required": False,
    }
    await db.catalog_promotions.insert_one(promo)
    promo.pop("_id", None)
    promo["new_price"] = new_price
    promo["original_price"] = price
    return promo


async def _expire_engine_promotions(db, max_age_days: int) -> int:
    """Auto-expire engine-created promos past max age OR past end_date."""
    from admin_promotions_routes import _revert_products

    cutoff_iso = (datetime.now(timezone.utc) - timedelta(days=max_age_days)).isoformat()
    today_iso = datetime.now(timezone.utc).date().isoformat()
    expired = 0
    async for p in db.catalog_promotions.find(
        {
            "status": "active",
            "auto_created": True,
            "$or": [
                {"created_at": {"$lt": cutoff_iso}},
                {"end_date": {"$ne": None, "$lt": today_iso}},
            ],
        },
        {"_id": 0, "id": 1},
    ):
        try:
            reverted = await _revert_products(p["id"])
            await db.catalog_promotions.update_one(
                {"id": p["id"]},
                {"$set": {
                    "status": "ended",
                    "ended_at": datetime.now(timezone.utc).isoformat(),
                    "products_reverted": reverted,
                    "auto_ended": True,
                }},
            )
            expired += 1
        except Exception as e:
            logger.warning("expire failed for promo %s: %s", p.get("id"), e)
    return expired


async def run_promotion_pass(db, dry_run: bool = False) -> dict:
    """Top up per-category promo quotas. Returns a run report."""
    config = await load_config(db)
    if not config.get("enabled") or not config["promotions"].get("enabled"):
        return {"skipped": True, "reason": "engine_disabled"}

    expired = 0 if dry_run else await _expire_engine_promotions(
        db, int(config["expiry_rules"].get("max_age_days", 30))
    )

    cats = await _list_categories(db)
    overrides = config["promotions"].get("category_overrides") or {}
    default_quota = int(config["promotions"].get("per_category_quota", 20))
    explore_pct = float(config["promotions"].get("exploration_ratio_pct", 30)) / 100

    created: list[dict] = []
    skipped: list[dict] = []

    for cat in cats:
        quota = int(overrides.get(cat, default_quota))
        if quota <= 0:
            continue
        active = await _active_promo_count(db, cat)
        need = quota - active
        if need <= 0:
            continue

        ranked = await _score_products(
            db, category=cat, weights=config["scoring_weights"]
        )
        # Skip products that already have an active promotion
        eligible = [r for r in ranked if not r.get("active_promotion_id")]

        winners_count = max(0, round(need * (1 - explore_pct)))
        explorers_count = need - winners_count
        winners = eligible[:winners_count]
        explorer_pool = eligible[winners_count:]
        random.shuffle(explorer_pool)
        explorers = explorer_pool[:explorers_count]
        picks = winners + explorers

        for r in picks:
            prod = await db.products.find_one({"id": r["product_id"]})
            if not prod:
                skipped.append({"product_id": r["product_id"], "reason": "not_found"})
                continue
            if dry_run:
                created.append({
                    "product_id": r["product_id"],
                    "category": cat,
                    "would_create": True,
                    "score": r["score"],
                })
                continue
            promo = await _create_engine_promotion(db, prod, config)
            if promo:
                created.append({
                    "promo_id": promo["id"],
                    "product_id": r["product_id"],
                    "category": cat,
                    "new_price": promo["new_price"],
                    "saves_tzs": promo["original_price"] - promo["new_price"],
                    "score": r["score"],
                })
            else:
                skipped.append({"product_id": r["product_id"], "reason": "pool_too_small"})

    if not dry_run:
        await db.system_settings.update_one(
            {"_id": CONFIG_KEY},
            {"$set": {"last_run.promotions_at": datetime.now(timezone.utc).isoformat()}},
        )

    return {
        "categories_scanned": len(cats),
        "created": created,
        "created_count": len(created),
        "skipped": skipped,
        "skipped_count": len(skipped),
        "expired_count": expired,
        "dry_run": dry_run,
    }


# ── Group deal pass ─────────────────────────────────────────
async def _active_group_deal_count(db) -> int:
    return await db.group_deal_campaigns.count_documents(
        {"status": "active", "auto_created": True}
    )


async def run_group_deal_pass(db, dry_run: bool = False) -> dict:
    config = await load_config(db)
    if not config.get("enabled") or not config["group_deals"].get("enabled"):
        return {"skipped": True, "reason": "engine_disabled"}

    target = int(config["group_deals"].get("target_count", 25))
    active = await _active_group_deal_count(db)
    need = target - active
    if need <= 0:
        return {"skipped": True, "reason": "already_at_target",
                "active": active, "target": target}

    # Reuse existing suggest engine
    from admin_group_deals_internal_routes import _suggest_for_product
    from services.settings_resolver import get_pricing_policy_tiers
    from commission_margin_engine_service import resolve_tier

    pool_share = float(config["group_deals"].get("discount_pool_share_pct", 20))
    duration = int(config["group_deals"].get("default_duration_days", 14))
    display_target = int(config["group_deals"].get("default_display_target", 20))
    funding_source = config["group_deals"].get("default_funding_source", "internal")

    # Score products to pick the best winners + some random explorers
    ranked = await _score_products(db, weights=config["scoring_weights"])
    # Filter out products already in active group deals
    active_pids = set()
    async for gd in db.group_deal_campaigns.find(
        {"status": "active"}, {"_id": 0, "product_id": 1}
    ):
        if gd.get("product_id"):
            active_pids.add(gd["product_id"])
    eligible = [r for r in ranked if r["product_id"] not in active_pids]

    explore_pct = float(config["promotions"].get("exploration_ratio_pct", 30)) / 100
    winners_count = max(0, round(need * (1 - explore_pct)))
    explorers_count = need - winners_count
    winners = eligible[:winners_count]
    explorer_pool = eligible[winners_count:]
    random.shuffle(explorer_pool)
    explorers = explorer_pool[:explorers_count]
    picks = winners + explorers

    tier_cache: dict = {}

    async def tiers_for(branch: str):
        if branch not in tier_cache:
            tier_cache[branch] = await get_pricing_policy_tiers(db, category=branch)
        return tier_cache[branch]

    created: list[dict] = []
    skipped: list[dict] = []

    for r in picks:
        product = await db.products.find_one({"id": r["product_id"]})
        if not product:
            skipped.append({"product_id": r["product_id"], "reason": "not_found"})
            continue
        branch = product.get("branch") or product.get("category_name") or "default"
        tiers = await tiers_for(branch)
        tier = resolve_tier(float(product.get("vendor_cost") or 0), tiers)
        if not tier:
            skipped.append({"product_id": r["product_id"], "reason": "no_tier"})
            continue
        sugg = await _suggest_for_product(product, tier, pool_share)
        if not sugg:
            skipped.append({"product_id": r["product_id"], "reason": "pool_too_small"})
            continue

        if dry_run:
            created.append({
                "product_id": r["product_id"],
                "would_create": True,
                "discount_pct": sugg["suggested_discount_pct"],
            })
            continue

        now = datetime.now(timezone.utc)
        deadline = now + timedelta(days=duration)
        campaign = {
            "campaign_id": str(uuid4())[:8].upper(),
            "product_id": sugg["product_id"],
            "product_name": sugg["product_name"],
            "product_image": sugg["product_image"],
            "description": sugg["customer_description"],
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
            "display_target": display_target,
            "vendor_threshold": display_target,
            "current_committed": 0,
            "buyer_count": 0,
            "duration_days": duration,
            "deadline": deadline,
            "funding_source": funding_source,
            "vendor_involved": funding_source == "vendor",
            "internal_pool_share_pct": pool_share,
            "internal_pool_label": (
                f"{sugg['distributable_margin_pct']:.0f}% distributable × {pool_share:.0f}%"
            ),
            "pricing_tier_label": sugg["tier_label"],
            "pricing_branch": sugg["branch"],
            "commission_mode": "none",
            "affiliate_share_pct": 0,
            # Group deal drafts go through the same admin review queue as
            # promotions. Customer-facing UI never shows status='draft'.
            "status": "draft",
            "is_active": False,
            "kind": "group_deal",
            "threshold_met": False,
            "is_featured": False,
            "created_by": "automation_engine",
            "auto_created": True,
            "always_fulfill_silent": bool(
                config["group_deals"].get("always_fulfill_silent", True)
            ),
            "preview": {
                "kind": "group_deal",
                "product_id": sugg["product_id"],
                "product_name": sugg["product_name"],
                "product_image": sugg["product_image"],
                "category": sugg["branch"],
                "vendor_cost": sugg["vendor_cost"],
                "current_price": sugg["current_customer_price"],
                "suggested_price": sugg["suggested_discounted_price"],
                "save_tzs": sugg["suggested_discount_amount"],
                "save_pct": sugg["suggested_discount_pct"],
                "duration_days": duration,
                "tier_label": sugg["tier_label"],
                "distributable_margin_pct": sugg.get("distributable_margin_pct"),
                "display_target": display_target,
                "funding_source": funding_source,
            },
            "created_at": now,
            "updated_at": now,
        }
        res = await db.group_deal_campaigns.insert_one(campaign)
        created.append({
            "id": str(res.inserted_id),
            "campaign_id": campaign["campaign_id"],
            "product_name": campaign["product_name"],
            "discount_pct": sugg["suggested_discount_pct"],
        })

    if not dry_run:
        await db.system_settings.update_one(
            {"_id": CONFIG_KEY},
            {"$set": {"last_run.group_deals_at": datetime.now(timezone.utc).isoformat()}},
        )

    return {
        "active_before": active,
        "target": target,
        "created": created,
        "created_count": len(created),
        "skipped": skipped,
        "skipped_count": len(skipped),
        "dry_run": dry_run,
    }


# ── Silent group-deal "always-sell" finaliser ───────────────
async def silent_finalize_expired_deals(db) -> dict:
    """Find expired group deals where target was NOT reached and mark them
    fulfilled at the advertised tier. Backend-only — UI never shows failure.

    For each pending participant order, flip status from 'awaiting_target' to
    'confirmed' so the standard fulfilment pipeline picks them up. Customers
    still pay the advertised discounted_price they committed to (already
    captured at join time).
    """
    now = datetime.now(timezone.utc)
    finalised = 0
    async for gd in db.group_deal_campaigns.find({
        "status": "active",
        "deadline": {"$lt": now},
    }):
        gd_id = gd.get("_id")
        always = bool(gd.get("always_fulfill_silent", True))
        committed = int(gd.get("current_committed") or gd.get("buyer_count") or 0)
        target = int(gd.get("display_target") or gd.get("vendor_threshold") or 0)
        target_met = committed >= target

        new_status = "completed" if target_met else (
            "fulfilled_silent" if always else "expired"
        )

        # Flip pending participant orders to confirmed when we are silently
        # fulfilling. No-op when the cohort hit the target naturally.
        if always or target_met:
            try:
                # Match either group_deal_id (stringified ObjectId, the canonical
                # key used by /join) or the short uppercase campaign_id field
                # for any legacy code paths.
                gd_id_str = str(gd_id)
                gd_short = gd.get("campaign_id")
                or_clauses = [{"group_deal_id": gd_id_str},
                              {"campaign_id": gd_id_str}]
                if gd_short:
                    or_clauses.extend([{"group_deal_id": gd_short},
                                        {"campaign_id": gd_short}])
                await db.orders.update_many(
                    {
                        "$or": or_clauses,
                        "status": {"$in": ["awaiting_target", "pending_group"]},
                    },
                    {"$set": {
                        "status": "confirmed",
                        "current_status": "confirmed",
                        "group_deal_finalized_at": now.isoformat(),
                    }},
                )
            except Exception as e:
                logger.warning("group-deal participant-order flip failed: %s", e)

        await db.group_deal_campaigns.update_one(
            {"_id": gd_id},
            {"$set": {
                "status": new_status,
                "is_active": False,
                "ended_at": now,
                "threshold_met": target_met,
                "fulfilled_silent": (always and not target_met),
            }},
        )
        finalised += 1

    await db.system_settings.update_one(
        {"_id": CONFIG_KEY},
        {"$set": {"last_run.deal_finalize_at": now.isoformat()}},
        upsert=True,
    )
    return {"finalised_count": finalised}


# ── Performance dashboard ───────────────────────────────────
async def compute_performance_dashboard(db, lookback_days: int = 30) -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    cutoff_iso = cutoff.isoformat()

    # Top performing engine promotions by revenue impact
    promo_stats: dict[str, dict] = {}
    async for promo in db.catalog_promotions.find(
        {"auto_created": True, "$or": [
            {"created_at": {"$gte": cutoff_iso}},
            {"created_at": {"$gte": cutoff}},
        ]},
        {"_id": 0, "id": 1, "name": 1, "status": 1, "product_ids": 1,
         "created_at": 1, "scope": 1},
    ):
        promo_stats[promo["id"]] = {
            "promo_id": promo["id"],
            "name": promo.get("name"),
            "status": promo.get("status"),
            "category": (promo.get("scope") or {}).get("branch"),
            "products_count": len(promo.get("product_ids") or []),
            "orders": 0,
            "revenue": 0.0,
            "created_at": promo.get("created_at"),
        }

    # Aggregate orders that referenced these promos
    pids_to_promo: dict[str, str] = {}

    async for promo in db.catalog_promotions.find(
        {"auto_created": True}, {"_id": 0, "id": 1, "product_ids": 1}
    ):
        for pid in promo.get("product_ids") or []:
            pids_to_promo[pid] = promo["id"]

    async for o in db.orders.find(
        {"$or": [
            {"created_at": {"$gte": cutoff_iso}},
            {"created_at": {"$gte": cutoff}},
        ]},
        {"_id": 0, "items": 1, "line_items": 1, "created_at": 1},
    ):
        items = o.get("items") or o.get("line_items") or []
        order_created = o.get("created_at")
        # Normalise to a comparable string for downstream attribution check.
        order_iso = (
            order_created.isoformat() if hasattr(order_created, "isoformat")
            else str(order_created or "")
        )
        for it in items:
            pid = it.get("product_id") or it.get("id")
            if not pid:
                continue
            promo_id = pids_to_promo.get(pid)
            if not promo_id or promo_id not in promo_stats:
                continue
            # STRICT attribution: only count orders placed AFTER the promo
            # was created. Otherwise the dashboard inflates by stale orders
            # for products that happen to be re-promoted now.
            promo_created = promo_stats[promo_id].get("created_at")
            if promo_created and order_iso and order_iso < (
                promo_created.isoformat() if hasattr(promo_created, "isoformat")
                else str(promo_created)
            ):
                continue
            qty = float(it.get("quantity") or 1)
            unit = float(it.get("unit_price") or it.get("price") or 0)
            promo_stats[promo_id]["revenue"] += qty * unit
            promo_stats[promo_id]["orders"] += 1

    promos_sorted = sorted(promo_stats.values(),
                            key=lambda r: r["revenue"], reverse=True)
    top_performers = promos_sorted[:10]
    dead_promos = [p for p in promos_sorted if p["orders"] == 0][:10]

    total_revenue = sum(p["revenue"] for p in promos_sorted)
    total_orders = sum(p["orders"] for p in promos_sorted)
    active_count = sum(1 for p in promos_sorted if p["status"] == "active")

    # Group deal stats
    gd_total = await db.group_deal_campaigns.count_documents(
        {"auto_created": True}
    )
    gd_active = await db.group_deal_campaigns.count_documents(
        {"auto_created": True, "status": "active"}
    )
    gd_completed = await db.group_deal_campaigns.count_documents(
        {"auto_created": True, "status": {"$in": ["completed", "fulfilled_silent"]}}
    )

    return {
        "lookback_days": lookback_days,
        "promotions": {
            "total_engine_promos": len(promos_sorted),
            "active": active_count,
            "total_orders": total_orders,
            "total_revenue": round(total_revenue, 2),
            "top_performers": top_performers,
            "dead_promos": dead_promos,
        },
        "group_deals": {
            "total_engine_deals": gd_total,
            "active": gd_active,
            "completed_or_fulfilled": gd_completed,
        },
    }


# ── Draft management (admin review queue) ──────────────────
async def list_drafts(db) -> list[dict]:
    """Return all engine-created promotion AND group-deal drafts pending admin review.

    Drafts are surfaced as a unified list with a `kind` discriminator
    ('promotion' | 'group_deal') so the admin reviews everything in one
    panel. After approval each kind flows back to its native page.
    """
    drafts: list[dict] = []
    # Promotion drafts
    async for d in db.catalog_promotions.find(
        {"auto_created": True, "status": "draft"},
        {"_id": 0},
    ).sort("created_at", -1):
        preview = d.get("preview") or {}
        drafts.append({
            "id": d["id"],
            "kind": "promotion",
            "name": d.get("name"),
            "category": (d.get("scope") or {}).get("branch"),
            "code": d.get("code") or "",
            "promo_code_required": bool(d.get("promo_code_required", False)),
            "duration_days": preview.get("duration_days") or 0,
            "start_date": d.get("start_date"),
            "end_date": d.get("end_date"),
            "created_at": d.get("created_at"),
            "preview": preview,
            "pools": d.get("pools") or [],
        })
    # Group-deal drafts
    async for g in db.group_deal_campaigns.find(
        {"auto_created": True, "status": "draft"},
        {"_id": 1},
    ).sort("created_at", -1):
        gid = str(g["_id"])
        full = await db.group_deal_campaigns.find_one({"_id": g["_id"]})
        if not full:
            continue
        full.pop("_id", None)
        preview = full.get("preview") or {}
        drafts.append({
            "id": gid,
            "kind": "group_deal",
            "name": f"Deal · {full.get('product_name')}",
            "category": full.get("branch") or full.get("category"),
            "code": "",
            "promo_code_required": False,
            "duration_days": full.get("duration_days") or preview.get("duration_days") or 0,
            "start_date": (full.get("created_at").isoformat() if hasattr(full.get("created_at"), "isoformat") else str(full.get("created_at") or "")),
            "end_date": (full.get("deadline").isoformat() if hasattr(full.get("deadline"), "isoformat") else str(full.get("deadline") or "")),
            "created_at": full.get("created_at"),
            "preview": preview or {
                "kind": "group_deal",
                "product_id": full.get("product_id"),
                "product_name": full.get("product_name"),
                "product_image": full.get("product_image"),
                "category": full.get("branch"),
                "vendor_cost": full.get("vendor_cost"),
                "current_price": full.get("original_price"),
                "suggested_price": full.get("discounted_price"),
                "save_tzs": full.get("savings_amount"),
                "save_pct": full.get("margin_pct"),
                "duration_days": full.get("duration_days"),
                "display_target": full.get("display_target"),
                "funding_source": full.get("funding_source"),
            },
            "pools": [],
        })
    drafts.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return drafts


def _recompute_with_pools(preview: dict, override_pools: list[str]) -> tuple[float, float, dict]:
    """Recompute the suggested price when admin overrides which pools to draw from.

    Returns (new_price, save_tzs, per_pool_used).
    Falls back to the original preview values when override is empty/equal.
    """
    if not override_pools:
        return (
            float(preview.get("suggested_price") or 0),
            float(preview.get("save_tzs") or 0),
            preview.get("per_pool_used_tzs") or {},
        )
    cap = preview.get("per_pool_capacity_tzs") or {}
    cur_price = float(preview.get("current_price") or 0)
    pool_share_pct = float(preview.get("pool_share_pct") or 60) / 100.0
    capacity_sum = sum(float(cap.get(p) or 0) for p in override_pools)
    avail = capacity_sum * pool_share_pct
    # Round to nearest 100 like the engine
    new_price = max(0.0, cur_price - avail)
    new_price = round(new_price / 100) * 100
    save = max(0.0, cur_price - new_price)
    used_total = save
    enabled_capacity_sum = sum(float(cap.get(p) or 0) for p in override_pools) or 1
    per_pool_used = {
        p: round(used_total * (float(cap.get(p) or 0) / enabled_capacity_sum), 2)
        for p in override_pools
    }
    return (new_price, save, per_pool_used)


async def approve_draft(db, draft_id: str, code: str | None = None,
                          required: bool = False,
                          pools_override: list[str] | None = None) -> dict:
    """Promote a draft (promotion OR group-deal) to active.

    code:           optional campaign code (uppercased). Empty = open promo.
    required:       when True, the customer must enter the code at checkout.
    pools_override: optional list — admin can change which margin pools fund
                    the giveaway (e.g. add 'reserve'). Recomputes price.
                    Only applies to promotion-kind drafts.
    """
    # Try promotion first
    d = await db.catalog_promotions.find_one({"id": draft_id, "status": "draft"})
    if d:
        return await _approve_promotion_draft(db, d, code, required, pools_override)

    # Then group deal — id may be the ObjectId-string
    try:
        from bson import ObjectId
        gd_id = ObjectId(draft_id)
    except Exception:
        return {"ok": False, "error": "draft_not_found"}
    gd = await db.group_deal_campaigns.find_one({"_id": gd_id, "status": "draft"})
    if not gd:
        return {"ok": False, "error": "draft_not_found"}
    return await _approve_group_deal_draft(db, gd)


async def _approve_promotion_draft(db, d: dict, code, required, pools_override):
    pools = list(d.get("pools") or [])
    preview = dict(d.get("preview") or {})
    pid = preview.get("product_id")
    cur_price = float(preview.get("current_price") or 0)
    new_price = float(preview.get("suggested_price") or 0)
    save_tzs = float(preview.get("save_tzs") or 0)

    # Apply pool override if provided
    if pools_override and set(pools_override) != set(pools):
        new_price, save_tzs, per_pool_used = _recompute_with_pools(preview, pools_override)
        if new_price >= cur_price:
            return {"ok": False, "error": "override_eats_no_margin"}
        pools = list(pools_override)
        preview["suggested_price"] = new_price
        preview["save_tzs"] = save_tzs
        preview["save_pct"] = round(save_tzs / cur_price * 100, 1) if cur_price else 0
        preview["per_pool_used_tzs"] = per_pool_used

    promo_blocks = {
        "affiliate": "affiliate" in pools,
        "referral": "referral" in pools,
        "sales": "sales" in pools,
        "reserve": "reserve" in pools,
    }
    name_for_label = d.get("name") or "Auto Promotion"
    if pid and cur_price > 0 and new_price > 0:
        await db.products.update_one(
            {"id": pid},
            {"$set": {
                "original_price": cur_price,
                "customer_price": new_price,
                "base_price": new_price,
                "active_promotion_id": d["id"],
                "active_promotion_label": name_for_label,
                "promo_saves_tzs": save_tzs,
                "promo_blocks": promo_blocks,
            }},
        )

    code_clean = (code or "").strip().upper()
    await db.catalog_promotions.update_one(
        {"id": d["id"]},
        {"$set": {
            "status": "active",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "code": code_clean,
            "promo_code_required": bool(required and code_clean),
            "pools": pools,
            "preview": preview,
            "blocks": promo_blocks,
        }},
    )
    return {"ok": True, "id": d["id"], "kind": "promotion", "code": code_clean}


async def _approve_group_deal_draft(db, gd: dict):
    """Group-deal drafts simply flip to active; their price + visibility wire
    is already populated. Customer-facing UI picks them up immediately."""
    await db.group_deal_campaigns.update_one(
        {"_id": gd["_id"]},
        {"$set": {
            "status": "active",
            "is_active": True,
            "approved_at": datetime.now(timezone.utc),
        }},
    )
    return {"ok": True, "id": str(gd["_id"]), "kind": "group_deal"}


async def reject_draft(db, draft_id: str) -> dict:
    # Promotion?
    res = await db.catalog_promotions.delete_one(
        {"id": draft_id, "auto_created": True, "status": "draft"}
    )
    if res.deleted_count == 1:
        return {"ok": True, "id": draft_id, "kind": "promotion"}
    # Group deal?
    try:
        from bson import ObjectId
        gd_id = ObjectId(draft_id)
    except Exception:
        return {"ok": False, "id": draft_id}
    res2 = await db.group_deal_campaigns.delete_one(
        {"_id": gd_id, "auto_created": True, "status": "draft"}
    )
    return {"ok": res2.deleted_count == 1, "id": draft_id, "kind": "group_deal"}


async def approve_all_drafts(db) -> dict:
    drafts = await list_drafts(db)
    for d in drafts:
        await approve_draft(db, d["id"])
    return {"ok": True, "approved": len(drafts)}


async def emit_expiry_renewal_notifications(db) -> int:
    """Find active engine promos that just ended and create an admin
    notification asking for review/renewal. Returns count emitted.

    Writes to the unified `db.notifications` collection (recipient_role='admin')
    so the standard NotificationBell dropdown surfaces them in real time.
    """
    today_iso = datetime.now(timezone.utc).date().isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()
    emitted = 0
    async for promo in db.catalog_promotions.find(
        {
            "auto_created": True,
            "status": "active",
            "end_date": {"$ne": None, "$lt": today_iso},
            "renewal_notified_at": {"$exists": False},
        },
        {"_id": 0, "id": 1, "name": 1, "scope": 1},
    ):
        try:
            await db.notifications.insert_one({
                "id": str(uuid4()),
                "kind": "promo_expiry_renewal",
                "notification_type": "promo_expiry_renewal",
                "title": f"Promo ended · {promo.get('name')}",
                "message": (
                    "An auto-engine promo has reached its end date. Review the "
                    "performance and approve a fresh promo for this product, "
                    "or close the slot."
                ),
                "body": (
                    "An auto-engine promo has reached its end date. Review the "
                    "performance and approve a fresh promo for this product, "
                    "or close the slot."
                ),
                "target_url": "/admin/promotions-manager",
                "cta_label": "Review promo",
                "recipient_role": "admin",
                "priority": "high",
                "promo_id": promo["id"],
                "category": (promo.get("scope") or {}).get("branch"),
                "is_read": False,
                "read": False,
                "created_at": now_iso,
            })
            await db.catalog_promotions.update_one(
                {"id": promo["id"]},
                {"$set": {"renewal_notified_at": now_iso}},
            )
            emitted += 1
        except Exception as e:
            logger.warning("renewal notification failed: %s", e)
    return emitted


# ── Promote-everything override ─────────────────────────────
async def promote_everything(db, discount_pct: float = 10.0,
                              duration_days: int = 3) -> dict:
    """One-click sitewide sale — applies a flat % off to ALL active products
    using the same margin-pool-aware giveaway primitive. Skips products where
    the pools cannot fund the discount.
    """
    from admin_promotions_routes import (
        _resolve_tier_for_cost,
        _compute_max_giveaway_per_line,
        _round_price,
    )

    config = await load_config(db)
    pools = _selected_pools(config.get("margin_pools", {}))
    if not pools:
        return {"created": 0, "skipped": 0, "reason": "no_pools_selected"}

    promo_id = str(uuid4())
    now = datetime.now(timezone.utc)
    end_date = (now + timedelta(days=duration_days)).date().isoformat()

    promo = {
        "id": promo_id,
        "name": f"Sitewide Auto Sale · {discount_pct:.0f}% off",
        "scope": {"branch": ""},
        "pools": pools,
        "pool_drawdown_pct": 100,
        "platform_eat_pct": 0,
        "discount_tzs_target": 0,
        "rounding": "nearest_100",
        "start_date": now.date().isoformat(),
        "end_date": end_date,
        "status": "active",
        "product_ids": [],
        "blocks": {
            "affiliate": "affiliate" in pools,
            "referral": "referral" in pools,
        },
        "created_by": "automation_engine.promote_everything",
        "created_at": now.isoformat(),
        "auto_created": True,
        "engine_origin": "promote_everything",
        "discount_pct_target": discount_pct,
    }
    await db.catalog_promotions.insert_one(promo)

    applied = 0
    skipped = 0
    matched_ids: list[str] = []
    promo_blocks = {
        "affiliate": "affiliate" in pools,
        "referral": "referral" in pools,
    }

    async for p in db.products.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "customer_price": 1, "base_price": 1, "vendor_cost": 1},
    ):
        cost = float(p.get("vendor_cost") or 0)
        price = float(p.get("customer_price") or p.get("base_price") or 0)
        if cost <= 0 or price <= 0:
            skipped += 1
            continue
        tier = await _resolve_tier_for_cost(cost)
        capacity = _compute_max_giveaway_per_line(
            base_cost=cost, tier=tier, pools=pools,
            sales_preserve_floor_pct=10.0,
            allow_eat_platform_margin=False,
        )
        wanted = price * (discount_pct / 100)
        if capacity["max_giveaway"] + 0.5 < wanted:
            skipped += 1
            continue
        new_price = _round_price(max(0.0, price - wanted), "nearest_100")
        if new_price >= price:
            skipped += 1
            continue
        await db.products.update_one(
            {"id": p["id"]},
            {"$set": {
                "original_price": price,
                "customer_price": new_price,
                "base_price": new_price,
                "active_promotion_id": promo_id,
                "active_promotion_label": promo["name"],
                "promo_saves_tzs": price - new_price,
                "promo_blocks": promo_blocks,
            }},
        )
        matched_ids.append(p["id"])
        applied += 1

    await db.catalog_promotions.update_one(
        {"id": promo_id}, {"$set": {"product_ids": matched_ids}}
    )
    return {"promo_id": promo_id, "applied": applied, "skipped": skipped}


# ── Background loop ─────────────────────────────────────────
CADENCE_SECONDS = {
    "daily": 24 * 3600,
    "every_3_days": 3 * 24 * 3600,
    "weekly": 7 * 24 * 3600,
}


async def automation_engine_loop(app):
    """Background loop. Wakes every 30 minutes, checks if a pass is due.

    Promotions: cadence is always daily.
    Group deals: cadence is configurable (daily / every_3_days / weekly).
    Silent finaliser: runs on every wake.
    """
    logger.info("Automation engine loop started")
    await asyncio.sleep(120)  # let other startup tasks settle

    while True:
        try:
            db = app.mongodb
            config = await load_config(db)

            if config.get("enabled"):
                # Silent finaliser — cheap, run every wake
                try:
                    await silent_finalize_expired_deals(db)
                except Exception as e:
                    logger.warning("silent finaliser failed: %s", e)

                # Renewal notifications for expired engine promos
                try:
                    await emit_expiry_renewal_notifications(db)
                except Exception as e:
                    logger.warning("renewal notifications failed: %s", e)

                # Promotion pass — daily
                if config["promotions"].get("enabled"):
                    last = (config.get("last_run") or {}).get("promotions_at")
                    if _is_due(last, "daily"):
                        try:
                            await run_promotion_pass(db)
                        except Exception as e:
                            logger.error("promotion pass failed: %s", e)

                # Group deal pass — configurable cadence
                if config["group_deals"].get("enabled"):
                    cadence = config["group_deals"].get("cadence", "weekly")
                    last = (config.get("last_run") or {}).get("group_deals_at")
                    if _is_due(last, cadence):
                        try:
                            await run_group_deal_pass(db)
                        except Exception as e:
                            logger.error("group deal pass failed: %s", e)
        except Exception as e:
            logger.error("automation loop tick error: %s", e)

        await asyncio.sleep(30 * 60)  # 30-min wake cycle


def _is_due(last_iso: Optional[str], cadence: str) -> bool:
    if not last_iso:
        return True
    try:
        last = datetime.fromisoformat(last_iso.replace("Z", "+00:00"))
    except Exception:
        return True
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    seconds = CADENCE_SECONDS.get(cadence, CADENCE_SECONDS["daily"])
    return (datetime.now(timezone.utc) - last).total_seconds() >= seconds
