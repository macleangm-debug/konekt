from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/partnerships", tags=["partnerships"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "konekt")


def get_db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


@router.get("/summary")
async def get_partnerships_summary():
    db = get_db()
    affiliates_count = await db.affiliates.count_documents({})
    referral_codes_count = await db.referral_codes.count_documents({})
    return {
        "affiliates": affiliates_count,
        "referrals": referral_codes_count,
        "pending_commissions": 0,
        "paid_out": 0,
    }
