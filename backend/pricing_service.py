"""
Pricing Service with Margin Protection Integration
This service integrates with margin_protection_service.py to ensure all pricing
decisions respect group markup settings and margin requirements.
"""
from datetime import datetime, timezone
from margin_protection_service import (
    apply_margin_protection,
    get_group_markup,
    calculate_selling_price
)


async def calculate_protected_price(
    db,
    *,
    partner_cost: float,
    product_group: str = None,
    service_group: str = None,
    country_code: str = "TZ",
    promo_discount: float = 0,
    affiliate_commission: float = 0,
    points_discount: float = 0,
):
    """
    Calculate selling price with margin protection.
    This ensures the final price respects minimum margin requirements.
    
    Returns:
        dict with pricing breakdown and margin safety status
    """
    # Get markup settings for this group/country
    markup = await get_group_markup(
        db,
        product_group=product_group,
        service_group=service_group,
        country_code=country_code,
    )
    
    # Calculate selling price from partner cost and markup
    selling_price = calculate_selling_price(
        partner_cost,
        markup["markup_type"],
        markup["markup_value"]
    )
    
    # Apply margin protection to discounts/commissions
    protected = await apply_margin_protection(
        db,
        partner_cost=partner_cost,
        selling_price=selling_price,
        promo_discount=promo_discount,
        affiliate_commission=affiliate_commission,
        points_discount=points_discount,
        product_group=product_group,
        service_group=service_group,
        country_code=country_code,
    )
    
    # Build comprehensive pricing response
    return {
        "partner_cost": partner_cost,
        "markup_type": markup["markup_type"],
        "markup_value": markup["markup_value"],
        "base_selling_price": selling_price,
        "promo_discount": protected["promo_discount"],
        "affiliate_commission": protected["affiliate_commission"],
        "points_discount": protected["points_discount"],
        "total_deductions": protected["total_deductions"],
        "final_price": selling_price - protected["total_deductions"],
        "gross_margin": protected["gross_margin"],
        "gross_margin_percent": protected["gross_margin_percent"],
        "final_margin": protected["final_margin"],
        "final_margin_percent": protected["final_margin_percent"],
        "minimum_margin_required": protected["minimum_margin_required"],
        "was_adjusted": protected["was_adjusted"],
        "margin_safe": protected["margin_safe"],
        "affiliate_allowed": markup["affiliate_allowed"],
    }


async def validate_line_item_pricing(
    db,
    *,
    line_item: dict,
    country_code: str = "TZ",
):
    """
    Validate pricing on a quote/invoice line item.
    Returns the item with margin-safe adjusted values if needed.
    """
    partner_cost = float(line_item.get("partner_cost", 0) or 0)
    unit_price = float(line_item.get("unit_price", 0) or 0)
    
    # Determine group from item
    product_group = line_item.get("product_group") or line_item.get("category")
    service_group = line_item.get("service_group") or line_item.get("service_type")
    
    # If no partner cost, use unit_price and assume margin is acceptable
    if partner_cost <= 0:
        return {
            **line_item,
            "margin_checked": False,
            "margin_safe": True,
        }
    
    # Get markup settings
    markup = await get_group_markup(
        db,
        product_group=product_group,
        service_group=service_group,
        country_code=country_code,
    )
    
    # Calculate expected selling price
    expected_selling_price = calculate_selling_price(
        partner_cost,
        markup["markup_type"],
        markup["markup_value"]
    )
    
    # Calculate actual margin
    actual_margin = unit_price - partner_cost
    actual_margin_percent = (actual_margin / unit_price * 100) if unit_price > 0 else 0
    minimum_margin_percent = markup["minimum_margin_percent"]
    
    margin_safe = actual_margin_percent >= minimum_margin_percent
    
    # If margin is not safe, suggest adjusted price
    suggested_price = None
    if not margin_safe:
        suggested_price = expected_selling_price
    
    return {
        **line_item,
        "margin_checked": True,
        "margin_safe": margin_safe,
        "actual_margin": round(actual_margin, 2),
        "actual_margin_percent": round(actual_margin_percent, 2),
        "minimum_margin_percent": minimum_margin_percent,
        "suggested_price": suggested_price,
    }


async def validate_quote_pricing(
    db,
    *,
    line_items: list,
    discount: float = 0,
    affiliate_commission: float = 0,
    points_discount: float = 0,
    country_code: str = "TZ",
):
    """
    Validate all pricing on a quote including line items and discounts.
    Returns validation results and any adjustments needed.
    """
    validated_items = []
    total_partner_cost = 0
    total_selling_price = 0
    items_with_issues = []
    
    for item in line_items:
        validated = await validate_line_item_pricing(
            db,
            line_item=item,
            country_code=country_code,
        )
        validated_items.append(validated)
        
        partner_cost = float(item.get("partner_cost", 0) or 0)
        unit_price = float(item.get("unit_price", 0) or 0)
        quantity = int(item.get("quantity", 1) or 1)
        
        total_partner_cost += partner_cost * quantity
        total_selling_price += unit_price * quantity
        
        if not validated.get("margin_safe", True):
            items_with_issues.append({
                "item": item.get("name") or item.get("description"),
                "issue": "Price below minimum margin",
                "suggested_price": validated.get("suggested_price"),
            })
    
    # Check overall margin with discounts
    overall_margin = await apply_margin_protection(
        db,
        partner_cost=total_partner_cost,
        selling_price=total_selling_price,
        promo_discount=discount,
        affiliate_commission=affiliate_commission,
        points_discount=points_discount,
        country_code=country_code,
    )
    
    return {
        "line_items": validated_items,
        "total_partner_cost": round(total_partner_cost, 2),
        "total_selling_price": round(total_selling_price, 2),
        "requested_discount": discount,
        "adjusted_discount": overall_margin["promo_discount"],
        "requested_affiliate_commission": affiliate_commission,
        "adjusted_affiliate_commission": overall_margin["affiliate_commission"],
        "requested_points_discount": points_discount,
        "adjusted_points_discount": overall_margin["points_discount"],
        "total_deductions": overall_margin["total_deductions"],
        "final_margin": overall_margin["final_margin"],
        "final_margin_percent": overall_margin["final_margin_percent"],
        "margin_safe": overall_margin["margin_safe"],
        "was_adjusted": overall_margin["was_adjusted"],
        "items_with_issues": items_with_issues,
    }


async def get_max_allowed_discount(
    db,
    *,
    selling_price: float,
    partner_cost: float = 0,
    product_group: str = None,
    service_group: str = None,
    country_code: str = "TZ",
):
    """
    Calculate maximum allowed discount for a given price point.
    Useful for showing customers maximum discount they can receive.
    """
    markup = await get_group_markup(
        db,
        product_group=product_group,
        service_group=service_group,
        country_code=country_code,
    )
    
    # Calculate gross margin
    gross_margin = selling_price - partner_cost
    
    # Minimum margin required
    minimum_margin = selling_price * (markup["minimum_margin_percent"] / 100)
    
    # Maximum discount is gross margin minus minimum margin
    max_discount = max(gross_margin - minimum_margin, 0)
    
    # Also cap at the max_promo_percent
    max_promo_cap = selling_price * (markup["max_promo_percent"] / 100)
    
    return {
        "selling_price": selling_price,
        "partner_cost": partner_cost,
        "gross_margin": round(gross_margin, 2),
        "minimum_margin_required": round(minimum_margin, 2),
        "max_discount_amount": round(min(max_discount, max_promo_cap), 2),
        "max_discount_percent": round(min(max_discount, max_promo_cap) / selling_price * 100, 2) if selling_price > 0 else 0,
    }
