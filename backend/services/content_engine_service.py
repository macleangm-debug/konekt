"""
Content Engine Service — Phase D
Generates role-aware, promotion-aware, pricing-aware content.
Pulls from: products, promotions, margin rules, attribution context.
NO hardcoded content — everything is dynamically resolved.
"""
from datetime import datetime, timezone
from uuid import uuid4
from services.product_promotion_enrichment import enrich_product_with_promotion, get_system_config


async def generate_content_for_product(db, *, product_id: str, role: str, campaign_id: str = None, promotion_id: str = None):
    """Generate a content object for a single product, resolving real pricing/promo data."""
    product = await db.products.find_one(
        {"$or": [{"id": product_id}, {"sku": product_id}]},
        {"_id": 0}
    )
    if not product:
        return None

    # Enrich with active promotion
    enriched = await enrich_product_with_promotion(dict(product), db=db)
    promo = enriched.get("promotion")
    config = await get_system_config(db)

    selling_price = float(product.get("selling_price") or product.get("customer_price") or product.get("price") or product.get("base_price") or 0)
    final_price = promo["promo_price"] if promo else selling_price
    original_price = promo["original_price"] if promo else selling_price
    discount_amount = promo["discount_amount"] if promo else 0
    discount_pct = round((discount_amount / original_price * 100), 1) if original_price > 0 and discount_amount else 0

    # Commission/earning calculation
    distributable_pct = config.get("distributable_margin_pct", 10)
    distributable_value = final_price * distributable_pct / 100

    if role == "affiliate":
        earning_pct = config.get("affiliate_share_pct", 40)
    elif role == "sales":
        earning_pct = config.get("sales_share_pct", 30)
    else:
        earning_pct = 0
    earning_amount = round(distributable_value * earning_pct / 100)

    # Promo code from promotion
    promo_code = ""
    if promo and promo.get("promo_id"):
        promo_doc = await db.promotions.find_one({"id": promo["promo_id"]}, {"_id": 0, "promo_code": 1, "title": 1})
        if promo_doc:
            promo_code = promo_doc.get("promo_code", "")

    # Short link
    short_link = f"konekt.link/{product.get('slug') or product_id}"

    # Image
    image_url = product.get("image_url") or product.get("hero_image") or ""
    if not image_url and product.get("images"):
        image_url = product["images"][0] if product["images"] else ""

    product_name = product.get("name", "Product")
    category = product.get("category_name") or product.get("category") or product.get("group_name", "")

    # Generate captions dynamically
    captions = _generate_captions(role, product_name, promo_code, short_link, discount_amount, final_price, category)

    # Headline
    if promo:
        headline = f"{product_name} — Save TZS {int(discount_amount):,}"
    else:
        headline = f"{product_name} — Available Now"

    content_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    content_obj = {
        "id": content_id,
        "role": role,
        "target_type": "product",
        "target_id": product_id,
        "campaign_id": campaign_id or "",
        "promotion_id": (promo or {}).get("promo_id", promotion_id or ""),
        "title": product_name,
        "headline": headline,
        "image_url": image_url,
        "category": category,
        "final_price": final_price,
        "original_price": original_price,
        "discount_amount": discount_amount,
        "discount_pct": discount_pct,
        "earning_amount": earning_amount,
        "promo_code": promo_code,
        "short_link": short_link,
        "captions": captions,
        "cta": "Order Now" if promo else "View Product",
        "has_promotion": bool(promo),
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    return content_obj


async def generate_content_bulk(db, *, role: str, campaign_id: str = None, product_ids: list = None):
    """Generate content for multiple products. If no product_ids, use products with active promotions."""
    if not product_ids:
        promos = await db.promotions.find(
            {"status": "active", "valid_to": {"$gte": datetime.now(timezone.utc).isoformat()}},
            {"_id": 0, "target_product_ids": 1, "target_category": 1}
        ).to_list(50)

        pids = set()
        for p in promos:
            for pid in (p.get("target_product_ids") or []):
                pids.add(pid)

        if not pids:
            products = await db.products.find(
                {"status": {"$in": ["active", "published", None]}},
                {"_id": 0, "id": 1}
            ).sort("created_at", -1).to_list(20)
            pids = {p["id"] for p in products if p.get("id")}

        product_ids = list(pids)

    results = []
    for pid in product_ids:
        item = await generate_content_for_product(db, product_id=pid, role=role, campaign_id=campaign_id)
        if item:
            results.append(item)
    return results


async def get_content_feed(db, *, role: str, limit: int = 20):
    """Get stored content feed for a role, enriched with current pricing."""
    items = await db.content_center.find(
        {"role": role, "status": "active"},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(limit)

    if not items:
        items = await generate_content_bulk(db, role=role)
        for item in items:
            await db.content_center.update_one(
                {"id": item["id"]},
                {"$set": item},
                upsert=True
            )

    return items


def _generate_captions(role, product_name, promo_code, short_link, discount_amount, final_price, category):
    """Generate role-specific captions dynamically from product/promo data."""
    price_str = f"TZS {int(final_price):,}"
    save_str = f"TZS {int(discount_amount):,}" if discount_amount else ""

    if role == "affiliate":
        short = f"{product_name} now at {price_str}."
        if save_str:
            short += f" Save {save_str}."
        if promo_code:
            short += f" Use code {promo_code}."
        if short_link:
            short += f" {short_link}"

        professional = f"Looking for {category or 'quality products'}? {product_name} is available at {price_str}."
        if save_str:
            professional += f" Save {save_str} with the current offer."
        if promo_code:
            professional += f" Use code {promo_code} at checkout."

        closing = "This offer is active now."
        if short_link:
            closing += f" Share {short_link} with interested buyers."

        return {"short_social": short.strip(), "professional": professional.strip(), "closing_script": closing.strip()}

    if role == "sales":
        short = f"{product_name} at {price_str}."
        if save_str:
            short += f" Currently on offer — save {save_str}."

        professional = f"We have {product_name} available at {price_str}."
        if save_str:
            professional += f" There is an active offer saving {save_str}."
        professional += " Share your quantity and I will prepare the best quote for your business."

        closing = "This offer is active now and I can help you lock in the current pricing today."
        if save_str:
            closing = f"This {save_str} saving is active now. I can help you lock in the current pricing today."

        return {"short_social": short.strip(), "professional": professional.strip(), "closing_script": closing.strip()}

    # Admin / default
    short = f"Featured: {product_name} at {price_str}."
    if save_str:
        short += f" Save {save_str}."

    professional = f"{product_name} is now part of the current Konekt campaign at {price_str}."
    if save_str:
        professional += f" Customers save {save_str}."

    closing = "Use the active campaign to drive conversions while the offer is live."

    return {"short_social": short.strip(), "professional": professional.strip(), "closing_script": closing.strip()}
