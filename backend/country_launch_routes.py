"""
Country Launch Configuration Routes
Manage country availability, waitlist, and partner recruitment
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

router = APIRouter(prefix="/api/admin/country-launch", tags=["Country Launch"])

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
async def list_country_launch_configs():
    """List all country launch configurations"""
    docs = await db.country_launch_configs.find({}).sort("country_code", 1).to_list(length=300)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_or_update_country_launch_config(payload: dict):
    """Create or update country launch configuration"""
    country_code = (payload.get("country_code") or "").upper()
    if not country_code:
        raise HTTPException(status_code=400, detail="country_code is required")

    existing = await db.country_launch_configs.find_one({"country_code": country_code})

    doc = {
        "country_code": country_code,
        "country_name": payload.get("country_name"),
        "currency": payload.get("currency"),
        "status": payload.get("status", "coming_soon"),  # live | coming_soon | partner_recruitment | not_available
        "waitlist_enabled": bool(payload.get("waitlist_enabled", True)),
        "partner_recruitment_enabled": bool(payload.get("partner_recruitment_enabled", False)),
        "headline": payload.get("headline", ""),
        "message": payload.get("message", ""),
        "launch_date": payload.get("launch_date"),
        "updated_at": datetime.now(timezone.utc),
    }

    if existing:
        await db.country_launch_configs.update_one({"_id": existing["_id"]}, {"$set": doc})
        updated = await db.country_launch_configs.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)

    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.country_launch_configs.insert_one(doc)
    created = await db.country_launch_configs.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/{country_code}")
async def get_country_launch_config(country_code: str):
    """Get specific country launch configuration"""
    doc = await db.country_launch_configs.find_one({"country_code": country_code.upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Country configuration not found")
    return serialize_doc(doc)


@router.delete("/{country_code}")
async def delete_country_launch_config(country_code: str):
    """Delete country launch configuration"""
    result = await db.country_launch_configs.delete_one({"country_code": country_code.upper()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Country configuration not found")
    return {"message": "Country configuration deleted"}


@router.get("/public/{country_code}")
async def public_country_launch_config(country_code: str):
    """Public endpoint - get country availability status"""
    doc = await db.country_launch_configs.find_one({"country_code": country_code.upper()})
    
    if not doc:
        # Check if country exists in geography
        country = await db.countries.find_one({"code": country_code.upper()})
        return {
            "country_code": country_code.upper(),
            "country_name": (country or {}).get("name", country_code.upper()),
            "currency": (country or {}).get("currency"),
            "status": "not_available",
            "waitlist_enabled": True,
            "partner_recruitment_enabled": True,
            "headline": "Konekt is not live in your country yet",
            "message": "Join the waitlist or apply to become a local operating partner.",
        }
    
    return serialize_doc(doc)
