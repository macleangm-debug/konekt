"""
Commission & Margin Distribution Engine.
Single source of truth for all financial calculations.

Rules:
- Commission comes from distributable margin, NOT revenue
- ONE channel per order — no mixing
- Wallet uses ONLY promotion reserve + remaining margin
- Protected allocations: sales, affiliate, referral, company core
"""
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def _get_settings():
    """Load commission-related settings from Settings Hub."""
    doc = await db.admin_settings.find_one({"key": "settings_hub"})
    val = doc.get("value", {}) if doc else {}

    commercial = val.get("commercial", {})
    sales = val.get("sales", {})
    affiliate = val.get("affiliate", {})
    distribution = val.get("distribution_config", {})

    return {
        "sales_direct_pct": float(sales.get("default_sales_commission_self_generated", 15)),
        "sales_assisted_pct": float(sales.get("default_sales_commission_affiliate_generated", 10)),
        "affiliate_pct": float(affiliate.get("default_affiliate_commission_percent", 10)),
        "referral_pct": float(commercial.get("referral_pct", 10)),
        "company_core_margin_pct": float(distribution.get("protected_company_margin_percent",
                                         commercial.get("protected_company_margin_percent", 8))),
        "promotion_reserve_pct": float(distribution.get("promo_percent_of_distributable", 10)),
        "max_wallet_per_order": float(commercial.get("max_wallet_per_order", 0)),
        "max_wallet_usage_pct": float(commercial.get("max_wallet_usage_pct", 30)),
        "wallet_enabled": bool(commercial.get("wallet_enabled", True)),
        "protect_allocations": bool(commercial.get("protect_allocations", True)),
        "enforce_single_channel": bool(commercial.get("enforce_single_channel", True)),
    }


VALID_CHANNELS = {"direct", "assisted", "affiliate", "referral", "group_deal"}


def calculate_margin_distribution(
    selling_price: float,
    vendor_cost: float,
    channel: str,
    settings: dict,
    wallet_balance: float = 0,
) -> dict:
    """
    Calculate the full margin distribution for an order.
    Returns all allocations + wallet max.

    Channel determines which stakeholders get paid:
    - direct: sales (full)
    - assisted: sales (reduced)
    - affiliate: affiliate + optional sales support
    - referral: referral only
    - group_deal: campaign-level (minimal commission)
    """
    if channel not in VALID_CHANNELS:
        channel = "direct"

    margin = max(0, selling_price - vendor_cost)
    if margin == 0:
        return {
            "margin": 0, "sales_allocation": 0, "affiliate_allocation": 0,
            "referral_allocation": 0, "company_core": 0, "promotion_reserve": 0,
            "remaining": 0, "wallet_max": 0, "channel": channel,
        }

    # Calculate allocations based on channel
    sales_alloc = 0
    affiliate_alloc = 0
    referral_alloc = 0

    if channel == "direct":
        sales_alloc = margin * (settings["sales_direct_pct"] / 100)
    elif channel == "assisted":
        sales_alloc = margin * (settings["sales_assisted_pct"] / 100)
    elif channel == "affiliate":
        affiliate_alloc = margin * (settings["affiliate_pct"] / 100)
        sales_alloc = margin * (settings["sales_assisted_pct"] / 100) * 0.5  # optional support
    elif channel == "referral":
        referral_alloc = margin * (settings["referral_pct"] / 100)
        # No sales, no affiliate
    elif channel == "group_deal":
        # Minimal — controlled at campaign level
        pass

    company_core = margin * (settings["company_core_margin_pct"] / 100)
    promotion_reserve = margin * (settings["promotion_reserve_pct"] / 100)

    total_protected = sales_alloc + affiliate_alloc + referral_alloc + company_core
    remaining = max(0, margin - total_protected - promotion_reserve)

    # Wallet max = promotion reserve + remaining (never touches protected)
    flexible = promotion_reserve + remaining
    wallet_max = 0
    if settings.get("wallet_enabled", True):
        system_limit = settings.get("max_wallet_per_order", 0)
        pct_limit = selling_price * (settings.get("max_wallet_usage_pct", 30) / 100)
        wallet_max = min(
            wallet_balance,
            flexible,
            system_limit if system_limit > 0 else float('inf'),
            pct_limit,
        )
        wallet_max = max(0, wallet_max)

    return {
        "margin": margin,
        "sales_allocation": round(sales_alloc, 2),
        "affiliate_allocation": round(affiliate_alloc, 2),
        "referral_allocation": round(referral_alloc, 2),
        "company_core": round(company_core, 2),
        "promotion_reserve": round(promotion_reserve, 2),
        "remaining": round(remaining, 2),
        "total_protected": round(total_protected, 2),
        "wallet_max": round(wallet_max, 2),
        "channel": channel,
    }


async def compute_order_commission(
    selling_price: float,
    vendor_cost: float,
    channel: str,
    wallet_balance: float = 0,
) -> dict:
    """High-level: compute commission for an order using live settings.
    
    Uses Pricing Tier distribution_split when available (amount-based),
    falls back to global Settings Hub percentages.
    """
    settings = await _get_settings()

    # Try to get tier-specific distribution split
    try:
        from services.pricing_engine import get_tier_margin
        tier = await get_tier_margin(db, vendor_cost)
        if tier and tier.get("distribution_split"):
            split = tier["distribution_split"]
            # Override settings with tier-specific values if present
            if "affiliate_pct" in split:
                settings["affiliate_pct"] = float(split["affiliate_pct"])
            if "sales_pct" in split:
                settings["sales_direct_pct"] = float(split["sales_pct"])
                settings["sales_assisted_pct"] = float(split["sales_pct"]) * 0.67
            if "referral_pct" in split:
                settings["referral_pct"] = float(split["referral_pct"])
            if "reserve_pct" in split:
                settings["promotion_reserve_pct"] = float(split["reserve_pct"])
    except Exception:
        pass

    result = calculate_margin_distribution(selling_price, vendor_cost, channel, settings, wallet_balance)
    result["tier_applied"] = True
    return result
