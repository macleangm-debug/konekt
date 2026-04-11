"""
Phase 45 — Platform Promotion Engine Service

Canonical promotion pricing resolver. Single source of truth for:
- Guest checkout, In-account checkout, Affiliate flows, Sales/Admin quotes.

Rules:
1. Konekt operational margin is NEVER touched by promotions.
2. Promotions draw from the distributable pool only.
3. Platform promotion + affiliate discount do NOT freely stack.
   Admin configures stacking policy per promotion.
4. Margin safety validator blocks (not just warns) unsafe promotions.
"""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

STACKING_POLICIES = ["no_stack", "cap_total", "reduce_affiliate"]


def _d(v):
    return Decimal(str(v or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ─────────── Margin Safety Validator ───────────

def validate_promotion_safety(
    *,
    vendor_price: float,
    operational_margin_pct: float,
    distributable_margin_pct: float,
    promo_type: str,          # "percentage" | "fixed"
    promo_value: float,
    affiliate_share_pct: float = 40,
    sales_share_pct: float = 30,
    discount_share_pct: float = 30,
    stacking_policy: str = "no_stack",
):
    """
    Validate whether a promotion is safe.
    Returns a dict with safety status and full breakdown.
    Blocks (safe=False) if the promo eats into operational margin.
    """
    vp = _d(vendor_price)
    op_pct = _d(operational_margin_pct)
    dp_pct = _d(distributable_margin_pct)
    hundred = Decimal("100")

    op_val = _d(vp * op_pct / hundred)
    dp_val = _d(vp * dp_pct / hundred)
    standard_final = _d(vp + op_val + dp_val)

    # Calculate promo discount amount
    if promo_type == "percentage":
        promo_discount = _d(standard_final * _d(promo_value) / hundred)
    else:  # fixed
        promo_discount = _d(promo_value)

    promo_price = _d(standard_final - promo_discount)

    # The promo draws from the distributable pool
    remaining_distributable = _d(dp_val - promo_discount)

    # Safety check: promo cannot exceed the distributable pool
    safe = remaining_distributable >= Decimal("0")

    # Even if safe, compute affiliate/sales effect under stacking
    aff_pct = _d(affiliate_share_pct)
    sal_pct = _d(sales_share_pct)
    disc_pct = _d(discount_share_pct)

    if safe and stacking_policy == "no_stack":
        # Promo replaces the customer discount share entirely
        effective_dp = remaining_distributable
        effective_aff = _d(effective_dp * aff_pct / hundred)
        effective_sal = _d(effective_dp * sal_pct / hundred)
        effective_disc = Decimal("0")  # replaced by promo
    elif safe and stacking_policy == "cap_total":
        # Promo + affiliate discount capped at distributable pool
        base_disc = _d(dp_val * disc_pct / hundred)
        total_deduction = _d(promo_discount + base_disc)
        if total_deduction > dp_val:
            # Cap: reduce promo to fit
            promo_discount = _d(dp_val - base_disc)
            promo_price = _d(standard_final - promo_discount)
            remaining_distributable = _d(dp_val - promo_discount)
        effective_dp = remaining_distributable
        effective_aff = _d(effective_dp * aff_pct / hundred)
        effective_sal = _d(effective_dp * sal_pct / hundred)
        effective_disc = _d(effective_dp * disc_pct / hundred)
    elif safe and stacking_policy == "reduce_affiliate":
        # Promo applied, affiliate share reduced proportionally
        ratio = remaining_distributable / dp_val if dp_val else Decimal("1")
        effective_aff = _d(dp_val * aff_pct / hundred * ratio)
        effective_sal = _d(dp_val * sal_pct / hundred * ratio)
        effective_disc = Decimal("0")
        effective_dp = remaining_distributable
    else:
        effective_aff = Decimal("0")
        effective_sal = Decimal("0")
        effective_disc = Decimal("0")
        effective_dp = remaining_distributable

    return {
        "safe": safe,
        "vendor_price": float(vp),
        "standard_price": float(standard_final),
        "promo_discount": float(promo_discount),
        "promo_price": float(promo_price),
        "operational_margin": float(op_val),
        "distributable_pool_original": float(dp_val),
        "distributable_pool_remaining": float(remaining_distributable),
        "effective_affiliate_amount": float(effective_aff),
        "effective_sales_amount": float(effective_sal),
        "effective_discount_amount": float(effective_disc),
        "stacking_policy": stacking_policy,
        "blocked_reason": None if safe else "Promotion exceeds distributable pool. Would erode operational margin.",
    }


# ─────────── Active Promotion Resolver ───────────

async def resolve_active_promotions(db, *, product_id=None, category=None):
    """
    Find active promotions applicable to a product.
    Resolution: product-specific > category > global.
    Reads from the canonical `promotions` collection (managed by Promotions Manager).
    Returns a list (usually 0 or 1 promotions) with normalized field names.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    query_base = {
        "status": "active",
        "$or": [
            {"start_date": {"$exists": False}},
            {"start_date": None},
            {"start_date": ""},
            {"start_date": {"$lte": now_iso}},
        ],
    }

    def _normalize(p):
        """Map canonical promotions fields to engine-expected fields."""
        if not p:
            return None
        return {
            "id": p.get("id", ""),
            "title": p.get("name", ""),
            "scope": p.get("scope", "global"),
            "scope_target": p.get("target_product_id") or p.get("target_category_id") or p.get("target_category_name"),
            "promo_type": p.get("discount_type", "percentage"),
            "promo_value": float(p.get("discount_value", 0)),
            "stacking_policy": p.get("stacking_rule", "no_stack"),
            "starts_at": p.get("start_date"),
            "ends_at": p.get("end_date"),
            "status": p.get("status"),
            "code": p.get("code", ""),
        }

    promotions = []

    # 1. Product-specific
    if product_id:
        p = await db.promotions.find_one(
            {**query_base, "scope": "product", "target_product_id": product_id},
            {"_id": 0},
        )
        n = _normalize(p)
        if n and _is_not_expired(n, now):
            promotions.append(n)
            return promotions

    # 2. Category-level
    if category:
        p = await db.promotions.find_one(
            {**query_base, "scope": "category",
             "$or": [{"target_category_id": category}, {"target_category_name": category}]},
            {"_id": 0},
        )
        n = _normalize(p)
        if n and _is_not_expired(n, now):
            promotions.append(n)
            return promotions

    # 3. Global
    p = await db.promotions.find_one(
        {**query_base, "scope": "global"},
        {"_id": 0},
    )
    n = _normalize(p)
    if n and _is_not_expired(n, now):
        promotions.append(n)

    return promotions


def _is_not_expired(promo, now):
    ends = promo.get("ends_at")
    if not ends:
        return True
    if isinstance(ends, str):
        try:
            ends = datetime.fromisoformat(ends.replace("Z", "+00:00"))
        except Exception:
            return True
    if isinstance(ends, datetime):
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=timezone.utc)
        return now <= ends
    return True


# ─────────── Checkout Pricing With Promotion ───────────

async def apply_promotion_to_price(
    db,
    *,
    vendor_price: float,
    operational_margin_pct: float,
    distributable_margin_pct: float,
    split_settings: dict,
    product_id: str = None,
    category: str = None,
):
    """
    Resolve pricing with any applicable promotion.
    Returns canonical pricing dict used by ALL checkout flows.
    """
    from services.margin_engine import resolve_pricing

    vp = _d(vendor_price)
    op_pct = _d(operational_margin_pct)
    dp_pct = _d(distributable_margin_pct)
    hundred = Decimal("100")

    op_val = _d(vp * op_pct / hundred)
    dp_val = _d(vp * dp_pct / hundred)
    standard_final = _d(vp + op_val + dp_val)

    # Check for active promotions
    promos = await resolve_active_promotions(db, product_id=product_id, category=category)

    if not promos:
        # No promotion — return standard pricing
        return {
            "has_promotion": False,
            "standard_price": float(standard_final),
            "final_price": float(standard_final),
            "promo_discount": 0,
            "promo_label": None,
            "promo_id": None,
            "operational_margin": float(op_val),
            "distributable_pool": float(dp_val),
            "affiliate_amount": float(_d(dp_val * _d(split_settings.get("affiliate_share_pct", 40)) / hundred)),
            "sales_amount": float(_d(dp_val * _d(split_settings.get("sales_share_pct", 30)) / hundred)),
            "discount_amount": float(_d(dp_val * _d(split_settings.get("discount_share_pct", 30)) / hundred)),
        }

    promo = promos[0]
    promo_type = promo.get("promo_type", "percentage")
    promo_value = float(promo.get("promo_value", 0))
    stacking = promo.get("stacking_policy", "no_stack")

    result = validate_promotion_safety(
        vendor_price=vendor_price,
        operational_margin_pct=operational_margin_pct,
        distributable_margin_pct=distributable_margin_pct,
        promo_type=promo_type,
        promo_value=promo_value,
        affiliate_share_pct=split_settings.get("affiliate_share_pct", 40),
        sales_share_pct=split_settings.get("sales_share_pct", 30),
        discount_share_pct=split_settings.get("discount_share_pct", 30),
        stacking_policy=stacking,
    )

    if not result["safe"]:
        # Unsafe promo — return standard pricing (promo blocked)
        return {
            "has_promotion": False,
            "standard_price": float(standard_final),
            "final_price": float(standard_final),
            "promo_discount": 0,
            "promo_label": None,
            "promo_id": None,
            "promo_blocked": True,
            "blocked_reason": result["blocked_reason"],
            "operational_margin": float(op_val),
            "distributable_pool": float(dp_val),
            "affiliate_amount": float(_d(dp_val * _d(split_settings.get("affiliate_share_pct", 40)) / hundred)),
            "sales_amount": float(_d(dp_val * _d(split_settings.get("sales_share_pct", 30)) / hundred)),
            "discount_amount": float(_d(dp_val * _d(split_settings.get("discount_share_pct", 30)) / hundred)),
        }

    return {
        "has_promotion": True,
        "standard_price": result["standard_price"],
        "final_price": result["promo_price"],
        "promo_discount": result["promo_discount"],
        "promo_label": promo.get("title", ""),
        "promo_id": promo.get("id", ""),
        "promo_type": promo_type,
        "promo_value": promo_value,
        "stacking_policy": stacking,
        "operational_margin": result["operational_margin"],
        "distributable_pool": result["distributable_pool_original"],
        "distributable_pool_remaining": result["distributable_pool_remaining"],
        "affiliate_amount": result["effective_affiliate_amount"],
        "sales_amount": result["effective_sales_amount"],
        "discount_amount": result["effective_discount_amount"],
    }
