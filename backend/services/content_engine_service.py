"""
Campaign Content Engine Service — Phase E

Campaign-driven content generation system.
Every piece of content is linked to a promotion, product, or service.
One campaign → many assets (square, vertical, story).
Multiple caption types per asset.

NO standalone content — everything is campaign-linked and dynamic.
"""
from datetime import datetime, timezone
from uuid import uuid4


FORMATS = ["square", "vertical"]
CAPTION_TYPES = ["short", "medium", "whatsapp_sales", "story"]


async def generate_campaign_content(db, *, promotion_id: str = None, product_id: str = None, role: str = "sales"):
    """
    Generate a full content asset pack for a campaign.
    Links to a promotion and/or product. Creates multiple formats + caption sets.
    """
    # Resolve promotion
    promo = None
    if promotion_id:
        promo = await db.promotions.find_one({"id": promotion_id, "status": "active"}, {"_id": 0})

    # Resolve product
    product = None
    if product_id:
        product = await db.products.find_one(
            {"$or": [{"id": product_id}, {"sku": product_id}]},
            {"_id": 0}
        )

    # If no product and promo has scope=product, try to find the target product
    if not product and promo and promo.get("scope") == "product" and promo.get("target_product_id"):
        product = await db.products.find_one(
            {"$or": [{"id": promo["target_product_id"]}, {"sku": promo["target_product_id"]}]},
            {"_id": 0}
        )

    # Determine target type
    if product:
        target_type = "product"
        target_name = product.get("name", "Product")
        target_id = product.get("id", product_id or "")
        image_url = product.get("image_url") or product.get("hero_image") or ""
        if not image_url and product.get("images"):
            image_url = product["images"][0] if product["images"] else ""
        category = product.get("category_name") or product.get("category") or product.get("group_name", "")
        base_cost = float(product.get("base_cost") or product.get("base_price") or product.get("partner_cost") or 0)
    else:
        target_type = "service" if not product_id else "general"
        target_name = "Service"
        target_id = product_id or ""
        image_url = ""
        category = ""
        base_cost = 0

    # Get selling price from pricing engine
    selling_price = base_cost
    if base_cost > 0:
        try:
            from commission_margin_engine_service import resolve_tier
            from services.settings_resolver import get_pricing_policy_tiers
            tiers = await get_pricing_policy_tiers(db)
            tier = resolve_tier(base_cost, tiers)
            if tier:
                selling_price = round(base_cost * (1 + tier["total_margin_pct"] / 100.0), 2)
        except Exception:
            selling_price = round(base_cost * 1.25, 2)

    # Calculate promo discount
    discount_amount = 0
    promo_code = ""
    promo_name = ""
    if promo:
        promo_code = promo.get("code", "")
        promo_name = promo.get("name", "")
        if promo.get("discount_type") == "percentage":
            discount_amount = round(selling_price * (promo.get("discount_value", 0) / 100.0), 2)
        elif promo.get("discount_type") == "fixed_amount":
            discount_amount = float(promo.get("discount_value", 0))

    final_price = round(selling_price - discount_amount, 2)

    # Generate captions for each format
    now = datetime.now(timezone.utc).isoformat()
    campaign_id = promotion_id or f"camp-{str(uuid4())[:8]}"

    assets = []
    for fmt in FORMATS:
        content_id = str(uuid4())
        captions = _generate_captions(
            role=role,
            product_name=target_name,
            promo_code=promo_code,
            promo_name=promo_name,
            discount_amount=discount_amount,
            final_price=final_price,
            selling_price=selling_price,
            category=category,
            fmt=fmt,
        )

        headline = _generate_headline(target_name, promo_name, discount_amount, fmt)

        asset = {
            "id": content_id,
            "role": role,
            "format": fmt,
            "target_type": target_type,
            "target_id": target_id,
            "target_name": target_name,
            "campaign_id": campaign_id,
            "promotion_id": promotion_id or "",
            "promotion_name": promo_name,
            "promotion_code": promo_code,
            "image_url": image_url,
            "category": category,
            "headline": headline,
            "captions": captions,
            "cta": _generate_cta(promo, fmt),
            "final_price": final_price,
            "original_price": selling_price,
            "discount_amount": discount_amount,
            "has_promotion": bool(promo),
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        assets.append(asset)

    return assets


async def generate_campaign_from_promotion(db, *, promotion_id: str, roles: list = None):
    """Generate content for all roles from a promotion. One promotion → full asset pack."""
    if roles is None:
        roles = ["sales", "admin"]

    all_assets = []
    for role in roles:
        assets = await generate_campaign_content(db, promotion_id=promotion_id, role=role)
        all_assets.extend(assets)

    # Save to content_center
    for asset in all_assets:
        await db.content_center.update_one({"id": asset["id"]}, {"$set": asset}, upsert=True)

    return all_assets


async def generate_product_content(db, *, product_id: str, roles: list = None):
    """Generate content pack for a specific product (with any active promotions)."""
    if roles is None:
        roles = ["sales", "admin"]

    # Check if product has an active promotion
    product = await db.products.find_one({"$or": [{"id": product_id}, {"sku": product_id}]}, {"_id": 0})
    promo = None
    if product:
        promo = await db.promotions.find_one({
            "status": "active",
            "$or": [
                {"scope": "global"},
                {"scope": "product", "target_product_id": product.get("id")},
                {"scope": "category", "target_category_id": product.get("category_id")},
            ]
        }, {"_id": 0})

    all_assets = []
    for role in roles:
        assets = await generate_campaign_content(
            db,
            promotion_id=promo.get("id") if promo else None,
            product_id=product_id,
            role=role,
        )
        all_assets.extend(assets)

    for asset in all_assets:
        await db.content_center.update_one({"id": asset["id"]}, {"$set": asset}, upsert=True)

    return all_assets


async def get_active_campaigns(db):
    """Get active promotions as campaigns with content counts."""
    promos = await db.promotions.find(
        {"status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    campaigns = []
    for p in promos:
        content_count = await db.content_center.count_documents({
            "campaign_id": p["id"],
            "status": "active"
        })
        campaigns.append({
            "id": p["id"],
            "name": p.get("name", ""),
            "code": p.get("code", ""),
            "scope": p.get("scope", "global"),
            "discount_type": p.get("discount_type", ""),
            "discount_value": p.get("discount_value", 0),
            "start_date": p.get("start_date"),
            "end_date": p.get("end_date"),
            "content_count": content_count,
            "status": p.get("status", "active"),
        })

    return campaigns


async def get_content_suggestions(db):
    """Generate smart content suggestions based on system activity."""
    suggestions = []

    # 1. Promotions without content
    promos = await db.promotions.find({"status": "active"}, {"_id": 0}).to_list(50)
    for p in promos:
        content_count = await db.content_center.count_documents({
            "campaign_id": p["id"],
            "status": "active"
        })
        if content_count == 0:
            suggestions.append({
                "type": "promotion_needs_content",
                "priority": "high",
                "title": f"Create content for '{p.get('name', '')}'",
                "description": f"Promotion {p.get('code', '')} has no content assets yet",
                "action_id": p["id"],
                "action_type": "generate_from_promotion",
            })

    # 2. Recently added products without content
    recent_products = await db.products.find(
        {"status": {"$in": ["active", "published", None]}},
        {"_id": 0, "id": 1, "name": 1}
    ).sort("created_at", -1).to_list(10)

    for prod in recent_products:
        content_count = await db.content_center.count_documents({
            "target_id": prod.get("id", ""),
            "status": "active"
        })
        if content_count == 0:
            suggestions.append({
                "type": "product_needs_content",
                "priority": "medium",
                "title": f"Create content for '{prod.get('name', '')}'",
                "description": "New product has no campaign content",
                "action_id": prod.get("id", ""),
                "action_type": "generate_from_product",
            })

    # 3. Expiring promotions (within 7 days)
    from datetime import timedelta
    soon = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()
    expiring = await db.promotions.find({
        "status": "active",
        "end_date": {"$lte": soon, "$gte": now_iso}
    }, {"_id": 0}).to_list(10)
    for p in expiring:
        suggestions.append({
            "type": "promotion_expiring",
            "priority": "medium",
            "title": f"'{p.get('name', '')}' expires soon",
            "description": f"Promotion {p.get('code', '')} expires within 7 days — push content now",
            "action_id": p["id"],
            "action_type": "generate_from_promotion",
        })

    return suggestions


async def get_content_feed(db, *, role: str, limit: int = 30):
    """Get content feed for a specific role. Sales sees sales content only."""
    items = await db.content_center.find(
        {"role": role, "status": "active"},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(limit)
    return items


def _generate_headline(name, promo_name, discount, fmt):
    """Generate format-appropriate headline."""
    if discount > 0:
        save = f"TZS {int(discount):,}"
        if fmt == "vertical":
            return f"Save {save} on {name}"
        return f"{name} — Save {save}"
    if promo_name:
        return f"{name} — {promo_name}"
    return f"{name} — Available Now"


def _generate_cta(promo, fmt):
    """Generate format-appropriate CTA."""
    if promo:
        if fmt == "vertical":
            return "Tap to Order"
        return "Order Now"
    if fmt == "vertical":
        return "Tap to Learn More"
    return "View Details"


def _generate_captions(*, role, product_name, promo_code, promo_name, discount_amount, final_price, selling_price, category, fmt):
    """Generate multiple caption types for a content asset."""
    price = f"TZS {int(final_price):,}"
    save = f"TZS {int(discount_amount):,}" if discount_amount else ""
    orig = f"TZS {int(selling_price):,}" if selling_price != final_price else ""

    # Short caption (social media)
    short = f"{product_name} at {price}."
    if save:
        short += f" Save {save}."
    if promo_code:
        short += f" Code: {promo_code}"

    # Medium caption (posts)
    medium = f"{product_name} is available at {price}."
    if save and orig:
        medium += f" Was {orig}, now {price} — save {save}."
    if promo_code:
        medium += f" Use promo code {promo_code} at checkout."
    if category:
        medium += f" Browse our {category} collection."

    # WhatsApp/Sales caption
    if role == "sales":
        whatsapp = f"Hi! We have {product_name} available at {price}."
        if save:
            whatsapp += f" There is a current offer saving you {save}."
        whatsapp += " Share your quantity and I will prepare the best quote for your business."
        if promo_code:
            whatsapp += f" Promo code: {promo_code}"
    else:
        whatsapp = f"Check out {product_name} at {price}!"
        if save:
            whatsapp += f" Save {save} with code {promo_code}." if promo_code else f" Save {save}."

    # Story text (short, punchy)
    if save:
        story = f"{product_name}\n{price}\nSave {save}"
    else:
        story = f"{product_name}\n{price}"

    return {
        "short": short.strip(),
        "medium": medium.strip(),
        "whatsapp_sales": whatsapp.strip(),
        "story": story.strip(),
    }
