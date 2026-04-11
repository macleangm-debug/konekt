"""
Unified Pricing Policy & Commission Distribution Engine

Single source of truth for all margin, distribution, and commission logic.
Reads exclusively from Settings Hub → pricing_policy_tiers.

Core flow per order:
  1. Resolve the correct tier by base_cost amount
  2. Get that tier's total_margin_pct, protected_platform_margin_pct, distributable_margin_pct
  3. Calculate distributable_pool in money
  4. Split distributable_pool by tier's distribution_split percentages
  5. Apply priority rules (referral > affiliate, no overflow, hard validation)

STRICT RULES:
  - Referral overrides affiliate (if referral exists, affiliate allocation = 0)
  - Total split allocations must never exceed 100% of distributable pool → HARD ERROR
  - Wallet usage must never consume vendor base_cost or protected platform margin
  - No silent scaling — violations are rejected with errors
"""

from datetime import datetime, timezone


class PricingPolicyError(Exception):
    """Raised when pricing policy rules are violated."""
    pass


def resolve_tier(base_cost: float, tiers: list) -> dict:
    """
    Find the matching pricing policy tier for a given base_cost.
    Returns the tier dict or None if no match.
    """
    base_cost = float(base_cost or 0)
    for tier in tiers:
        if tier["min_amount"] <= base_cost <= tier["max_amount"]:
            return tier
    return None


def calculate_selling_price(base_cost: float, tier: dict) -> float:
    """Calculate selling price from base_cost using the tier's total margin."""
    if not tier:
        return base_cost
    return round(base_cost * (1 + tier["total_margin_pct"] / 100.0), 2)


def calculate_order_economics(
    *,
    base_cost: float,
    tier: dict,
    has_affiliate: bool = False,
    has_referral: bool = False,
    has_sales: bool = False,
):
    """
    Calculate the full economic breakdown for a single item using the unified pricing policy.

    Args:
        base_cost: Vendor/partner cost (untouched, never consumed)
        tier: The resolved pricing policy tier dict
        has_affiliate: Whether an affiliate is attributed to this order
        has_referral: Whether a referral code was used
        has_sales: Whether a salesperson is assigned

    Returns:
        dict with full breakdown: selling_price, margins, distributable pool, allocations

    Raises:
        PricingPolicyError: If tier split percentages exceed 100%
    """
    base_cost = float(base_cost or 0)

    if not tier:
        return {
            "base_cost": round(base_cost, 2),
            "selling_price": round(base_cost, 2),
            "total_margin_amount": 0,
            "protected_platform_margin_amount": 0,
            "distributable_pool": 0,
            "allocations": _empty_allocations(),
            "tier_label": "No tier matched",
            "warnings": ["No pricing tier matched for this base_cost"],
        }

    total_margin_pct = float(tier.get("total_margin_pct", 0))
    protected_pct = float(tier.get("protected_platform_margin_pct", 0))
    distributable_pct = float(tier.get("distributable_margin_pct", 0))

    selling_price = round(base_cost * (1 + total_margin_pct / 100.0), 2)
    total_margin_amount = round(selling_price - base_cost, 2)
    protected_platform_margin_amount = round(base_cost * (protected_pct / 100.0), 2)
    distributable_pool = round(base_cost * (distributable_pct / 100.0), 2)

    # Get distribution split from the tier
    split = tier.get("distribution_split", {})
    affiliate_pct = float(split.get("affiliate_pct", 0))
    promotion_pct = float(split.get("promotion_pct", 0))
    sales_pct = float(split.get("sales_pct", 0))
    referral_pct = float(split.get("referral_pct", 0))
    reserve_pct = float(split.get("reserve_pct", 0))

    # HARD VALIDATION: split must not exceed 100%
    total_split = affiliate_pct + promotion_pct + sales_pct + referral_pct + reserve_pct
    if total_split > 100.0:
        raise PricingPolicyError(
            f"Distribution split exceeds 100%: "
            f"affiliate({affiliate_pct}) + promotion({promotion_pct}) + sales({sales_pct}) "
            f"+ referral({referral_pct}) + reserve({reserve_pct}) = {total_split}%. "
            f"Fix the pricing policy tiers in Settings Hub."
        )

    # PRIORITY RULES:
    # 1. Referral overrides affiliate — if referral exists, affiliate = 0
    effective_affiliate_pct = affiliate_pct
    effective_referral_pct = referral_pct
    effective_promotion_pct = promotion_pct

    if has_referral:
        effective_affiliate_pct = 0  # Referral overrides affiliate completely
    elif not has_affiliate:
        effective_affiliate_pct = 0  # No affiliate, no allocation

    if not has_referral:
        effective_referral_pct = 0

    if not has_sales:
        sales_pct = 0

    # Calculate money amounts from distributable pool
    affiliate_amount = round(distributable_pool * (effective_affiliate_pct / 100.0), 2)
    promotion_amount = round(distributable_pool * (effective_promotion_pct / 100.0), 2)
    sales_amount = round(distributable_pool * (sales_pct / 100.0), 2)
    referral_amount = round(distributable_pool * (effective_referral_pct / 100.0), 2)
    reserve_amount = round(distributable_pool * (reserve_pct / 100.0), 2)

    total_allocated = round(
        affiliate_amount + promotion_amount + sales_amount + referral_amount + reserve_amount, 2
    )

    # HARD VALIDATION: allocated must not exceed distributable pool
    if total_allocated > distributable_pool + 0.01:  # Small float tolerance
        raise PricingPolicyError(
            f"Total allocation ({total_allocated}) exceeds distributable pool ({distributable_pool}). "
            f"This should not happen with valid split percentages. Check tier configuration."
        )

    return {
        "base_cost": round(base_cost, 2),
        "selling_price": selling_price,
        "total_margin_pct": total_margin_pct,
        "total_margin_amount": total_margin_amount,
        "protected_platform_margin_pct": protected_pct,
        "protected_platform_margin_amount": protected_platform_margin_amount,
        "distributable_margin_pct": distributable_pct,
        "distributable_pool": distributable_pool,
        "tier_label": tier.get("label", ""),
        "allocations": {
            "affiliate_amount": affiliate_amount,
            "affiliate_pct_applied": effective_affiliate_pct,
            "promotion_amount": promotion_amount,
            "promotion_pct_applied": effective_promotion_pct,
            "sales_amount": sales_amount,
            "sales_pct_applied": sales_pct,
            "referral_amount": referral_amount,
            "referral_pct_applied": effective_referral_pct,
            "reserve_amount": reserve_amount,
            "reserve_pct_applied": reserve_pct,
            "total_allocated": total_allocated,
        },
        "priority_rules_applied": {
            "referral_overrode_affiliate": has_referral and affiliate_pct > 0,
            "affiliate_active": has_affiliate and not has_referral,
            "referral_active": has_referral,
            "sales_active": has_sales,
        },
    }


