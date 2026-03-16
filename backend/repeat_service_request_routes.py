"""
Repeat Service Request Routes - Duplicate past service requests
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/repeat-service-requests", tags=["Repeat Service Requests"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.post("/{service_request_id}")
async def repeat_service_request(service_request_id: str):
    """Duplicate a past service request"""
    original = await db.service_requests.find_one({"_id": ObjectId(service_request_id)})
    if not original:
        raise HTTPException(status_code=404, detail="Service request not found")

    new_doc = {
        "customer_id": original.get("customer_id"),
        "customer_email": original.get("customer_email"),
        "customer_name": original.get("customer_name"),
        "customer_phone": original.get("customer_phone"),
        "company_name": original.get("company_name"),
        "company": original.get("company"),
        "service_key": original.get("service_key"),
        "service_name": original.get("service_name"),
        "service_group_key": original.get("service_group_key"),
        "form_data": original.get("form_data", {}),
        "attachments": [],  # Don't copy attachments, user should re-upload
        "notes": original.get("notes", ""),
        "status": "new",
        "source_type": "repeat_service_request",
        "source_service_request_id": str(original["_id"]),
        "country_code": original.get("country_code"),
        "region": original.get("region"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.service_requests.insert_one(new_doc)
    created = await db.service_requests.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/customer/{customer_id}/history")
async def get_customer_service_request_history(customer_id: str, limit: int = 20):
    """Get a customer's past service requests for repeat selection"""
    docs = await db.service_requests.find(
        {"customer_id": customer_id, "status": {"$in": ["completed", "delivered"]}}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]
