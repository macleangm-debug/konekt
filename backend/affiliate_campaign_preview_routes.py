"""
Affiliate Campaign Preview Routes
Preview applicable campaigns during checkout
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

from affiliate_campaign_eval_service import evaluate_campaigns_for_checkout

router = APIRouter(prefix="/api/affiliate-campaign-preview", tags=["Affiliate Campaign Preview"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.post("")
async def preview_campaigns(payload: dict):
    """Preview which campaigns apply to a potential order"""
    results = await evaluate_campaigns_for_checkout(
        db,
        affiliate_code=payload.get("affiliate_code"),
        customer_email=payload.get("customer_email"),
        order_amount=float(payload.get("order_amount", 0) or 0),
        category=payload.get("category"),
        service_slug=payload.get("service_slug"),
    )

    return {
        "campaigns": results,
        "best_discount": max([c["discount_amount"] for c in results], default=0),
        "total_applicable": len(results),
    }
