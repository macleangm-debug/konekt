"""
Product Promotion Enrichment Service

Enriches product/listing data with active promotion info.
Called from listing APIs, cart validation, and checkout.
Single resolution path for ALL flows.
"""

import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from services.platform_promotion_engine import resolve_active_promotions, validate_promotion_safety
from services.margin_engine import resolve_margin_rule, get_split_settings

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
_client = AsyncIOMotorClient(MONGO_URL)
_db = _client[DB_NAME]


async def get_system_config(db=None):
    """Fetch current margin rule + distribution split."""
    if db is None:
        db = _db
    rule = await resolve_margin_rule(db)
    split = await get_split_settings(db)
    return {
        "operational_margin_pct": rule.get("operational_margin_pct", 20),
        "distributable_margin_pct": rule.get("distributable_margin_pct", 10),
        "affiliate_share_pct": split.get("affiliate_share_pct", 40),
        "sales_share_pct": split.get("sales_share_pct", 30),
        "discount_share_pct": split.get("discount_share_pct", 30),
    }


async def enrich_product_with_promotion(product: dict, db=None) -> dict:
    """
    Given a product dict, attach promotion info if an active promotion applies.
    Returns the product dict with an added 'promotion' key (or None).

    This is the SINGLE resolution path for all flows:
    - Guest PDP, Account PDP, Marketplace cards
    - Cart validation
    - Checkout total calculation
    - Quote auto-application
    """
    if db is None:
        db = _db
    product_id = product.get("id") or product.get("product_id", "")
    category = product.get("category_name") or product.get("category") or product.get("group_name", "")
    selling_price = float(product.get("selling_price") or product.get("customer_price") or product.get("price") or product.get("base_price") or 0)

    if selling_price <= 0:
        product["promotion"] = None
        return product

    # Resolve active promotions (product > category > global)
    promos = await resolve_active_promotions(db, product_id=product_id, category=category)

    if not promos:
        product["promotion"] = None
        return product

    promo = promos[0]
    promo_type = promo.get("promo_type", "percentage")
    promo_value = float(promo.get("promo_value", 0))
    stacking = promo.get("stacking_policy", "no_stack")

    # Calculate promo price from selling price
    if promo_type == "percentage":
        discount_amount = round(selling_price * promo_value / 100)
    else:
        discount_amount = round(min(promo_value, selling_price))

    promo_price = round(selling_price - discount_amount)

    # Sanity: promo price must not go below zero
    if promo_price < 0:
        product["promotion"] = None
        return product

    product["promotion"] = {
        "promo_id": promo.get("id", ""),
        "title": promo.get("title", ""),
        "promo_type": promo_type,
        "promo_value": promo_value,
        "stacking_policy": stacking,
        "original_price": selling_price,
        "promo_price": promo_price,
        "discount_amount": discount_amount,
        "discount_label": f"{promo_value}% OFF" if promo_type == "percentage" else f"TZS {int(promo_value):,} OFF",
    }

    return product


async def enrich_products_batch(products: list, db=None) -> list:
    """Enrich a list of products with promotion data."""
    if db is None:
        db = _db
    result = []
    for p in products:
        enriched = await enrich_product_with_promotion(dict(p), db=db)
        result.append(enriched)
    return result


async def resolve_checkout_item_price(item: dict, db=None) -> dict:
    """
    Resolve the correct price for a checkout item.
    If an active promotion applies, returns the promo price.
    Otherwise returns the original unit_price.

    Returns dict with:
    - unit_price: the price to use
    - original_price: price before promo (or same if no promo)
    - promo_discount: discount per unit (0 if no promo)
    - promo_applied: bool
    - promo_id: str or None
    - promo_label: str or None
    """
    if db is None:
        db = _db
    product_id = item.get("product_id", "")
    original_price = float(item.get("unit_price") or item.get("price") or 0)

    # Resolve active promotion for this product
    enriched = await enrich_product_with_promotion({
        "id": product_id,
        "selling_price": original_price,
        "category_name": item.get("category_name", ""),
        "category": item.get("category", ""),
    }, db=db)

    promo = enriched.get("promotion")
    if promo:
        return {
            "unit_price": promo["promo_price"],
            "original_price": promo["original_price"],
            "promo_discount": promo["discount_amount"],
            "promo_applied": True,
            "promo_id": promo["promo_id"],
            "promo_label": promo["discount_label"],
            "promo_title": promo["title"],
        }

    return {
        "unit_price": original_price,
        "original_price": original_price,
        "promo_discount": 0,
        "promo_applied": False,
        "promo_id": None,
        "promo_label": None,
        "promo_title": None,
    }
