"""
Content Template Data API
Provides product/service data enriched with customer-safe pricing,
active promotions, and branding for the dynamic graphics generator.
"""
from fastapi import APIRouter, Request
from typing import Optional

router = APIRouter(prefix="/api/content-engine", tags=["content-template"])


@router.get("/template-data/products")
async def get_template_products(request: Request):
    """Products with customer-safe pricing for template rendering."""
    db = request.app.mongodb

    products = await db.products.find(
        {"status": {"$in": ["active", "published", None]}},
        {"_id": 0}
    ).sort("name", 1).to_list(200)

    # Resolve pricing
    tiers = []
    try:
        from services.settings_resolver import get_pricing_policy_tiers
        tiers = await get_pricing_policy_tiers(db)
    except Exception:
        pass

    enriched = []
    for p in products:
        base_cost = float(p.get("base_cost") or p.get("base_price") or p.get("partner_cost") or 0)
        selling_price = base_cost
        if base_cost > 0 and tiers:
            try:
                from commission_margin_engine_service import resolve_tier
                tier = resolve_tier(base_cost, tiers)
                if tier:
                    selling_price = round(base_cost * (1 + tier["total_margin_pct"] / 100.0), 2)
            except Exception:
                selling_price = round(base_cost * 1.25, 2)

        # Check active promotions
        promo = await db.promotions.find_one({
            "status": "active",
            "$or": [
                {"scope": "global"},
                {"scope": "product", "target_product_id": p.get("id")},
                {"scope": "category", "target_category_id": p.get("category_id")},
            ]
        }, {"_id": 0})

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

        enriched.append({
            "id": p.get("id", ""),
            "name": p.get("name", ""),
            "category": p.get("category_name") or p.get("category") or p.get("group_name", ""),
            "image_url": p.get("image_url") or p.get("hero_image") or (p.get("images", [None])[0] if p.get("images") else ""),
            "description": (p.get("description") or "")[:120],
            "selling_price": selling_price,
            "final_price": final_price,
            "discount_amount": discount_amount,
            "has_promotion": bool(promo),
            "promo_code": promo_code,
            "promo_name": promo_name,
            "type": "product",
        })

    return {"ok": True, "items": enriched}


@router.get("/template-data/services")
async def get_template_services(request: Request):
    """Services with customer-safe info for template rendering."""
    db = request.app.mongodb

    services = await db.services.find(
        {"status": {"$in": ["active", "published", None]}},
        {"_id": 0}
    ).sort("name", 1).to_list(200)

    # Check global promotions
    global_promo = await db.promotions.find_one(
        {"status": "active", "scope": "global"},
        {"_id": 0}
    )

    enriched = []
    for s in services:
        price = float(s.get("price") or s.get("base_price") or s.get("starting_price") or 0)

        discount_amount = 0
        promo_code = ""
        promo_name = ""
        if global_promo:
            promo_code = global_promo.get("code", "")
            promo_name = global_promo.get("name", "")
            if global_promo.get("discount_type") == "percentage":
                discount_amount = round(price * (global_promo.get("discount_value", 0) / 100.0), 2)
            elif global_promo.get("discount_type") == "fixed_amount":
                discount_amount = float(global_promo.get("discount_value", 0))

        final_price = round(price - discount_amount, 2)

        enriched.append({
            "id": s.get("id", ""),
            "name": s.get("name") or s.get("title", ""),
            "category": s.get("category_name") or s.get("category", ""),
            "image_url": s.get("image_url") or s.get("hero_image", ""),
            "description": (s.get("description") or s.get("summary") or "")[:120],
            "selling_price": price,
            "final_price": final_price,
            "discount_amount": discount_amount,
            "has_promotion": bool(global_promo),
            "promo_code": promo_code,
            "promo_name": promo_name,
            "type": "service",
        })

    return {"ok": True, "items": enriched}


@router.get("/template-data/branding")
async def get_template_branding(request: Request):
    """Branding data for template rendering."""
    db = request.app.mongodb

    settings = await db.business_settings.find_one({}, {"_id": 0}) or {}
    hub = await db.settings_hub.find_one({}, {"_id": 0}) or {}
    branding = hub.get("branding", {})

    return {
        "ok": True,
        "branding": {
            "company_name": settings.get("company_name") or settings.get("trading_name") or "",
            "trading_name": settings.get("trading_name") or "",
            "tagline": hub.get("business_profile", {}).get("tagline", ""),
            "logo_url": settings.get("company_logo_path") or branding.get("primary_logo_url", ""),
            "phone": settings.get("phone", ""),
            "email": settings.get("email", ""),
            "website": settings.get("website", ""),
            "address": settings.get("address", ""),
            "primary_color": branding.get("primary_color", "#20364D"),
            "accent_color": branding.get("accent_color", "#D4A843"),
        }
    }
