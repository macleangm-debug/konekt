"""
Product Upload Service
Handles vendor product submissions with structural separation:
  - product definition (name, brand, taxonomy, descriptions, images)
  - vendor supply (base price, lead time, supply mode, default quantity)
  - variants (size/color/model combos, SKU, quantity, optional price/image overrides)

All submissions land as pending_review. No live catalog items created at upload time.
"""
import re
import logging
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger("product_upload")

MAX_IMAGES = 10
URL_PATTERN = re.compile(r'^https?://\S+\.\S+')


def _now():
    return datetime.now(timezone.utc).isoformat()


def validate_image_url(url: str) -> bool:
    if not url or not url.strip():
        return False
    return bool(URL_PATTERN.match(url.strip()))


def validate_images(images: list) -> tuple:
    """Validate image URLs. Returns (valid_urls, errors)."""
    errors = []
    valid = []
    if len(images) > MAX_IMAGES:
        errors.append(f"Maximum {MAX_IMAGES} images allowed, got {len(images)}")
        images = images[:MAX_IMAGES]
    for i, url in enumerate(images):
        if validate_image_url(url):
            valid.append(url.strip())
        else:
            errors.append(f"Image {i+1}: invalid URL format")
    return valid, errors


def build_submission_doc(
    vendor_id: str,
    vendor_name: str,
    product: dict,
    supply: dict,
    variants: list,
    source: str = "single_upload",
    import_job_id: str = None,
) -> dict:
    """Build a vendor_product_submission document with structural separation."""
    # Validate images
    raw_images = product.get("images", [])
    valid_images, img_errors = validate_images(raw_images)
    primary_image = valid_images[0] if valid_images else ""

    now = _now()
    return {
        "id": str(uuid4()),
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "source": source,
        "import_job_id": import_job_id,
        # Product Definition
        "product": {
            "product_name": product.get("product_name", "").strip(),
            "brand": product.get("brand", "").strip(),
            "group_id": product.get("group_id"),
            "group_name": product.get("group_name", ""),
            "category_id": product.get("category_id"),
            "category_name": product.get("category_name", ""),
            "subcategory_id": product.get("subcategory_id"),
            "subcategory_name": product.get("subcategory_name", ""),
            "short_description": product.get("short_description", "").strip(),
            "full_description": product.get("full_description", "").strip(),
            "images": valid_images,
            "primary_image": primary_image,
        },
        # Vendor Supply
        "supply": {
            "base_price_vat_inclusive": float(supply.get("base_price_vat_inclusive", 0)),
            "lead_time_days": int(supply.get("lead_time_days", 0)),
            "supply_mode": supply.get("supply_mode", "in_stock"),
            "default_quantity": int(supply.get("default_quantity", 1)),
            "vendor_product_code": supply.get("vendor_product_code", "").strip(),
        },
        # Variants
        "variants": _build_variants(variants),
        # Review state
        "review_status": "pending_review",
        "review_notes": "",
        "reviewed_by": None,
        "reviewed_at": None,
        "image_validation_errors": img_errors,
        "created_at": now,
        "updated_at": now,
    }


def _build_variants(variants: list) -> list:
    """Build variant list with validation."""
    result = []
    for v in (variants or []):
        variant = {
            "variant_id": str(uuid4()),
            "sku": (v.get("sku") or "").strip(),
            "size": (v.get("size") or "").strip() or None,
            "color": (v.get("color") or "").strip() or None,
            "model": (v.get("model") or "").strip() or None,
            "quantity": int(v.get("quantity", 0)),
            "price_override": float(v["price_override"]) if v.get("price_override") else None,
            "image_url": (v.get("image_url") or "").strip() or None,
        }
        result.append(variant)
    return result


async def create_product_submission(db, vendor_id: str, vendor_name: str, product: dict, supply: dict, variants: list):
    """Create a single product submission for admin review."""
    doc = build_submission_doc(vendor_id, vendor_name, product, supply, variants, source="single_upload")
    await db.vendor_product_submissions.insert_one(doc)
    doc.pop("_id", None)
    logger.info("Product submission created: %s by vendor %s", doc["id"], vendor_id)
    return doc


async def list_vendor_submissions(db, vendor_id: str, status: str = None):
    """List submissions for a specific vendor."""
    query = {"vendor_id": vendor_id}
    if status:
        query["review_status"] = status
    results = []
    async for doc in db.vendor_product_submissions.find(query, {"_id": 0}).sort("created_at", -1):
        results.append(doc)
    return results


async def get_submission_by_id(db, submission_id: str):
    """Get a single submission by ID."""
    return await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})


async def list_all_submissions(db, status: str = None, vendor_id: str = None):
    """Admin: list all submissions with optional filters."""
    query = {}
    if status:
        query["review_status"] = status
    if vendor_id:
        query["vendor_id"] = vendor_id
    results = []
    async for doc in db.vendor_product_submissions.find(query, {"_id": 0}).sort("created_at", -1):
        results.append(doc)
    return results


async def review_submission(db, submission_id: str, status: str, notes: str, reviewed_by: str):
    """Admin reviews a submission (approve/reject)."""
    valid_statuses = {"approved", "rejected", "changes_requested"}
    if status not in valid_statuses:
        return None
    now = _now()
    await db.vendor_product_submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "review_status": status,
            "review_notes": notes,
            "reviewed_by": reviewed_by,
            "reviewed_at": now,
            "updated_at": now,
        }}
    )
    return await db.vendor_product_submissions.find_one({"id": submission_id}, {"_id": 0})
