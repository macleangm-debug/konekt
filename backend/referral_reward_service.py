from math import floor


def calculate_referral_points(settings: dict, order_total: float) -> int:
    """Calculate referral points based on order total and settings"""
    if not settings.get("enabled", True):
        return 0

    minimum_order_amount = float(settings.get("minimum_order_amount", 0) or 0)
    if float(order_total or 0) < minimum_order_amount:
        return 0

    reward_mode = settings.get("reward_mode", "points_per_amount")

    if reward_mode == "fixed_points":
        points = int(settings.get("fixed_points", 0) or 0)
    else:
        # points_per_amount mode
        points_per_amount = float(settings.get("points_per_amount", 1) or 1)
        amount_unit = float(settings.get("amount_unit", 1000) or 1000)
        points = floor((float(order_total or 0) / amount_unit) * points_per_amount)

    max_points_per_order = int(settings.get("max_points_per_order", 5000) or 5000)
    return max(0, min(points, max_points_per_order))


def points_to_discount_amount(settings: dict, points: int) -> float:
    """Convert points to discount amount based on settings"""
    point_value_points = int(settings.get("point_value_points", 100) or 100)
    point_value_amount = float(settings.get("point_value_amount", 5000) or 5000)

    if point_value_points <= 0:
        return 0.0

    ratio = points / point_value_points
    return round(ratio * point_value_amount, 2)
