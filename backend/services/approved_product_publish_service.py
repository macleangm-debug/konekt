"""
Approved Product Publish Service
Materializes approved vendor submissions into canonical `products` collection records.

Key rules:
- Approval creates/updates a real product in `products` — the same collection the marketplace reads
- Idempotent: re-approval updates existing product, no duplicates
- Variants stored as sub-documents on the product
- Supply data linked to vendor
- Publish log created for audit
"""
import logging
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger("approved_product_publish")


def _now():
    return datetime.now(timezone.utc).isoformat()


def build_canonical_product(submission: dict) -> dict:
    """Transform a vendor_product_submission into a canonical products record."""
    product = submission.get("product", {})
    supply = submission.get("supply", {})
    variants = submission.get("variants", [])

    # Build variant sub-documents
    canonical_variants = []
    for v in variants:
        canonical_variants.append({
            "variant_id": v.get("variant_id", str(uuid4())),
            "sku": v.get("sku", ""),
            "size": v.get("size"),
            "color": v.get("color"),
            "model": v.get("model"),
            "quantity": v.get("quantity", 0),
            "price_override": v.get("price_override"),
            "image_url": v.get("image_url"),
            "status": "active",
        })

    return {
        # Core product identity
        "name": product.get("product_name", ""),
        "brand": product.get("brand", ""),
        "description": product.get("short_description", ""),
        "full_description": product.get("full_description", ""),
        "images": product.get("images", []),
        "primary_image": product.get("primary_image", ""),

        # Taxonomy
        "group_id": product.get("group_id"),
        "group_name": product.get("group_name", ""),
        "category_id": product.get("category_id"),
        "category_name": product.get("category_name", ""),
        "subcategory_id": product.get("subcategory_id"),
        "subcategory_name": product.get("subcategory_name", ""),

        # Pricing and supply
        "price": supply.get("base_price_vat_inclusive", 0),
        "customer_price": supply.get("base_price_vat_inclusive", 0),
        "base_price_vat_inclusive": supply.get("base_price_vat_inclusive", 0),
        "lead_time_days": supply.get("lead_time_days", 0),
        "supply_mode": supply.get("supply_mode", "in_stock"),
        "default_quantity": supply.get("default_quantity", 1),
        "vendor_product_code": supply.get("vendor_product_code", ""),

        # Vendor linkage
        "vendor_id": submission.get("vendor_id", ""),
        "vendor_name": submission.get("vendor_name", ""),

        # Variants
        "variants": canonical_variants,

        # Source linkage
        "source_submission_id": submission.get("id", ""),
        "source": "vendor_submission",

        # Status
        "is_active": True,
        "status": "active",
        "publish_status": "published",
    }


async def publish_approved_submission(db, submission: dict, published_by: str) -> dict:
    """
    Materialize an approved submission into the canonical products collection.
    Idempotent: updates existing product if source_submission_id matches.
    Returns the canonical product record.
    """
    submission_id = submission.get("id", "")
    canonical = build_canonical_product(submission)
    now = _now()

    # Check if product already exists from this submission (idempotent)
    existing = await db.products.find_one(
        {"source_submission_id": submission_id},
    )

    if existing:
        # Update existing product
        canonical["updated_at"] = now
        await db.products.update_one(
            {"_id": existing["_id"]},
            {"$set": canonical}
        )
        product_id = str(existing["_id"])
        logger.info("Updated existing product %s from submission %s", product_id, submission_id)
    else:
        # Create new product
        canonical["id"] = str(uuid4())
        canonical["created_at"] = now
        canonical["updated_at"] = now
        result = await db.products.insert_one(canonical)
        product_id = str(result.inserted_id)
        logger.info("Created new product %s from submission %s", product_id, submission_id)

    # Create publish log
    publish_log = {
        "id": str(uuid4()),
        "submission_id": submission_id,
        "product_id": product_id,
        "published_by": published_by,
        "action": "update" if existing else "create",
        "status": "published",
        "created_at": now,
    }
    await db.product_publish_logs.insert_one(publish_log)
    publish_log.pop("_id", None)

    # Return the canonical product
    product = await db.products.find_one(
        {"source_submission_id": submission_id}, {"_id": 0}
    )
    return product or canonical
