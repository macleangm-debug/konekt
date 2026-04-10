"""
Dynamic Margin Engine with Override Hierarchy.

Resolution order (most specific wins):
  1. Individual product rule (scope='product', target_id=product_id)
  2. Group rule (scope='group', target_id=group_id)
  3. Global rule (scope='global')

Uses the existing margin_rules collection schema from margin_engine_routes.py.
Each rule has: scope, target_id, method, value (=margin %), distributable_margin_pct.
"""

from decimal import Decimal, ROUND_HALF_UP


def _money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def resolve_margin_rule(db, product_id=None, group_id=None, service_id=None, service_group_id=None):
    """
    Resolve the effective margin rule using hierarchy:
      product > group > global
    Returns a dict with operational_margin_pct and distributable_margin_pct.
    """
    # 1. Individual product override
    if product_id:
        rule = await db.margin_rules.find_one(
            {"scope": "product", "target_id": product_id, "active": True}, {"_id": 0}
        )
        if rule:
            return _normalize_rule(rule, "product")

    # 2. Individual service override (same as product scope in the engine)
    if service_id:
        rule = await db.margin_rules.find_one(
            {"scope": "product", "target_id": service_id, "active": True}, {"_id": 0}
        )
        if rule:
            return _normalize_rule(rule, "service")

    # 3. Group override
    if group_id:
        rule = await db.margin_rules.find_one(
            {"scope": "group", "target_id": group_id, "active": True}, {"_id": 0}
        )
        if rule:
            return _normalize_rule(rule, "group")

    if service_group_id:
        rule = await db.margin_rules.find_one(
            {"scope": "group", "target_id": service_group_id, "active": True}, {"_id": 0}
        )
        if rule:
            return _normalize_rule(rule, "service_group")

    # 4. Global rule
    rule = await db.margin_rules.find_one(
        {"scope": "global", "active": True}, {"_id": 0}
    )
    if rule:
        return _normalize_rule(rule, "global")

    # 5. Fallback: read from distribution_settings for backward compat
    settings = await db.distribution_settings.find_one({"type": "global"}, {"_id": 0})
    return {
        "scope_type": "global",
        "scope_label": "Global Default",
        "operational_margin_pct": settings.get("konekt_margin_pct", 20) if settings else 20,
        "distributable_margin_pct": settings.get("distribution_margin_pct", 10) if settings else 10,
    }


async def resolve_margin_rule_for_price(db, vendor_price, product_id=None, group_id=None):
    """
    Resolve margin rule, considering tiered price bands.
    Priority: product > group > tier (by vendor price) > global
    """
    # 1. Product override
    if product_id:
        rule = await db.margin_rules.find_one(
            {"scope": "product", "target_id": product_id, "active": True}, {"_id": 0}
        )
        if rule:
            return _normalize_rule(rule, "product")

    # 2. Group override
    if group_id:
        rule = await db.margin_rules.find_one(
            {"scope": "group", "target_id": group_id, "active": True}, {"_id": 0}
        )
        if rule:
            return _normalize_rule(rule, "group")

    # 3. Tiered price band
    vp = float(vendor_price or 0)
    tiers = await db.margin_rules.find({"scope": "tier", "active": True}, {"_id": 0}).to_list(20)
    for t in sorted(tiers, key=lambda x: x.get("vendor_price_min", 0)):
        t_min = float(t.get("vendor_price_min", 0))
        t_max = t.get("vendor_price_max")
        if t_max is None:
            if vp >= t_min:
                return {
                    "scope_type": "tier",
                    "scope_label": t.get("tier_label", f"Tier {t_min}+"),
                    "operational_margin_pct": t.get("margin_pct", 20),
                    "distributable_margin_pct": t.get("distributable_margin_pct", 10),
                }
        else:
            if t_min <= vp < float(t_max):
                return {
                    "scope_type": "tier",
                    "scope_label": t.get("tier_label", f"Tier {t_min}-{t_max}"),
                    "operational_margin_pct": t.get("margin_pct", 20),
                    "distributable_margin_pct": t.get("distributable_margin_pct", 10),
                }

    # 4. Global
    return await resolve_margin_rule(db, product_id=product_id, group_id=group_id)


def _normalize_rule(rule, scope_type):
    """Convert margin_rules collection doc to normalized format."""
    return {
        "scope_type": scope_type,
        "scope_label": rule.get("target_name") or rule.get("scope_label") or scope_type.title(),
        "operational_margin_pct": rule.get("value", 20),
        "distributable_margin_pct": rule.get("distributable_margin_pct", 10),
    }


async def get_split_settings(db):
    """Get the global split percentages (of distributable pool)."""
    settings = await db.distribution_settings.find_one({"type": "global"}, {"_id": 0})
    if not settings:
        settings = {}
    # Also read referral_pct from admin_settings commercial section
    hub = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    commercial = {}
    if hub and hub.get("value"):
        commercial = hub["value"].get("commercial", {})
    return {
        "sales_share_pct": settings.get("sales_pct", 30),
        "affiliate_share_pct": settings.get("affiliate_pct", 40),
        "discount_share_pct": settings.get("discount_pct", 30),
        "referral_share_pct": commercial.get("referral_pct", 10),
        "max_wallet_usage_pct": commercial.get("max_wallet_usage_pct", 30),
    }


def resolve_pricing(vendor_price, rule, split_settings):
    """
    Compute full resolved pricing object for one item.
    Returns the canonical pricing truth per the locked business model.
    """
    vp = _money(vendor_price)
    op_pct = Decimal(str(rule.get("operational_margin_pct", 20)))
    dp_pct = Decimal(str(rule.get("distributable_margin_pct", 10)))

    op_val = _money(vp * op_pct / Decimal("100"))
    dp_val = _money(vp * dp_pct / Decimal("100"))
    final = _money(vp + op_val + dp_val)

    sales_pct = Decimal(str(split_settings.get("sales_share_pct", 0)))
    aff_pct = Decimal(str(split_settings.get("affiliate_share_pct", 0)))
    disc_pct = Decimal(str(split_settings.get("discount_share_pct", 0)))
    ref_pct = Decimal(str(split_settings.get("referral_share_pct", 0)))

    sales_amt = _money(dp_val * sales_pct / Decimal("100")) if dp_val else _money(0)
    aff_amt = _money(dp_val * aff_pct / Decimal("100")) if dp_val else _money(0)
    disc_amt = _money(dp_val * disc_pct / Decimal("100")) if dp_val else _money(0)
    ref_amt = _money(dp_val * ref_pct / Decimal("100")) if dp_val else _money(0)

    return {
        "base_price": float(vp),
        "effective_margin_pct": float(op_pct),
        "effective_margin_value": float(op_val),
        "effective_distributable_margin_pct": float(dp_pct),
        "effective_distributable_margin_value": float(dp_val),
        "sales_share_pct": float(sales_pct),
        "affiliate_share_pct": float(aff_pct),
        "discount_share_pct": float(disc_pct),
        "referral_share_pct": float(ref_pct),
        "sales_amount": float(sales_amt),
        "affiliate_amount": float(aff_amt),
        "discount_amount": float(disc_amt),
        "referral_amount": float(ref_amt),
        "final_price": float(final),
        "rule_scope": rule.get("scope_type", "global"),
        "rule_label": rule.get("scope_label", "Global Default"),
    }
