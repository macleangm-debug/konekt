"""
Product Margin Pricing Service
Simple margin calculator for vendor cost → sell price.
"""


def apply_margin(base_cost, margin_percent=20):
    """Apply a percentage margin to base cost to get sell price."""
    if base_cost is None:
        return None
    try:
        base = float(base_cost)
    except (TypeError, ValueError):
        return None
    return round(base * (1 + (margin_percent / 100.0)), 2)
