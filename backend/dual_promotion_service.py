"""
Dual Promotion Engine Service
Supports two promotion types:
1. display_uplift - Fake "compare price" (margin untouched)
2. margin_discount - Real discount from margin bucket
"""
from typing import Optional


def calculate_display_uplift_price(selling_price: float, uplift_percent: float):
    """
    Calculate display pricing for uplift promotions.
    The compare price is inflated, but actual selling price remains unchanged.
    """
    compare_price = selling_price + (selling_price * (uplift_percent / 100))
    return {
        "compare_price": round(compare_price, 2),
        "selling_price": round(selling_price, 2),
        "discount_display_percent": uplift_percent,
        "discount_amount": round(compare_price - selling_price, 2),
        "promotion_effect": "display_only",
    }


def calculate_margin_discount_price(selling_price: float, discount_percent: float):
    """
    Calculate pricing for real margin discounts.
    The actual selling price is reduced.
    """
    discount_amount = selling_price * (discount_percent / 100)
    final_price = selling_price - discount_amount
    return {
        "compare_price": round(selling_price, 2),
        "selling_price": round(final_price, 2),
        "discount_amount": round(discount_amount, 2),
        "discount_display_percent": discount_percent,
        "promotion_effect": "real_discount",
    }


def calculate_affiliate_payout(
    *,
    payout_type: str,
    payout_value: float,
    sale_amount: float,
    distributable_margin: float,
):
    """
    Calculate affiliate payout based on campaign settings.
    - fixed: Fixed amount per sale
    - percent_sale: Percentage of sale amount
    - percent_margin: Percentage of distributable margin
    """
    if payout_type == "fixed":
        payout = payout_value
    elif payout_type == "percent_sale":
        payout = sale_amount * (payout_value / 100)
    elif payout_type == "percent_margin":
        payout = distributable_margin * (payout_value / 100)
    else:
        payout = 0

    return round(max(payout, 0), 2)


def apply_margin_guard(
    *,
    partner_cost: float,
    final_selling_price: float,
    affiliate_payout: float,
    minimum_margin_percent: float,
):
    """
    Apply margin protection to ensure minimum margin is maintained.
    Reduces affiliate payout if necessary.
    """
    final_margin = final_selling_price - partner_cost
    minimum_margin_amount = final_selling_price * (minimum_margin_percent / 100)

    adjusted_payout = affiliate_payout
    was_adjusted = False

    if final_margin - affiliate_payout < minimum_margin_amount:
        allowed_affiliate_payout = max(final_margin - minimum_margin_amount, 0)
        adjusted_payout = min(affiliate_payout, allowed_affiliate_payout)
        was_adjusted = True

    return {
        "affiliate_payout": round(max(adjusted_payout, 0), 2),
        "original_payout": round(affiliate_payout, 2),
        "final_margin_amount": round(final_margin, 2),
        "minimum_margin_amount": round(minimum_margin_amount, 2),
        "margin_guard_applied": was_adjusted,
    }


async def evaluate_campaign_pricing(
    db,
    *,
    campaign_id: str,
    base_selling_price: float,
    partner_cost: float,
    minimum_margin_percent: float = 8,
):
    """
    Evaluate full campaign pricing including promotion type and affiliate payout.
    """
    campaign = await db.campaigns.find_one({
        "campaign_id": campaign_id,
        "status": "active",
    })
    
    if not campaign:
        return None

    promotion_type = campaign.get("promotion_type", "display_uplift")

    # Calculate pricing based on promotion type
    if promotion_type == "display_uplift":
        pricing = calculate_display_uplift_price(
            base_selling_price,
            float(campaign.get("uplift_percent", 0) or 0),
        )
        distributable_margin = base_selling_price - partner_cost
    else:
        pricing = calculate_margin_discount_price(
            base_selling_price,
            float(campaign.get("real_discount_percent", 0) or 0),
        )
        distributable_margin = pricing["selling_price"] - partner_cost

    # Calculate affiliate payout
    affiliate_payout = calculate_affiliate_payout(
        payout_type=campaign.get("affiliate_payout_type", "fixed"),
        payout_value=float(campaign.get("affiliate_payout_value", 0) or 0),
        sale_amount=pricing["selling_price"],
        distributable_margin=distributable_margin,
    )

    # Apply margin guard
    guard = apply_margin_guard(
        partner_cost=partner_cost,
        final_selling_price=pricing["selling_price"],
        affiliate_payout=affiliate_payout,
        minimum_margin_percent=minimum_margin_percent,
    )

    return {
        "campaign_id": campaign.get("campaign_id"),
        "campaign_name": campaign.get("campaign_name"),
        "promotion_type": promotion_type,
        "pricing": pricing,
        "affiliate": {
            "payout_type": campaign.get("affiliate_payout_type"),
            "requested_payout": affiliate_payout,
            "approved_payout": guard["affiliate_payout"],
            "was_adjusted": guard["margin_guard_applied"],
        },
        "margin": {
            "final_margin_amount": guard["final_margin_amount"],
            "minimum_margin_amount": guard["minimum_margin_amount"],
        },
    }
