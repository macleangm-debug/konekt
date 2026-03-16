"""
Geography Routes
Countries and regions management
"""
from datetime import datetime, timezone
from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient
from geography_defaults import DEFAULT_COUNTRIES

router = APIRouter(prefix="/api/geography", tags=["Geography"])

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


@router.post("/seed")
async def seed_geography():
    """Seed default countries and regions."""
    count = await db.countries.count_documents({})
    if count == 0:
        for item in DEFAULT_COUNTRIES:
            await db.countries.insert_one({
                **item,
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })

    docs = await db.countries.find({}).sort("name", 1).to_list(length=200)
    return [serialize_doc(doc) for doc in docs]


@router.get("/countries")
async def get_countries(active_only: bool = True):
    """Get all countries."""
    query = {"is_active": True} if active_only else {}
    docs = await db.countries.find(query).sort("name", 1).to_list(length=200)
    return [serialize_doc(doc) for doc in docs]


@router.get("/regions/{country_code}")
async def get_regions(country_code: str):
    """Get regions for a country."""
    country = await db.countries.find_one({"code": country_code.upper(), "is_active": True})
    if not country:
        return []
    return country.get("regions", [])


@router.get("/country/{country_code}")
async def get_country(country_code: str):
    """Get country details by code."""
    country = await db.countries.find_one({"code": country_code.upper()})
    if not country:
        return None
    return serialize_doc(country)
