"""
Commission Rules Service
Resolves applicable commission rule and splits margin accordingly.
"""


async def get_commission_rule(db, *, scope_type: str = None, scope_value: str = None, country_code: str = None):
    """
    Get the best matching commission rule.
    Priority: exact scope match > country fallback > default
    """
    # Try exact scope match first
    if scope_type and scope_value:
        query = {
            "scope_type": scope_type,
            "scope_value": scope_value,
            "is_active": True,
        }
        if country_code:
            query["country_code"] = country_code
        
        rule = await db.commission_rules.find_one(query)
        if rule:
            return rule

    # Try country fallback
    if country_code:
        rule = await db.commission_rules.find_one({
            "scope_type": "country",
            "country_code": country_code,
            "is_active": True,
        })
        if rule:
            return rule

    # Try default rule
    rule = await db.commission_rules.find_one({
        "scope_type": "default",
        "is_active": True,
    })
    if rule:
        return rule

    # Final fallback - return default values
    return {
        "protected_margin_percent": 40,
        "sales_percent": 20,
        "affiliate_percent": 15,
        "promo_percent": 15,
        "buffer_percent": 10,
    }


def split_margin_amount(total_margin: float, rule: dict):
    """
    Split the total margin according to the commission rule percentages.
    """
    protected = total_margin * (float(rule.get("protected_margin_percent", 0)) / 100)
    sales = total_margin * (float(rule.get("sales_percent", 0)) / 100)
    affiliate = total_margin * (float(rule.get("affiliate_percent", 0)) / 100)
    promo = total_margin * (float(rule.get("promo_percent", 0)) / 100)
    buffer_amt = total_margin * (float(rule.get("buffer_percent", 0)) / 100)

    return {
        "total_margin": round(total_margin, 2),
        "protected_margin_amount": round(protected, 2),
        "sales_amount": round(sales, 2),
        "affiliate_amount": round(affiliate, 2),
        "promo_amount": round(promo, 2),
        "buffer_amount": round(buffer_amt, 2),
    }


async def calculate_commission_split(
    db,
    *,
    partner_cost: float,
    selling_price: float,
    scope_type: str = None,
    scope_value: str = None,
    country_code: str = None,
):
    """
    Calculate the full commission split for a given price point.
    """
    total_margin = selling_price - partner_cost
    
    if total_margin <= 0:
        return {
            "total_margin": 0,
            "protected_margin_amount": 0,
            "sales_amount": 0,
            "affiliate_amount": 0,
            "promo_amount": 0,
            "buffer_amount": 0,
            "margin_negative": True,
        }
    
    rule = await get_commission_rule(
        db,
        scope_type=scope_type,
        scope_value=scope_value,
        country_code=country_code,
    )
    
    split = split_margin_amount(total_margin, rule)
    split["margin_negative"] = False
    split["rule_applied"] = rule.get("name") or rule.get("scope_type", "default")
    
    return split


def sales_commission_multiplier(sale_source: str):
    """
    Get commission multiplier based on sale source.
    - sales: 100% (salesperson closed the deal)
    - hybrid: 60% (website/affiliate lead, sales converted)
    - website/affiliate: 0% (no sales involvement)
    """
    if sale_source == "sales":
        return 1.0
    if sale_source == "hybrid":
        return 0.6
    return 0.0
