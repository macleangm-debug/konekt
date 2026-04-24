"""
Tiered Margin Engine — Pricing resolution using unified pricing policy tiers.

Override hierarchy: product > subcategory > category > group > global (Settings Hub).
Global tiers now come from the unified pricing_policy_tiers in Settings Hub.
"""


def resolve_tier(base_price, tiers):
    """Find the matching tier for a base_price. Supports both legacy and unified format."""
    for tier in tiers:
        # Unified format
        if "min_amount" in tier:
            if tier["min_amount"] <= base_price <= tier["max_amount"]:
                return tier
        # Legacy format
        elif "min" in tier:
            if tier["min"] <= base_price <= tier["max"]:
                return tier
    return None


def apply_margin(base_price, tier):
    """Apply margin from a tier to produce sell_price."""
    if tier is None:
        return base_price

    # Unified format: use total_margin_pct
    if "total_margin_pct" in tier:
        return round(base_price * (1 + tier["total_margin_pct"] / 100.0), 2)

    # Legacy format
    t = tier.get("type", "percentage")
    if t == "percentage":
        return round(base_price * (1 + tier["value"] / 100.0), 2)
    if t == "fixed":
        return round(base_price + tier["value"], 2)
    if t == "hybrid":
        return round(base_price * (1 + tier["percent"] / 100.0) + tier["fixed"], 2)
    return base_price


def resolve_service_sell_price(vendor_cost, service_group_margin_percent):
    """Simple service margin: vendor_cost * (1 + margin%)."""
    return round(vendor_cost * (1 + service_group_margin_percent / 100.0), 2)


async def get_global_tiers(db):
    """Get global tiers from Settings Hub (unified pricing policy tiers)."""
    try:
        from services.settings_resolver import get_pricing_policy_tiers
        tiers = await get_pricing_policy_tiers(db)
        if tiers and len(tiers) > 0:
            return tiers
    except Exception:
        pass
    # Fallback: check legacy margin_config collection
    doc = await db.margin_config.find_one({"scope": "global"}, {"_id": 0})
    if doc and doc.get("tiers"):
        return doc["tiers"]
    # Hardcoded fallback (should never be reached if Settings Hub is working)
    return [
        {"min_amount": 0, "max_amount": 100000, "total_margin_pct": 35, "label": "Small (0 – 100K)"},
        {"min_amount": 100001, "max_amount": 500000, "total_margin_pct": 30, "label": "Lower-Medium (100K – 500K)"},
        {"min_amount": 500001, "max_amount": 2000000, "total_margin_pct": 25, "label": "Medium (500K – 2M)"},
        {"min_amount": 2000001, "max_amount": 10000000, "total_margin_pct": 20, "label": "Large (2M – 10M)"},
        {"min_amount": 10000001, "max_amount": 999999999, "total_margin_pct": 15, "label": "Enterprise (10M+)"},
    ]


async def save_global_tiers(db, tiers, category: str = None):
    """Save pricing policy tiers to Settings Hub.

    If `category` is None, saves as the "default" tier set (also preserved as a
    flat list for legacy backward-compat in the margin_config collection).

    If `category` is provided (e.g. "Promotional Materials"), saves into the
    category-specific slot of a dict-shaped `pricing_policy_tiers`. Preserves
    any other category slots that were already set.
    """
    from datetime import datetime, timezone
    from services.settings_resolver import invalidate_settings_cache

    # Load current settings_hub
    hub = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    value = hub.get("value", {}) if hub else {}
    existing = value.get("pricing_policy_tiers", {})

    # Normalise current storage into dict-shape
    if isinstance(existing, list):
        existing = {"default": existing}
    elif not isinstance(existing, dict):
        existing = {}

    if category is None or category == "default":
        existing["default"] = tiers
    else:
        existing[category] = tiers

    value["pricing_policy_tiers"] = existing

    await db.admin_settings.update_one(
        {"key": "settings_hub"},
        {"$set": {"value": value}},
        upsert=True,
    )
    invalidate_settings_cache()

    # Legacy mirror (only the default set) — keeps older code paths working
    legacy_tiers = []
    for t in existing.get("default", tiers):
        if "min_amount" in t:
            legacy_tiers.append({
                "min": t["min_amount"],
                "max": t["max_amount"],
                "type": "percentage",
                "value": t.get("total_margin_pct", 0),
                "label": t.get("label", ""),
            })
        else:
            legacy_tiers.append(t)
    await db.margin_config.update_one(
        {"scope": "global"},
        {"$set": {"tiers": legacy_tiers, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )


async def resolve_price(db, base_price, product_id=None, subcategory_id=None, category_id=None, group=None):
    """
    Full pricing resolution with override hierarchy:
    product > subcategory > category > group > global.
    """
    # 1. Product-level override
    if product_id:
        override = await db.margin_config.find_one({"scope": "product", "target_id": product_id}, {"_id": 0})
        if override and override.get("tiers"):
            tier = resolve_tier(base_price, override["tiers"])
            if tier:
                return {"base_price": base_price, "final_price": apply_margin(base_price, tier), "resolved_from": "product", "tier": tier}

    # 2. Subcategory-level override
    if subcategory_id:
        override = await db.margin_config.find_one({"scope": "subcategory", "target_id": subcategory_id}, {"_id": 0})
        if override and override.get("tiers"):
            tier = resolve_tier(base_price, override["tiers"])
            if tier:
                return {"base_price": base_price, "final_price": apply_margin(base_price, tier), "resolved_from": "subcategory", "tier": tier}

    # 3. Category-level override
    if category_id:
        override = await db.margin_config.find_one({"scope": "category", "target_id": category_id}, {"_id": 0})
        if override and override.get("tiers"):
            tier = resolve_tier(base_price, override["tiers"])
            if tier:
                return {"base_price": base_price, "final_price": apply_margin(base_price, tier), "resolved_from": "category", "tier": tier}

    # 4. Group-level override
    if group:
        override = await db.margin_config.find_one({"scope": "group", "target_id": group}, {"_id": 0})
        if override and override.get("tiers"):
            tier = resolve_tier(base_price, override["tiers"])
            if tier:
                return {"base_price": base_price, "final_price": apply_margin(base_price, tier), "resolved_from": "group", "tier": tier}

    # 5. Global fallback — unified pricing policy tiers
    global_tiers = await get_global_tiers(db)
    tier = resolve_tier(base_price, global_tiers)
    return {"base_price": base_price, "final_price": apply_margin(base_price, tier), "resolved_from": "global", "tier": tier}
