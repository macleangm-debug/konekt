"""
Affiliate Customer Perk Service
Calculate and preview customer perks for affiliate code users
"""


async def get_effective_affiliate_perk(db, affiliate_code: str):
    """Get the effective perk configuration for an affiliate code"""
    settings = await db.affiliate_settings.find_one({}) or {}
    affiliate = await db.affiliates.find_one({"promo_code": affiliate_code, "status": "active"})

    if not affiliate or not settings.get("customer_perk_enabled", False):
        return None

    # Check for affiliate-specific override
    if affiliate.get("customer_perk_override_enabled"):
        return {
            "enabled": True,
            "type": affiliate.get("customer_perk_type"),
            "value": affiliate.get("customer_perk_value"),
            "cap": affiliate.get("customer_perk_cap"),
            "min_order_amount": affiliate.get("customer_perk_min_order_amount"),
            "first_order_only": affiliate.get("customer_perk_first_order_only"),
            "stackable": affiliate.get("customer_perk_stackable"),
            "allowed_categories": affiliate.get("customer_perk_allowed_categories"),
            "free_addon_code": affiliate.get("customer_perk_free_addon_code"),
        }

    # Use global settings
    return {
        "enabled": True,
        "type": settings.get("customer_perk_type"),
        "value": settings.get("customer_perk_value"),
        "cap": settings.get("customer_perk_cap"),
        "min_order_amount": settings.get("customer_perk_min_order_amount"),
        "first_order_only": settings.get("customer_perk_first_order_only"),
        "stackable": settings.get("customer_perk_stackable"),
        "allowed_categories": settings.get("customer_perk_allowed_categories", []),
        "free_addon_code": settings.get("customer_perk_free_addon_code"),
    }


async def preview_affiliate_perk(
    db,
    *,
    affiliate_code: str,
    customer_email: str | None,
    order_amount: float,
    category: str | None,
):
    """
    Preview what perk a customer would get for using an affiliate code.
    Returns eligibility status and discount/perk details.
    """
    perk = await get_effective_affiliate_perk(db, affiliate_code)
    if not perk or not perk.get("enabled"):
        return {"eligible": False, "reason": "No perk configured"}

    order_amount = float(order_amount or 0)

    # Check minimum order amount
    min_amount = float(perk.get("min_order_amount") or 0)
    if order_amount < min_amount:
        return {
            "eligible": False,
            "reason": f"Minimum order amount of TZS {min_amount:,.0f} not reached"
        }

    # Check category eligibility
    allowed_categories = perk.get("allowed_categories") or []
    if allowed_categories and category and category not in allowed_categories:
        return {"eligible": False, "reason": "Category not eligible for this perk"}

    # Check first order only restriction
    if perk.get("first_order_only") and customer_email:
        prior_paid = await db.invoices_v2.find_one({
            "customer_email": customer_email,
            "status": "paid",
        })
        if prior_paid:
            return {"eligible": False, "reason": "Perk only valid for first paid order"}

    perk_type = perk.get("type")
    
    if perk_type == "percentage_discount":
        raw_discount = order_amount * (float(perk.get("value") or 0) / 100)
        cap = float(perk.get("cap") or 0)
        discount = min(raw_discount, cap) if cap > 0 else raw_discount
        return {
            "eligible": True,
            "perk_type": perk_type,
            "perk_value": perk.get("value"),
            "discount_amount": round(discount, 2),
            "discount_cap": cap,
            "free_addon_code": None,
            "stackable": perk.get("stackable", False),
        }

    if perk_type == "fixed_discount":
        discount = float(perk.get("value") or 0)
        return {
            "eligible": True,
            "perk_type": perk_type,
            "perk_value": perk.get("value"),
            "discount_amount": min(discount, order_amount),
            "free_addon_code": None,
            "stackable": perk.get("stackable", False),
        }

    if perk_type == "free_addon":
        return {
            "eligible": True,
            "perk_type": perk_type,
            "discount_amount": 0,
            "free_addon_code": perk.get("free_addon_code"),
            "stackable": perk.get("stackable", False),
        }

    return {"eligible": False, "reason": "Invalid perk type"}
