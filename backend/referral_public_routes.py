from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/referrals", tags=["Referral Public"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]


@router.get("/code/{referral_code}")
async def get_referral_by_code(referral_code: str):
    """Public endpoint to get referral information by code"""
    user = await db.users.find_one({"referral_code": referral_code.upper()}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Referral code not found")

    # Get referral settings for display
    settings = await db.referral_settings.find_one({}, {"_id": 0})
    
    referee_discount = 10  # Default
    if settings:
        referee_discount = settings.get("referee_discount_value", 10)

    return {
        "referral_code": referral_code.upper(),
        "referrer_name": user.get("full_name") or user.get("name") or "Konekt Partner",
        "message": f"Join Konekt using this referral code and get {referee_discount}% off your first order!",
        "discount_percent": referee_discount
    }


@router.get("/settings/public")
async def get_public_referral_settings():
    """Get public referral program settings"""
    settings = await db.referral_settings.find_one({}, {"_id": 0})
    
    if not settings:
        settings = {
            "is_active": True,
            "referee_discount_type": "percentage",
            "referee_discount_value": 10.0,
            "share_message": "I've been using Konekt for branded products and design services. Join using my link: {referral_link}",
            "whatsapp_message": "Join Konekt with my referral link and get 10% off your first order: {referral_link}"
        }
    
    return {
        "is_active": settings.get("is_active", True),
        "referee_discount_type": settings.get("referee_discount_type", "percentage"),
        "referee_discount_value": settings.get("referee_discount_value", 10),
        "share_message": settings.get("share_message", "Join Konekt using my referral link: {referral_link}"),
        "whatsapp_message": settings.get("whatsapp_message", "Join Konekt: {referral_link}")
    }
