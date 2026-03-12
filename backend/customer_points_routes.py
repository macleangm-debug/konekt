from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt

router = APIRouter(prefix="/api/customer/points", tags=["Customer Points"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"


def serialize_doc(doc):
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
async def get_my_points(user: dict = Depends(get_current_user)):
    """Get current user's points wallet and transaction history"""
    user_id = user.get("id")

    wallet = await db.points_wallets.find_one({"user_id": user_id})
    transactions = await db.points_transactions.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(length=200)

    return {
        "wallet": serialize_doc(wallet) if wallet else None,
        "transactions": [serialize_doc(doc) for doc in transactions],
    }


@router.get("/balance")
async def get_points_balance(user: dict = Depends(get_current_user)):
    """Get just the points balance for the current user"""
    user_id = user.get("id")

    wallet = await db.points_wallets.find_one({"user_id": user_id})
    
    return {
        "points_balance": wallet.get("points_balance", 0) if wallet else 0,
        "points_earned_total": wallet.get("points_earned_total", 0) if wallet else 0,
        "points_redeemed_total": wallet.get("points_redeemed_total", 0) if wallet else 0,
    }
