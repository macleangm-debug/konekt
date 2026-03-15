"""
Affiliate Settings Routes
Admin configuration for affiliate program
"""
from datetime import datetime
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

from affiliate_settings_defaults import DEFAULT_AFFILIATE_SETTINGS

router = APIRouter(prefix="/api/admin/affiliate-settings", tags=["Affiliate Settings"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("")
async def get_affiliate_settings():
    doc = await db.affiliate_settings.find_one({})

    if not doc:
        await db.affiliate_settings.insert_one(
            {
                **DEFAULT_AFFILIATE_SETTINGS,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        )
        doc = await db.affiliate_settings.find_one({})

    return serialize_doc(doc)


@router.put("")
async def update_affiliate_settings(payload: dict):
    existing = await db.affiliate_settings.find_one({})

    if not existing:
        await db.affiliate_settings.insert_one(
            {
                **DEFAULT_AFFILIATE_SETTINGS,
                **payload,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        )
    else:
        await db.affiliate_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": {**payload, "updated_at": datetime.utcnow()}},
        )

    updated = await db.affiliate_settings.find_one({})
    return serialize_doc(updated)
