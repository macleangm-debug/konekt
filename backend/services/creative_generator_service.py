"""
Unified Creative Generator Service
ONE shared engine for Admin, Sales, and Affiliate content generation.
Role-based promo code injection. Amount-based promotions only (no percentages).
"""
from datetime import datetime, timezone
import os

# Share links must always point at the canonical production domain so
# old WhatsApp screenshots / printed flyers stay valid post-launch.
FRONTEND_URL = (
    os.environ.get("PRODUCTION_DOMAIN")
    or os.environ.get("CANONICAL_FRONTEND_URL")
    or "https://konekt.co.tz"
).rstrip("/")


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


async def generate_group_deal_campaigns(db, promo_code=None):
    """Generate shareable content for active group deal campaigns."""
    from bson import ObjectId
    deals = await db.group_deal_campaigns.find(
        {"status": "active"}, {"_id": 1, "campaign_id": 1, "product_name": 1,
         "original_price": 1, "discounted_price": 1, "display_target": 1,
         "current_committed": 1, "buyer_count": 1, "deadline": 1, "image_url": 1,
         "vendor_threshold": 1, "vendor_cost": 1, "margin_per_unit": 1,
         "commission_mode": 1, "affiliate_share_pct": 1, "affiliate_fixed_amount": 1}
    ).to_list(50)

    campaigns = []
    for d in deals:
        original = float(d.get("original_price", 0))
        discounted = float(d.get("discounted_price", 0))
        savings = max(0, original - discounted) if original > discounted else 0
        target = d.get("display_target", d.get("vendor_threshold", 1))
        current = d.get("current_committed", 0)

        # Per-deal affiliate earning, computed from the deal's own
        # commission settings — surfaces the exact TZS the affiliate
        # receives on every closed unit, so the dashboard table is
        # never blank.
        margin_per_unit = float(d.get("margin_per_unit") or 0)
        if margin_per_unit <= 0:
            margin_per_unit = max(0.0, discounted - float(d.get("vendor_cost") or 0))
        mode = (d.get("commission_mode") or "").lower()
        share_pct = float(d.get("affiliate_share_pct") or 0)
        fixed_amt = float(d.get("affiliate_fixed_amount") or 0)
        if mode == "affiliate_share" and share_pct > 0:
            your_earning = round(margin_per_unit * share_pct / 100)
        elif mode in ("fixed", "affiliate_fixed") and fixed_amt > 0:
            your_earning = round(fixed_amt)
        else:
            your_earning = 0

        # Public link → /group-deals/<id>?ref=<code>
        # (DealEndedFallback handles missing/expired; ?ref drops the 30d cookie.)
        ref_param = f"?ref={promo_code}" if promo_code else ""
        deal_link = f"{FRONTEND_URL}/group-deals/{d['_id']}{ref_param}"

        lines = ["Group Deal Live!\n"]
        if savings > 0:
            lines.append(f"Save TZS {savings:,.0f} on {d.get('product_name', '')}.\n")
        if current > 0 and target > 0:
            lines.append(f"Already {current}/{target} units committed.\n")
        if promo_code:
            lines.append(f"Use code: {promo_code}\n")
        lines.append(f"Join here: {deal_link}")
        caption = "\n".join(lines)

        campaigns.append({
            "id": str(d["_id"]),
            "campaign_id": d.get("campaign_id", ""),
            "name": d.get("product_name", ""),
            "image_url": d.get("image_url", ""),
            "selling_price": discounted,
            "original_price": original,
            "savings": savings,
            "savings_text": f"Save TZS {savings:,.0f}" if savings > 0 else "",
            "target": target,
            "current_committed": current,
            "your_earning": your_earning,
            "product_link": deal_link,
            "caption": caption,
            "promo_code": promo_code or "",
            "type": "group_deal",
        })
    return campaigns
