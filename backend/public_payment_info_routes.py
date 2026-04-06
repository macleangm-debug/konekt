"""Public Payment Info — returns bank details and VAT rate for customer-facing pages"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from services.checkout_totals_service import get_vat_percent

MONGO_URL = os.environ.get("MONGO_URL", "")
DB_NAME = os.environ.get("DB_NAME", "konekt")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/api/public", tags=["Public"])


@router.get("/payment-info")
async def get_payment_info():
    vat = await get_vat_percent(db)
    return {
        "bank_name": os.environ.get("BANK_NAME", ""),
        "account_name": os.environ.get("BANK_ACCOUNT_NAME", ""),
        "account_number": os.environ.get("BANK_ACCOUNT_NUMBER", ""),
        "branch": os.environ.get("BANK_BRANCH", ""),
        "swift_code": os.environ.get("BANK_SWIFT_CODE", ""),
        "currency": os.environ.get("BANK_CURRENCY", "TZS"),
        "vat_percent": vat,
    }
