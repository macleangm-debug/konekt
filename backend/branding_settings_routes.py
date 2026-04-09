"""
Branding Settings — Legacy endpoint that now delegates to Settings Hub as canonical source.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/branding-settings", tags=["Branding Settings"])

DEFAULTS = {
    "company_name": "Konekt",
    "logo_url": "",
    "icon_url": "",
    "company_email": "",
    "company_phone": "",
    "company_address": "",
    "company_tin": "",
    "company_vat_number": "",
    "quote_footer_note": "Thank you for choosing us.",
    "invoice_footer_note": "Payment terms apply as stated on this document.",
    "order_footer_note": "Order updates will be shared through your account and WhatsApp when enabled.",
}


@router.get("")
async def get_branding_settings(request: Request):
    """Get current branding settings — reads from settings hub as canonical source."""
    db = request.app.mongodb
    # Try settings hub first (canonical)
    hub = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    if hub:
        v = hub.get("value", {})
        profile = v.get("business_profile", {})
        branding = v.get("branding", {})
        return {
            **DEFAULTS,
            "company_name": profile.get("brand_name") or DEFAULTS["company_name"],
            "logo_url": branding.get("primary_logo_url") or DEFAULTS["logo_url"],
            "icon_url": branding.get("secondary_logo_url") or branding.get("favicon_url") or DEFAULTS["icon_url"],
            "company_email": profile.get("support_email") or DEFAULTS["company_email"],
            "company_phone": profile.get("support_phone") or DEFAULTS["company_phone"],
            "company_address": profile.get("business_address") or DEFAULTS["company_address"],
            "company_tin": profile.get("tax_id") or DEFAULTS["company_tin"],
        }
    # Fallback to legacy platform_settings
    row = await db.platform_settings.find_one({"key": "branding_settings"})
    if not row:
        return DEFAULTS
    return {**DEFAULTS, **row.get("value", {})}


@router.put("")
async def update_branding_settings(payload: dict, request: Request):
    """Update branding settings"""
    db = request.app.mongodb
    value = {**DEFAULTS, **payload}
    await db.platform_settings.update_one(
        {"key": "branding_settings"},
        {"$set": {"value": value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "value": value}
