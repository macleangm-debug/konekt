"""
Promotions CRUD & Validation Service

Promotions consume ONLY from the promotion allocation of the distributable pool.
They NEVER touch vendor/base cost, protected/platform margin, or borrow from
affiliate, referral, or sales allocations.

Stacking rules:
  - no_stack: Cannot be combined with any other promotion
  - stack_with_cap: Can be combined, but total discount capped at promotion allocation
  - reduce_when_affiliate: Promotion value reduced when affiliate is active
  - referral_priority: Referral gets priority; promotion may be reduced or blocked

Promotion scope:
  - global: Applies to all products/services
  - category: Applies to a specific catalog category
  - product: Applies to a specific product
"""

from datetime import datetime, timezone
from uuid import uuid4
from commission_margin_engine_service import resolve_tier, PricingPolicyError


def _now():
    return datetime.now(timezone.utc).isoformat()


VALID_SCOPES = ["global", "category", "product"]
VALID_DISCOUNT_TYPES = ["percentage", "fixed_amount"]
VALID_STACKING_RULES = ["no_stack", "stack_with_cap", "reduce_when_affiliate", "referral_priority"]
VALID_STATUSES = ["active", "inactive", "expired", "scheduled"]


def validate_promotion(promo: dict, pricing_tiers: list = None) -> list:
    """
    Validate a promotion dict against business rules.
    Returns list of error strings. Empty list = valid.
    Discount values are no longer required — calculated at runtime from pricing policy.
    """
    errors = []

    # Required fields
    if not promo.get("name"):
        errors.append("Promotion name is required")
    if not promo.get("code"):
        errors.append("Promotion code is required")
    if promo.get("scope") not in VALID_SCOPES:
        errors.append(f"Scope must be one of: {', '.join(VALID_SCOPES)}")
    if promo.get("stacking_rule") and promo["stacking_rule"] not in VALID_STACKING_RULES:
        errors.append(f"Stacking rule must be one of: {', '.join(VALID_STACKING_RULES)}")

    # Date validation
    start_date = promo.get("start_date")
    end_date = promo.get("end_date")
    if start_date and end_date:
        try:
            s = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if isinstance(start_date, str) else start_date
            e = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if isinstance(end_date, str) else end_date
            if e <= s:
                errors.append("End date must be after start date")
        except (ValueError, TypeError):
            errors.append("Invalid date format")

    # Usage limits
    max_uses = promo.get("max_total_uses")
    if max_uses is not None and (not isinstance(max_uses, (int, float)) or max_uses < 0):
        errors.append("Max total uses must be a non-negative number")

    max_per_customer = promo.get("max_uses_per_customer")
    if max_per_customer is not None and (not isinstance(max_per_customer, (int, float)) or max_per_customer < 0):
        errors.append("Max uses per customer must be a non-negative number")

    # Scope-specific validation
    if promo.get("scope") == "category" and not promo.get("target_category_id"):
        errors.append("Category scope requires a target_category_id")
    if promo.get("scope") == "product" and not promo.get("target_product_id"):
        errors.append("Product scope requires a target_product_id")

    # Note: Tier-based promotion ceiling validation happens at order application time
    # via calculate_effective_discount(), which caps the discount at the promotion allocation.
    # We do NOT block creation here — the admin knows what they're doing.

    return errors


def calculate_effective_discount(
    *,
    promo: dict,
    base_cost: float,
    selling_price: float,
    tier: dict,
    has_affiliate: bool = False,
    has_referral: bool = False,
):
    """
    Calculate the effective discount amount for a promotion, respecting
    the distributable pool promotion allocation cap.

    Returns dict with discount_amount, was_capped, and explanation.
    """
    if not promo or not tier:
        return {"discount_amount": 0, "was_capped": False, "blocked": True, "reason": "No promotion or tier"}

    stacking_rule = promo.get("stacking_rule", "no_stack")

    # Check referral priority
    if has_referral and stacking_rule == "referral_priority":
        return {"discount_amount": 0, "was_capped": False, "blocked": True, "reason": "Referral has priority; promotion blocked"}

    # Calculate max allowed promotion amount from distributable pool
    dist_pct = float(tier.get("distributable_margin_pct", 0))
    split = tier.get("distribution_split", {})
    promo_pct_of_dist = float(split.get("promotion_pct", 0))

    distributable_pool = round(base_cost * (dist_pct / 100.0), 2)

    # Admin Override: give away the ENTIRE distributable margin
    discount_type = promo.get("discount_type", "percentage")
    if discount_type == "admin_override":
        max_promo_amount = distributable_pool  # Full distributable margin
    else:
        max_promo_amount = round(distributable_pool * (promo_pct_of_dist / 100.0), 2)

    # Reduce when affiliate is active
    if has_affiliate and stacking_rule == "reduce_when_affiliate":
        max_promo_amount = round(max_promo_amount * 0.5, 2)  # 50% reduction

    # Calculate raw discount
    discount_value = float(promo.get("discount_value", 0))

    if discount_type == "admin_override":
        # Admin override: the discount IS the entire distributable pool
        raw_discount = distributable_pool
    elif discount_type == "percentage":
        raw_discount = round(selling_price * (discount_value / 100.0), 2)
    else:  # fixed_amount
        raw_discount = round(discount_value, 2)

    # Cap at promotion allocation
    effective_discount = min(raw_discount, max_promo_amount)
    was_capped = effective_discount < raw_discount

    return {
        "discount_amount": effective_discount,
        "raw_discount": raw_discount,
        "max_promo_amount": max_promo_amount,
        "was_capped": was_capped,
        "blocked": False,
        "stacking_rule": stacking_rule,
        "reason": f"Capped at promotion allocation ({max_promo_amount})" if was_capped else "Within allocation",
    }


