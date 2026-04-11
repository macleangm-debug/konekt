"""
Unified Pricing Policy & Commission Engine Routes

API endpoints for previewing and calculating commission distributions
using the unified pricing_policy_tiers from Settings Hub.
"""
from fastapi import APIRouter, Request, HTTPException
from commission_margin_engine_service import (
    resolve_tier,
    calculate_order_economics,
    calculate_order_commission,
    validate_wallet_usage,
    PricingPolicyError,
)

router = APIRouter(prefix="/api/commission-engine", tags=["Commission Engine"])


@router.post("/preview")
async def preview_distribution(payload: dict, request: Request):
    """
    Preview pricing economics for a single item using unified pricing policy tiers.

    Body:
    {
        "base_cost": 60000,
        "has_affiliate": true,
        "has_referral": false,
        "has_sales": true
    }
    """
    db = request.app.mongodb
    from services.settings_resolver import get_pricing_policy_tiers
    tiers = await get_pricing_policy_tiers(db)

    base_cost = float(payload.get("base_cost", 0))
    tier = resolve_tier(base_cost, tiers)

    try:
        economics = calculate_order_economics(
            base_cost=base_cost,
            tier=tier,
            has_affiliate=payload.get("has_affiliate", False),
            has_referral=payload.get("has_referral", False),
            has_sales=payload.get("has_sales", False),
        )
        return economics
    except PricingPolicyError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/calculate-order")
async def calculate_order(payload: dict, request: Request):
    """
    Calculate commission distribution for an entire order.

    Body:
    {
        "order_id": "order123",
        "line_items": [
            {"sku": "SKU001", "name": "Product 1", "base_cost": 30000, "quantity": 2},
            {"sku": "SKU002", "name": "Product 2", "base_cost": 45000, "quantity": 1}
        ],
        "source_type": "affiliate",
        "affiliate_user_id": "aff123",
        "assigned_sales_id": "sales456",
        "referral_user_id": null,
        "wallet_amount": 0
    }
    """
    db = request.app.mongodb
    try:
        return await calculate_order_commission(
            db,
            order_id=payload.get("order_id", ""),
            line_items=payload.get("line_items", []),
            source_type=payload.get("source_type", "website"),
            affiliate_user_id=payload.get("affiliate_user_id"),
            assigned_sales_id=payload.get("assigned_sales_id"),
            referral_user_id=payload.get("referral_user_id"),
            wallet_amount=float(payload.get("wallet_amount", 0)),
            config=payload.get("config"),
        )
    except PricingPolicyError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/pricing-policy-tiers")
async def get_pricing_policy_tiers_endpoint(request: Request):
    """Get the current unified pricing policy tiers from Settings Hub."""
    db = request.app.mongodb
    from services.settings_resolver import get_pricing_policy_tiers
    tiers = await get_pricing_policy_tiers(db)
    return {"tiers": tiers}


@router.put("/pricing-policy-tiers")
async def update_pricing_policy_tiers(payload: dict, request: Request):
    """
    Update pricing policy tiers. Validates split percentages before saving.

    Body:
    {
        "tiers": [
            {
                "label": "Small (0 – 100K)",
                "min_amount": 0,
                "max_amount": 100000,
                "total_margin_pct": 35,
                "protected_platform_margin_pct": 23,
                "distributable_margin_pct": 12,
                "distribution_split": {
                    "affiliate_pct": 25,
                    "promotion_pct": 20,
                    "sales_pct": 20,
                    "referral_pct": 20,
                    "reserve_pct": 15
                }
            }
        ]
    }
    """
    db = request.app.mongodb
    tiers = payload.get("tiers", [])

    # Validate each tier
    errors = []
    for i, tier in enumerate(tiers):
        split = tier.get("distribution_split", {})
        total_split = (
            float(split.get("affiliate_pct", 0)) +
            float(split.get("promotion_pct", 0)) +
            float(split.get("sales_pct", 0)) +
            float(split.get("referral_pct", 0)) +
            float(split.get("reserve_pct", 0))
        )
        if total_split > 100:
            errors.append(f"Tier {i+1} ({tier.get('label', '')}): split total is {total_split}%, exceeds 100%")

        total_margin = float(tier.get("total_margin_pct", 0))
        protected = float(tier.get("protected_platform_margin_pct", 0))
        distributable = float(tier.get("distributable_margin_pct", 0))

        if protected + distributable > total_margin + 0.01:
            errors.append(
                f"Tier {i+1} ({tier.get('label', '')}): protected({protected}%) + distributable({distributable}%) "
                f"= {protected + distributable}% exceeds total_margin({total_margin}%)"
            )

    if errors:
        raise HTTPException(status_code=422, detail={"errors": errors})

    from services.tiered_margin_engine import save_global_tiers
    await save_global_tiers(db, tiers)

    return {"status": "ok", "tiers_saved": len(tiers)}


@router.post("/validate-wallet")
async def validate_wallet_endpoint(payload: dict, request: Request):
    """
    Validate wallet usage against pricing policy rules.

    Body:
    {
        "wallet_amount": 50000,
        "base_cost": 500000,
        "selling_price": 625000,
        "distributable_pool": 40000,
        "promotion_amount": 8000,
        "max_wallet_usage_pct": 30
    }
    """
    return validate_wallet_usage(
        wallet_amount=float(payload.get("wallet_amount", 0)),
        base_cost=float(payload.get("base_cost", 0)),
        selling_price=float(payload.get("selling_price", 0)),
        distributable_pool=float(payload.get("distributable_pool", 0)),
        promotion_amount=float(payload.get("promotion_amount", 0)),
        max_wallet_usage_pct=float(payload.get("max_wallet_usage_pct", 30)),
    )


@router.post("/validate-tier-config")
async def validate_tier_config(payload: dict):
    """
    Validate a single tier's configuration.
    Returns warnings and errors.
    """
    total_margin = float(payload.get("total_margin_pct", 0))
    protected = float(payload.get("protected_platform_margin_pct", 0))
    distributable = float(payload.get("distributable_margin_pct", 0))

    split = payload.get("distribution_split", {})
    total_split = (
        float(split.get("affiliate_pct", 0)) +
        float(split.get("promotion_pct", 0)) +
        float(split.get("sales_pct", 0)) +
        float(split.get("referral_pct", 0)) +
        float(split.get("reserve_pct", 0))
    )

    errors = []
    warnings = []

    if protected + distributable > total_margin + 0.01:
        errors.append(f"protected({protected}%) + distributable({distributable}%) exceeds total_margin({total_margin}%)")

    if total_split > 100:
        errors.append(f"Distribution split total ({total_split}%) exceeds 100%")

    if total_split < 100 and total_split > 0:
        warnings.append(f"Distribution split is {total_split}% — {round(100 - total_split, 1)}% is unallocated")

    if protected < 5:
        warnings.append(f"Protected margin ({protected}%) is low — recommend at least 8-10%")

    if float(split.get("reserve_pct", 0)) < 5:
        warnings.append("Reserve is below 5% — recommend keeping at least 10% as buffer")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "total_margin_pct": total_margin,
        "margin_sum": protected + distributable,
        "split_total": total_split,
    }
