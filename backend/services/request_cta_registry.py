FRONTEND_REQUEST_CTAS = {
    "products": [
        {"label": "Buy Now", "action": "direct_checkout"},
        {"label": "Add to Cart", "action": "cart"},
        {"label": "Request Bulk Quote", "action": "product_bulk_request"},
    ],
    "promotional_materials": [
        {"label": "Customize & Request Quote", "action": "promo_custom_request"},
        {"label": "Request Sample", "action": "promo_sample_request"},
    ],
    "services": [
        {"label": "Request Service Quote", "action": "service_quote_request"},
        {"label": "Book Site Visit", "action": "service_site_visit_request"},
    ]
}

ACCOUNT_SHORTCUT_CTAS = [
    {"label": "Quick Request Quote", "action": "quick_quote_request"},
    {"label": "Request Sample", "action": "promo_sample_request"},
    {"label": "Request Service", "action": "service_quote_request"},
]
