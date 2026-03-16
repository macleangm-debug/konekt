"""
Business Settings Routes
Canonical settings for company data, commercial defaults, banking, and inventory
"""
from datetime import datetime
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/business-settings", tags=["Business Settings"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


DEFAULT_SETTINGS = {
    "company_name": "",
    "company_logo_path": "",
    "tax_name": "VAT",
    "tax_number": "",
    "business_registration_number": "",
    "address_line_1": "",
    "address_line_2": "",
    "city": "",
    "country": "Tanzania",
    "email": "",
    "phone": "",
    "website": "",

    "currency": "TZS",
    "default_tax_rate": 0,
    "default_payment_terms": "Due on receipt",
    "default_document_note": "",
    "payment_instructions": "",

    "bank_name": "",
    "bank_account_name": "",
    "bank_account_number": "",
    "bank_branch": "",
    "bank_swift_code": "",

    "sku_prefix": "KNK",
    "sku_separator": "-",
    "sku_next_number": 1,

    "low_stock_threshold": 5,
    "default_warehouse_id": "",
    "default_warehouse_name": "",

    "quote_collection_mode": "v2",
    "invoice_collection_mode": "v2",

    "created_at": None,
    "updated_at": None,
}


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("")
async def get_business_settings():
    doc = await db.business_settings.find_one({})

    if not doc:
        seed = {
            **DEFAULT_SETTINGS,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await db.business_settings.insert_one(seed)
        doc = await db.business_settings.find_one({})

    return serialize_doc(doc)


@router.put("")
async def update_business_settings(payload: dict):
    existing = await db.business_settings.find_one({})

    clean_payload = {k: v for k, v in payload.items() if k in DEFAULT_SETTINGS and k not in {"created_at"}}

    if not existing:
        doc = {
            **DEFAULT_SETTINGS,
            **clean_payload,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await db.business_settings.insert_one(doc)
    else:
        await db.business_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": {**clean_payload, "updated_at": datetime.utcnow()}},
        )

    updated = await db.business_settings.find_one({})
    return serialize_doc(updated)
