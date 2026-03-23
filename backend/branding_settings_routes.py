from datetime import datetime, timezone
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/branding-settings", tags=["Branding Settings"])

DEFAULTS = {
    "company_name": "Konekt",
    "logo_url": "/branding/konekt-logo-full.png",
    "icon_url": "/branding/konekt-icon.png",
    "company_email": "hello@konekt.co.tz",
    "company_phone": "+255 000 000 000",
    "company_address": "Dar es Salaam, Tanzania",
    "company_tin": "",
    "company_vat_number": "",
    "quote_footer_note": "Thank you for choosing Konekt.",
    "invoice_footer_note": "Payment terms apply as stated on this document.",
    "order_footer_note": "Order updates will be shared through your account and WhatsApp when enabled.",
}

@router.get("")
async def get_branding_settings(request: Request):
    """Get current branding settings"""
    db = request.app.mongodb
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
