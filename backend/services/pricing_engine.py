"""
Shared Pricing Engine — Single Source of Truth for all sell prices.

Rule: sell_price = pricing_engine(vendor_cost, category, settings)
Never use vendor_cost directly as sell_price.
"""
from datetime import datetime, timezone


async def get_margin_rules(db, category: str = None):
    """Get margin rules from settings. Priority: category-specific → default → global."""
    cat_rules = await db.platform_settings.find_one({"key": "category_margin_rules"})
    if cat_rules and cat_rules.get("value"):
        rules = cat_rules["value"]
        if category:
            cat_key = category.lower().replace(" ", "_").replace("-", "_")
            cat_specific = (rules.get("categories") or {}).get(cat_key)
            if cat_specific:
                return {
                    "min_margin_pct": float(cat_specific.get("min_margin_pct", 15)),
                    "target_margin_pct": float(cat_specific.get("target_margin_pct", 30)),
                    "max_discount_pct": float(cat_specific.get("max_discount_pct", 10)),
                    "rule_source": f"category:{cat_key}",
                }
        default = rules.get("default", {})
        if default:
            return {
                "min_margin_pct": float(default.get("min_margin_pct", 15)),
                "target_margin_pct": float(default.get("target_margin_pct", 30)),
                "max_discount_pct": float(default.get("max_discount_pct", 10)),
                "rule_source": "default",
            }

    # Fallback: settings hub commercial
    hub = await db.admin_settings.find_one({"key": "settings_hub"})
    if hub and hub.get("value"):
        comm = hub["value"].get("commercial", {})
        pct = float(comm.get("minimum_company_margin_percent", 20) or 20)
        return {"min_margin_pct": pct, "target_margin_pct": pct, "max_discount_pct": 0, "rule_source": "settings_hub"}

    return {"min_margin_pct": 20, "target_margin_pct": 20, "max_discount_pct": 0, "rule_source": "global_default"}


async def calculate_sell_price(db, vendor_cost: float, category: str = None, override_sell_price: float = None):
    """Calculate sell price from vendor cost using margin rules.
    
    If override_sell_price is provided, validates it meets minimum margin.
    Returns dict with sell_price, margin_pct, margin_amount, rule_source.
    """
    if vendor_cost <= 0:
        return {
            "sell_price": override_sell_price or 0,
            "margin_pct": 0,
            "margin_amount": 0,
            "rule_source": "no_vendor_cost",
            "warning": None,
        }

    rules = await get_margin_rules(db, category)
    target_pct = rules["target_margin_pct"]
    min_pct = rules["min_margin_pct"]

    # Calculate engine price
    engine_price = round(vendor_cost * (1 + target_pct / 100))
    min_price = round(vendor_cost * (1 + min_pct / 100))

    # If override provided, validate it
    warning = None
    if override_sell_price and override_sell_price > 0:
        if override_sell_price < min_price:
            warning = f"Price below minimum margin ({min_pct}%). Adjusted to minimum."
            sell_price = min_price
        else:
            sell_price = override_sell_price
    else:
        sell_price = engine_price

    margin_amount = round(sell_price - vendor_cost)
    margin_pct = round((margin_amount / vendor_cost) * 100, 1) if vendor_cost > 0 else 0

    return {
        "sell_price": sell_price,
        "margin_pct": margin_pct,
        "margin_amount": margin_amount,
        "rule_source": rules["rule_source"],
        "engine_price": engine_price,
        "min_price": min_price,
        "warning": warning,
    }
