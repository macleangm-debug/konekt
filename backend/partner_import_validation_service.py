"""
Partner Import Validation Service
Validate import rows before committing
"""
from typing import List, Dict, Any


async def validate_import_rows(db, rows: List[Dict], partner_id: str) -> Dict[str, Any]:
    """Validate import rows and return validation result"""
    errors = []
    valid_rows = []

    seen_skus = set()
    seen_slugs = set()

    for idx, row in enumerate(rows, start=2):  # Row 1 is header
        row_errors = []

        # Required field validation
        if not row.get("sku"):
            row_errors.append("Missing SKU")
        if not row.get("slug"):
            row_errors.append("Missing slug")
        if not row.get("name"):
            row_errors.append("Missing name")
        if not row.get("category"):
            row_errors.append("Missing category")

        # Listing type validation
        listing_type = row.get("listing_type", "product")
        if listing_type not in {"product", "service"}:
            row_errors.append("listing_type must be 'product' or 'service'")

        # Product family validation for products
        if listing_type == "product" and not row.get("product_family"):
            row_errors.append("Missing product_family for product listing")

        # Service family validation for services
        if listing_type == "service" and not row.get("service_family"):
            row_errors.append("Missing service_family for service listing")

        sku = row.get("sku")
        slug = row.get("slug")

        # Check for duplicates within import file
        if sku:
            if sku in seen_skus:
                row_errors.append(f"Duplicate SKU '{sku}' in import file")
            else:
                seen_skus.add(sku)

        if slug:
            if slug in seen_slugs:
                row_errors.append(f"Duplicate slug '{slug}' in import file")
            else:
                seen_slugs.add(slug)

        # Check for existing SKU in database
        if sku:
            existing_sku = await db.marketplace_listings.find_one({"sku": sku})
            if existing_sku:
                row_errors.append(f"SKU '{sku}' already exists in database")

        # Check for existing slug in database
        if slug:
            existing_slug = await db.marketplace_listings.find_one({"slug": slug})
            if existing_slug:
                row_errors.append(f"Slug '{slug}' already exists in database")

        # Price validation
        if row.get("base_partner_price", 0) < 0:
            row_errors.append("base_partner_price cannot be negative")

        # Quantity validation
        if row.get("partner_available_qty", 0) < 0:
            row_errors.append("partner_available_qty cannot be negative")

        # Status validation
        valid_statuses = {"in_stock", "low_stock", "out_of_stock"}
        if row.get("partner_status") and row.get("partner_status") not in valid_statuses:
            row_errors.append(f"Invalid partner_status. Must be one of: {valid_statuses}")

        if row_errors:
            errors.append({
                "row_number": idx,
                "sku": sku or "",
                "slug": slug or "",
                "name": row.get("name", ""),
                "errors": row_errors,
            })
        else:
            valid_rows.append(row)

    return {
        "valid_rows": valid_rows,
        "errors": errors,
        "valid_count": len(valid_rows),
        "error_count": len(errors),
        "total_rows": len(rows),
    }
