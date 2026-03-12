from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt

from referral_models import ReferralSettings

router = APIRouter(prefix="/api/admin/referral-settings", tags=["Referral Settings"])
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
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def get_referral_settings(user: dict = Depends(get_admin_user)):
    """Get current referral settings"""
    doc = await db.referral_settings.find_one({})
    if not doc:
        # Create default settings
        default_doc = ReferralSettings().model_dump()
        default_doc["created_at"] = datetime.now(timezone.utc).isoformat()
        default_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.referral_settings.insert_one(default_doc)
        created = await db.referral_settings.find_one({"_id": result.inserted_id})
        return serialize_doc(created)
    return serialize_doc(doc)


@router.put("")
async def upsert_referral_settings(payload: ReferralSettings, user: dict = Depends(get_admin_user)):
    """Create or update referral settings"""
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.referral_settings.find_one({})
    if existing:
        update_data = payload.model_dump(exclude={"created_at", "updated_at"})
        update_data["updated_at"] = now
        await db.referral_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data},
        )
        updated = await db.referral_settings.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)

    doc = payload.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    result = await db.referral_settings.insert_one(doc)
    created = await db.referral_settings.find_one({"_id": result.inserted_id})
    return serialize_doc(created)
