"""
Site Visit Routes - Booking and management of site inspections
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/site-visits", tags=["Site Visits"])

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


@router.get("")
async def list_site_visits(status: str = None, customer_id: str = None):
    query = {}
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    docs = await db.site_visits.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{visit_id}")
async def get_site_visit(visit_id: str):
    doc = await db.site_visits.find_one({"_id": ObjectId(visit_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Site visit not found")
    return serialize_doc(doc)


@router.post("")
async def create_site_visit(payload: dict):
    service_key = payload.get("service_key")
    service = await db.service_types.find_one({"key": service_key})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    visit_doc = {
        "service_key": service_key,
        "service_name": service.get("name", ""),
        "customer_id": payload.get("customer_id"),
        "customer_email": payload.get("customer_email"),
        "customer_name": payload.get("customer_name", ""),
        "customer_phone": payload.get("customer_phone", ""),
        "country_code": payload.get("country_code"),
        "region": payload.get("region"),
        "city": payload.get("city", ""),
        "address_line_1": payload.get("address_line_1"),
        "address_line_2": payload.get("address_line_2", ""),
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
        "site_photos": payload.get("site_photos", []),
        "site_description": payload.get("site_description", ""),
        "preferred_visit_date": payload.get("preferred_visit_date"),
        "preferred_time_window": payload.get("preferred_time_window"),
        "visit_fee": float(payload.get("visit_fee", service.get("visit_fee", 0)) or 0),
        "fee_paid": bool(payload.get("fee_paid", False)),
        "assigned_technician_id": None,
        "assigned_technician_name": None,
        "visit_completed_at": None,
        "visit_notes": "",
        "quote_generated": False,
        "quote_id": None,
        "status": "scheduled",
        "notes": payload.get("notes", ""),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.site_visits.insert_one(visit_doc)
    created = await db.site_visits.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{visit_id}")
async def update_site_visit(visit_id: str, payload: dict):
    existing = await db.site_visits.find_one({"_id": ObjectId(visit_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Site visit not found")
    
    updates = {
        "preferred_visit_date": payload.get("preferred_visit_date", existing.get("preferred_visit_date")),
        "preferred_time_window": payload.get("preferred_time_window", existing.get("preferred_time_window")),
        "status": payload.get("status", existing.get("status")),
        "assigned_technician_id": payload.get("assigned_technician_id", existing.get("assigned_technician_id")),
        "assigned_technician_name": payload.get("assigned_technician_name", existing.get("assigned_technician_name")),
        "visit_notes": payload.get("visit_notes", existing.get("visit_notes", "")),
        "fee_paid": bool(payload.get("fee_paid", existing.get("fee_paid", False))),
        "updated_at": datetime.now(timezone.utc),
    }
    
    if payload.get("status") == "completed" and existing.get("status") != "completed":
        updates["visit_completed_at"] = datetime.now(timezone.utc)
    
    await db.site_visits.update_one({"_id": ObjectId(visit_id)}, {"$set": updates})
    updated = await db.site_visits.find_one({"_id": ObjectId(visit_id)})
    return serialize_doc(updated)


@router.post("/{visit_id}/generate-quote")
async def generate_quote_from_visit(visit_id: str, payload: dict):
    """Generate a quote after site visit is completed"""
    visit = await db.site_visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")
    
    if visit.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Site visit must be completed before generating quote")
    
    # Create a quote document
    quote_doc = {
        "source": "site_visit",
        "site_visit_id": str(visit["_id"]),
        "customer_id": visit.get("customer_id"),
        "customer_email": visit.get("customer_email"),
        "service_key": visit.get("service_key"),
        "service_name": visit.get("service_name"),
        "items": payload.get("items", []),
        "subtotal": float(payload.get("subtotal", 0) or 0),
        "tax": float(payload.get("tax", 0) or 0),
        "total": float(payload.get("total", 0) or 0),
        "notes": payload.get("notes", ""),
        "valid_until": payload.get("valid_until"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.quotes.insert_one(quote_doc)
    
    # Update site visit to reference the quote
    await db.site_visits.update_one(
        {"_id": ObjectId(visit_id)},
        {"$set": {
            "quote_generated": True,
            "quote_id": str(result.inserted_id),
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    
    created_quote = await db.quotes.find_one({"_id": result.inserted_id})
    return serialize_doc(created_quote)
