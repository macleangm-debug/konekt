"""
Tiered Margin Engine — Percentage, fixed, hybrid margin resolution.
Override hierarchy: product > subcategory > category > group > global.
"""


def resolve_tier(base_price, tiers):
    """Find the matching tier for a base_price."""
    for tier in tiers:
        if tier["min"] <= base_price <= tier["max"]:
            return tier
    return None


def apply_margin(base_price, tier):
    """Apply margin from a tier to produce sell_price."""
    if tier is None:
        return base_price
    t = tier.get("type", "percentage")
    if t == "percentage":
        return round(base_price * (1 + tier["value"] / 100.0), 2)
    if t == "fixed":
        return round(base_price + tier["value"], 2)
    if t == "hybrid":
        return round(base_price * (1 + tier["percent"] / 100.0) + tier["fixed"], 2)
    return base_price


def resolve_service_sell_price(vendor_cost, service_group_margin_percent):
    """Simple service margin: vendor_cost × (1 + margin%)."""
    return round(vendor_cost * (1 + service_group_margin_percent / 100.0), 2)


# Default global tiers — ONLY used if Settings Hub is unavailable.
# The canonical source is Settings Hub → margin_rules.global_tiers
DEFAULT_GLOBAL_TIERS = [
    {"min": 0, "max": 100000, "type": "percentage", "value": 35, "label": "Micro (0 – 100K)"},
    {"min": 100001, "max": 500000, "type": "percentage", "value": 30, "label": "Small (100K – 500K)"},
    {"min": 500001, "max": 2000000, "type": "percentage", "value": 25, "label": "Medium (500K – 2M)"},
    {"min": 2000001, "max": 10000000, "type": "percentage", "value": 20, "label": "Large (2M – 10M)"},
    {"min": 10000001, "max": 999999999, "type": "percentage", "value": 15, "label": "Enterprise (10M+)"},
]


async def get_global_tiers(db):
    """Get global tiers from Settings Hub (single source of truth)."""
    try:
        from services.settings_resolver import get_margin_tiers
        tiers = await get_margin_tiers(db)
        if tiers and len(tiers) > 0:
            return tiers
    except Exception:
        pass
    # Fallback: check legacy margin_config collection
    doc = await db.margin_config.find_one({"scope": "global"}, {"_id": 0})
    if doc:
        return doc.get("tiers", DEFAULT_GLOBAL_TIERS)
    return DEFAULT_GLOBAL_TIERS


async def save_global_tiers(db, tiers):
    """Save global tiers to Settings Hub (primary) and legacy collection (compat)."""
    from datetime import datetime, timezone
    from services.settings_resolver import invalidate_settings_cache

    # Save to Settings Hub
    hub = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    if hub and hub.get("value"):
        value = hub["value"]
        if "margin_rules" not in value:
            value["margin_rules"] = {}
        value["margin_rules"]["global_tiers"] = tiers
        await db.admin_settings.update_one(
            {"key": "settings_hub"},
            {"$set": {"value": value}},
        )
    invalidate_settings_cache()

    # Also save to legacy collection for backward compat
    await db.margin_config.update_one(
        {"scope": "global"},
        {"$set": {"tiers": tiers, "updated_at": datetime.now(timezone.utc)}},
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

    # 5. Global fallback
    global_tiers = await get_global_tiers(db)
    tier = resolve_tier(base_price, global_tiers)
    return {"base_price": base_price, "final_price": apply_margin(base_price, tier), "resolved_from": "global", "tier": tier}
