"""
Campaign Pricing Routes
Evaluate campaign pricing with dual promotion support.
"""
import os
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from dual_promotion_service import (
    calculate_display_uplift_price,
    calculate_margin_discount_price,
    calculate_affiliate_payout,
    apply_margin_guard,
)

router = APIRouter(prefix="/api/campaign-pricing", tags=["Campaign Pricing"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.post("/evaluate")
async def evaluate_campaign(payload: dict):
    """
    Evaluate campaign pricing for a given product/service.
    Returns pricing breakdown and affiliate payout calculation.
    """
    campaign_id = payload.get("campaign_id")
    base_selling_price = float(payload.get("selling_price", 0) or 0)
    partner_cost = float(payload.get("partner_cost", 0) or 0)
    minimum_margin_percent = float(payload.get("minimum_margin_percent", 8) or 8)

    campaign = await db.campaigns.find_one({
        "campaign_id": campaign_id,
        "status": "active",
    })
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

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


@router.post("/preview-uplift")
async def preview_uplift_pricing(payload: dict):
    """
    Preview display uplift pricing without a campaign.
    Useful for testing and admin configuration.
    """
    selling_price = float(payload.get("selling_price", 0) or 0)
    uplift_percent = float(payload.get("uplift_percent", 10) or 10)
    
    return calculate_display_uplift_price(selling_price, uplift_percent)


@router.post("/preview-discount")
async def preview_discount_pricing(payload: dict):
    """
    Preview margin discount pricing without a campaign.
    Useful for testing and admin configuration.
    """
    selling_price = float(payload.get("selling_price", 0) or 0)
    discount_percent = float(payload.get("discount_percent", 5) or 5)
    
    return calculate_margin_discount_price(selling_price, discount_percent)
