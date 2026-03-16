"""
Service Catalog Routes - Admin management of service groups and types
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/service-catalog", tags=["Service Catalog"])

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


@router.get("/groups")
async def list_service_groups():
    docs = await db.service_groups.find({}).sort("sort_order", 1).to_list(length=300)
    return [serialize_doc(doc) for doc in docs]


@router.post("/groups")
async def create_service_group(payload: dict):
    doc = {
        "key": payload.get("key"),
        "name": payload.get("name"),
        "description": payload.get("description", ""),
        "icon": payload.get("icon", ""),
        "sort_order": int(payload.get("sort_order", 0) or 0),
        "is_active": bool(payload.get("is_active", True)),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.service_groups.insert_one(doc)
    created = await db.service_groups.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/groups/{group_id}")
async def update_service_group(group_id: str, payload: dict):
    existing = await db.service_groups.find_one({"_id": ObjectId(group_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Service group not found")
    
    updates = {
        "name": payload.get("name", existing.get("name")),
        "description": payload.get("description", existing.get("description", "")),
        "icon": payload.get("icon", existing.get("icon", "")),
        "sort_order": int(payload.get("sort_order", existing.get("sort_order", 0)) or 0),
        "is_active": bool(payload.get("is_active", existing.get("is_active", True))),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.service_groups.update_one({"_id": ObjectId(group_id)}, {"$set": updates})
    updated = await db.service_groups.find_one({"_id": ObjectId(group_id)})
    return serialize_doc(updated)


@router.delete("/groups/{group_id}")
async def delete_service_group(group_id: str):
    result = await db.service_groups.delete_one({"_id": ObjectId(group_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service group not found")
    return {"deleted": True}


@router.get("/types")
async def list_service_types(group_key: str = None):
    query = {}
    if group_key:
        query["group_key"] = group_key
    docs = await db.service_types.find(query).sort("sort_order", 1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.post("/types")
async def create_service_type(payload: dict):
    group = await db.service_groups.find_one({"key": payload.get("group_key")})
    if not group:
        raise HTTPException(status_code=404, detail="Service group not found")

    doc = {
        "group_key": payload.get("group_key"),
        "key": payload.get("key"),
        "slug": payload.get("slug"),
        "name": payload.get("name"),
        "short_description": payload.get("short_description", ""),
        "description": payload.get("description", ""),
        "service_mode": payload.get("service_mode", "quote_request"),
        "partner_required": bool(payload.get("partner_required", False)),
        "delivery_required": bool(payload.get("delivery_required", False)),
        "site_visit_required": bool(payload.get("site_visit_required", False)),
        "has_product_blanks": bool(payload.get("has_product_blanks", False)),
        "pricing_mode": payload.get("pricing_mode", "quote"),
        "visit_fee": float(payload.get("visit_fee", 0) or 0),
        "base_price": float(payload.get("base_price", 0) or 0),
        "icon": payload.get("icon", ""),
        "sort_order": int(payload.get("sort_order", 0) or 0),
        "is_active": bool(payload.get("is_active", True)),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.service_types.insert_one(doc)
    created = await db.service_types.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/types/{type_id}")
async def update_service_type(type_id: str, payload: dict):
    existing = await db.service_types.find_one({"_id": ObjectId(type_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Service type not found")
    
    updates = {
        "name": payload.get("name", existing.get("name")),
        "short_description": payload.get("short_description", existing.get("short_description", "")),
        "description": payload.get("description", existing.get("description", "")),
        "service_mode": payload.get("service_mode", existing.get("service_mode", "quote_request")),
        "partner_required": bool(payload.get("partner_required", existing.get("partner_required", False))),
        "delivery_required": bool(payload.get("delivery_required", existing.get("delivery_required", False))),
        "site_visit_required": bool(payload.get("site_visit_required", existing.get("site_visit_required", False))),
        "has_product_blanks": bool(payload.get("has_product_blanks", existing.get("has_product_blanks", False))),
        "pricing_mode": payload.get("pricing_mode", existing.get("pricing_mode", "quote")),
        "visit_fee": float(payload.get("visit_fee", existing.get("visit_fee", 0)) or 0),
        "base_price": float(payload.get("base_price", existing.get("base_price", 0)) or 0),
        "icon": payload.get("icon", existing.get("icon", "")),
        "sort_order": int(payload.get("sort_order", existing.get("sort_order", 0)) or 0),
        "is_active": bool(payload.get("is_active", existing.get("is_active", True))),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.service_types.update_one({"_id": ObjectId(type_id)}, {"$set": updates})
    updated = await db.service_types.find_one({"_id": ObjectId(type_id)})
    return serialize_doc(updated)


@router.delete("/types/{type_id}")
async def delete_service_type(type_id: str):
    result = await db.service_types.delete_one({"_id": ObjectId(type_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service type not found")
    return {"deleted": True}
