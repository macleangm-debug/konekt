"""
Vendor Product Upload Routes
Handles single product upload, taxonomy retrieval (capability-filtered),
2-step bulk import (validate → confirm), and vendor submission listing.
"""
import os
import logging
from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient

from partner_access_service import get_partner_user_from_header
from services.product_upload_service import (
    create_product_submission,
    list_vendor_submissions,
    get_submission_by_id,
)
from services.product_import_service import (
    validate_import,
    confirm_import,
    list_import_jobs,
    get_import_job,
)
from services.taxonomy_capability_filter_service import (
    can_vendor_upload_products,
    get_filtered_taxonomy,
    validate_taxonomy_for_vendor,
)

logger = logging.getLogger("vendor_product_upload_routes")

router = APIRouter(prefix="/api/vendor/products", tags=["vendor-product-upload"])

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ─── Helpers ──────────────────────────────────────────────

async def _get_vendor(authorization: str):
    """Extract vendor user from JWT."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user.get("partner_id", str(user.get("_id", "")))
    vendor_name = user.get("full_name", user.get("name", user.get("email", "")))

    # Load vendor profile from partners collection
    from bson import ObjectId
    vendor_profile = {}
    try:
        partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
        if partner:
            vendor_profile = {
                "vendor_role": partner.get("vendor_role", ""),
                "capability_type": partner.get("capability_type", ""),
                "products_capability_status": partner.get("products_capability_status", ""),
                "promo_capability_status": partner.get("promo_capability_status", ""),
            }
    except Exception:
        pass

    # Also check vendor_capabilities for role
    cap = await db.vendor_capabilities.find_one({"vendor_id": partner_id}, {"_id": 0})
    if cap and cap.get("capability_type"):
        vendor_profile["capability_type"] = cap["capability_type"]
        if not vendor_profile.get("vendor_role"):
            from services.vendor_role_policy_service import classify_vendor_role
            vendor_profile["vendor_role"] = classify_vendor_role(cap["capability_type"])

    return partner_id, vendor_name, vendor_profile


# ─── Taxonomy (capability-filtered) ──────────────────────

@router.get("/taxonomy")
async def get_vendor_taxonomy(authorization: Optional[str] = Header(None)):
    """Get taxonomy tree filtered by vendor capabilities."""
    vendor_id, vendor_name, vendor_profile = await _get_vendor(authorization)
    return await get_filtered_taxonomy(db, vendor_id, vendor_profile)


# ─── Single Product Upload ───────────────────────────────

class ProductDefinitionIn(BaseModel):
    product_name: str
    brand: str = ""
    group_id: Optional[str] = None
    category_id: str
    subcategory_id: Optional[str] = None
    short_description: str = ""
    full_description: str = ""
    images: List[str] = []

class SupplyDataIn(BaseModel):
    base_price_vat_inclusive: float
    lead_time_days: int = 0
    supply_mode: str = "in_stock"
    default_quantity: int = 1
    vendor_product_code: str = ""
    allocated_quantity: int = 0

class VariantIn(BaseModel):
    sku: str = ""
    size: Optional[str] = None
    color: Optional[str] = None
    model: Optional[str] = None
    quantity: int = 0
    price_override: Optional[float] = None
    image_url: Optional[str] = None

class ProductUploadIn(BaseModel):
    product: ProductDefinitionIn
    supply: SupplyDataIn
    variants: List[VariantIn] = []


@router.post("/upload")
async def upload_product(payload: ProductUploadIn, authorization: Optional[str] = Header(None)):
    """Submit a single product for admin review. Lands as pending_review."""
    vendor_id, vendor_name, vendor_profile = await _get_vendor(authorization)

    # Backend enforcement: check capability
    if not can_vendor_upload_products(vendor_profile):
        raise HTTPException(403, "Service-only vendors cannot upload products")

    # Validate required fields
    if not payload.product.product_name or not payload.product.product_name.strip():
        raise HTTPException(400, "Product name is required")
    if payload.supply.base_price_vat_inclusive <= 0:
        raise HTTPException(400, "Base price must be greater than 0")
    if payload.supply.allocated_quantity < 0:
        raise HTTPException(400, "Allocated quantity cannot be negative")

    # Resolve taxonomy names for display
    product_dict = payload.product.dict()

    # Resolve group name
    if product_dict.get("group_id"):
        grp = await db.catalog_groups.find_one({"id": product_dict["group_id"]}, {"_id": 0})
        product_dict["group_name"] = grp["name"] if grp else ""

    # Resolve category name
    cat = await db.catalog_categories.find_one({"id": product_dict["category_id"]}, {"_id": 0})
    if cat:
        product_dict["category_name"] = cat["name"]
        if not product_dict.get("group_id"):
            product_dict["group_id"] = cat.get("group_id", "")
            grp = await db.catalog_groups.find_one({"id": cat.get("group_id", "")}, {"_id": 0})
            product_dict["group_name"] = grp["name"] if grp else ""

    # Resolve subcategory name
    if product_dict.get("subcategory_id"):
        sub = await db.catalog_subcategories.find_one({"id": product_dict["subcategory_id"]}, {"_id": 0})
        product_dict["subcategory_name"] = sub["name"] if sub else ""

    # Enforce taxonomy validation
    allowed, err = await validate_taxonomy_for_vendor(
        db, vendor_id, vendor_profile,
        product_dict.get("group_id", ""),
        product_dict["category_id"],
        product_dict.get("subcategory_id"),
    )
    if not allowed:
        raise HTTPException(403, err)

    doc = await create_product_submission(
        db, vendor_id, vendor_name,
        product=product_dict,
        supply=payload.supply.dict(),
        variants=[v.dict() for v in payload.variants],
    )
    return {"ok": True, "submission": doc}


# ─── Submissions List ────────────────────────────────────

@router.get("/my-submissions")
async def my_submissions(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """List vendor's own product submissions."""
    vendor_id, _, _ = await _get_vendor(authorization)
    subs = await list_vendor_submissions(db, vendor_id, status)
    return subs


