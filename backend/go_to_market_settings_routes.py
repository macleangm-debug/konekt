from datetime import datetime
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/go-to-market", tags=["Go To Market"])

DEFAULT_GTM = {
    "minimum_company_margin_percent": 20.0,
    "distribution_layer_percent": 10.0,
    "affiliate_percent": 10.0,
    "sales_percent_self_generated": 15.0,
    "sales_percent_affiliate_generated": 10.0,
    "promo_percent": 10.0,
    "referral_percent": 5.0,
    "country_bonus_percent": 5.0,
    "payout_threshold": 50000.0,
    "payout_cycle": "monthly",
    "attribution_window_days": 30,
    "bank_only_payments": True,
    "payment_verification_mode": "manual",
    "ai_enabled": True,
    "ai_handoff_after_messages": 3,
    "assignment_mode": "auto",
    "updated_at": None,
}

@router.get("/settings")
async def get_gtm_settings(request: Request):
    db = request.app.mongodb
    row = await db.admin_settings.find_one({"key": "go_to_market_settings"})
    if not row:
        return DEFAULT_GTM
    return row.get("value", DEFAULT_GTM)

@router.put("/settings")
async def update_gtm_settings(payload: dict, request: Request):
    db = request.app.mongodb
    value = {**DEFAULT_GTM, **payload, "updated_at": datetime.utcnow().isoformat()}
    await db.admin_settings.update_one(
        {"key": "go_to_market_settings"},
        {"$set": {"key": "go_to_market_settings", "value": value}},
        upsert=True,
    )
    return value
