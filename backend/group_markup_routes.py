"""
Group Markup Settings Routes
Manage markup by product group, service group, and country.
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/group-markup", tags=["Group Markup"])

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
async def list_group_markup_settings(country_code: str = None):
    """List all group markup settings."""
    query = {}
    if country_code:
        query["country_code"] = country_code
    
    docs = await db.group_markup_settings.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{setting_id}")
async def get_group_markup_setting(setting_id: str):
    """Get a specific markup setting."""
    doc = await db.group_markup_settings.find_one({"_id": ObjectId(setting_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Markup setting not found")
    return serialize_doc(doc)


@router.post("")
async def create_group_markup_setting(payload: dict):
    """Create a new group markup setting."""
    now = datetime.now(timezone.utc).isoformat()

    # Validate: either product_group or service_group, not both
    product_group = payload.get("product_group")
    service_group = payload.get("service_group")
    country_code = payload.get("country_code", "TZ")

    if product_group and service_group:
        raise HTTPException(status_code=400, detail="Specify either product_group or service_group, not both")

    # Check for duplicates
    query = {"country_code": country_code}
    if product_group:
        query["product_group"] = product_group
    if service_group:
        query["service_group"] = service_group

    existing = await db.group_markup_settings.find_one(query)
    if existing:
        raise HTTPException(status_code=400, detail="Markup setting already exists for this group/country")

    doc = {
        "product_group": product_group,
        "service_group": service_group,
        "country_code": country_code,
        "markup_type": payload.get("markup_type", "percent"),  # percent | fixed
        "markup_value": float(payload.get("markup_value", 25) or 25),
        "minimum_margin_percent": float(payload.get("minimum_margin_percent", 8) or 8),
        "max_affiliate_percent": float(payload.get("max_affiliate_percent", 10) or 10),
        "max_promo_percent": float(payload.get("max_promo_percent", 15) or 15),
        "max_points_percent": float(payload.get("max_points_percent", 10) or 10),
        "affiliate_allowed": bool(payload.get("affiliate_allowed", True)),
        "is_active": bool(payload.get("is_active", True)),
        "created_at": now,
        "updated_at": now,
    }

    result = await db.group_markup_settings.insert_one(doc)
    created = await db.group_markup_settings.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{setting_id}")
async def update_group_markup_setting(setting_id: str, payload: dict):
    """Update a group markup setting."""
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.group_markup_settings.find_one({"_id": ObjectId(setting_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Markup setting not found")

    update_doc = {
        "markup_type": payload.get("markup_type", existing.get("markup_type", "percent")),
        "markup_value": float(payload.get("markup_value", existing.get("markup_value", 25)) or 25),
        "minimum_margin_percent": float(payload.get("minimum_margin_percent", existing.get("minimum_margin_percent", 8)) or 8),
        "max_affiliate_percent": float(payload.get("max_affiliate_percent", existing.get("max_affiliate_percent", 10)) or 10),
        "max_promo_percent": float(payload.get("max_promo_percent", existing.get("max_promo_percent", 15)) or 15),
        "max_points_percent": float(payload.get("max_points_percent", existing.get("max_points_percent", 10)) or 10),
        "affiliate_allowed": bool(payload.get("affiliate_allowed", existing.get("affiliate_allowed", True))),
        "is_active": bool(payload.get("is_active", existing.get("is_active", True))),
        "updated_at": now,
    }

    await db.group_markup_settings.update_one({"_id": ObjectId(setting_id)}, {"$set": update_doc})
    updated = await db.group_markup_settings.find_one({"_id": ObjectId(setting_id)})
    return serialize_doc(updated)


@router.delete("/{setting_id}")
async def delete_group_markup_setting(setting_id: str):
    """Delete a group markup setting."""
    result = await db.group_markup_settings.delete_one({"_id": ObjectId(setting_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Markup setting not found")
    return {"deleted": True}
