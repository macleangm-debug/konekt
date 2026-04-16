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


CATEGORY_DEFAULTS = {
    "display_mode": "visual",
    "commercial_mode": "fixed_price",
    "sourcing_mode": "preferred",
    "category_type": "product",
    "allow_custom_items": False,
    "require_description": False,
    "show_price_in_list": True,
    "multi_item_request": True,
    "search_first": False,
    "show_on_marketplace": True,
    "require_images": True,
    "requires_site_visit": False,
    "site_visit_optional": False,
    "installment_payments": False,
    "installment_split": "60/40",
    "related_services": [],
    "active": True,
}


@router.put("/categories/{cat_name}")
async def update_category_config(cat_name: str, payload: dict, request: Request):
    """Update a single category's configuration (display_mode, commercial_mode, etc.)"""
    db = request.app.mongodb

    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    s = settings_row.get("value", {}) if settings_row else {}
    catalog = s.get("catalog", {})
    raw_cats = catalog.get("product_categories", [])

    # Normalize all categories to rich objects
    normalized = []
    for c in raw_cats:
        if isinstance(c, str):
            normalized.append({**CATEGORY_DEFAULTS, "name": c})
        else:
            normalized.append({**CATEGORY_DEFAULTS, **c})

    # Find and update the target category
    updated = False
    updated_fields = []
    allowed_fields = {
        "display_mode", "commercial_mode", "sourcing_mode", "category_type",
        "allow_custom_items", "require_description", "show_price_in_list",
        "multi_item_request", "search_first", "show_on_marketplace",
        "require_images", "active",
        "requires_site_visit", "site_visit_optional",
        "installment_payments", "installment_split",
        "related_services", "subcategories",
    }
    for cat in normalized:
        if cat.get("name", "").lower() == cat_name.lower():
            for k, v in payload.items():
                if k in allowed_fields:
                    cat[k] = v
                    updated_fields.append(k)
            updated = True
            break

    if not updated:
        from fastapi import HTTPException
        raise HTTPException(404, f"Category '{cat_name}' not found")

    # Save back
    catalog["product_categories"] = normalized
    s["catalog"] = catalog
    await db.admin_settings.update_one(
        {"key": "settings_hub"},
        {"$set": {"value": s}},
        upsert=True,
    )

    # Invalidate cache
    try:
        from services.settings_resolver import invalidate_settings_cache
        invalidate_settings_cache()
    except Exception:
        pass

    return {"ok": True, "category": cat_name, "updated_fields": updated_fields}



@router.post("/bulk-import")
async def bulk_import_catalog(request: Request):
    """
    Bulk import list items/services from CSV.
    Expected CSV columns: name, category, subcategory, unit_of_measurement, sku, description, active
    """
    import csv
    import io
    from uuid import uuid4
    from datetime import datetime, timezone

    db = request.app.mongodb
    form = await request.form()
    file = form.get("file")
    if not file:
        from fastapi import HTTPException
        raise HTTPException(400, "No file uploaded")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = []
    now = datetime.now(timezone.utc).isoformat()

    for row_num, row in enumerate(reader, start=2):
        name = (row.get("name") or "").strip()
        if not name:
            skipped += 1
            errors.append({"row": row_num, "error": "Missing name"})
            continue

        category = (row.get("category") or "").strip()
        sku = (row.get("sku") or "").strip()

        # Check for duplicate by name + category
        exists = await db.products.find_one({"name": name, "category_name": category})
        if exists:
            skipped += 1
            errors.append({"row": row_num, "error": f"Duplicate: '{name}' in '{category}'"})
            continue

        doc = {
            "id": str(uuid4()),
            "name": name,
            "category_name": category,
            "subcategory": (row.get("subcategory") or "").strip(),
            "unit_of_measurement": (row.get("unit_of_measurement") or "Piece").strip(),
            "sku": sku or f"SKU-{uuid4().hex[:6].upper()}",
            "description": (row.get("description") or "").strip(),
            "status": "active" if (row.get("active") or "true").strip().lower() in ("true", "yes", "1", "active") else "draft",
            "source": "bulk_import",
            "created_at": now,
            "updated_at": now,
        }
        await db.products.insert_one(doc)
        imported += 1

    return {
        "ok": True,
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],
        "total_rows": imported + skipped,
    }
