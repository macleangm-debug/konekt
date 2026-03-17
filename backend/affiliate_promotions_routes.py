from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/affiliate-promotions", tags=["Affiliate Promotions"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]


@router.get("/available")
async def available_affiliate_promotions():
    campaigns = await db.campaigns.find({
        "status": "active"
    }).sort("created_at", -1).to_list(length=200)

    return [
        {
            "campaign_id": c.get("campaign_id"),
            "campaign_name": c.get("campaign_name"),
            "promotion_type": c.get("promotion_type", "display_uplift"),
            "scope_type": c.get("scope_type", "all"),
            "scope_value": c.get("scope_value"),
            "uplift_percent": c.get("uplift_percent", 0),
            "real_discount_percent": c.get("real_discount_percent", 0),
            "affiliate_payout_type": c.get("affiliate_payout_type", "fixed"),
            "affiliate_payout_value": c.get("affiliate_payout_value", 0),
            "minimum_sale_amount": c.get("minimum_sale_amount", 0),
            "currency": c.get("currency", "TZS"),
            "valid_until": c.get("valid_until"),
        }
        for c in campaigns
    ]