@router.get("/my-submissions/{submission_id}")
async def get_my_submission(
    submission_id: str,
    authorization: Optional[str] = Header(None),
):
    """Get a specific submission."""
    vendor_id, _, _ = await _get_vendor(authorization)
    sub = await get_submission_by_id(db, submission_id)
    if not sub or sub.get("vendor_id") != vendor_id:
        raise HTTPException(404, "Submission not found")
    return sub


# ─── 2-Step Bulk Import ──────────────────────────────────

@router.post("/import/validate")
async def validate_import_file(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """Step 1: Upload file, parse, validate taxonomy, return preview."""
    vendor_id, vendor_name, vendor_profile = await _get_vendor(authorization)

    if not can_vendor_upload_products(vendor_profile):
        raise HTTPException(403, "Service-only vendors cannot upload products")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Empty file")

    try:
        job = await validate_import(db, file_bytes, file.filename, vendor_id, vendor_name)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return {"ok": True, "import_job": job}


@router.post("/import/{job_id}/confirm")
async def confirm_import_job(
    job_id: str,
    authorization: Optional[str] = Header(None),
):
    """Step 2: Confirm import - persists only valid rows from stored validation session."""
    vendor_id, _, vendor_profile = await _get_vendor(authorization)

    if not can_vendor_upload_products(vendor_profile):
        raise HTTPException(403, "Service-only vendors cannot upload products")

    try:
        created_ids = await confirm_import(db, job_id, vendor_id)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return {"ok": True, "created_count": len(created_ids), "submission_ids": created_ids}


@router.get("/import/jobs")
async def my_import_jobs(authorization: Optional[str] = Header(None)):
    """List vendor's import job history."""
    vendor_id, _, _ = await _get_vendor(authorization)
    return await list_import_jobs(db, vendor_id)


@router.get("/import/jobs/{job_id}")
async def get_my_import_job(
    job_id: str,
    authorization: Optional[str] = Header(None),
):
    """Get full import job details including validation results."""
    vendor_id, _, _ = await _get_vendor(authorization)
    job = await get_import_job(db, job_id, vendor_id)
    if not job:
        raise HTTPException(404, "Import job not found")
    return job
