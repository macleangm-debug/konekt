"""
Marketplace Publish Service
Handles admin approval → margin application → product publishing.
"""
from datetime import datetime, timezone
from uuid import uuid4
from services.product_margin_pricing_service import apply_margin


def _now():
    return datetime.now(timezone.utc).isoformat()


async def publish_from_submission(db, submission_id: str, margin_percent: float = 20.0):
    """
    Admin publishes a vendor submission to the marketplace.
    - Applies margin to compute sell price
    - Creates/updates the product in the products collection
    - Links back to vendor submission
    """
    sub = await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        return None

    base_cost = float(sub.get("base_cost", 0))
    sell_price = apply_margin(base_cost, margin_percent)

    product_id = str(uuid4())
    product_doc = {
        "id": product_id,
        "name": sub.get("product_name", ""),
        "description": sub.get("description", ""),
        "base_price": sell_price,
        "base_cost_internal": base_cost,
        "margin_percent": margin_percent,
        "category": "",
        "category_id": sub.get("category_id"),
        "group_id": sub.get("group_id"),
        "subcategory_id": sub.get("subcategory_id"),
        "image_url": sub.get("image_url", ""),
        "min_quantity": sub.get("min_quantity", 1),
        "vendor_id": sub.get("vendor_id"),
        "owner_vendor_id": sub.get("vendor_id"),
        "visibility_mode": sub.get("visibility_mode", "request_quote"),
        "source": "vendor_submission",
        "source_submission_id": submission_id,
        "market_code": sub.get("market_code", "TZ"),
        "is_active": True,
        "publish_status": "published",
        "stock_quantity": 0,
        "is_customizable": False,
        "sizes": [],
        "colors": [],
        "print_methods": [],
        "created_at": _now(),
        "updated_at": _now(),
    }

    # Resolve taxonomy names
    if sub.get("group_id"):
        grp = await db.catalog_groups.find_one({"id": sub["group_id"]}, {"_id": 0})
        if grp:
            product_doc["group_name"] = grp["name"]
    if sub.get("category_id"):
        cat = await db.catalog_categories.find_one({"id": sub["category_id"]}, {"_id": 0})
        if cat:
            product_doc["category"] = cat["name"]
            product_doc["category_name"] = cat["name"]
    if sub.get("subcategory_id"):
        scat = await db.catalog_subcategories.find_one({"id": sub["subcategory_id"]}, {"_id": 0})
        if scat:
            product_doc["subcategory_name"] = scat["name"]

    await db.products.insert_one(product_doc)
    product_doc.pop("_id", None)  # Remove MongoDB ObjectId before returning

    # Update submission with approved product link
    await db.vendor_product_submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "review_status": "approved",
            "approved_product_id": product_id,
            "updated_at": _now(),
        }}
    )

    return product_doc
