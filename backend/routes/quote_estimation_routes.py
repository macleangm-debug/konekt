"""
Instant Quote Estimation API

Public endpoint that returns customer-safe price estimates using the
pricing policy engine. NEVER exposes internal margins, distributions,
or allocation mechanics.

Outputs:
- Estimated price or price range
- Active promotion awareness
- Tier-aware quantity pricing
"""
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/quote-estimate", tags=["Quote Estimation"])


@router.post("")
async def estimate_price(payload: dict, request: Request):
    """
    Calculate a customer-safe price estimate.

    Body:
    {
        "base_cost": 50000,
        "quantity": 5,
        "promo_code": "LAUNCH2026",      // optional
        "category_id": "cat-1",          // optional (for scoped promos)
        "product_id": "prod-1"           // optional (for scoped promos)
    }

    Returns customer-safe output ONLY:
    {
        "estimated_unit_price": 67500,
        "estimated_total": 337500,
        "quantity": 5,
        "promotion_applied": true,
        "discount_amount": 8100,
        "final_estimated_total": 329400,
        "promo_message": "Welcome! Enjoy your launch discount!",
        "price_note": "Final price confirmed after review"
    }

    NEVER returns: margin %, distributable pool, affiliate/referral math, allocation breakdown.
    """
    db = request.app.mongodb
    from services.settings_resolver import get_pricing_policy_tiers
    from commission_margin_engine_service import resolve_tier

    tiers = await get_pricing_policy_tiers(db)
    base_cost = float(payload.get("base_cost") or 0)
    quantity = max(int(payload.get("quantity") or 1), 1)

    if base_cost <= 0:
        return {
            "estimated_unit_price": 0,
            "estimated_total": 0,
            "quantity": quantity,
            "promotion_applied": False,
            "discount_amount": 0,
            "final_estimated_total": 0,
            "price_note": "Price available upon request",
        }

    # Resolve tier for base_cost
    tier = resolve_tier(base_cost, tiers)
    if tier:
        total_margin_pct = float(tier.get("total_margin_pct", 0))
        selling_price = round(base_cost * (1 + total_margin_pct / 100.0), 2)
    else:
        selling_price = round(base_cost * 1.25, 2)  # Safe fallback

    estimated_total = round(selling_price * quantity, 2)

    # Check for promotion
    promo_code = (payload.get("promo_code") or "").strip().upper()
    promo_applied = False
    discount_amount = 0
    promo_message = ""

    if promo_code:
        from services.promotions_service import apply_promotion_to_order

        line_items = [{
            "base_cost": base_cost,
            "quantity": quantity,
            "category_id": payload.get("category_id"),
            "product_id": payload.get("product_id"),
        }]
        promo_result = await apply_promotion_to_order(
            db,
            promo_code=promo_code,
            customer_id=payload.get("customer_id", ""),
            line_items=line_items,
            pricing_tiers=tiers,
            has_affiliate=False,
            has_referral=False,
        )
        if promo_result.get("valid"):
            promo_applied = True
            discount_amount = round(float(promo_result.get("discount_amount", 0)), 2)
            promo_message = promo_result.get("customer_message", "Promotion applied!")

    final_total = round(estimated_total - discount_amount, 2)

    return {
        "estimated_unit_price": selling_price,
        "estimated_total": estimated_total,
        "quantity": quantity,
        "promotion_applied": promo_applied,
        "discount_amount": discount_amount,
        "final_estimated_total": max(final_total, 0),
        "promo_message": promo_message,
        "price_note": "Final price confirmed after review",
    }


@router.post("/range")
async def estimate_price_range(payload: dict, request: Request):
    """
    Return a safe price range for display when exact pricing isn't fixed.
    Useful for services with variable pricing.

    Body:
    {
        "min_base_cost": 40000,
        "max_base_cost": 80000,
        "quantity": 1
    }

    Returns:
    {
        "price_range_low": 54000,
        "price_range_high": 96000,
        "quantity": 1,
        "range_note": "Estimated: TZS 54,000 – 96,000"
    }
    """
    db = request.app.mongodb
    from services.settings_resolver import get_pricing_policy_tiers
    from commission_margin_engine_service import resolve_tier

    tiers = await get_pricing_policy_tiers(db)
    min_cost = float(payload.get("min_base_cost") or 0)
    max_cost = float(payload.get("max_base_cost") or min_cost)
    quantity = max(int(payload.get("quantity") or 1), 1)

    def calc_sell(cost):
        tier = resolve_tier(cost, tiers)
        if tier:
            return round(cost * (1 + tier["total_margin_pct"] / 100.0), 2)
        return round(cost * 1.25, 2)

    low = calc_sell(min_cost) * quantity
    high = calc_sell(max_cost) * quantity

    fmt_low = f"TZS {int(low):,}"
    fmt_high = f"TZS {int(high):,}"

    return {
        "price_range_low": round(low, 2),
        "price_range_high": round(high, 2),
        "quantity": quantity,
        "range_note": f"Estimated: {fmt_low} – {fmt_high}" if low != high else f"Estimated: {fmt_low}",
    }
