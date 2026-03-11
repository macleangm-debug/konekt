"""
Konekt Company Settings Routes
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient
from quote_models import CompanySettings

router = APIRouter(prefix="/api/admin/settings", tags=["Admin Settings"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
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


@router.get("/company")
async def get_company_settings():
    """Get company settings for branding"""
    doc = await db.company_settings.find_one({})
    if not doc:
        return {
            "company_name": "Konekt Limited",
            "logo_url": "",
            "email": "",
            "phone": "",
            "website": "",
            "address_line_1": "",
            "address_line_2": "",
            "city": "",
            "country": "",
            "tax_number": "",
            "currency": "TZS",
            "bank_name": "",
            "bank_account_name": "",
            "bank_account_number": "",
            "bank_branch": "",
            "swift_code": "",
            "payment_instructions": "",
            "invoice_terms": "",
            "quote_terms": "",
        }
    return serialize_doc(doc)


@router.put("/company")
async def upsert_company_settings(payload: CompanySettings):
    """Create or update company settings"""
    existing = await db.company_settings.find_one({})
    now = datetime.now(timezone.utc)

    if existing:
        await db.company_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": {**payload.model_dump(), "updated_at": now.isoformat()}}
        )
        updated = await db.company_settings.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)

    doc = payload.model_dump()
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    result = await db.company_settings.insert_one(doc)
    created = await db.company_settings.find_one({"_id": result.inserted_id})
    return serialize_doc(created)
