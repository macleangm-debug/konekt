"""
Partner Bulk Upload Routes
CSV/JSON bulk upload for partner catalog items
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional

from partner_access_service import get_partner_user_from_header
from services.sku_service import generate_konekt_sku, matches_konekt_pattern

router = APIRouter(prefix="/api/partner-bulk-upload", tags=["Partner Bulk Upload"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("/catalog")
async def bulk_upload_catalog(payload: dict, authorization: Optional[str] = Header(None)):
    """Bulk upload catalog items from JSON array"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    rows = payload.get("rows", [])
    if not isinstance(rows, list) or not rows:
        raise HTTPException(status_code=400, detail="rows array is required")

    partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    inserted = 0
    updated = 0
    errors = []

    for idx, row in enumerate(rows):
        try:
            vendor_sku_raw = (row.get("sku") or row.get("vendor_sku") or "").strip()
            name = row.get("name")

            if not name:
                raise ValueError("name is required")

            country_code = (row.get("country_code") or partner.get("country_code") or "TZ").upper()[:2]

            # Dedupe strategy:
            #   1) Match by vendor_sku (the vendor recognises their own SKU when re-uploading)
            #   2) If vendor didn't give a SKU, match by (partner_id, name) as a fallback
            existing = None
            if vendor_sku_raw:
                existing = await db.partner_catalog_items.find_one({
                    "partner_id": partner_id,
                    "$or": [{"vendor_sku": vendor_sku_raw}, {"sku": vendor_sku_raw}],
                })
            if not existing:
                existing = await db.partner_catalog_items.find_one({
                    "partner_id": partner_id,
                    "name": name,
                    "country_code": country_code,
                })

            if existing:
                # Preserve the existing Konekt SKU on re-upload
                konekt_sku = existing.get("sku")
            elif matches_konekt_pattern(vendor_sku_raw):
                # Vendor happens to be supplying a KNT-format SKU (from an earlier export) — trust it
                konekt_sku = vendor_sku_raw
            else:
                konekt_sku = await generate_konekt_sku(
                    db, category_name=row.get("category", ""), country_code=country_code
                )

            doc = {
                "partner_id": partner_id,
                "partner_name": partner.get("name"),
                "source_type": row.get("source_type", "product"),
                "sku": konekt_sku,
                "vendor_sku": vendor_sku_raw if vendor_sku_raw and vendor_sku_raw != konekt_sku else existing.get("vendor_sku", "") if existing else "",
                "name": name,
                "description": row.get("description", ""),
                "category": row.get("category"),
                "base_partner_price": float(row.get("base_partner_price", 0) or 0),
                "country_code": country_code,
                "regions": row.get("regions") if isinstance(row.get("regions"), list) else partner.get("regions", []),
                "partner_available_qty": float(row.get("partner_available_qty", 0) or 0),
                "partner_status": row.get("partner_status", "in_stock"),
                "lead_time_days": int(row.get("lead_time_days") or partner.get("lead_time_days", 2)),
                "min_order_qty": int(row.get("min_order_qty", 1) or 1),
                "unit": row.get("unit", "piece"),
                "is_active": True,
                "updated_at": datetime.now(timezone.utc),
            }

            if existing:
                # Update existing
                await db.partner_catalog_items.update_one(
                    {"_id": existing["_id"]},
                    {"$set": doc}
                )
                updated += 1
            else:
                # Insert new
                doc["is_approved"] = False
                doc["created_at"] = datetime.now(timezone.utc)
                await db.partner_catalog_items.insert_one(doc)
                inserted += 1

        except Exception as exc:
            errors.append({"row": idx + 1, "sku": row.get("sku", ""), "error": str(exc)})

    return {
        "inserted": inserted,
        "updated": updated,
        "errors": errors,
        "total_processed": inserted + updated,
    }


@router.get("/template")
async def get_upload_template():
    """Get the JSON template for bulk upload"""
    return {
        "template": [
            {
                "sku": "SKU-001",
                "name": "Product Name",
                "description": "Product description",
                "category": "promotional",
                "base_partner_price": 10000,
                "partner_available_qty": 100,
                "partner_status": "in_stock",
                "lead_time_days": 2,
                "min_order_qty": 10,
                "unit": "piece",
                "source_type": "product"
            }
        ],
        "fields": {
            "sku": "Required - Unique product SKU",
            "name": "Required - Product name",
            "description": "Optional - Product description",
            "category": "Optional - Category name",
            "base_partner_price": "Required - Your price to Konekt (number)",
            "partner_available_qty": "Required - Quantity allocated for Konekt",
            "partner_status": "Optional - in_stock | low_stock | out_of_stock",
            "lead_time_days": "Optional - Days to fulfill (default: 2)",
            "min_order_qty": "Optional - Minimum order quantity (default: 1)",
            "unit": "Optional - Unit of measure (default: piece)",
            "source_type": "Optional - product | service (default: product)"
        }
    }


@router.post("/validate")
async def validate_upload(payload: dict, authorization: Optional[str] = Header(None)):
    """Validate bulk upload data without inserting"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    rows = payload.get("rows", [])
    if not isinstance(rows, list):
        raise HTTPException(status_code=400, detail="rows array is required")

    valid_rows = []
    errors = []
    duplicate_skus = []

    seen_skus = set()

    for idx, row in enumerate(rows):
        sku = row.get("sku")
        name = row.get("name")

        row_errors = []

        if not sku:
            row_errors.append("Missing SKU")
        if not name:
            row_errors.append("Missing name")
        
        if sku:
            if sku in seen_skus:
                row_errors.append("Duplicate SKU in upload")
                duplicate_skus.append(sku)
            seen_skus.add(sku)

            # Check if exists in database
            existing = await db.partner_catalog_items.find_one({
                "partner_id": partner_id,
                "sku": sku
            })
            if existing:
                row["_exists"] = True
                row["_action"] = "update"
            else:
                row["_exists"] = False
                row["_action"] = "insert"

        try:
            if row.get("base_partner_price"):
                float(row.get("base_partner_price"))
            if row.get("partner_available_qty"):
                float(row.get("partner_available_qty"))
        except ValueError:
            row_errors.append("Invalid number format")

        if row_errors:
            errors.append({"row": idx + 1, "sku": sku or "", "errors": row_errors})
        else:
            valid_rows.append(row)

    return {
        "valid_count": len(valid_rows),
        "error_count": len(errors),
        "insert_count": len([r for r in valid_rows if r.get("_action") == "insert"]),
        "update_count": len([r for r in valid_rows if r.get("_action") == "update"]),
        "duplicate_skus": list(set(duplicate_skus)),
        "errors": errors,
        "preview": valid_rows[:10]  # First 10 valid rows as preview
    }
