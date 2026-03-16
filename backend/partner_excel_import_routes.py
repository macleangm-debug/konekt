"""
Partner Excel/CSV Import Routes
Preview and commit bulk imports from CSV/XLSX files
"""
from datetime import datetime, timezone
from fastapi import APIRouter, File, HTTPException, Header, UploadFile
import os
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from partner_access_service import get_partner_user_from_header
from partner_import_service import parse_partner_import
from partner_import_validation_service import validate_import_rows

router = APIRouter(prefix="/api/partner-import", tags=["Partner Import"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.post("/preview")
async def preview_partner_import(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """Preview import file without committing"""
    user = await get_partner_user_from_header(authorization)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = await file.read()

    try:
        rows = parse_partner_import(file.filename, file_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not rows:
        raise HTTPException(status_code=400, detail="No data rows found in file")

    validation = await validate_import_rows(db, rows, user["partner_id"])

    return {
        "file_name": file.filename,
        "total_rows": len(rows),
        "preview_count": min(len(rows), 20),
        "preview_rows": rows[:20],
        "valid_count": validation["valid_count"],
        "error_count": validation["error_count"],
        "errors": validation["errors"][:50],  # Limit error display
    }


@router.post("/commit")
async def commit_partner_import(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """Commit import file after validation"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = await file.read()

    try:
        rows = parse_partner_import(file.filename, file_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not rows:
        raise HTTPException(status_code=400, detail="No data rows found in file")

    validation = await validate_import_rows(db, rows, partner_id)

    if validation["error_count"] > 0:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Import has {validation['error_count']} validation error(s)",
                "errors": validation["errors"][:20],
            }
        )

    # Get partner info
    from bson import ObjectId
    partner = await db.partners.find_one({"_id": ObjectId(partner_id)})

    inserted_ids = []
    for row in validation["valid_rows"]:
        doc = {
            "source_mode": "partner",
            "partner_id": partner_id,
            "partner_name": partner.get("name") if partner else None,
            "listing_type": row.get("listing_type", "product"),
            "product_family": row.get("product_family"),
            "service_family": row.get("service_family"),
            "sku": row.get("sku"),
            "slug": row.get("slug"),
            "name": row.get("name"),
            "short_description": row.get("short_description", ""),
            "description": row.get("description", ""),
            "category": row.get("category"),
            "subcategory": row.get("subcategory"),
            "brand": row.get("brand"),
            "country_code": row.get("country_code") or (partner.get("country_code") if partner else ""),
            "regions": row.get("regions", []),
            "currency": row.get("currency", "TZS"),
            "base_partner_price": float(row.get("base_partner_price", 0) or 0),
            "customer_price": 0,  # Admin sets final price
            "partner_available_qty": float(row.get("partner_available_qty", 0) or 0),
            "partner_status": row.get("partner_status", "in_stock"),
            "lead_time_days": int(row.get("lead_time_days", 2) or 2),
            "images": row.get("images", []),
            "hero_image": row.get("images", [None])[0] if row.get("images") else None,
            "documents": row.get("documents", []),
            "product_details": {},
            "service_details": {},
            "approval_status": "submitted",
            "is_active": False,
            "submitted_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.marketplace_listings.insert_one(doc)
        inserted_ids.append(str(result.inserted_id))

    return {
        "message": "Import completed successfully",
        "inserted_count": len(inserted_ids),
        "inserted_ids": inserted_ids,
    }


@router.get("/template/csv")
async def get_csv_template():
    """Get downloadable CSV template"""
    from fastapi.responses import PlainTextResponse

    header = ",".join([
        "listing_type",
        "product_family",
        "service_family",
        "sku",
        "slug",
        "name",
        "short_description",
        "description",
        "category",
        "subcategory",
        "brand",
        "country_code",
        "regions",
        "currency",
        "base_partner_price",
        "partner_available_qty",
        "partner_status",
        "lead_time_days",
        "images",
        "documents",
    ])

    sample_product = ",".join([
        "product",
        "promotional",
        "",
        "PROMO-001",
        "branded-mug-white",
        "Branded Mug White",
        "Premium white ceramic mug for branding",
        "Premium white ceramic mug suitable for corporate gifts and promotional events. Dishwasher safe.",
        "promotional",
        "mugs",
        "Konekt Partner",
        "TZ",
        '"Dar es Salaam,Arusha"',
        "TZS",
        "3500",
        "250",
        "in_stock",
        "2",
        '""',
        '""',
    ])

    sample_service = ",".join([
        "service",
        "",
        "printing",
        "PRINT-001",
        "brochure-printing-a4",
        "Brochure Printing A4",
        "High-quality A4 brochure printing",
        "Professional A4 brochure printing with matte and gloss finishing options. Minimum order 100 pieces.",
        "printing",
        "brochures",
        "",
        "TZ",
        '"Dar es Salaam"',
        "TZS",
        "25000",
        "9999",
        "in_stock",
        "3",
        '""',
        '""',
    ])

    content = "\n".join([header, sample_product, sample_service])

    return PlainTextResponse(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="konekt_listing_import_template.csv"'},
    )


@router.get("/template/fields")
async def get_template_fields():
    """Get field descriptions for import template"""
    return {
        "fields": {
            "listing_type": {
                "required": True,
                "type": "string",
                "values": ["product", "service"],
                "description": "Type of listing"
            },
            "product_family": {
                "required": "For products",
                "type": "string",
                "values": ["promotional", "office_equipment", "stationery", "consumables", "spare_parts"],
                "description": "Product category family"
            },
            "service_family": {
                "required": "For services",
                "type": "string",
                "values": ["printing", "creative", "maintenance", "branding", "installation"],
                "description": "Service category family"
            },
            "sku": {
                "required": True,
                "type": "string",
                "description": "Unique product/service code"
            },
            "slug": {
                "required": True,
                "type": "string",
                "description": "URL-friendly identifier (e.g., branded-mug-white)"
            },
            "name": {
                "required": True,
                "type": "string",
                "description": "Display name"
            },
            "short_description": {
                "required": False,
                "type": "string",
                "description": "Brief description (50-100 chars)"
            },
            "description": {
                "required": False,
                "type": "string",
                "description": "Full description"
            },
            "category": {
                "required": True,
                "type": "string",
                "description": "Main category"
            },
            "subcategory": {
                "required": False,
                "type": "string",
                "description": "Sub-category"
            },
            "brand": {
                "required": False,
                "type": "string",
                "description": "Brand name"
            },
            "country_code": {
                "required": False,
                "type": "string",
                "description": "Two-letter country code (e.g., TZ, KE)"
            },
            "regions": {
                "required": False,
                "type": "string",
                "description": "Comma-separated regions"
            },
            "currency": {
                "required": False,
                "type": "string",
                "default": "TZS",
                "description": "Currency code"
            },
            "base_partner_price": {
                "required": True,
                "type": "number",
                "description": "Your price to Konekt"
            },
            "partner_available_qty": {
                "required": False,
                "type": "number",
                "default": 0,
                "description": "Quantity allocated for Konekt"
            },
            "partner_status": {
                "required": False,
                "type": "string",
                "values": ["in_stock", "low_stock", "out_of_stock"],
                "default": "in_stock",
                "description": "Stock status"
            },
            "lead_time_days": {
                "required": False,
                "type": "number",
                "default": 2,
                "description": "Days to fulfill"
            },
            "images": {
                "required": False,
                "type": "string",
                "description": "Comma-separated image URLs"
            },
            "documents": {
                "required": False,
                "type": "string",
                "description": "Comma-separated document URLs"
            },
        }
    }
