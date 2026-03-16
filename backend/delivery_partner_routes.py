"""
Delivery Partner Routes - Management of delivery/logistics partners
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/delivery-partners", tags=["Delivery Partners"])

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
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("")
async def list_delivery_partners(country_code: str = None, status: str = None):
    query = {}
    if country_code:
        query["country_code"] = country_code
    if status:
        query["status"] = status
    docs = await db.delivery_partners.find(query).sort("created_at", -1).to_list(length=300)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{partner_id}")
async def get_delivery_partner(partner_id: str):
    doc = await db.delivery_partners.find_one({"_id": ObjectId(partner_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    return serialize_doc(doc)


@router.post("")
async def create_delivery_partner(payload: dict):
    doc = {
        "name": payload.get("name"),
        "code": payload.get("code", ""),
        "contact_person": payload.get("contact_person"),
        "email": payload.get("email"),
        "phone": payload.get("phone"),
        "country_code": payload.get("country_code"),
        "regions": payload.get("regions", []),
        "vehicle_types": payload.get("vehicle_types", []),
        "service_types": payload.get("service_types", []),
        "base_rate": float(payload.get("base_rate", 0) or 0),
        "rate_per_km": float(payload.get("rate_per_km", 0) or 0),
        "api_integration": payload.get("api_integration", None),
        "status": payload.get("status", "active"),
        "notes": payload.get("notes", ""),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.delivery_partners.insert_one(doc)
    created = await db.delivery_partners.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{partner_id}")
async def update_delivery_partner(partner_id: str, payload: dict):
    existing = await db.delivery_partners.find_one({"_id": ObjectId(partner_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    updates = {
        "name": payload.get("name", existing.get("name")),
        "code": payload.get("code", existing.get("code", "")),
        "contact_person": payload.get("contact_person", existing.get("contact_person")),
        "email": payload.get("email", existing.get("email")),
        "phone": payload.get("phone", existing.get("phone")),
        "regions": payload.get("regions", existing.get("regions", [])),
        "vehicle_types": payload.get("vehicle_types", existing.get("vehicle_types", [])),
        "service_types": payload.get("service_types", existing.get("service_types", [])),
        "base_rate": float(payload.get("base_rate", existing.get("base_rate", 0)) or 0),
        "rate_per_km": float(payload.get("rate_per_km", existing.get("rate_per_km", 0)) or 0),
        "status": payload.get("status", existing.get("status", "active")),
        "notes": payload.get("notes", existing.get("notes", "")),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.delivery_partners.update_one({"_id": ObjectId(partner_id)}, {"$set": updates})
    updated = await db.delivery_partners.find_one({"_id": ObjectId(partner_id)})
    return serialize_doc(updated)


@router.delete("/{partner_id}")
async def delete_delivery_partner(partner_id: str):
    result = await db.delivery_partners.delete_one({"_id": ObjectId(partner_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    return {"deleted": True}


@router.get("/for-region/{country_code}/{region}")
async def get_delivery_partners_for_region(country_code: str, region: str):
    """Get delivery partners available in a specific region"""
    query = {
        "country_code": country_code,
        "status": "active",
    }
    
    docs = await db.delivery_partners.find(query).to_list(length=100)
    
    # Filter by region
    result = []
    for doc in docs:
        regions = doc.get("regions", [])
        if not regions or region in regions:
            result.append(serialize_doc(doc))
    
    return result
