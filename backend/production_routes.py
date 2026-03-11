"""
Konekt Production Queue Routes
- List production queue
- Update production status (syncs to order)
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

from order_ops_models import UpdateProductionStatusRequest

router = APIRouter(prefix="/api/admin/production", tags=["Production"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


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
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    for k, v in item.items():
                        if isinstance(v, datetime):
                            item[k] = v.isoformat()
    return doc


@router.get("/queue")
async def list_production_queue(
    status: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all items in production queue"""
    query = {}
    if status:
        query["status"] = status
    docs = await db.production_queue.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/queue/{queue_id}")
async def get_production_item(queue_id: str):
    """Get a specific production queue item"""
    try:
        doc = await db.production_queue.find_one({"_id": ObjectId(queue_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Production item not found")
        return serialize_doc(doc)
    except Exception:
        raise HTTPException(status_code=404, detail="Production item not found")


@router.patch("/queue/{queue_id}/status")
async def update_production_status(queue_id: str, payload: UpdateProductionStatusRequest):
    """Update production status and sync to order"""
    now = datetime.now(timezone.utc)

    try:
        queue_item = await db.production_queue.find_one({"_id": ObjectId(queue_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Production item not found")
    
    if not queue_item:
        raise HTTPException(status_code=404, detail="Production item not found")

    await db.production_queue.update_one(
        {"_id": ObjectId(queue_id)},
        {
            "$set": {"status": payload.status, "updated_at": now.isoformat()},
            "$push": {
                "history": {
                    "status": payload.status,
                    "note": payload.note or f"Production status updated to {payload.status}",
                    "timestamp": now.isoformat(),
                }
            },
        },
    )

    # Map production status to order status
    status_map = {
        "queued": "in_production",
        "assigned": "in_production",
        "in_progress": "in_production",
        "waiting_approval": "in_review",
        "quality_check": "quality_check",
        "completed": "ready_for_dispatch",
        "blocked": "in_review",
    }

    # Sync status to the related order
    if queue_item.get("order_id"):
        try:
            order_status = status_map.get(payload.status, "in_production")
            await db.orders.update_one(
                {"_id": ObjectId(queue_item["order_id"])},
                {
                    "$set": {
                        "status": order_status,
                        "current_status": order_status,
                        "updated_at": now.isoformat()
                    },
                    "$push": {
                        "status_history": {
                            "status": order_status,
                            "note": payload.note or f"Production queue moved to {payload.status}",
                            "timestamp": now.isoformat(),
                        }
                    },
                },
            )
        except Exception:
            pass

    updated = await db.production_queue.find_one({"_id": ObjectId(queue_id)})
    return serialize_doc(updated)


@router.get("/stats")
async def get_production_stats():
    """Get production queue statistics"""
    total = await db.production_queue.count_documents({})
    queued = await db.production_queue.count_documents({"status": "queued"})
    in_progress = await db.production_queue.count_documents({"status": "in_progress"})
    completed = await db.production_queue.count_documents({"status": "completed"})
    blocked = await db.production_queue.count_documents({"status": "blocked"})
    
    return {
        "total": total,
        "queued": queued,
        "in_progress": in_progress,
        "completed": completed,
        "blocked": blocked,
    }
