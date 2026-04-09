"""
Public Branding Endpoint — safe projection of the Settings Hub.
Serves only the fields the unauthenticated frontend needs (logo, colors, name, tagline).
Canonical source: admin_settings collection, key="settings_hub".
"""
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/public", tags=["Public Branding"])

# Fallback values if settings hub has no data yet
SAFE_DEFAULTS = {
    "brand_name": "Konekt",
    "legal_name": "KONEKT LIMITED",
    "tagline": "Business Procurement Simplified",
    "primary_logo_url": "",
    "secondary_logo_url": "",
    "favicon_url": "",
    "primary_color": "#20364D",
    "accent_color": "#D4A843",
    "dark_bg_color": "#0f172a",
    "support_email": "",
    "support_phone": "",
}


@router.get("/branding")
async def get_public_branding(request: Request):
    """
    Public (no-auth) endpoint returning only the safe visual branding
    fields needed by the frontend before login.
    """
    db = request.app.mongodb
    row = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    hub = row.get("value", {}) if row else {}

    profile = hub.get("business_profile", {})
    branding = hub.get("branding", {})
    sender = hub.get("notification_sender", {})

    return {
        "brand_name": profile.get("brand_name") or SAFE_DEFAULTS["brand_name"],
        "legal_name": profile.get("legal_name") or SAFE_DEFAULTS["legal_name"],
        "tagline": profile.get("tagline") or SAFE_DEFAULTS["tagline"],
        "primary_logo_url": branding.get("primary_logo_url") or SAFE_DEFAULTS["primary_logo_url"],
        "secondary_logo_url": branding.get("secondary_logo_url") or SAFE_DEFAULTS["secondary_logo_url"],
        "favicon_url": branding.get("favicon_url") or SAFE_DEFAULTS["favicon_url"],
        "primary_color": branding.get("primary_color") or SAFE_DEFAULTS["primary_color"],
        "accent_color": branding.get("accent_color") or SAFE_DEFAULTS["accent_color"],
        "dark_bg_color": branding.get("dark_bg_color") or SAFE_DEFAULTS["dark_bg_color"],
        "support_email": profile.get("support_email") or SAFE_DEFAULTS["support_email"],
        "support_phone": profile.get("support_phone") or SAFE_DEFAULTS["support_phone"],
        "sender_name": sender.get("sender_name") or SAFE_DEFAULTS["brand_name"],
    }
