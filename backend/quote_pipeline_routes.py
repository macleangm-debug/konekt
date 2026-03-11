"""
Konekt Quote Pipeline Routes - Kanban board support
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/quotes", tags=["Quote Pipeline"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

KANBAN_STATUSES = ["draft", "sent", "approved", "converted"]


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("/pipeline")
async def get_quote_pipeline():
    """Get quotes grouped by status for Kanban board"""
    docs = await db.quotes.find({}).sort("created_at", -1).to_list(length=1000)
    serialized = [serialize_doc(doc) for doc in docs]

    grouped = {status: [] for status in KANBAN_STATUSES}
    grouped["other"] = []

    for quote in serialized:
        status = quote.get("status", "draft")
        if status in grouped:
            grouped[status].append(quote)
        else:
            grouped["other"].append(quote)

    summary = {
        "draft": len(grouped["draft"]),
        "sent": len(grouped["sent"]),
        "approved": len(grouped["approved"]),
        "converted": len(grouped["converted"]),
        "other": len(grouped["other"]),
        "total_value": sum(float(q.get("total", 0) or 0) for q in serialized),
    }

    return {
        "columns": grouped,
        "summary": summary,
    }


@router.patch("/{quote_id}/move")
async def move_quote_to_stage(quote_id: str, status: str = Query(...)):
    """Move quote to a different pipeline stage"""
    valid_statuses = KANBAN_STATUSES + ["rejected", "expired"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid quote status. Must be one of: {valid_statuses}")

    try:
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    now = datetime.now(timezone.utc)
    await db.quotes.update_one(
        {"_id": ObjectId(quote_id)},
        {
            "$set": {
                "status": status,
                "updated_at": now.isoformat(),
            }
        },
    )

    updated = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    return serialize_doc(updated)


@router.get("/pipeline/stats")
async def get_pipeline_stats():
    """Get summary statistics for the quote pipeline"""
    total = await db.quotes.count_documents({})
    draft = await db.quotes.count_documents({"status": "draft"})
    sent = await db.quotes.count_documents({"status": "sent"})
    approved = await db.quotes.count_documents({"status": "approved"})
    converted = await db.quotes.count_documents({"status": "converted"})
    rejected = await db.quotes.count_documents({"status": "rejected"})
    expired = await db.quotes.count_documents({"status": "expired"})
    
    # Calculate total value
    pipeline = [
        {"$group": {"_id": None, "total_value": {"$sum": "$total"}}}
    ]
    result = await db.quotes.aggregate(pipeline).to_list(length=1)
    total_value = result[0]["total_value"] if result else 0
    
    return {
        "total": total,
        "draft": draft,
        "sent": sent,
        "approved": approved,
        "converted": converted,
        "rejected": rejected,
        "expired": expired,
        "total_value": total_value,
    }
