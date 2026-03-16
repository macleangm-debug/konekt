"""
Partner Routing Service
Core routing engine for multi-country partner fulfillment
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def calculate_customer_price(country_code: str, category: str, base_partner_price: float):
    """
    Calculate customer price by applying country/category markup to partner base price.
    """
    # First try exact country + category match
    rule = await db.country_pricing_rules.find_one({
        "country_code": country_code.upper(),
        "category": category,
        "is_active": True,
    })

    # Fallback to country default
    if not rule:
        rule = await db.country_pricing_rules.find_one({
            "country_code": country_code.upper(),
            "category": "default",
            "is_active": True,
        })

    # Fallback to global default
    if not rule:
        rule = await db.country_pricing_rules.find_one({
            "country_code": "GLOBAL",
            "category": "default",
            "is_active": True,
        })

    markup_type = (rule or {}).get("markup_type", "percentage")
    markup_value = float((rule or {}).get("markup_value", 20) or 20)  # Default 20% markup
    tax_rate = float((rule or {}).get("tax_rate", 0) or 0)

    base_price = float(base_partner_price or 0)

    if markup_type == "fixed":
        price_before_tax = base_price + markup_value
    else:
        price_before_tax = base_price * (1 + markup_value / 100)

    # Apply tax if configured
    final_price = price_before_tax * (1 + tax_rate / 100) if tax_rate else price_before_tax

    return {
        "base_partner_price": base_price,
        "markup_type": markup_type,
        "markup_value": markup_value,
        "markup_amount": price_before_tax - base_price,
        "tax_rate": tax_rate,
        "tax_amount": final_price - price_before_tax,
        "customer_price": round(final_price, 2),
    }


async def find_eligible_partner_items(sku: str, country_code: str, region: str):
    """
    Find all partner catalog items that can fulfill a SKU for a given country/region.
    """
    items = await db.partner_catalog_items.find({
        "sku": sku,
        "country_code": country_code.upper(),
        "is_active": True,
        "is_approved": True,
    }).to_list(length=200)

    eligible = []
    for item in items:
        # Check region coverage
        item_regions = item.get("regions", [])
        if item_regions and region and region not in item_regions:
            continue

        # Check availability
        status = item.get("partner_status", "in_stock")
        qty = float(item.get("partner_available_qty", 0) or 0)
        if status == "out_of_stock":
            continue
        if status != "on_request" and qty <= 0:
            continue

        # Verify partner is active
        partner = await db.partners.find_one({"_id": item.get("partner_id")})
        if not partner or partner.get("status") != "active":
            continue

        # Calculate customer price
        pricing = await calculate_customer_price(
            country_code=country_code,
            category=item.get("category", "default"),
            base_partner_price=float(item.get("base_partner_price", 0) or 0),
        )

        eligible.append({
            "catalog_item_id": str(item.get("_id")),
            "partner_id": str(item.get("partner_id")),
            "partner_name": item.get("partner_name"),
            "sku": sku,
            "item_name": item.get("name"),
            "category": item.get("category"),
            "country_code": country_code.upper(),
            "region": region,
            "lead_time_days": int(item.get("lead_time_days", 2) or 2),
            "partner_available_qty": qty,
            "partner_status": status,
            "min_order_qty": int(item.get("min_order_qty", 1) or 1),
            "unit": item.get("unit", "piece"),
            **pricing,
        })

    return eligible


async def route_partner_item(sku: str, country_code: str, region: str, category: str = None, quantity: int = 1):
    """
    Route a single item to the best partner based on routing rules.
    Returns the selected partner allocation or None if no partner found.
    """
    # Find eligible partners
    eligible = await find_eligible_partner_items(sku, country_code, region)

    if not eligible:
        return None

    # Filter by quantity availability
    eligible = [e for e in eligible if e["partner_status"] == "on_request" or e["partner_available_qty"] >= quantity]

    if not eligible:
        return None

    # Filter by min order quantity
    eligible = [e for e in eligible if e["min_order_qty"] <= quantity]

    if not eligible:
        return None

    # Get routing rule for this country/region/category
    routing_rule = await db.routing_rules.find_one({
        "country_code": country_code.upper(),
        "region": region,
        "category": category,
        "is_active": True,
    })

    # Fallback to country-level rule
    if not routing_rule:
        routing_rule = await db.routing_rules.find_one({
            "country_code": country_code.upper(),
            "region": None,
            "category": category,
            "is_active": True,
        })

    # Fallback to most generic rule
    if not routing_rule:
        routing_rule = await db.routing_rules.find_one({
            "country_code": country_code.upper(),
            "region": None,
            "category": None,
            "is_active": True,
        })

    # Apply routing logic
    if routing_rule:
        mode = routing_rule.get("priority_mode", "lead_time")
        preferred_partner_id = routing_rule.get("preferred_partner_id")

        # If preferred partner specified and available, use it
        if mode == "preferred_partner" and preferred_partner_id:
            preferred = [x for x in eligible if x["partner_id"] == preferred_partner_id]
            if preferred:
                return preferred[0]

        # Sort by margin (highest first)
        if mode == "margin":
            eligible.sort(key=lambda x: x["markup_amount"], reverse=True)
            return eligible[0]

        # Sort by cost (lowest customer price first)
        if mode == "cost":
            eligible.sort(key=lambda x: x["customer_price"])
            return eligible[0]

    # Default: sort by lead time (fastest first)
    eligible.sort(key=lambda x: x["lead_time_days"])
    return eligible[0]


async def route_order_items(order_items: list, country_code: str, region: str):
    """
    Route all items in an order to appropriate partners.
    Returns list of routing results.
    """
    results = []

    for item in order_items:
        sku = item.get("sku")
        quantity = int(item.get("quantity", 1) or 1)
        category = item.get("category")
        source_mode = item.get("source_mode", "hybrid")

        # Skip internal items
        if source_mode == "internal":
            results.append({
                "sku": sku,
                "status": "internal",
                "message": "Item sourced from internal stock",
            })
            continue

        # Route to partner
        routing_result = await route_partner_item(
            sku=sku,
            country_code=country_code,
            region=region,
            category=category,
            quantity=quantity,
        )

        if routing_result:
            results.append({
                "sku": sku,
                "status": "routed",
                "routing": routing_result,
            })
        else:
            results.append({
                "sku": sku,
                "status": "no_partner",
                "message": f"No partner found for {sku} in {country_code}/{region}",
            })

    return results
