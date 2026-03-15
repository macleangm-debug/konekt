from datetime import datetime
import os
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/service-requests", tags=["Admin Service Requests"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("")
async def list_service_requests(
    request: Request,
    category: str | None = None,
    status: str | None = None,
    assigned_to: str | None = None,
):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to

    docs = await db.service_requests.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{request_id}")
async def get_service_request(request_id: str, request: Request):
    doc = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")
    return serialize_doc(doc)


@router.post("/{request_id}/assign")
async def assign_service_request(request_id: str, payload: dict, request: Request):
    assigned_to = payload.get("assigned_to")
    assigned_name = payload.get("assigned_name")

    if not assigned_to:
        raise HTTPException(status_code=400, detail="assigned_to is required")

    doc = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")

    now = datetime.utcnow()
    await db.service_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$set": {
                "assigned_to": assigned_to,
                "assigned_name": assigned_name,
                "updated_at": now,
            },
            "$push": {
                "timeline": {
                    "type": "assignment",
                    "label": "Assigned to staff",
                    "assigned_to": assigned_to,
                    "assigned_name": assigned_name,
                    "created_at": now,
                }
            },
        },
    )

    updated = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    return serialize_doc(updated)


@router.post("/{request_id}/status")
async def update_service_request_status(request_id: str, payload: dict, request: Request):
    status = payload.get("status")
    note = payload.get("note", "")

    allowed_statuses = {
        "submitted",
        "pending_review",
        "pending_payment",
        "in_progress",
        "awaiting_client_feedback",
        "revision_requested",
        "completed",
        "cancelled",
    }

    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    doc = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")

    now = datetime.utcnow()
    await db.service_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$set": {
                "status": status,
                "updated_at": now,
            },
            "$push": {
                "timeline": {
                    "type": "status_change",
                    "label": f"Status changed to {status}",
                    "note": note,
                    "created_at": now,
                }
            },
        },
    )

    updated = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    return serialize_doc(updated)


@router.post("/{request_id}/comments")
async def add_service_request_comment(request_id: str, payload: dict, request: Request):
    message = (payload.get("message") or "").strip()
    visibility = payload.get("visibility", "internal")

    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    doc = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")

    now = datetime.utcnow()
    comment = {
        "message": message,
        "visibility": visibility,
        "created_at": now,
    }

    await db.service_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$push": {
                "comments": comment,
                "timeline": {
                    "type": "comment",
                    "label": "Comment added",
                    "visibility": visibility,
                    "created_at": now,
                }
            },
            "$set": {"updated_at": now},
        },
    )

    updated = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    return serialize_doc(updated)


@router.post("/{request_id}/deliverables")
async def add_service_request_deliverable(request_id: str, payload: dict, request: Request):
    file_url = payload.get("file_url")
    file_name = payload.get("file_name")
    note = payload.get("note", "")

    if not file_url:
        raise HTTPException(status_code=400, detail="file_url is required")

    doc = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")

    now = datetime.utcnow()
    deliverable = {
        "file_url": file_url,
        "file_name": file_name or "Deliverable",
        "note": note,
        "created_at": now,
    }

    await db.service_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$push": {
                "deliverables": deliverable,
                "timeline": {
                    "type": "deliverable",
                    "label": "Deliverable uploaded",
                    "file_name": file_name,
                    "created_at": now,
                }
            },
            "$set": {
                "status": "awaiting_client_feedback",
                "updated_at": now,
            },
        },
    )

    updated = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    return serialize_doc(updated)
