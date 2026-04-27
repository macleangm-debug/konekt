"""
Content Template Data API
Provides product/service data enriched with customer-safe pricing,
active promotions, and branding for the dynamic graphics generator.

Promo resolution priority for every product:
  1. Product has `active_promotion_id` → use that promo's code + saves_tzs
     (covers manual ad-hoc promos AND auto-engine promos)
  2. Otherwise, KONEKT continuous promo (if enabled in automation engine
     config) → "KONEKT" code + flat TZS amount funded from the product's
     distributable margin (promotion pool share).
  3. Otherwise, no promo on the creative.

This keeps everything pricing-engine-bound: the discount shown is always
margin-safe unless an admin explicitly configures a deeper draw.
"""
from fastapi import APIRouter, Request
from typing import Optional

router = APIRouter(prefix="/api/content-engine", tags=["content-template"])


async def _load_continuous_promo(db) -> dict:
    """Read the KONEKT continuous-promo block from automation engine config.

    Returns a normalised dict with safe defaults when config missing.
    """
    cfg = await db.system_settings.find_one(
        {"_id": "automation_engine_config"}, {"_id": 0}
    ) or {}
    cont = (cfg.get("continuous_promo") or {}) if isinstance(cfg, dict) else {}
    return {
        "enabled": bool(cont.get("enabled", True)),
        "code": (cont.get("code") or "KONEKT").upper(),
        "pool_share_pct": float(cont.get("pool_share_pct", 30)),
    }


async def _resolve_product_promo(db, product: dict, tier: dict | None,
                                   selling_price: float,
                                   continuous: dict) -> tuple[float, str, str]:
    """Return (discount_amount, code, name) for the given product.

    Priority:
      1) active_promotion_id from db.catalog_promotions (per-product override)
      2) KONEKT continuous if enabled and a per-product promo wasn't found
      3) zero discount
    """
    active_id = product.get("active_promotion_id")
    if active_id:
        promo = await db.catalog_promotions.find_one(
            {"id": active_id, "status": "active"}, {"_id": 0}
        )
        if promo:
            saves = float(product.get("promo_saves_tzs") or 0)
            code = (promo.get("code") or promo.get("name") or "").strip()
            # Synthesise a short uppercase code from name when missing
            if not code:
                base = (promo.get("name") or "").upper()
                # take first word of name as code
                first = "".join(ch for ch in base.split(" ")[0] if ch.isalnum())
                code = first[:12] or "PROMO"
            return saves, code.upper(), promo.get("name") or code

    # Continuous KONEKT promo — pricing-engine-safe
    if continuous.get("enabled") and tier and selling_price > 0:
        try:
            distributable_pct = float(tier.get("distributable_margin_pct") or 0)
            split = tier.get("distribution_split") or {}
            promo_pool_pct = float(split.get("promotion_pct") or 0)
            base_cost = float(product.get("base_cost") or product.get("vendor_cost") or 0)
            if distributable_pct > 0 and promo_pool_pct > 0 and base_cost > 0:
                promo_pool_tzs = base_cost * (distributable_pct / 100.0) * (promo_pool_pct / 100.0)
                share = float(continuous.get("pool_share_pct", 30)) / 100.0
                saves = round(promo_pool_tzs * share, 0)
                # Round to nearest 100 TZS for clean creatives
                saves = round(saves / 100) * 100
                if saves > 0:
                    return float(saves), continuous.get("code", "KONEKT"), "Konekt All-Year Sale"
        except Exception:
            pass

    return 0.0, "", ""


@router.get("/template-data/products")
async def get_template_products(request: Request, promo_only: bool = False):
    """Products with customer-safe pricing for template rendering.

    Query params:
      promo_only=true  → only return products with an active promo
                         (used by Promo Focus tab in Content Studio)
    """
    db = request.app.mongodb

    products = await db.products.find(
        {"status": {"$in": ["active", "published", None]}},
        {"_id": 0}
    ).sort("name", 1).to_list(length=None)

    # Resolve pricing
    tiers = []
    try:
        from services.settings_resolver import get_pricing_policy_tiers
        tiers = await get_pricing_policy_tiers(db)
    except Exception:
        pass

    continuous = await _load_continuous_promo(db)

    enriched = []
    for p in products:
        base_cost = float(p.get("base_cost") or p.get("base_price") or p.get("partner_cost") or p.get("vendor_cost") or 0)
        selling_price = float(p.get("customer_price") or 0) or base_cost
        tier = None
        if base_cost > 0 and tiers:
            try:
                from commission_margin_engine_service import resolve_tier
                tier = resolve_tier(base_cost, tiers)
                if tier and not p.get("customer_price"):
                    selling_price = round(base_cost * (1 + tier["total_margin_pct"] / 100.0), 2)
            except Exception:
                selling_price = round(base_cost * 1.25, 2)

        discount_amount, promo_code, promo_name = await _resolve_product_promo(
            db, p, tier, selling_price, continuous
        )
        final_price = max(0.0, round(selling_price - discount_amount, 2))

        item = {
            "id": p.get("id", ""),
            "name": p.get("name", ""),
            "category": p.get("category_name") or p.get("category") or p.get("group_name", ""),
            "image_url": p.get("image_url") or p.get("hero_image") or (p.get("images", [None])[0] if p.get("images") else ""),
            "description": (p.get("description") or "")[:120],
            "selling_price": selling_price,
            "final_price": final_price,
            "discount_amount": discount_amount,
            "has_promotion": discount_amount > 0,
            "promo_code": promo_code,
            "promo_name": promo_name,
            "active_promotion_id": p.get("active_promotion_id"),
            "type": "product",
        }
        if promo_only and not item["has_promotion"]:
            continue
        enriched.append(item)

    return {
        "ok": True,
        "items": enriched,
        "continuous_promo": continuous,
        "total": len(enriched),
    }


