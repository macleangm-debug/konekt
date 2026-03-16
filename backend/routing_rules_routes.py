"""
Routing Rules Routes
Partner routing rules by geography
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/routing-rules", tags=["Routing Rules"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("")
async def list_routing_rules(country_code: str = None, limit: int = 300):
    """List routing rules with optional filters."""
    query = {}
    if country_code:
        query["country_code"] = country_code.upper()
    docs = await db.routing_rules.find(query).sort("country_code", 1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{rule_id}")
async def get_routing_rule(rule_id: str):
    """Get a specific routing rule."""
    doc = await db.routing_rules.find_one({"_id": ObjectId(rule_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Routing rule not found")
    return serialize_doc(doc)


@router.post("")
async def create_routing_rule(payload: dict):
    """Create a routing rule."""
    doc = {
        "country_code": payload.get("country_code", "").upper(),
        "region": payload.get("region"),  # Optional, None = all regions
        "category": payload.get("category"),  # Optional, None = all categories
        "priority_mode": payload.get("priority_mode", "lead_time"),  # lead_time | margin | preferred_partner | cost
        "preferred_partner_id": payload.get("preferred_partner_id"),
        "fallback_allowed": bool(payload.get("fallback_allowed", True)),
        "internal_first": bool(payload.get("internal_first", True)),  # Try internal stock before partners
        "notes": payload.get("notes", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.routing_rules.insert_one(doc)
    created = await db.routing_rules.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{rule_id}")
async def update_routing_rule(rule_id: str, payload: dict):
    """Update a routing rule."""
    existing = await db.routing_rules.find_one({"_id": ObjectId(rule_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Routing rule not found")

    update_data = {
        "country_code": payload.get("country_code", existing.get("country_code", "")).upper(),
        "region": payload.get("region", existing.get("region")),
        "category": payload.get("category", existing.get("category")),
        "priority_mode": payload.get("priority_mode", existing.get("priority_mode")),
        "preferred_partner_id": payload.get("preferred_partner_id", existing.get("preferred_partner_id")),
        "fallback_allowed": bool(payload.get("fallback_allowed", existing.get("fallback_allowed", True))),
        "internal_first": bool(payload.get("internal_first", existing.get("internal_first", True))),
        "notes": payload.get("notes", existing.get("notes")),
        "is_active": payload.get("is_active", existing.get("is_active")),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.routing_rules.update_one({"_id": ObjectId(rule_id)}, {"$set": update_data})
    updated = await db.routing_rules.find_one({"_id": ObjectId(rule_id)})
    return serialize_doc(updated)


@router.delete("/{rule_id}")
async def delete_routing_rule(rule_id: str):
    """Delete a routing rule."""
    result = await db.routing_rules.delete_one({"_id": ObjectId(rule_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Routing rule not found")
    return {"message": "Routing rule deleted successfully"}
