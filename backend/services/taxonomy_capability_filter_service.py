"""
Taxonomy Capability Filter Service
Filters taxonomy groups/categories/subcategories by vendor capabilities.

Enforcement rules:
- service_vendor: BLOCKED from product uploads entirely
- product_vendor, promo_vendor, hybrid_vendor: allowed
- If vendor has specific group_ids/category_ids/subcategory_ids assigned,
  filter taxonomy to only those
- If no specific assignments, return full product taxonomy
"""
import logging

from services.vendor_role_policy_service import can_publish_marketplace_items

logger = logging.getLogger("taxonomy_capability_filter")


def can_vendor_upload_products(vendor_profile: dict) -> bool:
    """Check if vendor role allows product uploads."""
    vendor_role = vendor_profile.get("vendor_role", "")
    if not vendor_role:
        # Fallback: check capability_type
        cap = vendor_profile.get("capability_type", "")
        if cap in ("services", "service"):
            return False
        return True
    return can_publish_marketplace_items(vendor_role)


async def get_filtered_taxonomy(db, vendor_id: str, vendor_profile: dict):
    """
    Returns taxonomy tree filtered by vendor capabilities.
    If vendor has specific capability assignments, restrict to those.
    Otherwise, return full product taxonomy.
    """
    from services.catalog_taxonomy_service import get_taxonomy_tree

    # Check if vendor can upload products at all
    if not can_vendor_upload_products(vendor_profile):
        return {"groups": [], "categories": [], "subcategories": [], "blocked": True,
                "reason": "Service-only vendors cannot upload products"}

    # Get full taxonomy
    full_tree = await get_taxonomy_tree(db)

    # Check for specific capability assignments
    capabilities = await db.vendor_capabilities.find_one(
        {"vendor_id": vendor_id}, {"_id": 0}
    )

    if not capabilities:
        # No specific restrictions - return full product taxonomy
        return full_tree

    allowed_group_ids = set(capabilities.get("group_ids", []))
    allowed_category_ids = set(capabilities.get("category_ids", []))
    allowed_subcategory_ids = set(capabilities.get("subcategory_ids", []))

    # If no specific IDs assigned, return full taxonomy
    if not allowed_group_ids and not allowed_category_ids and not allowed_subcategory_ids:
        return full_tree

    # Filter groups
    filtered_groups = []
    active_group_ids = set()
    for g in full_tree.get("groups", []):
        if not allowed_group_ids or g["id"] in allowed_group_ids:
            filtered_groups.append(g)
            active_group_ids.add(g["id"])

    # Filter categories - must belong to allowed groups
    filtered_categories = []
    active_category_ids = set()
    for c in full_tree.get("categories", []):
        if c.get("group_id") in active_group_ids:
            if not allowed_category_ids or c["id"] in allowed_category_ids:
                filtered_categories.append(c)
                active_category_ids.add(c["id"])

    # Filter subcategories - must belong to allowed categories
    filtered_subcategories = []
    for s in full_tree.get("subcategories", []):
        if s.get("category_id") in active_category_ids:
            if not allowed_subcategory_ids or s["id"] in allowed_subcategory_ids:
                filtered_subcategories.append(s)

    return {
        "groups": filtered_groups,
        "categories": filtered_categories,
        "subcategories": filtered_subcategories,
    }


async def validate_taxonomy_for_vendor(db, vendor_id: str, vendor_profile: dict,
                                        group_id: str, category_id: str, subcategory_id: str = None):
    """
    Backend enforcement: verify the vendor is allowed to submit under this taxonomy.
    Returns (allowed: bool, error_message: str | None).
    """
    if not can_vendor_upload_products(vendor_profile):
        return False, "Service-only vendors cannot upload products"

    # Verify category/subcategory exist
    cat = await db.catalog_categories.find_one({"id": category_id, "is_active": True}, {"_id": 0})
    if not cat:
        return False, f"Category '{category_id}' not found or inactive"

    if subcategory_id:
        sub = await db.catalog_subcategories.find_one(
            {"id": subcategory_id, "category_id": category_id, "is_active": True}, {"_id": 0}
        )
        if not sub:
            return False, f"Subcategory '{subcategory_id}' not found under category"

    # Check capability assignments
    capabilities = await db.vendor_capabilities.find_one(
        {"vendor_id": vendor_id}, {"_id": 0}
    )
    if not capabilities:
        return True, None  # No restrictions

    allowed_group_ids = set(capabilities.get("group_ids", []))
    allowed_category_ids = set(capabilities.get("category_ids", []))

    if allowed_group_ids and group_id and group_id not in allowed_group_ids:
        return False, "Vendor not authorized for this product group"

    if allowed_category_ids and category_id not in allowed_category_ids:
        return False, "Vendor not authorized for this category"

    return True, None
