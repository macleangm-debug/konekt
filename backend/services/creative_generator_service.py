"""
Unified Creative Generator Service
ONE shared engine for Admin, Sales, and Affiliate content generation.
Role-based promo code injection. Amount-based promotions only (no percentages).
"""
from datetime import datetime, timezone
import os

FRONTEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt.co.tz")


async def generate_campaign_content(db, products, user_role, promo_code=None):
    """
    Generate shareable campaign content for products.
    
    Args:
        db: MongoDB database
        products: List of product dicts
        user_role: "admin" | "sales" | "affiliate"
        promo_code: Personal promo code for sales/affiliate (None for admin)
    
    Returns: List of campaign content dicts
    """
    settings = await db.affiliate_settings.find_one({}, {"_id": 0}) or {}
    commission_type = settings.get("commission_type", "percentage")
    commission_rate = float(settings.get("default_commission_rate", 10))

    campaigns = []
    for p in products:
        selling_price = float(p.get("selling_price", 0) or p.get("price", 0) or 0)
        if selling_price <= 0:
            continue
        original_price = float(p.get("original_price", 0) or p.get("compare_at_price", 0) or 0)
        savings = max(0, original_price - selling_price) if original_price > selling_price else 0

        if commission_type == "percentage":
            your_earning = round(selling_price * commission_rate / 100, 2)
        else:
            your_earning = float(settings.get("default_fixed_commission", 0))

        ref_param = f"?ref={promo_code}" if promo_code else ""
        product_slug = p.get("slug", p.get("id", ""))
        product_link = f"{FRONTEND_URL}/marketplace/{product_slug}{ref_param}"
        savings_text = f"Save TZS {savings:,.0f}" if savings > 0 else ""

        caption = _build_caption(p, savings, promo_code, product_link)

        campaign = {
            "id": p.get("id"),
            "name": p.get("name", ""),
            "image_url": p.get("image_url", ""),
            "selling_price": selling_price,
            "original_price": original_price,
            "savings": savings,
            "savings_text": savings_text,
            "product_link": product_link,
            "caption": caption,
            "category": p.get("category", ""),
        }

        if user_role in ("sales", "affiliate") and promo_code:
            campaign["promo_code"] = promo_code
            campaign["your_earning"] = your_earning
        elif user_role == "admin":
            campaign["promo_code"] = promo_code or ""
            campaign["your_earning"] = 0

        campaigns.append(campaign)

    return campaigns


def _build_caption(product, savings, promo_code, product_link):
    """Build auto-generated share caption with injected promo code."""
    name = product.get("name", "this product")
    lines = ["Get this now!\n"]

    if savings > 0:
        lines.append(f"Save TZS {savings:,.0f} on {name}.\n")
    else:
        lines.append(f"Check out {name}.\n")

    if promo_code:
        lines.append(f"Use my code: {promo_code}\n")

    lines.append(f"{product_link}")
    return "\n".join(lines)


async def get_shareable_products(db, limit=100):
    """Get active products suitable for sharing."""
    products = await db.products.find(
        {"status": {"$in": ["active", "published"]}, "is_active": {"$ne": False}},
        {"_id": 0}
    ).to_list(limit)
    return products
