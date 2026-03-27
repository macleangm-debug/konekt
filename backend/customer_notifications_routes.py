from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import uuid
import os
import jwt

router = APIRouter(prefix="/api/customer", tags=["Customer Notifications & Activity"])

async def get_current_user(request: Request):
    """Extract user from token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== ACTIVITY FEED ====================

@router.get("/activity-feed")
async def get_activity_feed(
    request: Request,
    limit: int = Query(20, le=100)
):
    """Get user's activity feed - recent quotes, orders, etc."""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    activities = []
    
    # Get recent quotes
    quotes = await db.quotes_v2.find(
        {"customer_email": user["email"]}
    ).sort("created_at", -1).to_list(limit // 2)
    
    for q in quotes:
        q_id = q.get("id") or str(q.get("_id", ""))
        status_messages = {
            "pending": "Quote created - awaiting review",
            "approved": "Quote approved! Ready for payment",
            "paid": "Payment received for quote",
            "converted": "Quote converted to order",
        }
        activities.append({
            "id": f"quote_{q_id}",
            "type": f"quote_{q.get('status', 'created')}",
            "message": status_messages.get(q.get('status'), "New quote created"),
            "reference": f"Quote #{q.get('quote_number', q_id[:8])} - TZS {q.get('total', 0):,}",
            "created_at": q.get("created_at", datetime.now(timezone.utc).isoformat()),
            "link": f"/dashboard/quotes/{q_id}"
        })
    
    # Get recent orders
    orders = await db.orders.find(
        {"customer_email": user["email"]}
    ).sort("created_at", -1).to_list(limit // 2)
    
    for o in orders:
        o_id = o.get("id") or str(o.get("_id", ""))
        status_messages = {
            "pending": "Order placed",
            "confirmed": "Order confirmed",
            "processing": "Order in progress",
            "shipped": "Order shipped",
            "delivered": "Order delivered!",
        }
        activities.append({
            "id": f"order_{o_id}",
            "type": f"order_{o.get('status', 'confirmed')}",
            "message": status_messages.get(o.get('status'), "Order update"),
            "reference": f"Order #{o.get('order_number', o_id[:8])}",
            "created_at": o.get("created_at", datetime.now(timezone.utc).isoformat()),
            "link": f"/account/orders"
        })
    
    # Sort by created_at - normalize to string for comparison
    def get_sort_key(x):
        val = x.get("created_at", "")
        if isinstance(val, datetime):
            return val.isoformat()
        return str(val) if val else ""
    
    activities.sort(key=get_sort_key, reverse=True)
    
    return activities[:limit]

# ==================== NOTIFICATIONS ====================

@router.get("/notifications")
async def get_notifications(
    request: Request,
    limit: int = Query(50, le=100)
):
    """Get user's notifications"""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return notifications

@router.get("/notifications/count")
async def get_unread_count(request: Request):
    """Get count of unread notifications"""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    count = await db.notifications.count_documents({
        "user_id": user["id"],
        "read": {"$ne": True}
    })
    
    return {"unread": count}

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    """Mark a notification as read"""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Marked as read"}

@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(request: Request):
    """Mark all notifications as read"""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    await db.notifications.update_many(
        {"user_id": user["id"], "read": {"$ne": True}},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "All notifications marked as read"}

# ==================== NOTIFICATION TRIGGERS ====================

async def create_notification(db, user_id: str, notification_type: str, message: str, reference: str = None):
    """Internal function to create notifications"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notification_type,
        "message": message,
        "reference": reference,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notification)
    return notification

# Helper function for external use
def get_notification_creator(db):
    async def creator(user_id, notification_type, message, reference=None):
        return await create_notification(db, user_id, notification_type, message, reference)
    return creator
