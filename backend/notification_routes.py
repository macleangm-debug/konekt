"""
Notification Routes
API endpoints for managing notifications
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
import os

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


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


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    user: dict = Depends(get_current_user)
):
    """List notifications for current user based on role"""
    role = user.get("role", "customer")
    user_id = user.get("id")
    
    # Build query for role-based or user-specific notifications
    query = {
        "$or": [
            {"recipient_role": role},
            {"recipient_role": {"$in": ["admin", "super_admin"]}} if role in ["admin", "super_admin"] else {"recipient_role": role},
            {"recipient_user_id": user_id},
        ]
    }
    
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return notifications


@router.get("/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    """Get count of unread notifications for current user"""
    role = user.get("role", "customer")
    user_id = user.get("id")
    
    query = {
        "$or": [
            {"recipient_role": role},
            {"recipient_role": {"$in": ["admin", "super_admin"]}} if role in ["admin", "super_admin"] else {"recipient_role": role},
            {"recipient_user_id": user_id},
        ],
        "is_read": False,
    }
    
    count = await db.notifications.count_documents(query)
    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: dict = Depends(get_current_user)
):
    """Mark a single notification as read"""
    now = datetime.now(timezone.utc)
    
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True, "updated_at": now.isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification = await db.notifications.find_one({"id": notification_id}, {"_id": 0})
    return notification


@router.put("/mark-all-read")
async def mark_all_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read for current user"""
    role = user.get("role", "customer")
    user_id = user.get("id")
    now = datetime.now(timezone.utc)
    
    query = {
        "$or": [
            {"recipient_role": role},
            {"recipient_role": {"$in": ["admin", "super_admin"]}} if role in ["admin", "super_admin"] else {"recipient_role": role},
            {"recipient_user_id": user_id},
        ],
        "is_read": False,
    }
    
    await db.notifications.update_many(
        query,
        {"$set": {"is_read": True, "updated_at": now.isoformat()}}
    )
    
    return {"ok": True, "message": "All notifications marked as read"}
