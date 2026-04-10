"""
Business Settings Resolver Service
Reads business settings from DB and provides identity blocks
for quotes, invoices, statements, footer, contact, invite templates.
"""
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("business_settings_resolver")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
_client = AsyncIOMotorClient(MONGO_URL)
_db = _client[DB_NAME]

DEFAULTS = {
    "company_name": "Konekt",
    "tagline": "B2B Commerce Platform",
    "registration_number": "",
    "tin_number": "",
    "vat_number": "",
    "phone": "",
    "email": "",
    "website": "",
    "address_line_1": "",
    "address_line_2": "",
    "city": "",
    "country": "Tanzania",
    "bank_name": "",
    "account_name": "",
    "account_number": "",
    "swift_code": "",
    "branch_name": "",
    "currency_code": "TZS",
    "currency_symbol": "TSh",
    "company_logo_path": "",
    "quote_footer_note": "Thank you for your business.",
    "invoice_footer_note": "Payment is due within the terms stated above.",
    "statement_footer_note": "This is a system-generated statement of account.",
}


async def get_business_settings(db=None):
    """Get business settings from DB, falling back to Settings Hub, then to local defaults."""
    database = db or _db
    doc = await database.business_settings.find_one({}, {"_id": 0})

    # If no legacy business_settings doc, read from the Settings Hub
    if not doc:
        try:
            from services.settings_resolver import get_business_identity, get_bank_details
            identity = await get_business_identity(database)
            bank = await get_bank_details(database)
            merged = dict(DEFAULTS)
            merged["company_name"] = identity.get("company_name") or merged["company_name"]
            merged["phone"] = identity.get("support_phone") or merged["phone"]
            merged["email"] = identity.get("support_email") or merged["email"]
            merged["website"] = identity.get("website") or merged["website"]
            merged["tax_id"] = identity.get("tax_id") or merged["tax_id"]
            merged["vat_number"] = identity.get("vat_number") or merged["vat_number"]
            merged["bank_name"] = bank.get("bank_name") or merged["bank_name"]
            merged["account_name"] = bank.get("account_name") or merged["account_name"]
            merged["account_number"] = bank.get("account_number") or merged["account_number"]
            merged["swift_code"] = bank.get("swift_code") or merged["swift_code"]
            merged["currency_code"] = identity.get("currency_code") or merged["currency_code"]
            merged["currency_symbol"] = identity.get("currency_symbol") or merged["currency_symbol"]
            return merged
        except Exception:
            return dict(DEFAULTS)

    # Merge with defaults
    merged = dict(DEFAULTS)
    merged.update({k: v for k, v in doc.items() if v is not None and v != ""})
    return merged


async def get_identity_block(db=None):
    """Get company identity for document headers (quotes, invoices, statements)."""
    s = await get_business_settings(db)
    return {
        "company_name": s.get("company_name", ""),
        "tagline": s.get("tagline", ""),
        "logo_url": s.get("company_logo_path", ""),
        "tin": s.get("tin_number", ""),
        "vat": s.get("vat_number", ""),
        "registration": s.get("registration_number", ""),
        "phone": s.get("phone", ""),
        "email": s.get("email", ""),
        "website": s.get("website", ""),
        "address": ", ".join(filter(None, [
            s.get("address_line_1", ""),
            s.get("address_line_2", ""),
            s.get("city", ""),
            s.get("country", ""),
        ])),
    }


async def get_bank_block(db=None):
    """Get banking details for invoices and payment instructions."""
    s = await get_business_settings(db)
    return {
        "bank_name": s.get("bank_name", ""),
        "account_name": s.get("account_name", ""),
        "account_number": s.get("account_number", ""),
        "swift_code": s.get("swift_code", ""),
        "branch_name": s.get("branch_name", ""),
    }


async def get_currency_block(db=None):
    """Get currency formatting info."""
    s = await get_business_settings(db)
    return {
        "currency_code": s.get("currency_code", "TZS"),
        "currency_symbol": s.get("currency_symbol", "TSh"),
    }


async def get_footer_block(db=None, doc_type="quote"):
    """Get footer note for a specific document type."""
    s = await get_business_settings(db)
    key = f"{doc_type}_footer_note"
    return s.get(key, s.get("quote_footer_note", ""))


async def get_contact_block(db=None):
    """Get contact info for support/footer sections."""
    s = await get_business_settings(db)
    return {
        "company_name": s.get("company_name", ""),
        "phone": s.get("phone", ""),
        "email": s.get("email", ""),
        "website": s.get("website", ""),
        "address": ", ".join(filter(None, [
            s.get("address_line_1", ""),
            s.get("city", ""),
            s.get("country", ""),
        ])),
    }
