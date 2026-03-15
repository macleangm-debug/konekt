"""
Affiliate Fraud Guard
Basic anti-duplication and fraud protection for affiliate conversions
"""
from datetime import datetime, timedelta
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def affiliate_conversion_allowed(
    database=None,
    *,
    affiliate_email: str | None,
    customer_email: str | None,
    source_document: str,
    source_document_id: str,
):
    """
    Basic anti-duplication guard.
    Prevent duplicate commissions for same affiliate+customer+document.
    """
    _db = database if database is not None else db
    
    if not affiliate_email or not customer_email:
        return False, "Missing affiliate or customer"

    existing = await _db.affiliate_commissions.find_one(
        {
            "affiliate_email": affiliate_email,
            "customer_email": customer_email,
            "source_document": source_document,
            "source_document_id": source_document_id,
        }
    )
    if existing:
        return False, "Duplicate commission detected"

    return True, ""


async def check_velocity_fraud(
    database=None,
    *,
    affiliate_email: str,
    hours: int = 24,
    max_conversions: int = 50,
):
    """
    Check if affiliate has too many conversions in a time window.
    This can indicate click fraud or bot activity.
    """
    _db = database if database is not None else db
    
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    count = await _db.affiliate_commissions.count_documents({
        "affiliate_email": affiliate_email,
        "created_at": {"$gte": cutoff}
    })
    
    if count >= max_conversions:
        return False, f"Velocity limit exceeded: {count} conversions in {hours}h"
    
    return True, ""
