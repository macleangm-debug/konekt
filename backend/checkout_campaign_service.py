"""
Checkout Campaign Service
Evaluate and apply campaigns at checkout, handle attribution
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId


async def get_affiliate_from_code_or_cookie(db, *, code: str | None) -> Dict[str, Any] | None:
    """Look up affiliate by promo code"""
    if not code:
        return None
    return await db.affiliates.find_one({"promo_code": code, "status": "active"})


async def evaluate_checkout_campaigns(
    db,
    *,
    affiliate_code: str | None = None,
    customer_email: str | None = None,
    order_amount: float,
    category: str | None = None,
    service_slug: str | None = None,
) -> List[Dict[str, Any]]:
    """
    Evaluate all active campaigns against checkout data.
    Returns list of applicable campaigns with calculated discounts.
    """
    from affiliate_campaign_eval_service import evaluate_campaigns_for_checkout
    
    return await evaluate_campaigns_for_checkout(
        db,
        affiliate_code=affiliate_code,
        customer_email=customer_email,
        order_amount=order_amount,
        category=category,
        service_slug=service_slug,
    )


async def apply_campaign_to_document(
    db,
    *,
    campaign_id: str,
    customer_email: str,
    document_type: str,  # "order", "invoice", "quote"
    document_id: str,
    original_total: float,
    discount_amount: float,
) -> Dict[str, Any]:
    """
    Apply a campaign to a document and record the redemption.
    Returns the updated document attribution data.
    """
    from affiliate_campaign_eval_service import record_campaign_redemption
    
    # Record the redemption for limit tracking
    await record_campaign_redemption(
        db,
        campaign_id=campaign_id,
        customer_email=customer_email,
        document_type=document_type,
        document_id=document_id,
        discount_amount=discount_amount,
    )
    
    # Get campaign details for attribution
    campaign = await db.affiliate_campaigns.find_one({"_id": ObjectId(campaign_id)})
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name") if campaign else None,
        "campaign_headline": campaign.get("headline") if campaign else None,
        "original_total": original_total,
        "campaign_discount": discount_amount,
        "final_total": max(0, original_total - discount_amount),
    }


async def get_affiliate_perk_for_checkout(
    db,
    *,
    affiliate_code: str,
    customer_email: str | None = None,
    order_amount: float = 0,
    category: str | None = None,
) -> Dict[str, Any]:
    """
    Get the affiliate perk details for a given affiliate code.
    Used to preview discounts before checkout.
    """
    affiliate = await db.affiliates.find_one({
        "promo_code": affiliate_code,
        "status": "active"
    })
    
    if not affiliate:
        return {"eligible": False, "reason": "Invalid affiliate code"}
    
    settings = await db.affiliate_settings.find_one({}) or {}
    perk_settings = settings.get("customer_perk", {})
    
    if not perk_settings.get("enabled", True):
        return {"eligible": False, "reason": "Customer perks not enabled"}
    
    # Check category eligibility
    allowed_categories = perk_settings.get("allowed_categories", [])
    if allowed_categories and category and category not in allowed_categories:
        return {"eligible": False, "reason": f"Perk not valid for {category}"}
    
    # Check minimum order
    min_order = float(perk_settings.get("min_order_amount", 0) or 0)
    if order_amount < min_order:
        return {
            "eligible": False,
            "reason": f"Minimum order of TZS {int(min_order):,} required"
        }
    
    # Check first order only
    if perk_settings.get("first_order_only") and customer_email:
        prior_order = await db.orders.find_one({
            "customer_email": customer_email,
            "payment_status": "paid"
        })
        prior_invoice = await db.invoices.find_one({
            "customer_email": customer_email,
            "status": "paid"
        })
        if prior_order or prior_invoice:
            return {"eligible": False, "reason": "Perk only valid for first orders"}
    
    # Calculate discount
    perk_type = perk_settings.get("type", "percentage_discount")
    perk_value = float(perk_settings.get("value", 10) or 0)
    discount_cap = float(perk_settings.get("cap", 0) or 0)
    
    discount_amount = 0
    if perk_type == "percentage_discount":
        discount_amount = order_amount * (perk_value / 100)
        if discount_cap > 0:
            discount_amount = min(discount_amount, discount_cap)
    elif perk_type == "fixed_discount":
        discount_amount = min(perk_value, order_amount)
    
    return {
        "eligible": True,
        "affiliate_code": affiliate_code,
        "affiliate_name": affiliate.get("name"),
        "perk_type": perk_type,
        "perk_value": perk_value,
        "discount_cap": discount_cap,
        "discount_amount": round(discount_amount, 2),
        "free_addon_code": perk_settings.get("free_addon_code") if perk_type == "free_addon" else None,
    }


async def create_attribution_data(
    db,
    *,
    affiliate_code: str | None = None,
    affiliate_email: str | None = None,
    campaign_id: str | None = None,
    campaign_discount: float = 0,
) -> Dict[str, Any]:
    """
    Create a standardized attribution data object for documents.
    This should be stored on orders, quotes, and invoices.
    """
    attribution = {
        "attributed_at": datetime.utcnow().isoformat(),
    }
    
    # Add affiliate attribution
    if affiliate_code:
        affiliate = await db.affiliates.find_one({
            "promo_code": affiliate_code,
            "status": "active"
        })
        if affiliate:
            attribution["affiliate_code"] = affiliate_code
            attribution["affiliate_email"] = affiliate.get("email")
            attribution["affiliate_name"] = affiliate.get("name")
    elif affiliate_email:
        affiliate = await db.affiliates.find_one({
            "email": affiliate_email,
            "status": "active"
        })
        if affiliate:
            attribution["affiliate_email"] = affiliate_email
            attribution["affiliate_code"] = affiliate.get("promo_code")
            attribution["affiliate_name"] = affiliate.get("name")
    
    # Add campaign attribution
    if campaign_id:
        campaign = await db.affiliate_campaigns.find_one({"_id": ObjectId(campaign_id)})
        if campaign:
            attribution["campaign_id"] = campaign_id
            attribution["campaign_name"] = campaign.get("name")
            attribution["campaign_headline"] = campaign.get("headline")
            attribution["campaign_discount"] = campaign_discount
    
    return attribution
