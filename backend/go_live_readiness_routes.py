"""
Go-Live Readiness Routes
Hard checks before production deployment
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/go-live-readiness", tags=["Go Live Readiness"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("")
async def get_go_live_readiness():
    settings = await db.business_settings.find_one({}) or {}

    checks = {
        "company_name": bool(settings.get("company_name")),
        "logo": bool(settings.get("company_logo_path")),
        "tax_number": bool(settings.get("tax_number")),
        "business_registration_number": bool(settings.get("business_registration_number")),
        "company_email": bool(settings.get("email")),
        "company_phone": bool(settings.get("phone")),
        "address": bool(settings.get("address_line_1")),
        "currency": bool(settings.get("currency")),
        "tax_rate": settings.get("default_tax_rate") is not None,
        "payment_terms": bool(settings.get("default_payment_terms")),
        "bank_name": bool(settings.get("bank_name")),
        "bank_account_name": bool(settings.get("bank_account_name")),
        "bank_account_number": bool(settings.get("bank_account_number")),
        "sku_prefix": bool(settings.get("sku_prefix")),
        "resend_key": bool(os.getenv("RESEND_API_KEY")),
        "sender_email": bool(os.getenv("SENDER_EMAIL")),
        "kwikpay_base_url": bool(os.getenv("KWIKPAY_BASE_URL")),
        "kwikpay_api_key": bool(os.getenv("KWIKPAY_API_KEY")),
        "kwikpay_secret": bool(os.getenv("KWIKPAY_API_SECRET")),
    }

    score = sum(1 for v in checks.values() if v)
    total = len(checks)

    return {
        "status": "ready" if score == total else "needs_attention",
        "score": score,
        "total": total,
        "checks": checks,
    }
