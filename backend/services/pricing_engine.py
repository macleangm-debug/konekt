"""
Shared Pricing Engine — Single Source of Truth for all sell prices.

Rule: sell_price = pricing_engine(vendor_cost, category, settings)
Never use vendor_cost directly as sell_price.

Priority: Pricing Tiers (by amount) → Category-specific rules → Global defaults
"""
from datetime import datetime, timezone


async def get_tier_margin(db, amount: float):
    """Get margin from Pricing Tiers based on the vendor cost amount."""
    hub = await db.admin_settings.find_one({"key": "settings_hub"})
    if not hub or not hub.get("value"):
        return None

    tiers = hub["value"].get("pricing_policy_tiers", [])
    for tier in tiers:
        # Defensive: some legacy/imported tier rows are stored as strings
        # (e.g. "Micro (0 – 2K)"). Skip non-dict rows so we don't crash the
        # whole pricing pipeline.
        if not isinstance(tier, dict):
            continue
        min_amt = float(tier.get("min_amount", 0) or 0)
        max_amt = float(tier.get("max_amount", 999999999) or 999999999)
        if min_amt <= amount <= max_amt:
            total_margin = tier.get("total_margin_pct")
            if total_margin is not None:
                return {
                    "total_margin_pct": float(total_margin),
                    "protected_pct": float(tier.get("protected_platform_margin_pct", 0) or 0),
                    "distributable_pct": float(tier.get("distributable_margin_pct", 0) or 0),
                    "tier_label": tier.get("label", ""),
                    "distribution_split": tier.get("distribution_split", {}),
                }
    return None


async def get_margin_rules(db, category: str = None, vendor_cost: float = 0):
    """Get margin rules. Priority: Pricing Tiers → category-specific → default → global."""

    # 1. Try Pricing Tiers first (amount-based)
    if vendor_cost > 0:
        tier = await get_tier_margin(db, vendor_cost)
        if tier and tier["total_margin_pct"] > 0:
            return {
                "min_margin_pct": tier["protected_pct"] or tier["total_margin_pct"] * 0.5,
                "target_margin_pct": tier["total_margin_pct"],
                "max_discount_pct": tier["distributable_pct"],
                "rule_source": f"pricing_tier:{tier['tier_label']}",
                "tier_data": tier,
            }

    # 2. Category-specific rules
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

    # 3. Settings hub commercial fallback
    hub = await db.admin_settings.find_one({"key": "settings_hub"})
    if hub and hub.get("value"):
        comm = hub["value"].get("commercial", {})
        pct = float(comm.get("minimum_company_margin_percent", 20) or 20)
        return {"min_margin_pct": pct, "target_margin_pct": pct, "max_discount_pct": 0, "rule_source": "settings_hub"}

    return {"min_margin_pct": 20, "target_margin_pct": 20, "max_discount_pct": 0, "rule_source": "global_default"}


async def calculate_sell_price(db, vendor_cost: float, category: str = None, override_sell_price: float = None):
    """Calculate sell price from vendor cost using margin rules.

    Uses Pricing Tiers (amount-based) first, then category rules.
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

    rules = await get_margin_rules(db, category, vendor_cost=vendor_cost)
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
