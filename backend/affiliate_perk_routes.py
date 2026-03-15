"""
Affiliate Perk Routes
Public routes for previewing affiliate perks at checkout
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

from affiliate_customer_perk_service import preview_affiliate_perk

router = APIRouter(prefix="/api/affiliate-perks", tags=["Affiliate Perks"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.post("/preview")
async def preview_perk(payload: dict):
    """Preview what perk a customer would receive for using an affiliate code"""
    result = await preview_affiliate_perk(
        db,
        affiliate_code=payload.get("affiliate_code"),
        customer_email=payload.get("customer_email"),
        order_amount=float(payload.get("order_amount", 0) or 0),
        category=payload.get("category"),
    )
    return result


@router.get("/validate/{code}")
async def validate_affiliate_code(code: str):
    """Check if an affiliate code is valid"""
    affiliate = await db.affiliates.find_one({"promo_code": code, "status": "active"})
    if not affiliate:
        return {"valid": False, "reason": "Invalid or inactive affiliate code"}
    
    settings = await db.affiliate_settings.find_one({}) or {}
    if not settings.get("enabled", True):
        return {"valid": False, "reason": "Affiliate program is currently disabled"}
    
    return {
        "valid": True,
        "affiliate_name": affiliate.get("name"),
        "has_customer_perk": settings.get("customer_perk_enabled", False),
    }
