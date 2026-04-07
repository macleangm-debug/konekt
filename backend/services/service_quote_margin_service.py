"""Service Quote Margin Service — calculates margin on vendor base quotes."""
from decimal import Decimal, ROUND_HALF_UP


def money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def apply_margin_percent(base_tax_inclusive_cost: float, margin_percent: float):
    base = money(base_tax_inclusive_cost)
    margin_pct = Decimal(str(margin_percent or 0))
    margin_value = money(base * (margin_pct / Decimal("100")))
    final_amount = money(base + margin_value)
    return {
        "base_tax_inclusive_cost": float(base),
        "margin_percent": float(margin_pct),
        "margin_value": float(margin_value),
        "final_quote_amount": float(final_amount),
    }


def build_internal_service_quote_line(service_name: str, vendor_base_tax_inclusive: float, margin_percent: float):
    pricing = apply_margin_percent(vendor_base_tax_inclusive, margin_percent)
    return {
        "service_name": service_name,
        **pricing,
    }


def build_customer_facing_service_quote_line(service_name: str, vendor_base_tax_inclusive: float, margin_percent: float):
    pricing = apply_margin_percent(vendor_base_tax_inclusive, margin_percent)
    return {
        "service_name": service_name,
        "quoted_amount": pricing["final_quote_amount"],
    }
