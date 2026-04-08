"""
Distribution Margin Engine
Implements the locked business model:
  Vendor Price + Konekt Margin (fixed) + Distribution Layer (flexible) = Final Price

Distribution Layer funds:
  - Affiliate commission
  - Sales commission
  - Customer discount

Rules:
  - Konekt margin is NEVER reduced
  - Distribution layer sits ON TOP of Konekt margin
  - affiliate_pct + sales_pct + discount_pct <= distribution_margin_pct
"""

from decimal import Decimal, ROUND_HALF_UP


def _money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_final_price(
    vendor_price_tax_inclusive: float,
    konekt_margin_pct: float,
    distribution_margin_pct: float,
):
    vendor = _money(vendor_price_tax_inclusive)
    konekt_value = _money(vendor * Decimal(str(konekt_margin_pct)) / Decimal("100"))
    dist_value = _money(vendor * Decimal(str(distribution_margin_pct)) / Decimal("100"))
    final = _money(vendor + konekt_value + dist_value)
    return {
        "vendor_price_tax_inclusive": float(vendor),
        "konekt_margin_pct": float(konekt_margin_pct),
        "konekt_margin_value": float(konekt_value),
        "distribution_margin_pct": float(distribution_margin_pct),
        "distribution_margin_value": float(dist_value),
        "final_price": float(final),
    }


def validate_distribution_split(
    affiliate_pct: float,
    sales_pct: float,
    discount_pct: float,
    distribution_margin_pct: float,
):
    """
    Split percentages are OF the distributable pool (not of vendor price).
    Total must be <= 100%.
    """
    total = Decimal(str(affiliate_pct)) + Decimal(str(sales_pct)) + Decimal(str(discount_pct))
    cap = Decimal("100")
    return {
        "affiliate_pct": float(affiliate_pct),
        "sales_pct": float(sales_pct),
        "discount_pct": float(discount_pct),
        "total_split_pct": float(total),
        "distribution_margin_pct": float(distribution_margin_pct),
        "is_valid": total <= cap,
        "remaining_pct": float(cap - total) if total <= cap else 0,
    }


def calculate_distribution_components(
    vendor_price_tax_inclusive: float,
    affiliate_pct: float,
    sales_pct: float,
    discount_pct: float,
    distribution_margin_pct: float = 10,
):
    """
    Calculate TZS amounts for each split component.
    affiliate_pct, sales_pct, discount_pct are % OF the distributable pool.
    """
    vendor = _money(vendor_price_tax_inclusive)
    dist_value = _money(vendor * Decimal(str(distribution_margin_pct)) / Decimal("100"))
    aff = _money(dist_value * Decimal(str(affiliate_pct)) / Decimal("100"))
    sal = _money(dist_value * Decimal(str(sales_pct)) / Decimal("100"))
    disc = _money(dist_value * Decimal(str(discount_pct)) / Decimal("100"))
    return {
        "affiliate_commission": float(aff),
        "sales_commission": float(sal),
        "customer_discount": float(disc),
        "distributable_pool": float(dist_value),
    }


def build_order_margin_record(
    vendor_price: float,
    konekt_margin_pct: float,
    distribution_margin_pct: float,
    affiliate_pct: float,
    sales_pct: float,
    discount_pct: float,
    affiliate_id: str = None,
    sales_user_id: str = None,
):
    pricing = calculate_final_price(vendor_price, konekt_margin_pct, distribution_margin_pct)
    components = calculate_distribution_components(vendor_price, affiliate_pct, sales_pct, discount_pct, distribution_margin_pct)
    return {
        "vendor_price": pricing["vendor_price_tax_inclusive"],
        "konekt_margin_pct": pricing["konekt_margin_pct"],
        "konekt_margin_value": pricing["konekt_margin_value"],
        "distribution_margin_pct": pricing["distribution_margin_pct"],
        "distribution_margin_value": pricing["distribution_margin_value"],
        "final_price": pricing["final_price"],
        "affiliate_id": affiliate_id,
        "affiliate_commission": components["affiliate_commission"],
        "sales_user_id": sales_user_id,
        "sales_commission": components["sales_commission"],
        "customer_discount": components["customer_discount"],
    }
