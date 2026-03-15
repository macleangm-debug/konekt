"""
Checkout Campaign Routes
Evaluate campaigns and perks at checkout before order submission
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, Cookie
from pydantic import BaseModel
import os
from motor.motor_asyncio import AsyncIOMotorClient

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


class ApplyCampaignRequest(BaseModel):
    campaign_id: str
    customer_email: str
    order_amount: float
    discount_amount: float


@router.post("/evaluate-campaigns")
async def evaluate_checkout_campaigns(
    payload: CheckoutEvaluationRequest,
    request: Request,
    affiliate_code_cookie: Optional[str] = Cookie(default=None, alias="affiliate_code"),
):
    """
    Evaluate all active campaigns for the current checkout.
    Returns list of applicable campaigns with calculated discounts.
    
    Automatically reads affiliate_code from cookie if not provided in payload.
    """
    from checkout_campaign_service import evaluate_checkout_campaigns
    
    # Use payload affiliate_code, fallback to cookie
    effective_code = payload.affiliate_code or affiliate_code_cookie
    
    campaigns = await evaluate_checkout_campaigns(
        db,
        affiliate_code=effective_code,
        customer_email=payload.customer_email,
        order_amount=payload.order_amount,
        category=payload.category,
        service_slug=payload.service_slug,
    )
    
    return {
        "campaigns": campaigns,
        "affiliate_code_detected": effective_code,
        "best_campaign": campaigns[0] if campaigns else None,
    }


@router.post("/evaluate-affiliate-perk")
async def evaluate_affiliate_perk(
    payload: CheckoutEvaluationRequest,
    request: Request,
    affiliate_code_cookie: Optional[str] = Cookie(default=None, alias="affiliate_code"),
):
    """
    Evaluate the affiliate perk for a specific affiliate code.
    Returns discount details if eligible.
    """
    from checkout_campaign_service import get_affiliate_perk_for_checkout
    
    effective_code = payload.affiliate_code or affiliate_code_cookie
    
    if not effective_code:
        return {
            "eligible": False,
            "reason": "No affiliate code provided",
            "affiliate_code_detected": None,
        }
    
    perk = await get_affiliate_perk_for_checkout(
        db,
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
    Used by frontend to pre-populate checkout forms.
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
    Get all active public promotions that can be displayed on checkout.
    Only returns promotions visible to non-affiliate customers.
    """
    from affiliate_campaign_eval_service import get_active_campaigns
    
    campaigns = await get_active_campaigns(db, channel="public")
    
    # Only return safe fields for public display
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
