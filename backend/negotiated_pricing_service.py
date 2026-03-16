"""
Negotiated Pricing Service - Resolve customer-specific pricing
"""


async def resolve_negotiated_price(
    db,
    *,
    customer_id: str,
    sku: str = None,
    service_key: str = None,
    category: str = None,
    default_price: float = 0,
):
    """
    Resolve the best negotiated price for a customer.
    Priority: SKU > Service > Category
    """
    rules = await db.negotiated_pricing.find({
        "customer_id": customer_id,
        "is_active": True,
    }).to_list(length=200)

    best_match = None

    for rule in rules:
        scope = rule.get("pricing_scope")

        # SKU-specific pricing has highest priority
        if scope == "sku" and sku and rule.get("sku") == sku:
            best_match = rule
            break

        # Service-specific pricing
        if scope == "service" and service_key and rule.get("service_key") == service_key:
            best_match = rule
            break

        # Category-level pricing (lowest priority)
        if scope == "category" and category and rule.get("category") == category:
            best_match = rule

    if not best_match:
        return {
            "price": float(default_price or 0),
            "source": "default",
        }

    price_type = best_match.get("price_type", "fixed")
    price_value = float(best_match.get("price_value", 0) or 0)

    if price_type == "discount_percent":
        final_price = float(default_price or 0) * (1 - (price_value / 100))
    else:
        final_price = price_value

    return {
        "price": round(final_price, 2),
        "source": "negotiated",
        "rule_id": str(best_match["_id"]),
        "price_type": price_type,
        "discount_percent": price_value if price_type == "discount_percent" else None,
    }
