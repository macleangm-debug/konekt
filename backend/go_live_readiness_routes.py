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
        "sender_email": bool(os.getenv("SENDER_EMAIL") or os.getenv("RESEND_FROM_EMAIL")),
        "payment_gateway": bool(os.getenv("KWIKPAY_BASE_URL")) or bool(os.getenv("STRIPE_API_KEY")),
        "payment_gateway_keys": bool(os.getenv("KWIKPAY_API_KEY") or os.getenv("KWIKPAY_PUBLIC_KEY") or os.getenv("STRIPE_API_KEY")),
    }

    score = sum(1 for v in checks.values() if v)
    total = len(checks)

    return {
        "status": "ready" if score == total else "needs_attention",
        "score": score,
        "total": total,
        "checks": checks,
    }


@router.get("/audit")
async def launch_readiness_audit():
    """Comprehensive launch readiness audit"""
    settings = await db.business_settings.find_one({}) or {}
    payment_settings_count = await db.payment_settings.count_documents({})
    partner_count = await db.partners.count_documents({"status": "active"})
    service_groups_count = await db.service_groups.count_documents({"is_active": True})
    admin_count = await db.users.count_documents({"role": {"$in": ["admin", "super_admin"]}, "is_active": True})
    sales_count = await db.users.count_documents({"role": "sales", "is_active": True})
    operations_count = await db.users.count_documents({"role": "operations", "is_active": True})

    collections = await db.list_collection_names()

    return {
        "business_identity": {
            "company_name": bool(settings.get("company_name")),
            "logo_url": bool(settings.get("company_logo_path")),
            "tin": bool(settings.get("tax_number")),
            "address": bool(settings.get("address_line_1")),
            "support_email": bool(settings.get("email")),
            "phone": bool(settings.get("phone")),
        },
        "payments": {
            "payment_settings_count": payment_settings_count,
            "bank_transfer_configured": payment_settings_count > 0 or bool(settings.get("bank_account_number")),
            "kwikpay_configured": bool(os.getenv("KWIKPAY_PUBLIC_KEY")) and bool(os.getenv("KWIKPAY_SECRET_KEY")),
            "stripe_configured": bool(os.getenv("STRIPE_API_KEY")),
            "resend_configured": bool(os.getenv("RESEND_API_KEY")) and bool(os.getenv("RESEND_FROM_EMAIL")),
        },
        "operations": {
            "active_partners": partner_count,
            "active_service_groups": service_groups_count,
            "admin_accounts": admin_count,
            "sales_accounts": sales_count,
            "operations_accounts": operations_count,
        },
        "commercial": {
            "has_default_markup_rules": await db.group_markup_rules.count_documents({}) > 0 if "group_markup_rules" in collections else False,
            "has_commission_rules": await db.commission_rules.count_documents({}) > 0 if "commission_rules" in collections else False,
            "has_country_configs": await db.country_launch_configs.count_documents({}) > 0 if "country_launch_configs" in collections else False,
        },
    }
