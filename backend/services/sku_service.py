"""
Konekt SKU generator — single source of truth for product SKUs.

Pattern (from Settings Hub → catalog → sku_format):
    {PREFIX}-{COUNTRY}-{CATEGORY}-{RANDOM}
e.g. KNT-TZ-OEQ-A7K92M

- PREFIX:   platform code (default "KNT")
- COUNTRY:  2-letter country ISO (TZ / KE / UG)
- CATEGORY: 2-4 letter code derived from category name (or admin override)
- RANDOM:   6-character A-Z 0-9 (collision-checked up to 5 retries)

This module is imported by product creation (admin, vendor, Ops impersonation, bulk
import, AI-assisted import) so every product has a Konekt-owned SKU. The vendor's
own SKU is stored separately in `vendor_sku`.
"""
import re
import secrets
import string
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase


ALLOWED_RANDOM = string.ascii_uppercase + string.digits
DEFAULT_FORMAT = "{PREFIX}-{COUNTRY}-{CATEGORY}-{RANDOM}"
DEFAULT_PREFIX = "KNT"
STOPWORDS = {"and", "or", "the", "of", "for", "with", "in"}


def derive_category_code(name: str) -> str:
    """Derive a 2-4 letter short code from a category name.
    - Single word: first 3 letters
    - Multi-word: first letter of each non-stopword (max 4)
    - Falls back to GEN if name is blank
    """
    if not name:
        return "GEN"
    name = re.sub(r"[^A-Za-z\s]", " ", name).strip().upper()
    if not name:
        return "GEN"
    words = [w for w in name.split() if w.lower() not in STOPWORDS]
    if not words:
        return name[:3].ljust(3, "X")
    if len(words) == 1:
        return words[0][:3].ljust(3, "X")
    code = "".join(w[0] for w in words[:4])
    return code[:4]


async def get_category_code(db: AsyncIOMotorDatabase, category_name: str, country_code: str = "TZ") -> str:
    """Look up the admin-set category code, falling back to auto-derivation."""
    if not category_name:
        return "GEN"
    # Admin override per category in settings_hub.catalog.categories
    hub_doc = await db.admin_settings.find_one({"key": "settings_hub"}) or {}
    hub = (hub_doc.get("value") or {}).get("catalog", {})
    for cat in hub.get("categories", []) or []:
        if isinstance(cat, dict) and (cat.get("name", "").strip().lower() == category_name.strip().lower()):
            override = (cat.get("code") or "").strip().upper()
            if override:
                return override[:4]
        elif isinstance(cat, str) and cat.strip().lower() == category_name.strip().lower():
            break
    return derive_category_code(category_name)


def _random_chunk(length: int = 6) -> str:
    return "".join(secrets.choice(ALLOWED_RANDOM) for _ in range(length))


async def generate_konekt_sku(
    db: AsyncIOMotorDatabase,
    *,
    category_name: str,
    country_code: str = "TZ",
    prefix: Optional[str] = None,
    sku_format: Optional[str] = None,
    max_retries: int = 5,
) -> str:
    """Generate a fresh, collision-free Konekt SKU.
    Callers should invoke this once per product — the returned SKU is already
    guaranteed unique against the `products` collection at call-time.
    """
    # Resolve format + prefix from Settings Hub if not passed
    if sku_format is None or prefix is None:
        hub_doc = await db.admin_settings.find_one({"key": "settings_hub"}) or {}
        catalog = (hub_doc.get("value") or {}).get("catalog", {})
        sku_format = sku_format or catalog.get("sku_format") or DEFAULT_FORMAT
        prefix = prefix or catalog.get("sku_prefix") or DEFAULT_PREFIX

    # Force-upgrade legacy formats that don't include {COUNTRY} — ensures country isolation
    if "{COUNTRY}" not in sku_format:
        sku_format = DEFAULT_FORMAT

    category_code = await get_category_code(db, category_name, country_code)
    country_code = (country_code or "TZ").upper()[:2]

    for _ in range(max_retries):
        sku = (
            sku_format
            .replace("{PREFIX}", prefix)
            .replace("{COUNTRY}", country_code)
            .replace("{CATEGORY}", category_code)
            .replace("{RANDOM}", _random_chunk(6))
        )
        existing = await db.products.find_one({"sku": sku}, {"_id": 1})
        if not existing:
            return sku
    # Extremely unlikely fallback — add 2 extra random chars
    return sku + _random_chunk(2)


def matches_konekt_pattern(sku: str, prefix: str = DEFAULT_PREFIX) -> bool:
    """Returns True if the SKU already follows the KNT-XX-XXX-XXXXXX pattern."""
    if not sku:
        return False
    pattern = rf"^{re.escape(prefix)}-[A-Z]{{2}}-[A-Z]{{2,4}}-[A-Z0-9]{{6,8}}$"
    return bool(re.match(pattern, sku.upper()))