def validate_wallet_usage(
    *,
    wallet_amount: float,
    base_cost: float,
    selling_price: float,
    distributable_pool: float,
    promotion_amount: float,
    max_wallet_usage_pct: float = 30.0,
):
    """
    Validate wallet usage against pricing policy rules.

    Wallet MUST NEVER consume:
      - vendor base_cost
      - protected platform margin

    Wallet can only consume from the distributable/promotional layer.

    Returns dict with allowed_wallet_amount and validation result.
    """
    wallet_amount = float(wallet_amount or 0)
    max_wallet_usage_pct = float(max_wallet_usage_pct or 30)

    # Cap 1: wallet balance (already implied by the amount passed in)
    # Cap 2: wallet usage cap % of selling price
    cap_by_pct = round(selling_price * (max_wallet_usage_pct / 100.0), 2)

    # Cap 3: safe distributable allowance — wallet can only consume from distributable pool
    safe_distributable_cap = distributable_pool

    allowed = min(wallet_amount, cap_by_pct, safe_distributable_cap)
    allowed = max(allowed, 0)

    return {
        "requested_wallet_amount": round(wallet_amount, 2),
        "allowed_wallet_amount": round(allowed, 2),
        "cap_by_percentage": cap_by_pct,
        "cap_by_distributable": safe_distributable_cap,
        "was_reduced": wallet_amount > allowed,
        "wallet_valid": True,
    }


def _empty_allocations():
    return {
        "affiliate_amount": 0,
        "affiliate_pct_applied": 0,
        "promotion_amount": 0,
        "promotion_pct_applied": 0,
        "sales_amount": 0,
        "sales_pct_applied": 0,
        "referral_amount": 0,
        "referral_pct_applied": 0,
        "reserve_amount": 0,
        "reserve_pct_applied": 0,
        "total_allocated": 0,
    }


