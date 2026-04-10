"""
Commission + Margin Distribution Engine Service
Enforces protected company margin and distributes remaining margin to stakeholders.

Core Principle:
- Distributable margin never goes below protected company margin
- Configurable slices for affiliate, sales, promo, referral, country bonus
- Supports both margin-touching and non-margin-touching promotions
"""
from datetime import datetime, timezone


def calculate_margin_pool(
    *,
    selling_price: float,
    base_cost: float,
    protected_company_margin_percent: float = 8.0,
):
    """
    Calculate the margin pool from selling price and base cost.
    
    Args:
        selling_price: Final selling price to customer
        base_cost: Cost from partner/supplier (partner_cost)
        protected_company_margin_percent: Minimum company margin as % of selling price
    
    Returns:
        dict with selling_price, base_cost, gross_margin, protected_company_margin_amount, distributable_margin
    """
    selling_price = float(selling_price or 0)
    base_cost = float(base_cost or 0)
    gross_margin = max(selling_price - base_cost, 0)
    protected_company_margin_amount = round(selling_price * (float(protected_company_margin_percent or 0) / 100.0), 2)
    distributable_margin = max(gross_margin - protected_company_margin_amount, 0)

    return {
        "selling_price": round(selling_price, 2),
        "base_cost": round(base_cost, 2),
        "gross_margin": round(gross_margin, 2),
        "protected_company_margin_amount": round(protected_company_margin_amount, 2),
        "distributable_margin": round(distributable_margin, 2),
    }


def calculate_distribution(
    *,
    selling_price: float,
    base_cost: float,
    protected_company_margin_percent: float = 8.0,
    affiliate_percent_of_distributable: float = 0.0,
    sales_percent_of_distributable: float = 0.0,
    promo_percent_of_distributable: float = 0.0,
    referral_percent_of_distributable: float = 0.0,
    country_bonus_percent_of_distributable: float = 0.0,
    non_margin_touching_promo_amount: float = 0.0,
):
    """
    Calculate the full distribution of margin to all stakeholders.
    
    Critical Rule: Total distribution <= distributable_margin (auto-scaled if exceeded)
    
    Args:
        selling_price: Final selling price
        base_cost: Partner/supplier cost
        protected_company_margin_percent: Minimum company margin % (default 8%)
        affiliate_percent_of_distributable: Affiliate commission % of distributable
        sales_percent_of_distributable: Sales commission % of distributable
        promo_percent_of_distributable: Promo discount % of distributable
        referral_percent_of_distributable: Referral bonus % of distributable
        country_bonus_percent_of_distributable: Country director bonus % of distributable
        non_margin_touching_promo_amount: Display/uplift promo (doesn't reduce margin)
    
    Returns:
        dict with pool, distribution breakdown, and applied rules
    """
    pool = calculate_margin_pool(
        selling_price=selling_price,
        base_cost=base_cost,
        protected_company_margin_percent=protected_company_margin_percent,
    )

    distributable = pool["distributable_margin"]

    # Calculate each slice from distributable margin
    affiliate_amount = round(distributable * (float(affiliate_percent_of_distributable or 0) / 100.0), 2)
    sales_amount = round(distributable * (float(sales_percent_of_distributable or 0) / 100.0), 2)
    promo_amount = round(distributable * (float(promo_percent_of_distributable or 0) / 100.0), 2)
    referral_amount = round(distributable * (float(referral_percent_of_distributable or 0) / 100.0), 2)
    country_bonus_amount = round(distributable * (float(country_bonus_percent_of_distributable or 0) / 100.0), 2)

    allocated = round(
        affiliate_amount
        + sales_amount
        + promo_amount
        + referral_amount
        + country_bonus_amount,
        2,
    )

    # Scale down if total allocation exceeds distributable margin
    if allocated > distributable:
        scale = distributable / allocated if allocated else 1
        affiliate_amount = round(affiliate_amount * scale, 2)
        sales_amount = round(sales_amount * scale, 2)
        promo_amount = round(promo_amount * scale, 2)
        referral_amount = round(referral_amount * scale, 2)
        country_bonus_amount = round(country_bonus_amount * scale, 2)
        allocated = round(
            affiliate_amount
            + sales_amount
            + promo_amount
            + referral_amount
            + country_bonus_amount,
            2,
        )

    # Remaining gross margin after all distributions
    retained_company_margin = round(pool["gross_margin"] - allocated, 2)

    return {
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "pool": pool,
        "distribution": {
            "affiliate_amount": affiliate_amount,
            "sales_amount": sales_amount,
            "promo_amount": promo_amount,
            "referral_amount": referral_amount,
            "country_bonus_amount": country_bonus_amount,
            "allocated_distributable_margin": allocated,
            "retained_company_margin": retained_company_margin,
            "non_margin_touching_promo_amount": round(float(non_margin_touching_promo_amount or 0), 2),
        },
        "rules": {
            "protected_company_margin_percent": float(protected_company_margin_percent or 0),
            "affiliate_percent_of_distributable": float(affiliate_percent_of_distributable or 0),
            "sales_percent_of_distributable": float(sales_percent_of_distributable or 0),
            "promo_percent_of_distributable": float(promo_percent_of_distributable or 0),
            "referral_percent_of_distributable": float(referral_percent_of_distributable or 0),
            "country_bonus_percent_of_distributable": float(country_bonus_percent_of_distributable or 0),
        },
    }


