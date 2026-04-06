"""
Canonical Checkout Totals Service.
Single source of truth for subtotal, VAT, and grand total calculation.
Used by BOTH guest checkout and account checkout.
"""
import math


DEFAULT_VAT_PERCENT = 18.0


async def get_vat_percent(db) -> float:
    """Read VAT rate from settings_hub, falling back to default."""
    settings = await db.settings_hub.find_one({}, {"_id": 0, "commercial.vat_percent": 1})
    if settings and "commercial" in settings:
        return float(settings["commercial"].get("vat_percent", DEFAULT_VAT_PERCENT))
    return DEFAULT_VAT_PERCENT


def calculate_totals(line_items: list, vat_percent: float) -> dict:
    """
    Canonical totals calculation.
    line_items: list of dicts with 'quantity' and 'unit_price'
    Returns: { subtotal, vat_percent, vat_amount, total }
    """
    subtotal = 0
    for item in line_items:
        qty = int(item.get("quantity", 1))
        price = float(item.get("unit_price", 0))
        subtotal += qty * price

    vat_amount = math.floor(subtotal * (vat_percent / 100))
    total = subtotal + vat_amount

    return {
        "subtotal": subtotal,
        "vat_percent": vat_percent,
        "vat_amount": vat_amount,
        "total": total,
    }
