"""
Checkout Attribution Service
Resolves affiliate attribution and logs campaign usage
"""
from datetime import datetime
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def resolve_affiliate_attribution(
    database=None,
    *,
    affiliate_code: str | None = None,
    customer_email: str | None = None,
):
    """
    Resolve affiliate from explicit code first.
    Later this can also be extended to use click cookies or session mapping.
    """
    _db = database if database is not None else db
    
    if not affiliate_code:
        return None

    affiliate = await _db.affiliates.find_one(
        {
            "promo_code": affiliate_code,
            "status": "active",
        }
    )

    if not affiliate:
        return None

    return {
        "affiliate_code": affiliate.get("promo_code"),
        "affiliate_email": affiliate.get("email"),
        "affiliate_name": affiliate.get("name"),
    }


async def log_campaign_usage(
    database=None,
    *,
    campaign_id: str | None,
    campaign_name: str | None,
    customer_email: str | None,
    order_id: str | None,
    invoice_id: str | None,
    discount_amount: float = 0,
):
    """Log campaign usage for tracking and analytics"""
    _db = database if database is not None else db
    
    if not campaign_id:
        return

    await _db.campaign_usages.insert_one(
        {
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "customer_email": customer_email,
            "order_id": order_id,
            "invoice_id": invoice_id,
            "discount_amount": float(discount_amount or 0),
            "created_at": datetime.utcnow(),
        }
    )
