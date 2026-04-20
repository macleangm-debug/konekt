"""
Unified Document Render Settings — Single endpoint for CanonicalDocumentRenderer.
Merges business_settings, invoice_branding, and settings_hub into one response.
"""
import os
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/documents", tags=["Document Render Settings"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "konekt_db")


@router.get("/render-settings")
async def get_render_settings(request: Request):
    """
    Public endpoint (no auth) — returns everything the document renderer needs:
    - Company info (name, address, phone, email, TIN, BRN, bank details)
    - Branding (logo, signature, stamp, CFO info)
    - Doc footer toggles
    - Doc numbering config
    - Doc template selection
    """
    db = request.app.mongodb

    # 1. Business settings (company profile)
    biz = await db.business_settings.find_one({}, {"_id": 0}) or {}

    # 2. Invoice branding (logo, signature, stamp)
    branding_doc = await db.business_settings.find_one(
        {"type": "invoice_branding"}, {"_id": 0}
    ) or {}
    branding_doc.pop("type", None)

    # 3. Settings hub (doc_footer, doc_numbering, doc_template)
    hub_row = await db.admin_settings.find_one({"key": "settings_hub"})
    hub = hub_row.get("value", {}) if hub_row else {}

    doc_footer = hub.get("doc_footer", {
        "show_address": True,
        "show_email": True,
        "show_phone": True,
        "show_registration": False,
        "custom_footer_text": "",
    })
    doc_numbering = hub.get("doc_numbering", {})
    doc_template = hub.get("doc_template", {"selected_template": "classic"})

    # Business profile from hub
    business_profile = hub.get("business_profile", {})
    payment_accounts = hub.get("payment_accounts", {})
    hub_branding = hub.get("branding", {})

    return {
        # Company info — cascade: business_settings > hub business_profile > hub branding
        "company_name": biz.get("company_name") or biz.get("trading_name") or business_profile.get("legal_name") or hub_branding.get("company_name") or "",
        "trading_name": biz.get("trading_name") or business_profile.get("brand_name") or hub_branding.get("company_name") or "",
        "phone": biz.get("phone") or business_profile.get("support_phone") or "",
        "email": biz.get("email") or business_profile.get("support_email") or "",
        "address": biz.get("address") or biz.get("address_line_1") or business_profile.get("business_address") or "",
        "city": biz.get("city") or "",
        "country": biz.get("country") or "",
        "website": biz.get("website") or business_profile.get("website") or "",
        "tin": biz.get("tin") or biz.get("tax_number") or business_profile.get("tax_id") or "",
        "brn": biz.get("brn") or biz.get("business_registration_number") or business_profile.get("vat_number") or "",
        "currency": payment_accounts.get("currency") or biz.get("currency") or "TZS",
        # Bank details
        "bank_name": biz.get("bank_name") or payment_accounts.get("bank_name") or "",
        "bank_account_name": biz.get("bank_account_name") or payment_accounts.get("account_name") or "",
        "bank_account_number": biz.get("bank_account_number") or payment_accounts.get("account_number") or "",
        "bank_branch": biz.get("bank_branch") or payment_accounts.get("branch_name") or "",
        "swift_code": biz.get("bank_swift_code") or payment_accounts.get("swift_code") or "",
        # Branding assets — cascade: invoice_branding > hub branding > business_settings
        "logo_url": branding_doc.get("company_logo_url") or hub_branding.get("primary_logo_url") or biz.get("company_logo_path") or "",
        "secondary_logo_url": hub_branding.get("secondary_logo_url") or "",
        "tagline": hub_branding.get("tagline") or "",
        "show_signature": branding_doc.get("show_signature", False),
        "cfo_name": branding_doc.get("cfo_name") or "",
        "cfo_title": branding_doc.get("cfo_title") or "Chief Finance Officer",
        "cfo_signature_url": branding_doc.get("cfo_signature_url") or "",
        "show_stamp": branding_doc.get("show_stamp", False),
        "stamp_mode": branding_doc.get("stamp_mode") or "generated",
        "stamp_uploaded_url": branding_doc.get("stamp_uploaded_url") or "",
        "stamp_preview_url": branding_doc.get("stamp_preview_url") or "",
        "stamp_svg": "",
        "contact_email": branding_doc.get("contact_email") or biz.get("email") or "",
        "contact_phone": branding_doc.get("contact_phone") or biz.get("phone") or "",
        "contact_address": branding_doc.get("contact_address") or "",
        # Doc footer settings
        "doc_footer": doc_footer,
        # Doc numbering settings
        "doc_numbering": doc_numbering,
        # Doc template
        "doc_template": doc_template,
    }
