"""
Negotiated Pricing Routes - Customer-specific pricing rules
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/negotiated-pricing", tags=["Negotiated Pricing"])

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
async def list_negotiated_pricing(customer_id: str = None, pricing_scope: str = None):
    """List negotiated pricing rules"""
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if pricing_scope:
        query["pricing_scope"] = pricing_scope
    docs = await db.negotiated_pricing.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{pricing_id}")
async def get_negotiated_pricing(pricing_id: str):
    """Get a specific pricing rule"""
    doc = await db.negotiated_pricing.find_one({"_id": ObjectId(pricing_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return serialize_doc(doc)


@router.post("")
async def create_negotiated_pricing(payload: dict):
    """Create a new negotiated pricing rule"""
    doc = {
        "customer_id": payload.get("customer_id"),
        "pricing_scope": payload.get("pricing_scope", "sku"),  # sku | service | category
        "sku": payload.get("sku"),
        "service_key": payload.get("service_key"),
        "category": payload.get("category"),
        "price_type": payload.get("price_type", "fixed"),  # fixed | discount_percent
        "price_value": float(payload.get("price_value", 0) or 0),
        "currency": payload.get("currency", "TZS"),
        "start_date": payload.get("start_date"),
        "end_date": payload.get("end_date"),
        "min_quantity": int(payload.get("min_quantity", 1) or 1),
        "notes": payload.get("notes", ""),
        "is_active": bool(payload.get("is_active", True)),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.negotiated_pricing.insert_one(doc)
    created = await db.negotiated_pricing.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{pricing_id}")
async def update_negotiated_pricing(pricing_id: str, payload: dict):
    """Update a pricing rule"""
    existing = await db.negotiated_pricing.find_one({"_id": ObjectId(pricing_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Pricing rule not found")

    updates = {
        "pricing_scope": payload.get("pricing_scope", existing.get("pricing_scope")),
        "sku": payload.get("sku", existing.get("sku")),
        "service_key": payload.get("service_key", existing.get("service_key")),
        "category": payload.get("category", existing.get("category")),
        "price_type": payload.get("price_type", existing.get("price_type")),
        "price_value": float(payload.get("price_value", existing.get("price_value", 0)) or 0),
        "currency": payload.get("currency", existing.get("currency")),
        "start_date": payload.get("start_date", existing.get("start_date")),
        "end_date": payload.get("end_date", existing.get("end_date")),
        "min_quantity": int(payload.get("min_quantity", existing.get("min_quantity", 1)) or 1),
        "notes": payload.get("notes", existing.get("notes")),
        "is_active": bool(payload.get("is_active", existing.get("is_active", True))),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.negotiated_pricing.update_one({"_id": ObjectId(pricing_id)}, {"$set": updates})
    updated = await db.negotiated_pricing.find_one({"_id": ObjectId(pricing_id)})
    return serialize_doc(updated)


@router.delete("/{pricing_id}")
async def delete_negotiated_pricing(pricing_id: str):
    """Delete a pricing rule"""
    result = await db.negotiated_pricing.delete_one({"_id": ObjectId(pricing_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return {"deleted": True}