async def create_promotion(db, promo_data: dict, pricing_tiers: list = None) -> dict:
    """Create a new promotion with validation. Discount is policy-driven, not manual."""
    errors = validate_promotion(promo_data, pricing_tiers)
    if errors:
        return {"success": False, "errors": errors}

    now = _now()
    promo = {
        "id": str(uuid4()),
        "code": promo_data["code"].upper().strip(),
        "name": promo_data["name"].strip(),
        "description": promo_data.get("description", "").strip(),
        "scope": promo_data["scope"],
        "target_category_id": promo_data.get("target_category_id"),
        "target_category_name": promo_data.get("target_category_name"),
        "target_product_id": promo_data.get("target_product_id"),
        "target_product_name": promo_data.get("target_product_name"),
        "discount_type": promo_data.get("discount_type", "policy_driven"),
        "discount_value": float(promo_data.get("discount_value", 0)),
        "stacking_rule": promo_data.get("stacking_rule", "no_stack"),
        "start_date": promo_data.get("start_date"),
        "end_date": promo_data.get("end_date"),
        "max_total_uses": promo_data.get("max_total_uses"),
        "max_uses_per_customer": promo_data.get("max_uses_per_customer"),
        "current_uses": 0,
        "status": "active",
        "customer_message": promo_data.get("customer_message", ""),
        "created_at": now,
        "updated_at": now,
    }

    # Check code uniqueness
    existing = await db.promotions.find_one({"code": promo["code"], "status": {"$ne": "deleted"}})
    if existing:
        return {"success": False, "errors": [f"Promotion code '{promo['code']}' already exists"]}

    await db.promotions.insert_one(promo)
    promo.pop("_id", None)

    return {"success": True, "promotion": promo, "warnings": []}


async def update_promotion(db, promo_id: str, updates: dict, pricing_tiers: list = None) -> dict:
    """Update an existing promotion."""
    existing = await db.promotions.find_one({"id": promo_id}, {"_id": 0})
    if not existing:
        return {"success": False, "errors": ["Promotion not found"]}

    merged = {**existing, **updates, "updated_at": _now()}
    errors = validate_promotion(merged, pricing_tiers)
    if errors:
        return {"success": False, "errors": errors}

    # Check code uniqueness if code changed
    if updates.get("code") and updates["code"].upper().strip() != existing["code"]:
        dup = await db.promotions.find_one({
            "code": updates["code"].upper().strip(),
            "id": {"$ne": promo_id},
            "status": {"$ne": "deleted"},
        })
        if dup:
            return {"success": False, "errors": [f"Code '{updates['code']}' already in use"]}

    update_fields = {}
    allowed = [
        "code", "name", "description", "scope", "target_category_id", "target_category_name",
        "target_product_id", "target_product_name", "discount_type", "discount_value",
        "stacking_rule", "start_date", "end_date", "max_total_uses", "max_uses_per_customer",
        "status", "customer_message",
    ]
    for k in allowed:
        if k in updates:
            val = updates[k]
            if k == "code" and isinstance(val, str):
                val = val.upper().strip()
            if k == "discount_value" and val is not None:
                val = float(val)
            update_fields[k] = val

    update_fields["updated_at"] = _now()

    await db.promotions.update_one({"id": promo_id}, {"$set": update_fields})
    updated = await db.promotions.find_one({"id": promo_id}, {"_id": 0})
    return {"success": True, "promotion": updated}


async def list_promotions(db, status_filter: str = None, scope_filter: str = None) -> list:
    """List all promotions (excluding deleted)."""
    query = {"status": {"$ne": "deleted"}}
    if status_filter and status_filter != "all":
        query["status"] = status_filter
    if scope_filter and scope_filter != "all":
        query["scope"] = scope_filter

    promos = []
    async for p in db.promotions.find(query, {"_id": 0}).sort("created_at", -1):
        promos.append(p)
    return promos


