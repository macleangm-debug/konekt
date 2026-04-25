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
    """Public endpoint to get referral information by code.

    Resolves the code across THREE attribution surfaces (in priority order):
    1. db.affiliates.affiliate_code  — Affiliate Program partners (e.g. KONTEST)
    2. db.users.referral_code        — Customer signup-reward referral codes
    3. db.users.sales_promo_code     — Internal sales / staff promo codes

    Returning the first match keeps a single public lookup powering the
    /r/<code> referral landing page regardless of who owns the code.
    """
    code_upper = referral_code.upper()

    # Get referral settings for display (used as a default discount hint)
    settings = await db.referral_settings.find_one({}, {"_id": 0})
    referee_discount = 10  # Default
    if settings:
        referee_discount = settings.get("referee_discount_value", 10)

    # 1) Affiliate program code
    affiliate = await db.affiliates.find_one(
        {"affiliate_code": code_upper, "is_active": True}, {"_id": 0}
    )
    if affiliate:
        return {
            "referral_code": code_upper,
            "referrer_name": affiliate.get("name")
                or affiliate.get("full_name")
                or "Konekt Affiliate",
            "referrer_type": "affiliate",
            "message": "Use this Konekt affiliate code to unlock special offers.",
            "discount_percent": referee_discount,
        }

    # 2) Customer referral code (legacy signup-reward path)
    user = await db.users.find_one(
        {"referral_code": code_upper}, {"_id": 0}
    )
    if user:
        return {
            "referral_code": code_upper,
            "referrer_name": user.get("full_name") or user.get("name") or "Konekt Partner",
            "referrer_type": "customer",
            "message": f"Join Konekt using this referral code and get {referee_discount}% off your first order!",
            "discount_percent": referee_discount,
        }

    # 3) Sales / staff promo code
    sales_user = await db.users.find_one(
        {"sales_promo_code": code_upper}, {"_id": 0}
    )
    if sales_user:
        return {
            "referral_code": code_upper,
            "referrer_name": sales_user.get("full_name") or sales_user.get("name") or "Konekt Sales",
            "referrer_type": "sales",
            "message": "Use this Konekt promo code at checkout for a special offer.",
            "discount_percent": referee_discount,
        }

    raise HTTPException(status_code=404, detail="Referral code not found")


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
