"""
Welcome Rewards Routes
Safer alternative to aggressive first-order discounts
Issues welcome points instead of direct margin discounts
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter(prefix="/api/welcome-rewards", tags=["Welcome Rewards"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


class WelcomeRewardCapture(BaseModel):
    email: str


@router.post("/capture")
async def capture_welcome_reward(data: WelcomeRewardCapture):
    """Capture email and check welcome reward eligibility"""
    now = datetime.now(timezone.utc)
    email = data.email.strip().lower()
    
    if not email:
        return {"ok": False, "reason": "missing_email"}

    existing_customer = await db.customers.find_one({"email": email})
    existing_order = await db.orders.find_one({"customer_email": email})
    existing_reward = await db.welcome_reward_captures.find_one({"email": email})

    is_new_user = not existing_order and existing_reward is None

    if not existing_reward:
        await db.welcome_reward_captures.insert_one({
            "email": email,
            "is_new_user": is_new_user,
            "reward_type": "welcome_points",
            "points_amount": 1000 if is_new_user else 0,
            "status": "captured",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        })

    return {
        "ok": True,
        "is_new_user": is_new_user,
        "reward_type": "welcome_points",
        "points_amount": 1000 if is_new_user else 0,
        "message": "Welcome reward eligibility captured."
    }


@router.get("/check/{email}")
async def check_welcome_reward(email: str):
    """Check if an email is eligible for welcome reward"""
    email = email.strip().lower()
    
    existing_order = await db.orders.find_one({"customer_email": email})
    existing_reward = await db.welcome_reward_captures.find_one({"email": email})
    
    if existing_order:
        return {"eligible": False, "reason": "existing_customer"}
    
    if existing_reward and existing_reward.get("status") == "redeemed":
        return {"eligible": False, "reason": "already_redeemed"}
    
    return {
        "eligible": True,
        "reward_type": "welcome_points",
        "points_amount": 1000,
    }
