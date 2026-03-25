"""
Checkout Campaign Routes
Evaluate campaigns and perks at checkout, resolve attribution
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Request, Cookie
from pydantic import BaseModel
import os
from motor.motor_asyncio import AsyncIOMotorClient
from checkout_attribution_service import resolve_affiliate_attribution

router = APIRouter(prefix="/api/checkout", tags=["Checkout"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


class CheckoutEvaluationRequest(BaseModel):
    customer_email: Optional[str] = None
    order_amount: float
    category: Optional[str] = None
    service_slug: Optional[str] = None
    affiliate_code: Optional[str] = None


@router.post("/evaluate-campaign")
async def evaluate_campaign(payload: dict):
    """
    Evaluate campaigns and resolve attribution at checkout.
    Returns best matching campaign and affiliate details.
    """
    order_amount = payload.get("order_amount", 0)
    affiliate_code = payload.get("affiliate_code")
    service_slug = payload.get("service_slug")
    customer_email = payload.get("customer_email")

    # Evaluate campaign eligibility
    campaign = await _evaluate_campaign_for_checkout(
        order_amount=order_amount,
        affiliate_code=affiliate_code,
        service_slug=service_slug,
    )

    # Resolve affiliate attribution
    attribution = await resolve_affiliate_attribution(
        db,
        affiliate_code=affiliate_code,
        customer_email=customer_email,
    )

    return {
        "campaign": campaign,
        "affiliate": attribution,
    }


@router.post("/evaluate-campaigns")
async def evaluate_checkout_campaigns(
    payload: CheckoutEvaluationRequest,
    affiliate_code_cookie: Optional[str] = Cookie(default=None, alias="affiliate_code"),
):
    """
    Evaluate all active campaigns for the current checkout.
    Returns list of applicable campaigns with calculated discounts.
    """
    effective_code = payload.affiliate_code or affiliate_code_cookie
    
    campaigns = await _get_all_applicable_campaigns(
        order_amount=payload.order_amount,
        affiliate_code=effective_code,
        service_slug=payload.service_slug,
        category=payload.category,
    )
    
    # Also resolve attribution
    attribution = await resolve_affiliate_attribution(
        db,
        affiliate_code=effective_code,
        customer_email=payload.customer_email,
    )
    
    return {
        "campaigns": campaigns,
        "affiliate_code_detected": effective_code,
        "affiliate": attribution,
        "best_campaign": campaigns[0] if campaigns else None,
    }


@router.post("/evaluate-affiliate-perk")
async def evaluate_affiliate_perk(
    payload: CheckoutEvaluationRequest,
    affiliate_code_cookie: Optional[str] = Cookie(default=None, alias="affiliate_code"),
):
    """
    Evaluate the affiliate perk for a specific affiliate code.
    """
    effective_code = payload.affiliate_code or affiliate_code_cookie
    
    if not effective_code:
        return {
            "eligible": False,
            "reason": "No affiliate code provided",
            "affiliate_code_detected": None,
        }
    
    perk = await _get_affiliate_perk(
        affiliate_code=effective_code,
        customer_email=payload.customer_email,
        order_amount=payload.order_amount,
        category=payload.category,
    )
    
    perk["affiliate_code_detected"] = effective_code
    return perk


@router.get("/detect-attribution")
async def detect_checkout_attribution(
    request: Request,
    affiliate_code: Optional[str] = Cookie(default=None),
):
    """
    Detect any attribution data from cookies or URL params.
    """
    result = {
        "has_attribution": False,
        "affiliate_code": None,
        "affiliate_name": None,
        "source": None,
    }
    
    # Check URL query param first
    url_code = request.query_params.get("affiliate")
    if url_code:
        affiliate = await db.affiliates.find_one({
            "promo_code": url_code,
            "status": "active"
        })
        if affiliate:
            result["has_attribution"] = True
            result["affiliate_code"] = url_code
            result["affiliate_name"] = affiliate.get("name")
            result["source"] = "url"
            return result
    
    # Check cookie
    if affiliate_code:
        affiliate = await db.affiliates.find_one({
            "promo_code": affiliate_code,
            "status": "active"
        })
        if affiliate:
            result["has_attribution"] = True
            result["affiliate_code"] = affiliate_code
            result["affiliate_name"] = affiliate.get("name")
            result["source"] = "cookie"
    
    return result


@router.get("/active-promotions")
async def get_active_public_promotions():
    """
    Get all active public promotions for checkout display.
    """
    now = datetime.utcnow()
    
    campaigns = await db.affiliate_campaigns.find({
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
    }).to_list(length=50)
    
    public_campaigns = []
    for c in campaigns:
        if c.get("is_public", True):
            public_campaigns.append({
                "id": str(c.get("_id")),
                "name": c.get("name"),
                "headline": c.get("headline"),
                "description": c.get("marketing", {}).get("landing_copy"),
                "reward_type": c.get("reward", {}).get("type"),
                "reward_value": c.get("reward", {}).get("value"),
                "min_order": c.get("eligibility", {}).get("min_order_amount"),
                "end_date": c.get("end_date").isoformat() if c.get("end_date") else None,
            })
    
    return {"promotions": public_campaigns}


@router.post("/active-promotions")
async def post_active_promotions(payload: dict):
    """
    Alias endpoint for active promotions with POST.
    """
    order_amount = payload.get("order_amount", 0)
    affiliate_code = payload.get("affiliate_code")
    service_slug = payload.get("service_slug")
    
    campaign = await _evaluate_campaign_for_checkout(
        order_amount=order_amount,
        affiliate_code=affiliate_code,
        service_slug=service_slug,
    )
    
    return {"campaigns": [campaign] if campaign else []}


# Internal helper functions

async def _evaluate_campaign_for_checkout(
    *,
    order_amount: float,
    affiliate_code: str | None = None,
    service_slug: str | None = None,
):
    """Evaluate and return the best matching campaign"""
    now = datetime.utcnow()
    
    campaigns = await db.affiliate_campaigns.find({
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
    }).to_list(length=200)

    for campaign in campaigns:
        eligibility = campaign.get("eligibility", {})
        reward = campaign.get("reward", {})

        min_order = float(eligibility.get("min_order_amount", 0) or 0)
        if order_amount < min_order:
            continue

        allowed_services = eligibility.get("allowed_service_slugs", [])
        if allowed_services and service_slug and service_slug not in allowed_services:
            continue

        # Calculate discount
        discount = 0
        reward_type = reward.get("type", "percentage_discount")
        reward_value = float(reward.get("value", 0) or 0)
        
        if reward_type == "percentage_discount":
            raw = order_amount * reward_value / 100
            cap = reward.get("cap")
            discount = min(raw, float(cap)) if cap else raw
        elif reward_type == "fixed_discount":
            discount = min(reward_value, order_amount)

        return {
            "campaign_id": str(campaign["_id"]),
            "campaign_name": campaign.get("name"),
            "campaign_headline": campaign.get("headline"),
            "reward_type": reward_type,
            "reward_value": reward_value,
            "discount_amount": round(discount, 2),
        }

    return None


async def _get_all_applicable_campaigns(
    *,
    order_amount: float,
    affiliate_code: str | None = None,
    service_slug: str | None = None,
    category: str | None = None,
):
    """Get all applicable campaigns, sorted by discount value"""
    now = datetime.utcnow()
    
    campaigns = await db.affiliate_campaigns.find({
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
    }).to_list(length=200)

    applicable = []
    
    for campaign in campaigns:
        eligibility = campaign.get("eligibility", {})
        reward = campaign.get("reward", {})

        min_order = float(eligibility.get("min_order_amount", 0) or 0)
        if order_amount < min_order:
            continue

        allowed_services = eligibility.get("allowed_service_slugs", [])
        if allowed_services and service_slug and service_slug not in allowed_services:
            continue
            
        allowed_categories = eligibility.get("allowed_categories", [])
        if allowed_categories and category and category not in allowed_categories:
            continue

        # Calculate discount
        discount = 0
        reward_type = reward.get("type", "percentage_discount")
        reward_value = float(reward.get("value", 0) or 0)
        
        if reward_type == "percentage_discount":
            raw = order_amount * reward_value / 100
            cap = reward.get("cap")
            discount = min(raw, float(cap)) if cap else raw
        elif reward_type == "fixed_discount":
            discount = min(reward_value, order_amount)

        applicable.append({
            "campaign_id": str(campaign["_id"]),
            "campaign_name": campaign.get("name"),
            "campaign_headline": campaign.get("headline"),
            "reward_type": reward_type,
            "reward_value": reward_value,
            "discount_amount": round(discount, 2),
        })

    # Sort by discount amount descending
    applicable.sort(key=lambda x: x["discount_amount"], reverse=True)
    return applicable


async def _get_affiliate_perk(
    *,
    affiliate_code: str,
    customer_email: str | None = None,
    order_amount: float = 0,
    category: str | None = None,
):
    """Get affiliate perk details for checkout preview"""
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
