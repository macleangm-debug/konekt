"""
Affiliate Campaign Evaluation Service
Evaluate which campaigns apply to a checkout
"""
from datetime import datetime


async def get_active_campaigns(db, *, channel: str | None = None):
    """Get all currently active campaigns, optionally filtered by channel"""
    now = datetime.utcnow()
    query = {
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
    }
    if channel:
        query["channel"] = {"$in": [channel, "both"]}
    return await db.affiliate_campaigns.find(query).to_list(length=200)


async def evaluate_campaigns_for_checkout(
    db,
    *,
    affiliate_code: str | None,
    customer_email: str | None,
    order_amount: float,
    category: str | None,
    service_slug: str | None = None,
):
    """
    Evaluate all active campaigns and return which ones apply to this checkout.
    Returns a list of applicable campaigns with calculated rewards.
    """
    channel = "affiliate" if affiliate_code else "public"
    campaigns = await get_active_campaigns(db, channel=channel)
    results = []

    for campaign in campaigns:
        eligibility = campaign.get("eligibility", {})
        reward = campaign.get("reward", {})
        limits = campaign.get("limits", {})

        # Check affiliate code requirement
        if eligibility.get("requires_affiliate_code") and not affiliate_code:
            continue

        # Check specific affiliate codes
        specific_codes = eligibility.get("specific_affiliate_codes") or []
        if specific_codes and affiliate_code not in specific_codes:
            continue

        # Check minimum order amount
        min_order = float(eligibility.get("min_order_amount", 0) or 0)
        if float(order_amount or 0) < min_order:
            continue

        # Check category eligibility
        allowed_categories = eligibility.get("allowed_categories") or []
        if allowed_categories and category and category not in allowed_categories:
            continue

        # Check service slug eligibility
        allowed_services = eligibility.get("allowed_service_slugs") or []
        if allowed_services and service_slug and service_slug not in allowed_services:
            continue

        # Check first order only
        if eligibility.get("first_order_only") and customer_email:
            prior_paid = await db.invoices_v2.find_one({
                "customer_email": customer_email,
                "status": "paid",
            })
            if prior_paid:
                continue

        # Check max uses per customer
        max_per_customer = int(limits.get("max_uses_per_customer", 0) or 0)
        if max_per_customer > 0 and customer_email:
            customer_uses = await db.campaign_redemptions.count_documents({
                "campaign_id": str(campaign["_id"]),
                "customer_email": customer_email,
            })
            if customer_uses >= max_per_customer:
                continue

        # Check total redemption limit
        max_total = int(limits.get("max_total_redemptions", 0) or 0)
        if max_total > 0:
            total_redemptions = campaign.get("redemption_count", 0)
            if total_redemptions >= max_total:
                continue

        # Calculate reward
        reward_type = reward.get("type")
        discount_amount = 0

        if reward_type == "percentage_discount":
            raw_discount = float(order_amount or 0) * (float(reward.get("value", 0) or 0) / 100)
            cap = float(reward.get("cap", 0) or 0)
            discount_amount = min(raw_discount, cap) if cap > 0 else raw_discount

        elif reward_type == "fixed_discount":
            discount_amount = min(float(reward.get("value", 0) or 0), float(order_amount or 0))

        results.append({
            "campaign_id": str(campaign["_id"]),
            "campaign_name": campaign.get("name"),
            "campaign_headline": campaign.get("headline"),
            "reward_type": reward_type,
            "reward_value": reward.get("value"),
            "discount_amount": round(discount_amount, 2),
            "discount_cap": reward.get("cap"),
            "free_addon_code": reward.get("free_addon_code"),
            "affiliate_commission": campaign.get("affiliate_commission", {}),
            "stacking": campaign.get("stacking", {}),
        })

    return results


async def record_campaign_redemption(
    db,
    *,
    campaign_id: str,
    customer_email: str,
    document_type: str,
    document_id: str,
    discount_amount: float,
):
    """Record a campaign redemption for tracking limits"""
    from bson import ObjectId
    
    await db.campaign_redemptions.insert_one({
        "campaign_id": campaign_id,
        "customer_email": customer_email,
        "document_type": document_type,
        "document_id": document_id,
        "discount_amount": discount_amount,
        "created_at": datetime.utcnow(),
    })
    
    # Increment campaign redemption count
    await db.affiliate_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$inc": {"redemption_count": 1}},
    )
