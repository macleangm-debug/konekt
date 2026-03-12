from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt

router = APIRouter(prefix="/api/customer/referrals", tags=["Customer Referrals"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"


def serialize_doc(doc):
    """Convert MongoDB document to dict with string id"""
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
async def get_my_referrals(user: dict = Depends(get_current_user)):
    """Get current user's referral stats and transactions"""
    user_id = user.get("id")
    user_email = user.get("email")

    # Get referral transactions where this user is the referrer
    transactions = await db.referral_transactions.find(
        {"referrer_id": user_id}
    ).sort("created_at", -1).to_list(length=200)

    # Calculate stats
    total_earned = sum(t.get("reward_amount", 0) for t in transactions if t.get("status") == "credited")
    pending_rewards = sum(t.get("reward_amount", 0) for t in transactions if t.get("status") == "pending")
    successful_referrals = len([t for t in transactions if t.get("status") == "credited"])

    # Get points balance
    points_wallet = await db.points_wallets.find_one({"user_id": user_id}, {"_id": 0})
    points_balance = points_wallet.get("points_balance", 0) if points_wallet else user.get("points", 0)

    # Get referral settings for share messages
    settings = await db.referral_settings.find_one({}, {"_id": 0})
    share_message = "I've been using Konekt for branded products and design services. Join using my link: {referral_link}"
    whatsapp_message = "Join Konekt with my referral link: {referral_link}"
    
    if settings:
        share_message = settings.get("share_message", share_message)
        whatsapp_message = settings.get("whatsapp_message", whatsapp_message)

    return {
        "referral_code": user.get("referral_code", ""),
        "referral_transactions": [serialize_doc(t) for t in transactions],
        "credit_balance": user.get("credit_balance", 0),
        "points_balance": points_balance,
        "total_referrals": len(transactions),
        "successful_referrals": successful_referrals,
        "total_earned": total_earned,
        "pending_rewards": pending_rewards,
        "share_message": share_message,
        "whatsapp_message": whatsapp_message
    }


@router.get("/stats")
async def get_referral_stats(user: dict = Depends(get_current_user)):
    """Get summary stats for current user's referrals"""
    user_id = user.get("id")

    transactions = await db.referral_transactions.find(
        {"referrer_id": user_id}
    ).to_list(length=1000)

    credited = [t for t in transactions if t.get("status") == "credited"]
    pending = [t for t in transactions if t.get("status") == "pending"]

    return {
        "referral_code": user.get("referral_code", ""),
        "total_referrals": len(transactions),
        "successful_referrals": len(credited),
        "pending_referrals": len(pending),
        "total_earned": sum(t.get("reward_amount", 0) for t in credited),
        "pending_rewards": sum(t.get("reward_amount", 0) for t in pending),
        "credit_balance": user.get("credit_balance", 0),
        "points": user.get("points", 0)
    }
