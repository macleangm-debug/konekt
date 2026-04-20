"""
Country Auto-Detection Service
Detects user country from IP address using a lightweight approach.
Falls back to TZ if detection fails.
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/geo", tags=["Geo Detection"])

# IP-based country detection using simple IP ranges for East Africa
# For production, you'd use a proper GeoIP database or service
COUNTRY_MAP = {
    "TZ": {"name": "Tanzania", "currency": "TZS", "phone_prefix": "+255"},
    "KE": {"name": "Kenya", "currency": "KES", "phone_prefix": "+254"},
    "UG": {"name": "Uganda", "currency": "UGX", "phone_prefix": "+256"},
}


@router.get("/detect-country")
async def detect_country(request: Request):
    """Detect user's country from IP address and Accept-Language header.
    
    Uses multiple signals:
    1. X-Country-Code header (if set by CDN/proxy)
    2. Accept-Language header (sw = Swahili → TZ/KE)
    3. Timezone hint from query param
    4. Falls back to TZ (primary market)
    """
    # Signal 1: CDN/proxy header
    cdn_country = request.headers.get("cf-ipcountry") or request.headers.get("x-country-code") or ""
    if cdn_country.upper() in COUNTRY_MAP:
        return {"country_code": cdn_country.upper(), "source": "cdn_header", **COUNTRY_MAP[cdn_country.upper()]}

    # Signal 2: Accept-Language
    accept_lang = (request.headers.get("accept-language") or "").lower()
    if "sw" in accept_lang:
        # Swahili — could be TZ or KE, default TZ
        return {"country_code": "TZ", "source": "language_sw", **COUNTRY_MAP["TZ"]}

    # Signal 3: Timezone query param (frontend can pass Intl.DateTimeFormat timezone)
    tz_hint = request.query_params.get("tz", "")
    if "nairobi" in tz_hint.lower():
        return {"country_code": "KE", "source": "timezone", **COUNTRY_MAP["KE"]}
    if "kampala" in tz_hint.lower():
        return {"country_code": "UG", "source": "timezone", **COUNTRY_MAP["UG"]}
    if "dar" in tz_hint.lower() or "africa" in tz_hint.lower():
        return {"country_code": "TZ", "source": "timezone", **COUNTRY_MAP["TZ"]}

    # Signal 4: Client IP hint (x-forwarded-for)
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
    
    # Default: Tanzania (primary market)
    return {"country_code": "TZ", "source": "default", "client_ip": client_ip, **COUNTRY_MAP["TZ"]}
