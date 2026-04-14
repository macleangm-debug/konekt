"""
Affiliate Settings Defaults
Global configuration for the affiliate/partner program
"""

DEFAULT_AFFILIATE_SETTINGS = {
    "enabled": True,
    "application_enabled": True,
    "auto_approve": False,
    "max_active_affiliates": 0,
    "commission_type": "percentage",
    "default_commission_rate": 10.0,
    "default_fixed_commission": 0.0,
    "commission_trigger": "business_closed_paid",
    "minimum_payout_amount": 50000,
    "cookie_window_days": 30,
    "allow_promo_codes": True,
    "allow_referral_links": True,
    "require_manual_payout_approval": True,
    "allow_partner_assets": False,
    "partner_terms_url": "",
    "branding_message": "Join the Konekt Partner Network and earn commission on closed business.",
    "qualification_rules": {
        "require_review": True,
        "min_audience_size": 0,
        "industry_relevance_required": False,
        "professional_profile_required": False,
    },
    "customer_perk_enabled": True,
    "customer_perk_type": "percentage_discount",
    "customer_perk_value": 5.0,
    "customer_perk_cap": 30000,
    "customer_perk_min_order_amount": 100000,
    "customer_perk_first_order_only": True,
    "customer_perk_stackable": False,
    "customer_perk_allowed_categories": ["creative", "promotional_materials"],
    "customer_perk_free_addon_code": "",
    "contracts": {
        "starter": {
            "label": "Starter",
            "duration_months": 1,
            "min_deals": 5,
            "min_earnings": 50000,
        },
        "growth": {
            "label": "Growth",
            "duration_months": 3,
            "min_deals": 20,
            "min_earnings": 250000,
        },
        "top": {
            "label": "Top Performer",
            "duration_months": 6,
            "min_deals": 60,
            "min_earnings": 1000000,
        },
    },
    "status_engine": {
        "warning_threshold_pct": 50,
        "probation_threshold_pct": 25,
        "suspension_after_months_below": 2,
    },
}
