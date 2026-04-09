from datetime import datetime
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin/settings-hub", tags=["Admin Settings Hub"])

DEFAULT_SETTINGS = {
    "business_profile": {
        "legal_name": "KONEKT LIMITED",
        "brand_name": "Konekt",
        "tagline": "Business Procurement Simplified",
        "support_email": "",
        "support_phone": "",
        "website": "",
        "business_address": "",
        "tax_id": "",
        "vat_number": "",
    },
    "branding": {
        "primary_logo_url": "",
        "secondary_logo_url": "",
        "favicon_url": "",
        "primary_color": "#20364D",
        "accent_color": "#D4A843",
        "dark_bg_color": "#0f172a",
    },
    "notification_sender": {
        "sender_name": "Konekt",
        "sender_email": "",
        "whatsapp_number": "",
        "email_footer_text": "B2B Platform",
    },
    "commercial": {
        "minimum_company_margin_percent": 20.0,
        "distribution_layer_percent": 10.0,
        "commission_mode": "fair_balanced",
        "affiliate_attribution_reduces_sales_commission": True,
        "vat_percent": 18.0,
    },
    "margin_rules": {
        "allow_product_group_margin_override": True,
        "allow_product_margin_override": True,
        "allow_service_group_margin_override": True,
        "allow_service_margin_override": True,
        "pricing_below_minimum_margin_requires_admin_override": True,
    },
    "promotions": {
        "default_promo_type": "safe_distribution",
        "allow_margin_touching_promos": False,
        "max_public_promo_discount_percent": 5.0,
        "affiliate_visible_campaigns": True,
        "campaign_start_end_required": True,
    },
    "affiliate": {
        "default_affiliate_commission_percent": 10.0,
        "affiliate_registration_requires_approval": True,
        "default_affiliate_status": "pending",
        "personal_promo_code_enabled": True,
        "commission_trigger": "payment_approved",
        "commission_duration": "per_successful_sale",
        "attribution_sources": "link_and_code",
        "attribution_window_days": 30,
        "watchlist_logic_enabled": True,
        "paused_logic_enabled": True,
        "suspend_for_abuse_enabled": True,
    },
    "payouts": {
        "affiliate_minimum_payout": 50000.0,
        "sales_minimum_payout": 100000.0,
        "payout_cycle": "monthly",
        "payout_methods_enabled": ["mobile_money", "bank_transfer"],
        "manual_payout_approval": True,
        "payout_review_mode": "admin_required",
    },
    "sales": {
        "default_sales_commission_self_generated": 15.0,
        "default_sales_commission_affiliate_generated": 10.0,
        "assignment_mode": "auto",
        "smart_assignment_enabled": True,
        "lead_source_visibility": True,
        "commission_type_visibility": True,
        "sales_referral_link_enabled": True,
    },
    "payments": {
        "bank_only_payments": True,
        "card_payments_enabled": False,
        "mobile_money_enabled": False,
        "kwikpay_enabled": False,
        "payment_proof_required": True,
        "payment_proof_auto_link_to_invoice": True,
        "payment_verification_mode": "manual",
        "commission_creation_on_payment_approval": True,
    },
    "payment_accounts": {
        "default_country": "TZ",
        "account_name": "KONEKT LIMITED",
        "account_number": "015C8841347002",
        "bank_name": "CRDB BANK",
        "swift_code": "CORUTZTZ",
        "branch_name": "",
        "currency": "TZS",
        "show_on_invoice": True,
        "show_on_checkout": True,
    },
    "progress_workflows": {
        "hide_internal_provider_details_from_customer": True,
        "customer_safe_external_statuses_only": True,
        "product_workflow_enabled": True,
        "service_workflow_enabled": True,
    },
    "ai_assistant": {
        "ai_enabled": True,
        "human_handoff_enabled": True,
        "handoff_after_unresolved_exchanges": 3,
        "lead_capture_on_handoff": True,
        "customer_safe_status_translation_only": True,
    },
    "notifications": {
        "customer_notifications_enabled": True,
        "sales_notifications_enabled": True,
        "affiliate_notifications_enabled": True,
        "admin_notifications_enabled": True,
        "vendor_notifications_enabled": True,
    },
    "vendors": {
        "vendor_can_update_internal_progress": True,
        "vendor_sees_only_assigned_jobs": True,
        "vendor_cannot_see_customer_financials": True,
        "vendor_cannot_see_commissions": True,
    },
    "numbering_rules": {
        "sku_auto_numbering_enabled": True,
        "quote_format": "KON-QT-[YY]-[SEQ]",
        "invoice_format": "KON-IN-[YY]-[SEQ]",
        "order_format": "KON-OR-[YY]-[SEQ]",
    },
    "launch_controls": {
        "system_mode": "controlled_launch",
        "manual_payment_verification": True,
        "manual_payout_approval": True,
        "affiliate_approval_required": True,
        "ai_enabled": True,
        "bank_only_payments": True,
        "audit_notifications_enabled": True,
    },
    "customer_activity_rules": {
        "active_days": 30,
        "at_risk_days": 90,
        "default_new_customer_status": "active",
        "signals": {
            "orders": True,
            "invoices": True,
            "quotes": True,
            "requests": True,
            "sales_notes": True,
            "account_logins": False,
        },
    },
    "updated_at": None,
}

@router.get("")
async def get_settings_hub(request: Request):
    db = request.app.mongodb
    row = await db.admin_settings.find_one({"key": "settings_hub"})
    if not row:
        return DEFAULT_SETTINGS
    stored = row.get("value", {})
    # Deep merge with defaults so new fields are always present
    merged = {}
    for k, v in DEFAULT_SETTINGS.items():
        if isinstance(v, dict) and isinstance(stored.get(k), dict):
            merged[k] = {**v, **stored[k]}
        elif k in stored:
            merged[k] = stored[k]
        else:
            merged[k] = v
    return merged

@router.put("")
async def update_settings_hub(payload: dict, request: Request):
    db = request.app.mongodb
    value = {**DEFAULT_SETTINGS, **payload, "updated_at": datetime.utcnow().isoformat()}
    await db.admin_settings.update_one(
        {"key": "settings_hub"},
        {"$set": {"key": "settings_hub", "value": value}},
        upsert=True,
    )
    return value
