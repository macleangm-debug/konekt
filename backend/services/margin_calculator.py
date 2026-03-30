def apply_percentage(cost: float, percent: float) -> float:
    return round(cost * (1 + (percent / 100.0)), 2)

def apply_fixed_amount(cost: float, fixed_amount: float) -> float:
    return round(cost + fixed_amount, 2)

def apply_tiered(cost: float, tiers: list[dict]) -> float:
    for tier in tiers or []:
        min_cost = tier.get("min_cost", 0)
        max_cost = tier.get("max_cost")
        if cost >= min_cost and (max_cost is None or cost <= max_cost):
            return apply_percentage(cost, tier.get("value", 0))
    return cost

def calculate_selling_price(cost: float, rule: dict | None) -> float:
    if not rule:
        return cost
    method = rule.get("method")
    if method == "percentage":
        return apply_percentage(cost, rule.get("value", 0))
    if method == "fixed_amount":
        return apply_fixed_amount(cost, rule.get("value", 0))
    if method == "tiered":
        return apply_tiered(cost, rule.get("tiers", []))
    return cost