@router.get("/template-data/services")
async def get_template_services(request: Request):
    """Services with customer-safe info for template rendering."""
    db = request.app.mongodb

    services = await db.services.find(
        {"status": {"$in": ["active", "published", None]}},
        {"_id": 0}
    ).sort("name", 1).to_list(length=None)

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

    profile_doc = await db.business_settings.find_one({"type": "company_profile"}, {"_id": 0}) or {}
    # Merge ALL non-profile business_settings docs (legacy + invoice_branding +
    # whatever future docs admin may save) so we never miss a field that lives
    # on a sibling doc. Newer docs win when keys collide.
    settings: dict = {}
    async for s in db.business_settings.find(
        {"type": {"$ne": "company_profile"}}, {"_id": 0}
    ):
        for k, v in s.items():
            if v not in (None, "", []):
                settings[k] = v
    if not settings:
        settings = await db.business_settings.find_one({}, {"_id": 0}) or {}
    hub = await db.settings_hub.find_one({}, {"_id": 0}) or {}
    branding = hub.get("branding", {})
    business_profile = hub.get("business_profile", {})

    # Resolve each contact field across every save surface admin might use,
    # then fall back to the platform default ("+255 712 345 678" / Konekt
    # contact info) so creatives never render empty footers. Admin's most
    # recently saved value always wins.
    DEFAULT_PHONE = "+255 712 345 678"
    DEFAULT_EMAIL = "info@konekt.co.tz"
    DEFAULT_WEBSITE = "https://konekt.co.tz"

    def first_set(*candidates, fallback=""):
        for c in candidates:
            if c:
                return c
        return fallback

    return {
        "ok": True,
        "branding": {
            "company_name": first_set(
                profile_doc.get("company_name"),
                business_profile.get("legal_name"),
                settings.get("company_name"),
                settings.get("trading_name"),
                fallback="Konekt",
            ),
            "trading_name": first_set(
                profile_doc.get("trading_name"),
                business_profile.get("brand_name"),
                settings.get("trading_name"),
                fallback="Konekt",
            ),
            "tagline": first_set(
                profile_doc.get("tagline"),
                business_profile.get("tagline"),
                fallback="One-stop shop for products, services & deals",
            ),
            "logo_url": first_set(
                profile_doc.get("logo_url"),
                business_profile.get("logo_url"),
                settings.get("company_logo_path"),
                branding.get("primary_logo_url"),
            ),
            "phone": first_set(
                profile_doc.get("phone"),
                profile_doc.get("support_phone"),
                profile_doc.get("contact_phone"),
                profile_doc.get("primary_phone"),
                business_profile.get("support_phone"),
                business_profile.get("contact_phone"),
                business_profile.get("phone"),
                settings.get("phone"),
                settings.get("contact_phone"),
                settings.get("primary_phone"),
                fallback=DEFAULT_PHONE,
            ),
            "email": first_set(
                profile_doc.get("email"),
                profile_doc.get("support_email"),
                business_profile.get("support_email"),
                settings.get("email"),
                fallback=DEFAULT_EMAIL,
            ),
            "website": first_set(
                profile_doc.get("website"),
                business_profile.get("website"),
                settings.get("website"),
                fallback=DEFAULT_WEBSITE,
            ),
            "address": first_set(
                profile_doc.get("address"),
                profile_doc.get("address_line_1"),
                business_profile.get("business_address"),
                settings.get("address"),
                fallback="Dar es Salaam, Tanzania",
            ),
            "primary_color": branding.get("primary_color", "#20364D"),
            "accent_color": branding.get("accent_color", "#D4A843"),
        },
    }
