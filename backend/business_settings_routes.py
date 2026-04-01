"""
Business Settings Routes
Canonical settings for company data, commercial defaults, banking, and inventory.
Single source of truth for invoices, quotes, statements, and public contact.
"""
from datetime import datetime, timezone
import os
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/business-settings", tags=["Business Settings"])

security = HTTPBearer()

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "staff"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


DEFAULT_SETTINGS = {
    # Business Identity
    "company_name": "",
    "trading_name": "",
    "tin": "",
    "brn": "",
    "vrn": "",
    "company_logo_path": "",

    # Contact
    "address": "",
    "address_line_1": "",
    "address_line_2": "",
    "city": "",
    "country": "Tanzania",
    "email": "",
    "phone": "",
    "website": "",

    # Document & Tax
    "tax_name": "VAT",
    "tax_number": "",
    "business_registration_number": "",
    "currency": "TZS",
    "default_tax_rate": 0,
    "default_payment_terms": "Due on receipt",
    "default_document_note": "",
    "payment_instructions": "",

    # Banking
    "bank_name": "",
    "bank_account_name": "",
    "bank_account_number": "",
    "bank_branch": "",
    "bank_swift_code": "",

    # Inventory
    "sku_prefix": "KNK",
    "sku_separator": "-",
    "sku_next_number": 1,
    "low_stock_threshold": 5,
    "default_warehouse_id": "",
    "default_warehouse_name": "",

    # Collection modes
    "quote_collection_mode": "v2",
    "invoice_collection_mode": "v2",

    "created_at": None,
    "updated_at": None,
}


def serialize_doc(doc):
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


@router.get("")
async def get_business_settings(user: dict = Depends(get_admin_user)):
    doc = await db.business_settings.find_one({})

    if not doc:
        seed = {
            **DEFAULT_SETTINGS,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.business_settings.insert_one(seed)
        doc = await db.business_settings.find_one({})

    return serialize_doc(doc)


@router.put("")
async def update_business_settings(payload: dict, user: dict = Depends(get_admin_user)):
    existing = await db.business_settings.find_one({})

    clean_payload = {k: v for k, v in payload.items() if k in DEFAULT_SETTINGS and k not in {"created_at"}}

    if not existing:
        doc = {
            **DEFAULT_SETTINGS,
            **clean_payload,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.business_settings.insert_one(doc)
    else:
        await db.business_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": {**clean_payload, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )

    updated = await db.business_settings.find_one({})
    return serialize_doc(updated)


@router.get("/public")
async def get_public_business_info():
    """Public-facing business info for footers, contact blocks, etc. No auth required."""
    doc = await db.business_settings.find_one({}, {"_id": 0})
    if not doc:
        return {}
    return {
        "company_name": doc.get("company_name") or doc.get("trading_name") or "",
        "trading_name": doc.get("trading_name") or "",
        "phone": doc.get("phone") or "",
        "email": doc.get("email") or "",
        "address": doc.get("address") or doc.get("address_line_1") or "",
        "city": doc.get("city") or "",
        "country": doc.get("country") or "",
        "website": doc.get("website") or "",
        "tin": doc.get("tin") or doc.get("tax_number") or "",
        "brn": doc.get("brn") or doc.get("business_registration_number") or "",
        "bank_name": doc.get("bank_name") or "",
        "bank_account_name": doc.get("bank_account_name") or "",
        "bank_account_number": doc.get("bank_account_number") or "",
        "bank_branch": doc.get("bank_branch") or "",
        "swift_code": doc.get("bank_swift_code") or "",
        "logo_url": doc.get("company_logo_path") or "",
    }
