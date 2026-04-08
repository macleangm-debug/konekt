"""
Default margin seed — single source of truth.

Global default (backward compat, flat percentage):
Used when no tiered rules exist.

Tiered price bands (recommended):
Different margin + distributable by vendor price range.
Seeded on startup. Still override-able by product > group rules.
"""

DEFAULT_PRODUCT_MARGIN_RULE = {
    "scope": "global",
    "scope_id": None,
    "entity_type": "product",
    "method": "percentage",
    "value": 20,
    "distributable_margin_pct": 10,
    "active": True,
    "note": "Launch default 20% product margin + 10% distributable"
}

# Tiered price bands — seeded on first startup
# Higher-priced items get lower margins for competitiveness
# Lower-priced items get higher margins for profitability
DEFAULT_TIERED_BANDS = [
    {
        "scope": "tier",
        "tier_label": "0 - 50,000",
        "vendor_price_min": 0,
        "vendor_price_max": 50000,
        "margin_pct": 30,
        "distributable_margin_pct": 10,
        "active": True,
        "note": "Low-price band: 30% margin + 10% distributable",
    },
    {
        "scope": "tier",
        "tier_label": "50,000 - 200,000",
        "vendor_price_min": 50000,
        "vendor_price_max": 200000,
        "margin_pct": 25,
        "distributable_margin_pct": 8,
        "active": True,
        "note": "Mid-price band: 25% margin + 8% distributable",
    },
    {
        "scope": "tier",
        "tier_label": "200,000 - 1,000,000",
        "vendor_price_min": 200000,
        "vendor_price_max": 1000000,
        "margin_pct": 20,
        "distributable_margin_pct": 6,
        "active": True,
        "note": "High-price band: 20% margin + 6% distributable",
    },
    {
        "scope": "tier",
        "tier_label": "1,000,000+",
        "vendor_price_min": 1000000,
        "vendor_price_max": None,
        "margin_pct": 15,
        "distributable_margin_pct": 4,
        "active": True,
        "note": "Premium band: 15% margin + 4% distributable",
    },
]

# Default distribution split (of the distributable margin pool)
DEFAULT_DISTRIBUTION_SPLIT = {
    "type": "global",
    "konekt_margin_pct": 20,
    "distribution_margin_pct": 10,
    "affiliate_pct": 40,
    "sales_pct": 30,
    "discount_pct": 30,
    "attribution_window_days": 365,
    "minimum_payout": 50000,
}
