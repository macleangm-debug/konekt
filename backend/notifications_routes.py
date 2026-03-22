"""
Konekt Notification System Routes
Handles in-app notifications for users, staff, partners.
"""

from fastapi import APIRouter, Request, HTTPException
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

def serialize_notification(doc):
    """Convert MongoDB document to JSON-serializable format."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", ""))
    if "created_at" in doc and doc["created_at"]:
        doc["created_at"] = doc["created_at"].isoformat()
    if "read_at" in doc and doc["read_at"]:
        doc["read_at"] = doc["read_at"].isoformat()
    return doc

@router.post("/")
async def create_notification(payload: dict, request: Request):
    """Create a new notification."""
    db = request.app.mongodb
    doc = {
        "user_id": payload.get("user_id"),
        "role": payload.get("role", "customer"),
        "type": payload.get("type", "info"),  # info, success, warning, error
        "title": payload.get("title"),
        "message": payload.get("message"),
        "action_url": payload.get("action_url"),
        "status": "unread",
        "created_at": datetime.utcnow(),
        "read_at": None
    }
    result = await db.notifications.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

@router.get("/")
async def get_notifications(request: Request, limit: int = 20):
    """Get notifications for current user."""
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    
    query = {}
    if user:
        uid = str(user.get("_id", ""))
        query = {"$or": [{"user_id": uid}, {"user_id": None, "role": user.get("role")}]}
    
    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)
    data = await cursor.to_list(length=limit)
    return [serialize_notification(doc) for doc in data]

@router.get("/unread-count")
async def get_unread_count(request: Request):
    """Get count of unread notifications."""
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    
    query = {"status": "unread"}
    if user:
        uid = str(user.get("_id", ""))
        query["$or"] = [{"user_id": uid}, {"user_id": None, "role": user.get("role")}]
    
    count = await db.notifications.count_documents(query)
    return {"unread_count": count}

@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, request: Request):
    """Mark a notification as read."""
    db = request.app.mongodb
    
    try:
        result = await db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"status": "read", "read_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/mark-all-read")
async def mark_all_as_read(request: Request):
    """Mark all notifications as read for current user."""
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    
    query = {"status": "unread"}
    if user:
        uid = str(user.get("_id", ""))
        query["$or"] = [{"user_id": uid}, {"user_id": None, "role": user.get("role")}]
    
    result = await db.notifications.update_many(
        query,
        {"$set": {"status": "read", "read_at": datetime.utcnow()}}
    )
    return {"ok": True, "marked_count": result.modified_count}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, request: Request):
    """Delete a notification."""
    db = request.app.mongodb
    
    try:
        result = await db.notifications.delete_one({"_id": ObjectId(notification_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Utility function for triggering notifications from other parts of the system
async def trigger_notification(db, user_id: str, title: str, message: str, 
                                type: str = "info", role: str = None, action_url: str = None):
    """Helper function to create notifications programmatically."""
    doc = {
        "user_id": user_id,
        "role": role,
        "type": type,
        "title": title,
        "message": message,
        "action_url": action_url,
        "status": "unread",
        "created_at": datetime.utcnow(),
        "read_at": None
    }
    await db.notifications.insert_one(doc)
