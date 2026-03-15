POINT_VALUE_TZS = 1  # 1 point = 1 TZS, adjust later in settings if needed


def calculate_points_redemption(points_balance: int, requested_points: int, subtotal: float):
    allowed_points = max(0, min(int(points_balance or 0), int(requested_points or 0)))
    max_points_by_subtotal = int(max(0, subtotal))
    usable_points = min(allowed_points, max_points_by_subtotal)
    discount_value = usable_points * POINT_VALUE_TZS

    return {
        "usable_points": usable_points,
        "discount_value": discount_value,
    }
