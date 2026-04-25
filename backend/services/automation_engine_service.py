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
    """Count active engine-created promotions whose scope.branch == category."""
    return await db.catalog_promotions.count_documents({
        "status": "active",
        "auto_created": True,
        "$or": [
            {"scope.branch": category},
            {"scope.category_id": category},
        ],
    })


async def _create_engine_promotion(db, product: dict, config: dict) -> Optional[dict]:
    """Create a single-product auto promotion using the existing margin-aware
    primitive from admin_promotions_routes."""
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
        "status": "active",
        "product_ids": [product["id"]],
        "blocks": {
            "affiliate": "affiliate" in pools,
            "referral": "referral" in pools,
        },
        "created_by": "automation_engine",
        "created_at": now.isoformat(),
        "auto_created": True,
        "engine_origin": "automation",
    }
    await db.catalog_promotions.insert_one(promo)

    promo_blocks = {
        "affiliate": "affiliate" in pools,
        "referral": "referral" in pools,
    }
    await db.products.update_one(
        {"id": product["id"]},
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
            "status": "active",
            "is_active": True,
            "threshold_met": False,
            "is_featured": False,
            "created_by": "automation_engine",
            "auto_created": True,
            "always_fulfill_silent": bool(
                config["group_deals"].get("always_fulfill_silent", True)
            ),
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
        {"_id": 0, "items": 1, "line_items": 1},
    ):
        items = o.get("items") or o.get("line_items") or []
        for it in items:
            pid = it.get("product_id") or it.get("id")
            if not pid:
                continue
            promo_id = pids_to_promo.get(pid)
            if not promo_id or promo_id not in promo_stats:
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
