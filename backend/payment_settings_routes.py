"""
Payment Settings Routes
Admin endpoint for country-level payment configuration
Supports: GET (list all), POST (create/update)
"""
import os
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin/payment-settings", tags=["Payment Settings"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt_db')]


class PaymentSettingsCreate(BaseModel):
    country_code: str
    currency: str
    bank_transfer_enabled: bool = True
    kwikpay_enabled: bool = False
    mobile_money_enabled: bool = False
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    branch: Optional[str] = None
    swift_code: Optional[str] = None
    payment_instructions: Optional[str] = None


def serialize_doc(doc):
    """Serialize MongoDB document"""
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("")
async def list_payment_settings():
    """List all payment settings by country"""
    docs = await db.payment_settings.find({}).sort("country_code", 1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_or_update_payment_settings(data: PaymentSettingsCreate):
    """Create or update payment settings for a country"""
    now = datetime.utcnow()
    
    # Check if settings exist for this country
    existing = await db.payment_settings.find_one({"country_code": data.country_code})
    
    settings_data = {
        "country_code": data.country_code,
        "currency": data.currency,
        "bank_transfer_enabled": data.bank_transfer_enabled,
        "kwikpay_enabled": data.kwikpay_enabled,
        "mobile_money_enabled": data.mobile_money_enabled,
        "bank_name": data.bank_name,
        "account_name": data.account_name,
        "account_number": data.account_number,
        "branch": data.branch,
        "swift_code": data.swift_code,
        "payment_instructions": data.payment_instructions,
        "updated_at": now,
    }
    
    if existing:
        # Update existing
        await db.payment_settings.update_one(
            {"country_code": data.country_code},
            {"$set": settings_data}
        )
        return {"message": "Payment settings updated", "country_code": data.country_code}
    else:
        # Create new
        settings_data["created_at"] = now
        result = await db.payment_settings.insert_one(settings_data)
        return {"message": "Payment settings created", "country_code": data.country_code, "id": str(result.inserted_id)}


@router.get("/{country_code}")
async def get_payment_settings(country_code: str):
    """Get payment settings for a specific country"""
    doc = await db.payment_settings.find_one({"country_code": country_code.upper()})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No payment settings found for {country_code}")
    return serialize_doc(doc)


@router.delete("/{country_code}")
async def delete_payment_settings(country_code: str):
    """Delete payment settings for a country"""
    result = await db.payment_settings.delete_one({"country_code": country_code.upper()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"No payment settings found for {country_code}")
    return {"message": "Payment settings deleted", "country_code": country_code}
