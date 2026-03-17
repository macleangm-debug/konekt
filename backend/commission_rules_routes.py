"""
Commission Rules Engine
Configurable margin distribution by scope (service_group, product_group, country)
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/commission-rules", tags=["Commission Rules"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


@router.get("")
async def list_commission_rules():
    """List all commission rules."""
    docs = await db.commission_rules.find({}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{rule_id}")
async def get_commission_rule(rule_id: str):
    """Get a single commission rule."""
    doc = await db.commission_rules.find_one({"_id": ObjectId(rule_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Commission rule not found")
    return serialize_doc(doc)


@router.post("")
async def create_commission_rule(payload: dict):
    """Create a new commission rule."""
    now = datetime.now(timezone.utc).isoformat()

    # Validate total doesn't exceed 100%
    total = sum([
        float(payload.get("protected_margin_percent", 0) or 0),
        float(payload.get("sales_percent", 0) or 0),
        float(payload.get("affiliate_percent", 0) or 0),
        float(payload.get("promo_percent", 0) or 0),
        float(payload.get("buffer_percent", 0) or 0),
    ])

    if total > 100:
        raise HTTPException(status_code=400, detail="Commission rule percentages exceed 100% of margin")

    doc = {
        "name": payload.get("name", ""),
        "scope_type": payload.get("scope_type", "service_group"),  # service_group | product_group | country | default
        "scope_value": payload.get("scope_value"),
        "country_code": payload.get("country_code"),
        "protected_margin_percent": float(payload.get("protected_margin_percent", 40) or 40),
        "sales_percent": float(payload.get("sales_percent", 20) or 20),
        "affiliate_percent": float(payload.get("affiliate_percent", 15) or 15),
        "promo_percent": float(payload.get("promo_percent", 15) or 15),
        "buffer_percent": float(payload.get("buffer_percent", 10) or 10),
        "is_active": bool(payload.get("is_active", True)),
        "created_at": now,
        "updated_at": now,
    }

    result = await db.commission_rules.insert_one(doc)
    created = await db.commission_rules.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{rule_id}")
async def update_commission_rule(rule_id: str, payload: dict):
    """Update a commission rule."""
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.commission_rules.find_one({"_id": ObjectId(rule_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Commission rule not found")

    # Validate total doesn't exceed 100%
    total = sum([
        float(payload.get("protected_margin_percent", existing.get("protected_margin_percent", 0)) or 0),
        float(payload.get("sales_percent", existing.get("sales_percent", 0)) or 0),
        float(payload.get("affiliate_percent", existing.get("affiliate_percent", 0)) or 0),
        float(payload.get("promo_percent", existing.get("promo_percent", 0)) or 0),
        float(payload.get("buffer_percent", existing.get("buffer_percent", 0)) or 0),
    ])

    if total > 100:
        raise HTTPException(status_code=400, detail="Commission rule percentages exceed 100% of margin")

    update = {
        "name": payload.get("name", existing.get("name")),
        "scope_type": payload.get("scope_type", existing.get("scope_type")),
        "scope_value": payload.get("scope_value", existing.get("scope_value")),
        "country_code": payload.get("country_code", existing.get("country_code")),
        "protected_margin_percent": float(payload.get("protected_margin_percent", existing.get("protected_margin_percent")) or 0),
        "sales_percent": float(payload.get("sales_percent", existing.get("sales_percent")) or 0),
        "affiliate_percent": float(payload.get("affiliate_percent", existing.get("affiliate_percent")) or 0),
        "promo_percent": float(payload.get("promo_percent", existing.get("promo_percent")) or 0),
        "buffer_percent": float(payload.get("buffer_percent", existing.get("buffer_percent")) or 0),
        "is_active": bool(payload.get("is_active", existing.get("is_active"))),
        "updated_at": now,
    }

    await db.commission_rules.update_one({"_id": ObjectId(rule_id)}, {"$set": update})
    updated = await db.commission_rules.find_one({"_id": ObjectId(rule_id)})
    return serialize_doc(updated)


@router.delete("/{rule_id}")
async def delete_commission_rule(rule_id: str):
    """Delete a commission rule."""
    result = await db.commission_rules.delete_one({"_id": ObjectId(rule_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commission rule not found")
    return {"message": "Commission rule deleted"}
