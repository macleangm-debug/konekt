"""
Notification Routes
API endpoints for managing notifications
Supports multiple auth contexts: main users, partners, affiliates
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
PARTNER_JWT_SECRET = os.environ.get('PARTNER_JWT_SECRET', 'konekt-partner-secret-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Multi-context auth handler that supports:
    - Main users (customers, admin, sales, staff) via JWT_SECRET
    - Partners (service/product partners) via PARTNER_JWT_SECRET
    - Affiliates (in partner_users collection with role=affiliate)
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    
    # Try main JWT_SECRET first (customers, admin, sales, staff)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if user:
                return user
    except jwt.InvalidTokenError:
        pass
    
    # Try PARTNER_JWT_SECRET (partners and affiliates)
    try:
        payload = jwt.decode(token, PARTNER_JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Partner tokens have partner_user_id or partner_id
        partner_user_id = payload.get("partner_user_id")
        partner_id = payload.get("partner_id")
        
        if partner_user_id:
            # Try to find by ObjectId first
            from bson import ObjectId
            try:
                partner = await db.partner_users.find_one({"_id": ObjectId(partner_user_id)}, {"_id": 0})
            except Exception:
                partner = None
            
            # Fallback to string id
            if not partner:
                partner = await db.partner_users.find_one({"id": partner_user_id}, {"_id": 0})
            
            if partner:
                # Normalize partner data to match user structure
                return {
                    "id": partner.get("id") or partner_user_id,
                    "email": partner.get("email"),
                    "name": partner.get("full_name") or partner.get("name"),
                    "role": partner.get("role", "partner"),  # partner or affiliate
                    "partner_id": partner_id or partner.get("partner_id"),
                }
    except jwt.InvalidTokenError:
        pass
    
    raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    user: dict = Depends(get_current_user)
):
    """List notifications for current user based on role and user ID"""
    role = user.get("role", "customer")
    user_id = user.get("id")
    partner_id = user.get("partner_id")

    # Build query matching by user ID, role, or partner target
    or_conditions = [
        {"recipient_user_id": user_id},
        {"recipient_role": role},
    ]
    # Also match vendor notifications by target_id (legacy format)
    if partner_id:
        or_conditions.append({"target_id": partner_id, "target_type": "vendor"})
        or_conditions.append({"recipient_user_id": partner_id})
    if role in ["admin", "super_admin"]:
        or_conditions.append({"recipient_role": {"$in": ["admin", "super_admin"]}})

    query = {"$or": or_conditions}

    if unread_only:
        query["$and"] = [{"$or": [{"is_read": False}, {"read": False}]}]

    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # Normalize is_read field
    for n in notifications:
        if "is_read" not in n:
            n["is_read"] = n.get("read", False)

    return notifications


@router.get("/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    """Get count of unread notifications for current user"""
    role = user.get("role", "customer")
    user_id = user.get("id")
    partner_id = user.get("partner_id")

    or_conditions = [
        {"recipient_user_id": user_id},
        {"recipient_role": role},
    ]
    if partner_id:
        or_conditions.append({"target_id": partner_id, "target_type": "vendor"})
        or_conditions.append({"recipient_user_id": partner_id})
    if role in ["admin", "super_admin"]:
        or_conditions.append({"recipient_role": {"$in": ["admin", "super_admin"]}})

    query = {
        "$or": or_conditions,
        "$and": [{"$or": [{"is_read": False}, {"read": False}]}],
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
    
    # Build role/user conditions
    role_conditions = [
        {"recipient_role": role},
        {"recipient_user_id": user_id},
    ]
    if role in ["admin", "super_admin"]:
        role_conditions.append({"recipient_role": {"$in": ["admin", "super_admin"]}})
    
    query = {
        "$and": [
            {"$or": role_conditions},
            {"$or": [{"is_read": False}, {"read": False}]},
        ]
    }
    
    await db.notifications.update_many(
        query,
        {"$set": {"is_read": True, "read": True, "updated_at": now.isoformat()}}
    )
    
    return {"ok": True, "message": "All notifications marked as read"}



# ═══ NOTIFICATION PREFERENCES ═══

@router.get("/preferences")
async def get_notification_preferences(user: dict = Depends(get_current_user)):
    """Get current user's notification preferences with role-based defaults."""
    from services.notification_multichannel_service import (
        get_user_preferences, EVENT_CATALOG, ROLE_DEFAULTS
    )

    user_id = user.get("id", "")
    role = user.get("role", "customer")

    # Map partner users to vendor role for notification preferences
    is_partner = user.get("is_partner", False) or user.get("partner_id")
    if is_partner and role not in ("affiliate",):
        role = "vendor"

    prefs = await get_user_preferences(db, user_id, role)

    # Build structured response grouped by event group
    role_events = {k: v for k, v in EVENT_CATALOG.items() if role in v["roles"]}
    groups = {}
    for event_key, meta in role_events.items():
        group = meta["group"]
        if group not in groups:
            groups[group] = []
        channel_prefs = prefs.get(event_key, ROLE_DEFAULTS.get(role, {}).get(
            event_key, {"in_app": True, "email": False, "whatsapp": False}
        ))
        groups[group].append({
            "event_key": event_key,
            "label": meta["label"],
            "in_app": channel_prefs.get("in_app", True),
            "email": channel_prefs.get("email", False),
            "whatsapp": channel_prefs.get("whatsapp", False),
        })

    # Channel availability
    import os
    resend_configured = bool(os.getenv("RESEND_API_KEY"))
    twilio_configured = all([
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN"),
        os.getenv("TWILIO_WHATSAPP_FROM"),
    ])

    return {
        "ok": True,
        "role": role,
        "groups": groups,
        "channels": {
            "in_app": True,
            "email": resend_configured,
            "whatsapp": twilio_configured,
        },
    }


@router.put("/preferences")
async def update_notification_preferences(
    payload: dict,
    user: dict = Depends(get_current_user),
):
    """Update notification preferences for specific event types."""
    from services.notification_multichannel_service import save_user_preferences, get_user_preferences

    user_id = user.get("id", "")
    role = user.get("role", "customer")

    # Merge with existing
    existing = await get_user_preferences(db, user_id, role)
    updates = payload.get("preferences", {})

    for event_key, channels in updates.items():
        if event_key not in existing:
            existing[event_key] = {}
        for channel, enabled in channels.items():
            if channel in ("in_app", "email", "whatsapp"):
                existing[event_key][channel] = bool(enabled)

    await save_user_preferences(db, user_id, role, existing)
    return {"ok": True, "message": "Preferences updated"}
