"""
Central Platform Settings Resolver — Single Source of Truth

All backend services MUST use get_platform_settings(db) or the section-specific
helpers below instead of maintaining local defaults.

Source of truth: admin_settings collection, key='settings_hub'
"""

import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger("settings_resolver")

# In-memory cache with TTL (avoids DB hit on every call within the same request burst)
_cache = {"data": None, "ts": 0}
_CACHE_TTL_SECONDS = 30

# ─── Canonical defaults ───
# These are the ONLY place fallback values live.
# If a setting is not in the DB, this default is used.
PLATFORM_DEFAULTS = {
    "business_profile": {
        "legal_name": "KONEKT LIMITED",
        "brand_name": "Konekt",
        "tagline": "One-stop shop for products, services & deals",
        "support_email": "",
        "support_phone": "",
        "website": "",
        "business_address": "",
        "tax_id": "",
        "vat_number": "",
        "registration_number": "",
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
        "protected_company_margin_percent": 8.0,
        "commission_mode": "fair_balanced",
        "affiliate_attribution_reduces_sales_commission": True,
        "vat_percent": 18.0,
        "referral_pct": 10.0,
        "max_wallet_usage_pct": 30.0,
        "max_wallet_per_order": 0,
        "wallet_enabled": True,
        "protect_allocations": True,
        "enforce_single_channel": True,
        "referral_min_order_amount": 0,
        "referral_max_reward_per_order": 0,
        "welcome_bonus_enabled": False,
        "welcome_bonus_type": "fixed",
        "welcome_bonus_value": 5000,
        "welcome_bonus_max_cap": 10000,
        "welcome_bonus_first_purchase_only": True,
        "welcome_bonus_trigger_event": "payment_verified",
        "welcome_bonus_stack_with_referral": False,
        "welcome_bonus_stack_with_wallet": True,
    },
    "margin_rules": {
        "allow_product_group_margin_override": True,
        "allow_product_margin_override": True,
        "allow_service_group_margin_override": True,
        "allow_service_margin_override": True,
        "pricing_below_minimum_margin_requires_admin_override": True,
    },
    "pricing_policy_tiers": [
        {
            "label": "Small (0 – 100K)",
            "min_amount": 0,
            "max_amount": 100000,
            "total_margin_pct": 35,
            "protected_platform_margin_pct": 23,
            "distributable_margin_pct": 12,
            "distribution_split": {
                "affiliate_pct": 25,
                "promotion_pct": 20,
                "sales_pct": 20,
                "referral_pct": 20,
                "reserve_pct": 15,
            },
        },
        {
            "label": "Lower-Medium (100K – 500K)",
            "min_amount": 100001,
            "max_amount": 500000,
            "total_margin_pct": 30,
            "protected_platform_margin_pct": 20,
            "distributable_margin_pct": 10,
            "distribution_split": {
                "affiliate_pct": 25,
                "promotion_pct": 20,
                "sales_pct": 20,
                "referral_pct": 20,
                "reserve_pct": 15,
            },
        },
        {
            "label": "Medium (500K – 2M)",
            "min_amount": 500001,
            "max_amount": 2000000,
            "total_margin_pct": 25,
            "protected_platform_margin_pct": 17,
            "distributable_margin_pct": 8,
            "distribution_split": {
                "affiliate_pct": 25,
                "promotion_pct": 20,
                "sales_pct": 20,
                "referral_pct": 20,
                "reserve_pct": 15,
            },
        },
        {
            "label": "Large (2M – 10M)",
            "min_amount": 2000001,
            "max_amount": 10000000,
            "total_margin_pct": 20,
            "protected_platform_margin_pct": 14,
            "distributable_margin_pct": 6,
            "distribution_split": {
                "affiliate_pct": 30,
                "promotion_pct": 20,
                "sales_pct": 20,
                "referral_pct": 20,
                "reserve_pct": 10,
            },
        },
        {
            "label": "Enterprise (10M+)",
            "min_amount": 10000001,
            "max_amount": 999999999,
            "total_margin_pct": 15,
            "protected_platform_margin_pct": 11,
            "distributable_margin_pct": 4,
            "distribution_split": {
                "affiliate_pct": 30,
                "promotion_pct": 15,
                "sales_pct": 20,
                "referral_pct": 20,
                "reserve_pct": 15,
            },
        },
    ],
    "distribution_config": {
        "protected_company_margin_percent": 8,
        "affiliate_percent_of_distributable": 10,
        "sales_percent_of_distributable": 15,
        "promo_percent_of_distributable": 10,
        "referral_percent_of_distributable": 5,
        "country_bonus_percent_of_distributable": 5,
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
        "customer_perk_enabled": True,
        "customer_perk_type": "percentage_discount",
        "customer_perk_value": 5.0,
        "customer_perk_cap": 30000,
        "customer_perk_min_order_amount": 100000,
        "customer_perk_first_order_only": True,
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
        "sales_promo_codes_enabled": True,
        "assignment_policy": {
            "primary_strategy": "customer_ownership",
            "fallback_strategy": "round_robin",
            "track_deal_source": True,
        },
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
        "currency_symbol": "TSh",
        "show_on_invoice": True,
        "show_on_checkout": True,
    },
    "operational_rules": {
        "date_format": "DD MMM YYYY",
        "time_format": "HH:mm",
        "timezone": "Africa/Dar_es_Salaam",
        "default_country": "TZ",
        "follow_up_threshold_days": 3,
        "stale_deal_threshold_days": 7,
        "quote_response_threshold_days": 5,
        "payment_overdue_threshold_days": 7,
    },
    "countries": {
        "active_country": "TZ",
        "available_countries": [
            {
                "code": "TZ",
                "name": "Tanzania",
                "currency": "TZS",
                "currency_symbol": "TSh",
                "timezone": "Africa/Dar_es_Salaam",
                "vat_rate": 18,
                "phone_prefix": "+255",
                "doc_prefix_code": "TZ",
                "bank_details": {
                    "account_name": "KONEKT LIMITED",
                    "account_number": "015C8841347002",
                    "bank_name": "CRDB BANK",
                    "swift_code": "CORUTZTZ",
                },
            },
            {
                "code": "KE",
                "name": "Kenya",
                "currency": "KES",
                "currency_symbol": "KSh",
                "timezone": "Africa/Nairobi",
                "vat_rate": 16,
                "phone_prefix": "+254",
                "doc_prefix_code": "KE",
                "bank_details": {},
            },
            {
                "code": "UG",
                "name": "Uganda",
                "currency": "UGX",
                "currency_symbol": "USh",
                "timezone": "Africa/Kampala",
                "vat_rate": 18,
                "phone_prefix": "+256",
                "doc_prefix_code": "UG",
                "bank_details": {},
            },
        ],
        "clone_config_from": None,
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
    "report_schedule": {
        "enabled": True,
        "day": "monday",
        "time": "08:00",
        "timezone": "Africa/Dar_es_Salaam",
        "recipient_roles": ["admin", "sales_manager", "finance_manager"],
    },
    "vendors": {
        "vendor_can_update_internal_progress": True,
        "vendor_sees_only_assigned_jobs": True,
        "vendor_cannot_see_customer_financials": True,
        "vendor_cannot_see_commissions": True,
    },
    "vendor_ops": {
        "default_sourcing_mode": "preferred",
        "max_vendors_per_request": 3,
        "default_quote_expiry_hours": 48,
        "default_lead_time_days": 3,
        "auto_select_best_quote": True,
        "preferred_vendors_by_category": {},
        "sourcing_mode_by_category": {},
        "lead_time_by_category": {},
    },
    "partner_policy": {
        "auto_assignment_mode": "capability_match",
        "logistics_handling_default": "konekt_managed",
        "vendor_types": ["product_supplier", "service_provider", "logistics_partner"],
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
    "discount_governance": {
        "enabled": True,
        "critical_threshold": 3,
        "warning_threshold": 5,
        "rolling_window_days": 7,
        "dedup_window_hours": 24,
    },
    "performance_targets": {
        "monthly_revenue_target": 500000000,
        "target_margin_pct": 20,
        "channel_allocation": {
            "sales_pct": 50,
            "affiliate_pct": 30,
            "direct_pct": 10,
            "group_deals_pct": 10,
        },
        "sales_staff_count": 10,
        "affiliate_count": 10,
        "sales_min_kpi_pct": 70,
        "affiliate_min_kpi_pct": 60,
        "min_rating_threshold": 3.0,
        "rating_weight_in_kpi_pct": 20,
    },
    "ratings": {
        "enabled": True,
        "trigger": "delivery_confirmed",
        "scale": 5,
        "allow_comment": True,
    },
    "sales_visibility": {
        "show_total_commission": True,
        "show_monthly_commission": True,
        "show_pending_commission": True,
        "show_paid_commission": True,
        "show_revenue": False,
        "show_profit_breakdown": False,
    },
    "business_profile": {
        "legal_name": "",
        "brand_name": "",
        "tagline": "",
        "support_email": "",
        "support_phone": "",
        "business_address": "",
        "tax_id": "",
        "vat_number": "",
        "website": "",
        "base_public_url": "",
    },
    "affiliate_emails": {
        "send_application_received": True,
        "send_application_approved": True,
        "send_application_rejected": True,
        "sla_response_text": "We will review your application within 48-72 hours.",
    },
    "catalog": {
        "units_of_measurement": [
            {"name": "Piece", "abbr": "pcs", "type": "count"},
            {"name": "Pair", "abbr": "pr", "type": "count"},
            {"name": "Pack", "abbr": "pk", "type": "count"},
            {"name": "Box", "abbr": "bx", "type": "count"},
            {"name": "Carton", "abbr": "ctn", "type": "count"},
            {"name": "Roll", "abbr": "rl", "type": "count"},
            {"name": "Set", "abbr": "set", "type": "count"},
            {"name": "Dozen", "abbr": "dz", "type": "count"},
            {"name": "Bundle", "abbr": "bdl", "type": "count"},
            {"name": "Kg", "abbr": "kg", "type": "weight"},
            {"name": "Gram", "abbr": "g", "type": "weight"},
            {"name": "Litre", "abbr": "L", "type": "volume"},
            {"name": "Millilitre", "abbr": "ml", "type": "volume"},
            {"name": "Meter", "abbr": "m", "type": "length"},
            {"name": "Square Meter", "abbr": "sqm", "type": "length"},
            {"name": "Service Unit", "abbr": "svc", "type": "service"},
        ],
        "sku_prefix": "KNT",
        "sku_format": "{PREFIX}-{COUNTRY}-{CATEGORY}-{RANDOM}",
        "variant_types": ["Size", "Color", "Material", "Weight", "Volume"],
        "product_categories": [
            "Office Equipment", "Printing & Stationery", "IT & Electronics",
            "Furniture", "Promotional Materials", "Industrial Supplies",
            "Cleaning & Hygiene", "Safety & PPE", "Packaging",
            "Food & Beverages", "Fashion & Apparel", "Other"
        ],
    },
    "document_numbering": {
        "country_code": "TZ",
        "quote_prefix": "QT",
        "invoice_prefix": "IN",
        "order_prefix": "ORD",
        "delivery_note_prefix": "DN",
        "use_shared_sequence": True,
    },
}


def _deep_merge(defaults: dict, stored: dict) -> dict:
    """Recursively merge stored values over defaults, preserving all default keys."""
    merged = {}
    for k, v in defaults.items():
        if isinstance(v, dict) and isinstance(stored.get(k), dict):
            merged[k] = _deep_merge(v, stored[k])
        elif k in stored and stored[k] is not None:
            merged[k] = stored[k]
        else:
            merged[k] = v
    # Also include any stored keys not in defaults
    for k, v in stored.items():
        if k not in merged:
            merged[k] = v
    return merged


async def get_platform_settings(db) -> dict:
    """
    Central entry point. Returns the full settings dict, deep-merged with defaults.
    Uses a short TTL cache to avoid repeated DB reads within the same burst.
    """
    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < _CACHE_TTL_SECONDS:
        return _cache["data"]

    try:
        row = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
        stored = row.get("value", {}) if row else {}
    except Exception as e:
        logger.error(f"Failed to read settings hub: {e}")
        stored = {}

    merged = _deep_merge(PLATFORM_DEFAULTS, stored)
    _cache["data"] = merged
    _cache["ts"] = now
    return merged


def invalidate_settings_cache():
    """Call after any settings update to force next read from DB."""
    _cache["data"] = None
    _cache["ts"] = 0


# ─── Section-specific convenience getters ───

async def get_commercial_settings(db) -> dict:
    s = await get_platform_settings(db)
    return s.get("commercial", PLATFORM_DEFAULTS["commercial"])


async def get_operational_rules(db) -> dict:
    s = await get_platform_settings(db)
    return s.get("operational_rules", PLATFORM_DEFAULTS["operational_rules"])


async def get_distribution_config(db) -> dict:
    """Returns the commission distribution config, resolving from Settings Hub."""
    s = await get_platform_settings(db)
    dc = s.get("distribution_config", PLATFORM_DEFAULTS["distribution_config"])
    commercial = s.get("commercial", {})
    # protected_company_margin_percent can live in commercial or distribution_config
    if "protected_company_margin_percent" in commercial:
        dc["protected_company_margin_percent"] = commercial["protected_company_margin_percent"]
    return dc


async def get_affiliate_settings(db) -> dict:
    s = await get_platform_settings(db)
    return s.get("affiliate", PLATFORM_DEFAULTS["affiliate"])


async def get_sales_settings(db) -> dict:
    s = await get_platform_settings(db)
    return s.get("sales", PLATFORM_DEFAULTS["sales"])


async def get_vendor_policy(db) -> dict:
    s = await get_platform_settings(db)
    return s.get("vendors", PLATFORM_DEFAULTS["vendors"])


async def get_partner_policy(db) -> dict:
    s = await get_platform_settings(db)
    return s.get("partner_policy", PLATFORM_DEFAULTS["partner_policy"])


async def get_payment_accounts(db) -> dict:
    s = await get_platform_settings(db)
    return s.get("payment_accounts", PLATFORM_DEFAULTS["payment_accounts"])


async def get_report_schedule(db) -> dict:
    s = await get_platform_settings(db)
    return s.get("report_schedule", PLATFORM_DEFAULTS["report_schedule"])


async def get_business_identity(db) -> dict:
    """Returns company identity for documents (quotes, invoices, statements)."""
    s = await get_platform_settings(db)
    bp = s.get("business_profile", {})
    pa = s.get("payment_accounts", {})
    return {
        "company_name": bp.get("legal_name") or bp.get("brand_name", "Konekt"),
        "brand_name": bp.get("brand_name", "Konekt"),
        "tagline": bp.get("tagline", ""),
        "tax_id": bp.get("tax_id", ""),
        "vat_number": bp.get("vat_number", ""),
        "registration_number": bp.get("registration_number", ""),
        "support_email": bp.get("support_email", ""),
        "support_phone": bp.get("support_phone", ""),
        "website": bp.get("website", ""),
        "business_address": bp.get("business_address", ""),
        "currency_code": pa.get("currency", "TZS"),
        "currency_symbol": pa.get("currency_symbol", "TSh"),
    }


async def get_bank_details(db) -> dict:
    """Returns bank details for invoices/payment instructions."""
    s = await get_platform_settings(db)
    pa = s.get("payment_accounts", {})
    return {
        "bank_name": pa.get("bank_name", ""),
        "account_name": pa.get("account_name", ""),
        "account_number": pa.get("account_number", ""),
        "swift_code": pa.get("swift_code", ""),
        "branch_name": pa.get("branch_name", ""),
        "show_on_invoice": pa.get("show_on_invoice", True),
    }


async def get_margin_tiers(db) -> list:
    """Returns the global margin tiers from Settings Hub (legacy compat)."""
    tiers = await get_pricing_policy_tiers(db)
    # Convert unified tiers to legacy format for backward compat
    legacy = []
    for t in tiers:
        legacy.append({
            "min": t["min_amount"],
            "max": t["max_amount"],
            "type": "percentage",
            "value": t["total_margin_pct"],
            "label": t.get("label", ""),
        })
    return legacy


async def get_pricing_policy_tiers(db, category: str = None) -> list:
    """Returns pricing policy tiers, optionally for a specific category/branch.

    Storage format (new):
        pricing_policy_tiers: {
            "default": [tier, tier, ...],
            "Promotional Materials": [...],
            "Office Equipment": [...],
            "Stationery": [...],
            "Services": [...],
        }

    Legacy format (backward-compat):
        pricing_policy_tiers: [tier, tier, ...]   # treated as default

    Resolution:
        1. Exact category match (e.g. "Office Equipment")
        2. Fallback to "default" key if present
        3. Fallback to legacy flat list
        4. Finally PLATFORM_DEFAULTS
    """
    s = await get_platform_settings(db)
    stored = s.get("pricing_policy_tiers", PLATFORM_DEFAULTS["pricing_policy_tiers"])

    if isinstance(stored, list):
        # Legacy flat list — every category uses the same tiers
        return stored

    if isinstance(stored, dict):
        # Category-aware storage. Try exact match, then default.
        if category and category in stored and isinstance(stored[category], list) and stored[category]:
            return stored[category]
        if "default" in stored and isinstance(stored["default"], list) and stored["default"]:
            return stored["default"]
        # If the dict has any list, return the first as last resort
        for v in stored.values():
            if isinstance(v, list) and v:
                return v

    return PLATFORM_DEFAULTS["pricing_policy_tiers"]


async def get_pricing_policy_tiers_all(db) -> dict:
    """Returns the full per-category tier mapping (dict) or {'default': [...]} for legacy."""
    s = await get_platform_settings(db)
    stored = s.get("pricing_policy_tiers", PLATFORM_DEFAULTS["pricing_policy_tiers"])
    if isinstance(stored, list):
        return {"default": stored}
    if isinstance(stored, dict):
        # Ensure default key present
        out = dict(stored)
        if "default" not in out:
            out["default"] = PLATFORM_DEFAULTS["pricing_policy_tiers"]
        return out
    return {"default": PLATFORM_DEFAULTS["pricing_policy_tiers"]}