async def calculate_order_commission(
    db,
    *,
    order_id: str,
    line_items: list,
    source_type: str = "website",
    affiliate_user_id: str = None,
    assigned_sales_id: str = None,
    referral_user_id: str = None,
    wallet_amount: float = 0,
    config: dict = None,
):
    """
    Calculate commission distribution for an entire order using unified pricing policy tiers.

    Args:
        db: Database connection
        order_id: Order ID
        line_items: List of items with base_cost (and optionally selling_price)
        source_type: website | affiliate | sales | hybrid
        affiliate_user_id: Affiliate who referred the order
        assigned_sales_id: Sales person assigned to the order
        referral_user_id: User who referred the order (referral code)
        wallet_amount: Wallet balance being applied
        config: Override tiers (for testing)

    Returns:
        dict with order_id, totals, per-item breakdowns, and wallet validation

    Raises:
        PricingPolicyError: If any pricing rule is violated
    """
    # Get tiers from Settings Hub
    if config and isinstance(config, list):
        tiers = config
    else:
        from services.settings_resolver import get_pricing_policy_tiers, get_platform_settings
        tiers = await get_pricing_policy_tiers(db)
        settings = await get_platform_settings(db)

    has_affiliate = bool(affiliate_user_id)
    has_referral = bool(referral_user_id)
    has_sales = bool(assigned_sales_id)

    item_breakdowns = []
    totals = {
        "base_cost": 0,
        "selling_price": 0,
        "total_margin": 0,
        "protected_platform_margin": 0,
        "distributable_pool": 0,
        "affiliate_commission": 0,
        "promotion_budget": 0,
        "sales_commission": 0,
        "referral_reward": 0,
        "reserve": 0,
    }

    for item in line_items:
        base_cost = float(item.get("base_cost") or item.get("partner_cost") or 0)
        quantity = int(item.get("quantity") or item.get("qty") or 1)

        tier = resolve_tier(base_cost, tiers)
        economics = calculate_order_economics(
            base_cost=base_cost,
            tier=tier,
            has_affiliate=has_affiliate,
            has_referral=has_referral,
            has_sales=has_sales,
        )

        # Multiply by quantity
        alloc = economics["allocations"]

        totals["base_cost"] += base_cost * quantity
        totals["selling_price"] += economics["selling_price"] * quantity
        totals["total_margin"] += economics["total_margin_amount"] * quantity
        totals["protected_platform_margin"] += economics["protected_platform_margin_amount"] * quantity
        totals["distributable_pool"] += economics["distributable_pool"] * quantity
        totals["affiliate_commission"] += alloc["affiliate_amount"] * quantity
        totals["promotion_budget"] += alloc["promotion_amount"] * quantity
        totals["sales_commission"] += alloc["sales_amount"] * quantity
        totals["referral_reward"] += alloc["referral_amount"] * quantity
        totals["reserve"] += alloc["reserve_amount"] * quantity

        item_breakdowns.append({
            "sku": item.get("sku"),
            "name": item.get("name"),
            "quantity": quantity,
            "unit_base_cost": base_cost,
            "unit_selling_price": economics["selling_price"],
            "tier_label": economics["tier_label"],
            "unit_economics": economics,
            "line_totals": {
                "base_cost": round(base_cost * quantity, 2),
                "selling_price": round(economics["selling_price"] * quantity, 2),
                "affiliate": round(alloc["affiliate_amount"] * quantity, 2),
                "promotion": round(alloc["promotion_amount"] * quantity, 2),
                "sales": round(alloc["sales_amount"] * quantity, 2),
                "referral": round(alloc["referral_amount"] * quantity, 2),
                "reserve": round(alloc["reserve_amount"] * quantity, 2),
            },
        })

    # Round totals
    for k in totals:
        totals[k] = round(totals[k], 2)

    # Wallet validation
    wallet_validation = None
    if wallet_amount > 0:
        max_wallet_pct = 30.0
        if not config:
            commercial = settings.get("commercial", {})
            max_wallet_pct = float(commercial.get("max_wallet_usage_pct", 30))

        wallet_validation = validate_wallet_usage(
            wallet_amount=wallet_amount,
            base_cost=totals["base_cost"],
            selling_price=totals["selling_price"],
            distributable_pool=totals["distributable_pool"],
            promotion_amount=totals["promotion_budget"],
            max_wallet_usage_pct=max_wallet_pct,
        )

    return {
        "order_id": order_id,
        "source_type": source_type,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "ownership": {
            "affiliate_user_id": affiliate_user_id,
            "assigned_sales_id": assigned_sales_id,
            "referral_user_id": referral_user_id,
        },
        "totals": totals,
        "priority_rules": {
            "referral_overrides_affiliate": has_referral,
            "affiliate_active": has_affiliate and not has_referral,
            "sales_active": has_sales,
        },
        "wallet_validation": wallet_validation,
        "item_breakdowns": item_breakdowns,
    }
