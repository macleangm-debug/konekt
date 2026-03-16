"""
Partner Capability Routes - Mapping partners to services they can provide
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/partner-capabilities", tags=["Partner Capabilities"])

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
async def list_partner_capabilities(partner_id: str = None, service_key: str = None):
    query = {}
    if partner_id:
        query["partner_id"] = partner_id
    if service_key:
        query["service_key"] = service_key
    docs = await db.partner_capabilities.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{capability_id}")
async def get_partner_capability(capability_id: str):
    doc = await db.partner_capabilities.find_one({"_id": ObjectId(capability_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Partner capability not found")
    return serialize_doc(doc)


@router.post("")
async def create_partner_capability(payload: dict):
    partner = await db.partners.find_one({"_id": ObjectId(payload.get("partner_id"))})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    service = await db.service_types.find_one({"key": payload.get("service_key")})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    doc = {
        "partner_id": str(partner["_id"]),
        "partner_name": partner.get("name"),
        "service_key": service.get("key"),
        "service_name": service.get("name"),
        "country_code": payload.get("country_code"),
        "regions": payload.get("regions", []),
        "capacity_per_week": int(payload.get("capacity_per_week", 0) or 0),
        "priority_weight": int(payload.get("priority_weight", 0) or 0),
        "lead_time_days": int(payload.get("lead_time_days", 3) or 3),
        "status": payload.get("status", "active"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.partner_capabilities.insert_one(doc)
    created = await db.partner_capabilities.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{capability_id}")
async def update_partner_capability(capability_id: str, payload: dict):
    existing = await db.partner_capabilities.find_one({"_id": ObjectId(capability_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Partner capability not found")
    
    updates = {
        "regions": payload.get("regions", existing.get("regions", [])),
        "capacity_per_week": int(payload.get("capacity_per_week", existing.get("capacity_per_week", 0)) or 0),
        "priority_weight": int(payload.get("priority_weight", existing.get("priority_weight", 0)) or 0),
        "lead_time_days": int(payload.get("lead_time_days", existing.get("lead_time_days", 3)) or 3),
        "status": payload.get("status", existing.get("status", "active")),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.partner_capabilities.update_one({"_id": ObjectId(capability_id)}, {"$set": updates})
    updated = await db.partner_capabilities.find_one({"_id": ObjectId(capability_id)})
    return serialize_doc(updated)


@router.delete("/{capability_id}")
async def delete_partner_capability(capability_id: str):
    result = await db.partner_capabilities.delete_one({"_id": ObjectId(capability_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner capability not found")
    return {"deleted": True}


@router.get("/for-service/{service_key}")
async def get_capable_partners_for_service(service_key: str, country_code: str = None, region: str = None):
    """Get all partners capable of providing a specific service"""
    query = {"service_key": service_key, "status": "active"}
    if country_code:
        query["country_code"] = country_code
    
    docs = await db.partner_capabilities.find(query).to_list(length=100)
    
    # Filter by region if provided
    result = []
    for doc in docs:
        if region:
            regions = doc.get("regions", [])
            if regions and region not in regions:
                continue
        result.append(serialize_doc(doc))
    
    return result
