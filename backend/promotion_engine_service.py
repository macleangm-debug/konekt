"""
Promotion Engine Service — Safe promotion budget calculation.

All promotions are funded ONLY from the distributable pool, NEVER from
vendor base_cost or protected platform margin.

Uses the unified pricing_policy_tiers as the single source of truth.
"""

from datetime import datetime, timezone


def calculate_safe_promotion_budget(
    *,
    base_cost: float,
    tier: dict = None,
    total_margin_pct: float = None,
    protected_platform_margin_pct: float = None,
    distributable_margin_pct: float = None,
):
    """
    Calculate the maximum safe promotion budget for a given base_cost.

    If a tier is provided, uses tier values.
    Otherwise uses explicit percentages.

    The promotion budget is the promotion_pct share of the distributable pool.
    The max safe promotion amount is the ENTIRE distributable pool (theoretical max).
    """
    base_cost = float(base_cost or 0)

    if tier:
        total_margin_pct = float(tier.get("total_margin_pct", 0))
        protected_platform_margin_pct = float(tier.get("protected_platform_margin_pct", 0))
        distributable_margin_pct = float(tier.get("distributable_margin_pct", 0))
        split = tier.get("distribution_split", {})
        promotion_pct_of_distributable = float(split.get("promotion_pct", 0))
    else:
        total_margin_pct = float(total_margin_pct or 0)
        protected_platform_margin_pct = float(protected_platform_margin_pct or 0)
        distributable_margin_pct = float(distributable_margin_pct or 0)
        promotion_pct_of_distributable = 20.0  # Default

    selling_price = round(base_cost * (1 + total_margin_pct / 100.0), 2)
    protected_platform_margin_amount = round(base_cost * (protected_platform_margin_pct / 100.0), 2)
    distributable_pool = round(base_cost * (distributable_margin_pct / 100.0), 2)

    # The promotion budget is the promotion slice of the distributable pool
    promotion_budget = round(distributable_pool * (promotion_pct_of_distributable / 100.0), 2)

    # Max safe promotion amount = entire distributable pool (absolute ceiling)
    max_safe_promotion_amount = distributable_pool

    max_safe_promotion_percent_of_selling_price = round(
        (max_safe_promotion_amount / selling_price) * 100.0, 2
    ) if selling_price else 0

    return {
        "base_cost": round(base_cost, 2),
        "selling_price": selling_price,
        "total_margin_pct": total_margin_pct,
        "protected_platform_margin_amount": protected_platform_margin_amount,
        "distributable_pool": distributable_pool,
        "promotion_budget": promotion_budget,
        "promotion_pct_of_distributable": promotion_pct_of_distributable,
        "max_safe_promotion_amount": max_safe_promotion_amount,
        "max_safe_promotion_percent_of_selling_price": max_safe_promotion_percent_of_selling_price,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }
