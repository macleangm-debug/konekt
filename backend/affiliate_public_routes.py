from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/affiliates", tags=["Affiliate Public"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]


@router.get("/code/{affiliate_code}")
async def get_affiliate_by_code(affiliate_code: str):
    """Public endpoint to get affiliate info by code"""
    affiliate = await db.affiliates.find_one(
        {"affiliate_code": affiliate_code.upper(), "is_active": True}
    )
    if not affiliate:
        # Also try lowercase
        affiliate = await db.affiliates.find_one(
            {"affiliate_code": affiliate_code, "is_active": True}
        )
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate code not found")

    return {
        "affiliate_code": affiliate.get("affiliate_code"),
        "name": affiliate.get("name"),
        "message": "Use this promo code or link to access special Konekt offers.",
    }
