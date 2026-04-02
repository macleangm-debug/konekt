"""
Performance Governance Routes — Admin-only CRUD for performance configuration.
"""
import os
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from services.performance_governance_service import get_performance_settings, update_performance_settings

router = APIRouter(prefix="/api/admin/performance-governance", tags=["Performance Governance"])

security = HTTPBearer()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: dict):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/settings")
async def get_settings(user: dict = Depends(get_admin_user)):
    """Admin: get current performance governance settings."""
    require_admin(user)
    return await get_performance_settings(db)


@router.put("/settings")
async def update_settings(payload: dict, user: dict = Depends(get_admin_user)):
    """Admin: update performance governance settings."""
    require_admin(user)
    admin_name = user.get("full_name") or user.get("name") or user.get("email", "admin")
    return await update_performance_settings(db, payload, admin_name)


@router.get("/audit")
async def get_audit_log(user: dict = Depends(get_admin_user)):
    """Admin: view recent settings change history."""
    require_admin(user)
    docs = await db.performance_governance_audit.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"entries": docs}