# Suggested default distribution configuration
DEFAULT_DISTRIBUTION_CONFIG = {
    "protected_company_margin_percent": 8,
    "affiliate_percent_of_distributable": 10,
    "sales_percent_of_distributable": 15,
    "promo_percent_of_distributable": 10,
    "referral_percent_of_distributable": 5,
    "country_bonus_percent_of_distributable": 5,
}


async def calculate_order_commission(
    db,
    *,
    order_id: str,
    line_items: list,
    source_type: str = "website",
    affiliate_user_id: str = None,
    assigned_sales_id: str = None,
    referral_user_id: str = None,
    country_code: str = None,
    config: dict = None,
):
    """
    Calculate commission distribution for an entire order.
    
    Args:
        db: Database connection
        order_id: Order ID
        line_items: List of items with selling_price and base_cost
        source_type: website | affiliate | sales | hybrid
        affiliate_user_id: Affiliate who referred the order
        assigned_sales_id: Sales person assigned to the order
        referral_user_id: User who referred the order
        country_code: Country code for country bonus
        config: Override default distribution config
    
    Returns:
        dict with order_id, total amounts, and per-item breakdowns
    """
    cfg = config
    if not cfg:
        from services.settings_resolver import get_distribution_config
        cfg = await get_distribution_config(db)
    
    # Adjust percentages based on source type
    affiliate_pct = cfg["affiliate_percent_of_distributable"] if affiliate_user_id else 0
    sales_pct = cfg["sales_percent_of_distributable"] if assigned_sales_id else 0
    referral_pct = cfg["referral_percent_of_distributable"] if referral_user_id else 0
    country_pct = cfg["country_bonus_percent_of_distributable"] if country_code else 0
    
    item_breakdowns = []
    total_affiliate = 0
    total_sales = 0
    total_promo = 0
    total_referral = 0
    total_country_bonus = 0
    total_retained = 0
    
    for item in line_items:
        selling_price = float(item.get("selling_price") or item.get("unit_price") or 0)
        base_cost = float(item.get("base_cost") or item.get("partner_cost") or 0)
        quantity = int(item.get("quantity") or item.get("qty") or 1)
        
        # Calculate for single item
        dist = calculate_distribution(
            selling_price=selling_price,
            base_cost=base_cost,
            protected_company_margin_percent=cfg["protected_company_margin_percent"],
            affiliate_percent_of_distributable=affiliate_pct,
            sales_percent_of_distributable=sales_pct,
            promo_percent_of_distributable=cfg["promo_percent_of_distributable"],
            referral_percent_of_distributable=referral_pct,
            country_bonus_percent_of_distributable=country_pct,
        )
        
        # Multiply by quantity
        item_affiliate = dist["distribution"]["affiliate_amount"] * quantity
        item_sales = dist["distribution"]["sales_amount"] * quantity
        item_promo = dist["distribution"]["promo_amount"] * quantity
        item_referral = dist["distribution"]["referral_amount"] * quantity
        item_country = dist["distribution"]["country_bonus_amount"] * quantity
        item_retained = dist["distribution"]["retained_company_margin"] * quantity
        
        total_affiliate += item_affiliate
        total_sales += item_sales
        total_promo += item_promo
        total_referral += item_referral
        total_country_bonus += item_country
        total_retained += item_retained
        
        item_breakdowns.append({
            "sku": item.get("sku"),
            "name": item.get("name"),
            "quantity": quantity,
            "unit_selling_price": selling_price,
            "unit_base_cost": base_cost,
            "unit_distribution": dist["distribution"],
            "line_totals": {
                "affiliate": round(item_affiliate, 2),
                "sales": round(item_sales, 2),
                "promo": round(item_promo, 2),
                "referral": round(item_referral, 2),
                "country_bonus": round(item_country, 2),
                "retained": round(item_retained, 2),
            }
        })
    
    return {
        "order_id": order_id,
        "source_type": source_type,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "ownership": {
            "affiliate_user_id": affiliate_user_id,
            "assigned_sales_id": assigned_sales_id,
            "referral_user_id": referral_user_id,
            "country_code": country_code,
        },
        "totals": {
            "affiliate_commission": round(total_affiliate, 2),
            "sales_commission": round(total_sales, 2),
            "promo_discount": round(total_promo, 2),
            "referral_bonus": round(total_referral, 2),
            "country_bonus": round(total_country_bonus, 2),
            "retained_by_company": round(total_retained, 2),
        },
        "config_applied": {
            "protected_company_margin_percent": cfg["protected_company_margin_percent"],
            "affiliate_percent_of_distributable": affiliate_pct,
            "sales_percent_of_distributable": sales_pct,
            "promo_percent_of_distributable": cfg["promo_percent_of_distributable"],
            "referral_percent_of_distributable": referral_pct,
            "country_bonus_percent_of_distributable": country_pct,
        },
        "item_breakdowns": item_breakdowns,
    }
