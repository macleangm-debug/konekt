"""
Affiliate Settings Defaults
Global configuration for the affiliate/partner program
"""

DEFAULT_AFFILIATE_SETTINGS = {
    "enabled": True,
    "application_enabled": True,
    "auto_approve": False,
    "commission_type": "percentage",  # percentage | fixed
    "default_commission_rate": 10.0,
    "default_fixed_commission": 0.0,
    "commission_trigger": "business_closed_paid",  # business_closed_paid | invoice_paid | order_paid
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
    # Customer perk settings
    "customer_perk_enabled": True,
    "customer_perk_type": "percentage_discount",  # percentage_discount | fixed_discount | free_addon
    "customer_perk_value": 5.0,
    "customer_perk_cap": 30000,
    "customer_perk_min_order_amount": 100000,
    "customer_perk_first_order_only": True,
    "customer_perk_stackable": False,
    "customer_perk_allowed_categories": ["creative", "promotional_materials"],
    "customer_perk_free_addon_code": "",
}
