"""
CRM Settings Defaults
Default pipeline stages, lost/win reasons, and reminder rules
"""

DEFAULT_CRM_SETTINGS = {
    "pipeline_stages": [
        "new_lead",
        "contacted",
        "qualified",
        "meeting_demo",
        "quote_sent",
        "negotiation",
        "won",
        "lost",
        "dormant",
    ],
    "lost_reasons": [
        "price_too_high",
        "no_budget",
        "went_to_competitor",
        "no_response",
        "not_ready",
        "wrong_fit",
    ],
    "win_reasons": [
        "best_price",
        "better_service",
        "fast_delivery",
        "strong_relationship",
        "custom_solution",
    ],
    "default_follow_up_days": 3,
    "stale_lead_days": 7,
}