async def get_promotion(db, promo_id: str) -> dict:
    """Get a single promotion by ID."""
    return await db.promotions.find_one({"id": promo_id, "status": {"$ne": "deleted"}}, {"_id": 0})


async def deactivate_promotion(db, promo_id: str) -> dict:
    """Deactivate a promotion (soft delete)."""
    result = await db.promotions.update_one(
        {"id": promo_id},
        {"$set": {"status": "inactive", "updated_at": _now()}}
    )
    if result.modified_count == 0:
        return {"success": False, "errors": ["Promotion not found"]}
    return {"success": True}


async def delete_promotion(db, promo_id: str) -> dict:
    """Soft delete a promotion."""
    result = await db.promotions.update_one(
        {"id": promo_id},
        {"$set": {"status": "deleted", "updated_at": _now()}}
    )
    if result.modified_count == 0:
        return {"success": False, "errors": ["Promotion not found"]}
    return {"success": True}


async def apply_promotion_to_order(
    db,
    *,
    promo_code: str,
    customer_id: str,
    line_items: list,
    pricing_tiers: list,
    has_affiliate: bool = False,
    has_referral: bool = False,
) -> dict:
    """
    Apply a promotion code to an order.
    Validates eligibility, calculates effective discount, and returns customer-safe output.

    Returns:
        dict with discount_amount, customer_message, and validation info
    """
    promo = await db.promotions.find_one(
        {"code": promo_code.upper().strip(), "status": "active"},
        {"_id": 0}
    )
    if not promo:
        return {"valid": False, "reason": "Invalid or expired promotion code"}

    # Check date window
    now = datetime.now(timezone.utc)
    if promo.get("start_date"):
        start = datetime.fromisoformat(promo["start_date"].replace("Z", "+00:00")) if isinstance(promo["start_date"], str) else promo["start_date"]
        if now < start:
            return {"valid": False, "reason": "This promotion has not started yet"}
    if promo.get("end_date"):
        end = datetime.fromisoformat(promo["end_date"].replace("Z", "+00:00")) if isinstance(promo["end_date"], str) else promo["end_date"]
        if now > end:
            return {"valid": False, "reason": "This promotion has expired"}

    # Check usage limits
    if promo.get("max_total_uses") and promo.get("current_uses", 0) >= promo["max_total_uses"]:
        return {"valid": False, "reason": "This promotion has reached its usage limit"}

    if promo.get("max_uses_per_customer") and customer_id:
        customer_uses = await db.promotion_usage.count_documents({
            "promo_id": promo["id"],
            "customer_id": customer_id,
        })
        if customer_uses >= promo["max_uses_per_customer"]:
            return {"valid": False, "reason": "You have already used this promotion"}

    # Calculate total order economics
    total_base_cost = 0
    total_selling_price = 0
    applicable_base_cost = 0
    applicable_selling_price = 0

    for item in line_items:
        base_cost = float(item.get("base_cost") or item.get("partner_cost") or 0)
        qty = int(item.get("quantity") or 1)
        tier = resolve_tier(base_cost, pricing_tiers)
        if tier:
            sell = round(base_cost * (1 + tier["total_margin_pct"] / 100.0), 2)
        else:
            sell = base_cost

        total_base_cost += base_cost * qty
        total_selling_price += sell * qty

        # Check scope applicability
        scope = promo.get("scope", "global")
        if scope == "global":
            applicable_base_cost += base_cost * qty
            applicable_selling_price += sell * qty
        elif scope == "category" and item.get("category_id") == promo.get("target_category_id"):
            applicable_base_cost += base_cost * qty
            applicable_selling_price += sell * qty
        elif scope == "product" and item.get("product_id") == promo.get("target_product_id"):
            applicable_base_cost += base_cost * qty
            applicable_selling_price += sell * qty

    if applicable_selling_price == 0:
        return {"valid": False, "reason": "This promotion does not apply to any items in your order"}

    # Find tier for the applicable base cost
    tier = resolve_tier(applicable_base_cost, pricing_tiers)

    result = calculate_effective_discount(
        promo=promo,
        base_cost=applicable_base_cost,
        selling_price=applicable_selling_price,
        tier=tier,
        has_affiliate=has_affiliate,
        has_referral=has_referral,
    )

    if result["blocked"]:
        return {"valid": False, "reason": result["reason"]}

    # Customer-safe output (no internal pool math, no margin mechanics)
    return {
        "valid": True,
        "promo_code": promo["code"],
        "promo_name": promo["name"],
        "discount_amount": result["discount_amount"],
        "customer_message": promo.get("customer_message") or f"Promotion '{promo['name']}' applied!",
        "was_capped": result["was_capped"],
    }
