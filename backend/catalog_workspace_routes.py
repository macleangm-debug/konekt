"""
Catalog Workspace Routes — Unified catalog overview with real data.
"""
from fastapi import APIRouter, Request


router = APIRouter(prefix="/api/admin/catalog-workspace", tags=["Catalog Workspace"])


@router.get("/stats")
async def catalog_stats(request: Request):
    """Return catalog overview with real data from settings + products."""
    db = request.app.mongodb

    products_count = await db.products.count_documents({})
    active_products = await db.products.count_documents({"status": "active", "is_active": True})
    draft_products = await db.products.count_documents({"status": "draft"})
    services_count = await db.services.count_documents({}) if "services" in await db.list_collection_names() else 0

    # Get categories from settings
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    s = settings_row.get("value", {}) if settings_row else {}
    catalog = s.get("catalog", {})
    raw_cats = catalog.get("product_categories", [])
    categories = []
    for c in raw_cats:
        if isinstance(c, str):
            cat_obj = {"name": c, "display_mode": "visual", "commercial_mode": "fixed_price", "sourcing_mode": "preferred", "active": True}
        else:
            cat_obj = c
        if cat_obj.get("active", True):
            count = await db.products.count_documents({"category": cat_obj["name"]})
            cat_obj["product_count"] = count
            categories.append(cat_obj)

    # Product health from supply review
    pricing_issues = await db.products.count_documents({"$or": [
        {"selling_price": {"$lte": 0}, "vendor_cost": {"$gt": 0}},
        {"selling_price": {"$lte": 0}, "status": {"$in": ["active", "draft"]}},
    ]})
    missing_images = await db.products.count_documents({"$or": [{"images": {"$size": 0}}, {"images": {"$exists": False}}]})
    pending_review = await db.products.count_documents({"status": {"$in": ["draft", "pending_review"]}})

    # Quote items (price requests)
    quote_items = await db.price_requests.count_documents({})
    pending_quotes = await db.price_requests.count_documents({"status": {"$in": ["new", "pending_vendor_response"]}})

    return {
        "products": products_count,
        "active_products": active_products,
        "draft_products": draft_products,
        "services": services_count,
        "categories": categories,
        "category_count": len(categories),
        "pricing_issues": pricing_issues,
        "missing_images": missing_images,
        "pending_review": pending_review,
        "quote_items": quote_items,
        "pending_quotes": pending_quotes,
    }
