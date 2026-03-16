"""
Country Pricing Routes
Country-specific markup and pricing rules
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/country-pricing", tags=["Country Pricing"])

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
async def list_country_pricing(country_code: str = None, limit: int = 300):
    """List country pricing rules."""
    query = {}
    if country_code:
        query["country_code"] = country_code.upper()
    docs = await db.country_pricing_rules.find(query).sort("country_code", 1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{rule_id}")
async def get_country_pricing_rule(rule_id: str):
    """Get a specific pricing rule."""
    doc = await db.country_pricing_rules.find_one({"_id": ObjectId(rule_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return serialize_doc(doc)


@router.post("")
async def create_or_update_country_pricing(payload: dict):
    """Create or update a country pricing rule."""
    country_code = payload.get("country_code", "").upper()
    category = payload.get("category", "default")

    if not country_code:
        raise HTTPException(status_code=400, detail="country_code is required")

    existing = await db.country_pricing_rules.find_one({
        "country_code": country_code,
        "category": category,
    })

    doc = {
        "country_code": country_code,
        "category": category,
        "markup_type": payload.get("markup_type", "percentage"),  # percentage | fixed
        "markup_value": float(payload.get("markup_value", 0) or 0),
        "currency": payload.get("currency"),
        "min_markup": float(payload.get("min_markup", 0) or 0),
        "max_markup": float(payload.get("max_markup", 0) or 0) or None,
        "tax_rate": float(payload.get("tax_rate", 0) or 0),  # VAT etc.
        "is_active": payload.get("is_active", True),
        "updated_at": datetime.now(timezone.utc),
    }

    if existing:
        await db.country_pricing_rules.update_one({"_id": existing["_id"]}, {"$set": doc})
        updated = await db.country_pricing_rules.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)

    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.country_pricing_rules.insert_one(doc)
    created = await db.country_pricing_rules.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/{rule_id}")
async def delete_country_pricing_rule(rule_id: str):
    """Delete a pricing rule."""
    result = await db.country_pricing_rules.delete_one({"_id": ObjectId(rule_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return {"message": "Pricing rule deleted successfully"}
