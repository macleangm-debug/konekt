"""
Margin Protection Service
Ensures pricing maintains minimum margin and controls affiliate/promo discounts.
"""


async def apply_margin_protection(
    db,
    *,
    partner_cost: float,
    selling_price: float,
    promo_discount: float = 0,
    affiliate_commission: float = 0,
    points_discount: float = 0,
    product_group: str = None,
    service_group: str = None,
    country_code: str = "TZ",
):
    """
    Apply margin protection to ensure Konekt margin is never breached.
    Returns adjusted discounts/commissions if needed.
    """
    
    # Get margin settings (defaults if not configured)
    settings = await db.margin_settings.find_one({
        "product_group": product_group,
        "service_group": service_group,
        "country_code": country_code,
    }) or {}
    
    # Default settings
    minimum_margin_percent = float(settings.get("minimum_margin_percent", 8))
    max_affiliate_percent = float(settings.get("max_affiliate_percent", 10))
    max_promo_percent = float(settings.get("max_promo_percent", 15))
    max_points_percent = float(settings.get("max_points_percent", 10))

    # Calculate available margin
    gross_margin = selling_price - partner_cost
    gross_margin_percent = (gross_margin / selling_price * 100) if selling_price > 0 else 0
    
    # Calculate minimum required margin in absolute terms
    minimum_margin = selling_price * (minimum_margin_percent / 100)
    available_for_discounts = max(gross_margin - minimum_margin, 0)

    # Track original values
    original_promo = promo_discount
    original_commission = affiliate_commission
    original_points = points_discount

    # Calculate total requested discounts
    total_requested = promo_discount + affiliate_commission + points_discount

    # If total exceeds available margin, reduce proportionally
    if total_requested > available_for_discounts:
        if total_requested > 0:
            reduction_factor = available_for_discounts / total_requested
            promo_discount = round(promo_discount * reduction_factor, 2)
            affiliate_commission = round(affiliate_commission * reduction_factor, 2)
            points_discount = round(points_discount * reduction_factor, 2)

    # Also enforce individual caps
    if promo_discount > (selling_price * max_promo_percent / 100):
        promo_discount = round(selling_price * max_promo_percent / 100, 2)

    if affiliate_commission > (selling_price * max_affiliate_percent / 100):
        affiliate_commission = round(selling_price * max_affiliate_percent / 100, 2)

    if points_discount > (selling_price * max_points_percent / 100):
        points_discount = round(selling_price * max_points_percent / 100, 2)

    # Calculate final margin
    total_deductions = promo_discount + affiliate_commission + points_discount
    final_margin = gross_margin - total_deductions
    final_margin_percent = (final_margin / selling_price * 100) if selling_price > 0 else 0

    # Build result
    was_adjusted = (
        promo_discount != original_promo or
        affiliate_commission != original_commission or
        points_discount != original_points
    )

    return {
        "partner_cost": partner_cost,
        "selling_price": selling_price,
        "gross_margin": round(gross_margin, 2),
        "gross_margin_percent": round(gross_margin_percent, 2),
        "promo_discount": promo_discount,
        "affiliate_commission": affiliate_commission,
        "points_discount": points_discount,
        "total_deductions": round(total_deductions, 2),
        "final_margin": round(final_margin, 2),
        "final_margin_percent": round(final_margin_percent, 2),
        "minimum_margin_required": round(minimum_margin, 2),
        "was_adjusted": was_adjusted,
        "margin_safe": final_margin >= minimum_margin,
    }


async def get_group_markup(
    db,
    *,
    product_group: str = None,
    service_group: str = None,
    country_code: str = "TZ",
):
    """
    Get markup settings for a product or service group.
    """
    query = {"country_code": country_code}
    if product_group:
        query["product_group"] = product_group
    if service_group:
        query["service_group"] = service_group

    settings = await db.group_markup_settings.find_one(query)
    
    if not settings:
        # Return defaults
        return {
            "markup_type": "percent",
            "markup_value": 25,
            "minimum_margin_percent": 8,
            "max_affiliate_percent": 10,
            "max_promo_percent": 15,
            "max_points_percent": 10,
            "affiliate_allowed": True,
        }

    return {
        "markup_type": settings.get("markup_type", "percent"),
        "markup_value": float(settings.get("markup_value", 25)),
        "minimum_margin_percent": float(settings.get("minimum_margin_percent", 8)),
        "max_affiliate_percent": float(settings.get("max_affiliate_percent", 10)),
        "max_promo_percent": float(settings.get("max_promo_percent", 15)),
        "max_points_percent": float(settings.get("max_points_percent", 10)),
        "affiliate_allowed": bool(settings.get("affiliate_allowed", True)),
    }


def calculate_selling_price(partner_cost: float, markup_type: str, markup_value: float) -> float:
    """
    Calculate selling price from partner cost and markup.
    """
    if markup_type == "percent":
        return round(partner_cost * (1 + markup_value / 100), 2)
    else:  # fixed
        return round(partner_cost + markup_value, 2)
