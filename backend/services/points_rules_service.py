"""
Points Rules Service
Enforces that points can only be redeemed from the allowed margin portion.
"""


def calculate_max_points_redemption_amount(
    *,
    final_selling_price: float,
    partner_cost: float,
    protected_margin_percent: float = 40,
    points_cap_percent_of_distributable_margin: float = 10,
):
    """
    Calculate the maximum amount of points that can be redeemed.
    Points come from distributable margin only, NOT from order total.
    """
    gross_margin = final_selling_price - partner_cost
    if gross_margin <= 0:
        return {
            "gross_margin": 0,
            "protected_margin_amount": 0,
            "distributable_margin": 0,
            "max_points_redemption_amount": 0,
        }

    protected_margin_amount = gross_margin * (protected_margin_percent / 100)
    distributable_margin = max(gross_margin - protected_margin_amount, 0)
    max_points_redemption_amount = distributable_margin * (
        points_cap_percent_of_distributable_margin / 100
    )

    return {
        "gross_margin": round(gross_margin, 2),
        "protected_margin_amount": round(protected_margin_amount, 2),
        "distributable_margin": round(distributable_margin, 2),
        "max_points_redemption_amount": round(max_points_redemption_amount, 2),
    }


def apply_points_redemption_guard(
    *,
    requested_points_amount: float,
    max_points_redemption_amount: float,
):
    """
    Guard against redeeming more points than allowed.
    """
    approved_points_amount = min(
        float(requested_points_amount or 0),
        float(max_points_redemption_amount or 0),
    )

    return {
        "requested_points_amount": round(float(requested_points_amount or 0), 2),
        "approved_points_amount": round(approved_points_amount, 2),
        "points_guard_applied": True,
        "was_capped": requested_points_amount > max_points_redemption_amount,
    }
