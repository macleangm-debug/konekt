"""
Market Settings Resolver
Provides centralized market/instance configuration.
All company contact info, currency, date format, phone defaults come from here.
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger("market_settings")

# Tanzania defaults — the canonical source for all display values
MARKET_DEFAULTS = {
    "TZ": {
        "country_code": "TZ",
        "country_name": "Tanzania",
        "phone": "+255 759 110 453",
        "email": "sales@konekt.co.tz",
        "address": "Dar es Salaam, Tanzania",
        "currency_code": "TZS",
        "currency_symbol": "TZS",
        "currency_placeholder": "500,000",
        "date_format": "DD/MM/YYYY",
        "locale": "en-TZ",
        "default_phone_prefix": "+255",
        "default_phone_prefix_label": "TZ +255",
        "business_hours": "Mon-Fri, 9am - 6pm EAT",
        "company_name": "Konekt",
        "support_email": "support@konekt.co.tz",
    }
}

# Current active market
ACTIVE_MARKET = "TZ"


def get_market_settings(market_code: str = None) -> dict:
    """Get settings for a specific market or the active market."""
    code = (market_code or ACTIVE_MARKET).upper()
    settings = MARKET_DEFAULTS.get(code)
    if not settings:
        settings = MARKET_DEFAULTS.get(ACTIVE_MARKET, {})
    return settings


async def get_market_settings_from_db(db, market_code: str = None) -> dict:
    """
    Get market settings from DB if overrides exist, fallback to defaults.
    Admin can override via the settings collection.
    """
    code = (market_code or ACTIVE_MARKET).upper()
    db_settings = await db.market_settings.find_one(
        {"market_code": code}, {"_id": 0}
    )
    defaults = MARKET_DEFAULTS.get(code, MARKET_DEFAULTS.get(ACTIVE_MARKET, {}))
    if db_settings:
        merged = {**defaults, **{k: v for k, v in db_settings.items() if v}}
        return merged
    return defaults
