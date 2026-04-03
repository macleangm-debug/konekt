"""
Product Import Service
2-Step bulk import: Validate → Preview → Confirm

Step 1 (validate): Parse file, check taxonomy, store validation session in DB
Step 2 (confirm): Read stored validation session, persist only valid rows as pending_review submissions

Supported formats: CSV, XLS, XLSX
"""
import io
import logging
from datetime import datetime, timezone
from uuid import uuid4

import pandas as pd

from services.product_upload_service import build_submission_doc

logger = logging.getLogger("product_import")

SUPPORTED_EXTENSIONS = {"csv", "xls", "xlsx"}

REQUIRED_COLUMNS = {"product_name", "category", "base_price_vat_inclusive"}

EXPECTED_COLUMNS = [
    "vendor_product_code", "product_name", "brand",
    "category", "subcategory",
    "short_description", "full_description",
    "base_price_vat_inclusive", "lead_time_days", "supply_mode",
    "variant_size", "variant_color", "variant_model",
    "quantity", "sku",
    "image_1_url", "image_2_url", "image_3_url",
]


def _now():
    return datetime.now(timezone.utc).isoformat()


def get_file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def parse_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV/XLS/XLSX file bytes into a DataFrame."""
    ext = get_file_extension(filename)
    if ext == "csv":
        return pd.read_csv(io.BytesIO(file_bytes), dtype=str).fillna("")
    elif ext in ("xls", "xlsx"):
        return pd.read_excel(io.BytesIO(file_bytes), dtype=str, engine="openpyxl" if ext == "xlsx" else "xlrd").fillna("")
    else:
        raise ValueError(f"Unsupported file format: {ext}")


async def _build_taxonomy_lookup(db):
    """Build category/subcategory name→id lookups from DB."""
    groups = {}
    async for g in db.catalog_groups.find({"is_active": True}, {"_id": 0}):
        groups[g["name"].strip().lower()] = g

    categories = {}
    async for c in db.catalog_categories.find({"is_active": True}, {"_id": 0}):
        categories[c["name"].strip().lower()] = c

    subcategories = {}
    async for s in db.catalog_subcategories.find({"is_active": True}, {"_id": 0}):
        key = s["name"].strip().lower()
        if key not in subcategories:
            subcategories[key] = []
        subcategories[key].append(s)

    return groups, categories, subcategories


def _resolve_category(cat_name: str, categories: dict, groups: dict):
    """Resolve category name to category doc + group doc."""
    key = cat_name.strip().lower()
    cat = categories.get(key)
    if not cat:
        return None, None
    group_id = cat.get("group_id", "")
    grp = None
    for g in groups.values():
        if g.get("id") == group_id:
            grp = g
            break
    return cat, grp


def _resolve_subcategory(sub_name: str, category_id: str, subcategories: dict):
    """Resolve subcategory name to subcategory doc, scoped to a category."""
    key = sub_name.strip().lower()
    matches = subcategories.get(key, [])
    for s in matches:
        if s.get("category_id") == category_id:
            return s
    return matches[0] if matches else None


def _validate_row(row_num: int, row: dict, categories: dict, subcategories: dict, groups: dict):
    """Validate a single import row. Returns (valid, errors, parsed_data)."""
    errors = []
    product_name = str(row.get("product_name", "")).strip()
    category_name = str(row.get("category", "")).strip()
    subcategory_name = str(row.get("subcategory", "")).strip()

    if not product_name:
        errors.append("product_name is required")
    if not category_name:
        errors.append("category is required")

    # Parse price
    try:
        price = float(row.get("base_price_vat_inclusive", 0) or 0)
        if price <= 0:
            errors.append("base_price_vat_inclusive must be > 0")
    except (ValueError, TypeError):
        errors.append("base_price_vat_inclusive must be a valid number")
        price = 0

    # Resolve taxonomy
    cat_doc, grp_doc = _resolve_category(category_name, categories, groups)
    sub_doc = None
    if not cat_doc and category_name:
        errors.append(f"Category '{category_name}' not found in taxonomy")
    if cat_doc and subcategory_name:
        sub_doc = _resolve_subcategory(subcategory_name, cat_doc["id"], subcategories)
        if not sub_doc:
            errors.append(f"Subcategory '{subcategory_name}' not found under '{category_name}'")

    # Collect images
    images = []
    for key in ["image_1_url", "image_2_url", "image_3_url"]:
        val = str(row.get(key, "")).strip()
        if val:
            images.append(val)

    # Parse quantity
    try:
        qty = int(float(row.get("quantity", 0) or 0))
    except (ValueError, TypeError):
        qty = 0
        errors.append("quantity must be a valid number")

    # Parse lead_time
    try:
        lead_time = int(float(row.get("lead_time_days", 0) or 0))
    except (ValueError, TypeError):
        lead_time = 0

    parsed = {
        "product": {
            "product_name": product_name,
            "brand": str(row.get("brand", "")).strip(),
            "group_id": grp_doc["id"] if grp_doc else None,
            "group_name": grp_doc["name"] if grp_doc else "",
            "category_id": cat_doc["id"] if cat_doc else None,
            "category_name": cat_doc["name"] if cat_doc else category_name,
            "subcategory_id": sub_doc["id"] if sub_doc else None,
            "subcategory_name": sub_doc["name"] if sub_doc else subcategory_name,
            "short_description": str(row.get("short_description", "")).strip(),
            "full_description": str(row.get("full_description", "")).strip(),
            "images": images,
        },
        "supply": {
            "base_price_vat_inclusive": price,
            "lead_time_days": lead_time,
            "supply_mode": str(row.get("supply_mode", "in_stock")).strip() or "in_stock",
            "default_quantity": qty,
            "vendor_product_code": str(row.get("vendor_product_code", "")).strip(),
        },
        "variant": {
            "sku": str(row.get("sku", "")).strip(),
            "size": str(row.get("variant_size", "")).strip() or None,
            "color": str(row.get("variant_color", "")).strip() or None,
            "model": str(row.get("variant_model", "")).strip() or None,
            "quantity": qty,
        },
    }

    return len(errors) == 0, errors, parsed


async def validate_import(db, file_bytes: bytes, filename: str, vendor_id: str, vendor_name: str):
    """
    Step 1: Parse file, validate each row, store validation session.
    Returns the import job document.
    """
    ext = get_file_extension(filename)
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file format: {ext}. Supported: CSV, XLS, XLSX")

    df = parse_file(file_bytes, filename)

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Check required columns
    missing_cols = REQUIRED_COLUMNS - set(df.columns)
    if missing_cols:
        raise ValueError(f"Missing required columns: {', '.join(missing_cols)}")

    # Build taxonomy lookups
    groups, categories, subcategories = await _build_taxonomy_lookup(db)

    # Validate each row
    rows = []
    valid_count = 0
    error_count = 0
    for idx, row in df.iterrows():
        row_num = idx + 2  # +2 for header row + 0-index
        row_dict = row.to_dict()
        valid, errors, parsed = _validate_row(row_num, row_dict, categories, subcategories, groups)
        rows.append({
            "row_number": row_num,
            "valid": valid,
            "errors": errors,
            "data": parsed,
        })
        if valid:
            valid_count += 1
        else:
            error_count += 1

    now = _now()
    job = {
        "id": str(uuid4()),
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "filename": filename,
        "file_type": ext,
        "status": "validated",
        "total_rows": len(rows),
        "valid_rows": valid_count,
        "error_rows": error_count,
        "validation_result": rows,
        "created_submissions": [],
        "created_at": now,
        "updated_at": now,
    }
    await db.vendor_import_jobs.insert_one(job)
    job.pop("_id", None)
    logger.info("Import validation complete: %s (%d valid, %d errors)", job["id"], valid_count, error_count)
    return job


async def confirm_import(db, import_job_id: str, vendor_id: str):
    """
    Step 2: Read stored validation session, persist only valid rows as pending_review submissions.
    Returns list of created submission IDs.
    """
    job = await db.vendor_import_jobs.find_one(
        {"id": import_job_id, "vendor_id": vendor_id},
        {"_id": 0}
    )
    if not job:
        raise ValueError("Import job not found")
    if job["status"] != "validated":
        raise ValueError(f"Import job is in '{job['status']}' state, expected 'validated'")

    vendor_name = job.get("vendor_name", "")
    created_ids = []
    rows = job.get("validation_result", [])

    for row in rows:
        if not row.get("valid"):
            continue
        data = row["data"]
        # Group variants by product name - each row becomes a submission with its variant
        variant = data.get("variant", {})
        variants = []
        if variant.get("sku") or variant.get("size") or variant.get("color") or variant.get("model"):
            variants = [variant]

        doc = build_submission_doc(
            vendor_id=vendor_id,
            vendor_name=vendor_name,
            product=data["product"],
            supply=data["supply"],
            variants=variants,
            source="bulk_import",
            import_job_id=import_job_id,
        )
        await db.vendor_product_submissions.insert_one(doc)
        doc.pop("_id", None)
        created_ids.append(doc["id"])

    # Update job status
    await db.vendor_import_jobs.update_one(
        {"id": import_job_id},
        {"$set": {
            "status": "confirmed",
            "created_submissions": created_ids,
            "updated_at": _now(),
        }}
    )

    logger.info("Import confirmed: %s -> %d submissions created", import_job_id, len(created_ids))
    return created_ids


async def list_import_jobs(db, vendor_id: str):
    """List import jobs for a vendor."""
    results = []
    async for doc in db.vendor_import_jobs.find(
        {"vendor_id": vendor_id},
        {"_id": 0, "validation_result": 0}  # Exclude heavy validation data from list
    ).sort("created_at", -1):
        results.append(doc)
    return results


async def get_import_job(db, job_id: str, vendor_id: str = None):
    """Get full import job including validation results."""
    query = {"id": job_id}
    if vendor_id:
        query["vendor_id"] = vendor_id
    return await db.vendor_import_jobs.find_one(query, {"_id": 0})


async def list_all_import_jobs(db, status: str = None):
    """Admin: list all import jobs."""
    query = {}
    if status:
        query["status"] = status
    results = []
    async for doc in db.vendor_import_jobs.find(
        query,
        {"_id": 0, "validation_result": 0}
    ).sort("created_at", -1):
        results.append(doc)
    return results
