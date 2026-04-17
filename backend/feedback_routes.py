"""
Feedback & Issue Reporting Routes
- Users submit issues/feedback via floating widget
- Admin receives in Feedback Inbox
- Categories: bug, payment_issue, order_issue, feature_request, general
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

CATEGORIES = {
    "bug": {"label": "Bug / Error", "priority": "high"},
    "payment_issue": {"label": "Payment Issue", "priority": "high"},
    "order_issue": {"label": "Order Issue", "priority": "high"},
    "feature_request": {"label": "Feature Request", "priority": "low"},
    "general": {"label": "General Feedback", "priority": "medium"},
}


def _serialize(doc):
    if not doc:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


@router.post("")
async def submit_feedback(payload: dict):
    """Submit feedback/issue from any logged-in user."""
    now = datetime.now(timezone.utc).isoformat()
    category = payload.get("category", "general")
    cat_info = CATEGORIES.get(category, CATEGORIES["general"])

    doc = {
        "id": str(uuid4()),
        "category": category,
        "category_label": cat_info["label"],
        "priority": cat_info["priority"],
        "description": payload.get("description", ""),
        "page_url": payload.get("page_url", ""),
        "user_id": payload.get("user_id", ""),
        "user_email": payload.get("user_email", ""),
        "user_name": payload.get("user_name", ""),
        "user_role": payload.get("user_role", ""),
        "status": "new",
        "admin_notes": "",
        "created_at": now,
        "updated_at": now,
    }
    await db.feedback.insert_one(doc)
    return {"status": "success", "id": doc["id"], "message": "Thank you for your feedback!"}


@router.get("")
async def list_feedback(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(default=100, le=500),
):
    """Admin: list all feedback."""
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    docs = await db.feedback.find(query).sort("created_at", -1).to_list(length=limit)
    return [_serialize(d) for d in docs]


@router.get("/stats")
async def feedback_stats():
    """Admin: feedback counts by status and category."""
    total = await db.feedback.count_documents({})
    new_count = await db.feedback.count_documents({"status": "new"})
    in_progress = await db.feedback.count_documents({"status": "in_progress"})
    resolved = await db.feedback.count_documents({"status": "resolved"})
    by_category = {}
    for cat in CATEGORIES:
        by_category[cat] = await db.feedback.count_documents({"category": cat})
    return {
        "total": total, "new": new_count,
        "in_progress": in_progress, "resolved": resolved,
        "by_category": by_category,
    }


@router.patch("/{feedback_id}")
async def update_feedback(feedback_id: str, payload: dict):
    """Admin: update feedback status/notes."""
    existing = await db.feedback.find_one({"id": feedback_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Feedback not found")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if "status" in payload:
        updates["status"] = payload["status"]
    if "admin_notes" in payload:
        updates["admin_notes"] = payload["admin_notes"]
    if "priority" in payload:
        updates["priority"] = payload["priority"]
    await db.feedback.update_one({"id": feedback_id}, {"$set": updates})
    updated = await db.feedback.find_one({"id": feedback_id})
    return _serialize(updated)
