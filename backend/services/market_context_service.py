"""
Market Context Service — Country-aware defaults for vendor onboarding and system-wide usage.
Provides phone prefix, currency, support contact, and tax field labels by country.
"""

MARKET_DEFAULTS = {
    "TZ": {
        "country_code": "TZ",
        "country_name": "Tanzania",
        "phone_prefix": "+255",
        "currency_code": "TZS",
        "currency_name": "Tanzanian Shilling",
        "support_email": "sales@konekt.co.tz",
        "support_phone": "+255 759 110 453",
        "tax_id_label": "TIN",
        "vat_label": "VRN",
        "default_region": "Dar es Salaam",
    },
    "KE": {
        "country_code": "KE",
        "country_name": "Kenya",
        "phone_prefix": "+254",
        "currency_code": "KES",
        "currency_name": "Kenyan Shilling",
        "support_email": "sales@konekt.co.ke",
        "support_phone": "+254 700 000 000",
        "tax_id_label": "KRA PIN",
        "vat_label": "VAT No",
        "default_region": "Nairobi",
    },
    "UG": {
        "country_code": "UG",
        "country_name": "Uganda",
        "phone_prefix": "+256",
        "currency_code": "UGX",
        "currency_name": "Ugandan Shilling",
        "support_email": "sales@konekt.co.ug",
        "support_phone": "+256 700 000 000",
        "tax_id_label": "TIN",
        "vat_label": "VAT No",
        "default_region": "Kampala",
    },
    "RW": {
        "country_code": "RW",
        "country_name": "Rwanda",
        "phone_prefix": "+250",
        "currency_code": "RWF",
        "currency_name": "Rwandan Franc",
        "support_email": "sales@konekt.rw",
        "support_phone": "+250 700 000 000",
        "tax_id_label": "TIN",
        "vat_label": "VAT No",
        "default_region": "Kigali",
    },
    "NG": {
        "country_code": "NG",
        "country_name": "Nigeria",
        "phone_prefix": "+234",
        "currency_code": "NGN",
        "currency_name": "Nigerian Naira",
        "support_email": "sales@konekt.ng",
        "support_phone": "+234 800 000 000",
        "tax_id_label": "TIN",
        "vat_label": "VAT No",
        "default_region": "Lagos",
    },
    "ZA": {
        "country_code": "ZA",
        "country_name": "South Africa",
        "phone_prefix": "+27",
        "currency_code": "ZAR",
        "currency_name": "South African Rand",
        "support_email": "sales@konekt.co.za",
        "support_phone": "+27 800 000 000",
        "tax_id_label": "Tax Reference",
        "vat_label": "VAT No",
        "default_region": "Johannesburg",
    },
}


def get_market_context(country_code: str = "TZ") -> dict:
    """Return market defaults for a given country code."""
    return MARKET_DEFAULTS.get(country_code.upper(), MARKET_DEFAULTS["TZ"])


def list_supported_markets() -> list:
    """Return all supported markets."""
    return [
        {"code": k, "name": v["country_name"], "phone_prefix": v["phone_prefix"], "currency": v["currency_code"]}
        for k, v in MARKET_DEFAULTS.items()
    ]


def get_phone_prefix(country_code: str = "TZ") -> str:
    ctx = MARKET_DEFAULTS.get(country_code.upper(), MARKET_DEFAULTS["TZ"])
    return ctx["phone_prefix"]


def get_currency(country_code: str = "TZ") -> str:
    ctx = MARKET_DEFAULTS.get(country_code.upper(), MARKET_DEFAULTS["TZ"])
    return ctx["currency_code"]
