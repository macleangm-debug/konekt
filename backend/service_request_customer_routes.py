from datetime import datetime
import os
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/customer/service-requests", tags=["Customer Service Requests"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("/{request_id}")
async def get_customer_service_request(request_id: str, request: Request):
    user_email = getattr(request.state, "user_email", None)

    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    doc = await db.service_requests.find_one(
        {"_id": ObjectId(request_id), "customer_email": user_email}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")

    # Filter comments to only show customer-visible ones
    doc["comments"] = [c for c in doc.get("comments", []) if c.get("visibility") == "customer"]
    return serialize_doc(doc)


@router.post("/{request_id}/revision")
async def request_revision(request_id: str, payload: dict, request: Request):
    user_email = getattr(request.state, "user_email", None)

    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    message = (payload.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    doc = await db.service_requests.find_one(
        {"_id": ObjectId(request_id), "customer_email": user_email}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")

    now = datetime.utcnow()
    await db.service_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$push": {
                "comments": {
                    "message": message,
                    "visibility": "customer",
                    "created_at": now,
                    "author_role": "customer",
                    "author_email": user_email,
                },
                "timeline": {
                    "type": "revision_requested",
                    "label": "Customer requested revision",
                    "created_at": now,
                    "actor_email": user_email,
                },
            },
            "$set": {
                "status": "revision_requested",
                "updated_at": now,
            },
        },
    )

    updated = await db.service_requests.find_one({"_id": ObjectId(request_id)})
    updated["comments"] = [c for c in updated.get("comments", []) if c.get("visibility") == "customer"]
    return serialize_doc(updated)
