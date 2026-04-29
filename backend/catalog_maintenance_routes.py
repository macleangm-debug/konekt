"""
Catalog maintenance — admin-only.

Endpoints:
  POST /api/admin/maintenance/clear-demo-catalog   → wipe seeded/demo products
  POST /api/admin/maintenance/ensure-vendor        → idempotently create a partner/vendor by name
"""
import os
import jwt
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin/maintenance", tags=["Catalog Maintenance"])
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "konekt")]
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")


async def _assert_admin(request: Request) -> dict:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    try:
        payload = jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


class ConfirmPayload(BaseModel):
    confirm: str = ""


@router.post("/clear-demo-catalog")
async def clear_demo_catalog(payload: ConfirmPayload, request: Request):
    """Wipe demo/seed catalog items.  Requires body {"confirm":"WIPE-DEMO"} to avoid accidents.

    A product is considered demo if ALL of:
      • has no vendor_id / partner_id (i.e. not linked to a real vendor)
      • OR image_url points at images.unsplash.com (seeded placeholder)
      • OR name matches the known seed pattern ('Classic Cotton T-Shirt' etc.)
    """
    await _assert_admin(request)
    if payload.confirm != "WIPE-DEMO":
        raise HTTPException(status_code=400, detail="Pass {\"confirm\": \"WIPE-DEMO\"} to proceed")

    # Count first
    q = {"$or": [
        {"image_url": {"$regex": "images\\.unsplash\\.com"}},
        {"vendor_id": {"$in": [None, ""]}},
        {"vendor_id": {"$exists": False}},
        {"name": {"$regex": "^TEST_|^Test_|Sample Product", "$options": "i"}},
        {"name": {"$regex": "Valid Product", "$options": "i"}},
    ]}
    products_n = await db.products.count_documents({})
    deleted_products = await db.products.delete_many(q)
    # Also wipe partner_catalog demo items
    pc_q = {"$or": [
        {"image_url": {"$regex": "images\\.unsplash\\.com"}},
        {"partner_id": {"$in": [None, ""]}},
        {"partner_id": {"$exists": False}},
        {"is_demo": True},
    ]}
    deleted_pc = await db.partner_catalog.delete_many(pc_q)

    return {
        "ok": True,
        "products_before": products_n,
        "products_deleted": deleted_products.deleted_count,
        "products_remaining": await db.products.count_documents({}),
        "partner_catalog_deleted": deleted_pc.deleted_count,
    }


class EnsureVendorPayload(BaseModel):
    name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country_code: str = "TZ"
    partner_type: str = "product"
    website: Optional[str] = None
    payment_modality: str = "pay_per_order"


@router.post("/ensure-vendor")
async def ensure_vendor(payload: EnsureVendorPayload, request: Request):
    """Idempotently create a partner record.  Returns existing if a partner with the same
    (case-insensitive) name already exists — safe to re-run from the URL import flow."""
    await _assert_admin(request)
    nm = payload.name.strip()
    if not nm:
        raise HTTPException(status_code=400, detail="name required")

    existing = await db.partners.find_one({"name": {"$regex": f"^{nm}$", "$options": "i"}}, {"_id": 1, "name": 1, "partner_type": 1})
    if existing:
        return {
            "ok": True,
            "created": False,
            "partner_id": str(existing["_id"]),
            "name": existing.get("name"),
        }

    now = datetime.now(timezone.utc)
    doc = {
        "name": nm,
        "company_name": payload.company_name or nm,
        "email": payload.email or "",
        "phone": payload.phone or "",
        "country_code": payload.country_code,
        "partner_type": payload.partner_type,
        "website": payload.website or "",
        "payment_modality": payload.payment_modality,
        "status": "active",
        "source": "url_import",
        "created_at": now,
        "updated_at": now,
    }
    res = await db.partners.insert_one(doc)
    partner_id = str(res.inserted_id)

    return {"ok": True, "created": True, "partner_id": partner_id, "name": nm}


@router.post("/purge-test-pollution")
async def purge_test_pollution(payload: ConfirmPayload, request: Request):
    """Purge TEST_/Test_/pytest leftover rows from every catalog-related collection.
    Requires body {"confirm":"PURGE-TESTS"}."""
    await _assert_admin(request)
    if payload.confirm != "PURGE-TESTS":
        raise HTTPException(status_code=400, detail="Pass {\"confirm\": \"PURGE-TESTS\"} to proceed")

    name_rx = {"$regex": "^TEST_|^Test_|TEST_|Sample Product|Valid Product|Bulk Upload Test|Routing Test|Test Printed", "$options": "i"}
    results = {}

    # vendor_product_submissions: check product_name
    r = await db.vendor_product_submissions.delete_many({"$or": [
        {"product_name": name_rx},
        {"product.product_name": name_rx},
        {"description": {"$regex": "Test product submitted by vendor", "$options": "i"}},
    ]})
    results["vendor_product_submissions"] = r.deleted_count

    # catalog_products: name field
    r = await db.catalog_products.delete_many({"name": name_rx})
    results["catalog_products"] = r.deleted_count

    # partner_catalog_items: name OR partner_name contains TEST_
    r = await db.partner_catalog_items.delete_many({"$or": [
        {"name": name_rx},
        {"partner_name": {"$regex": "^TEST_|Demo Supplier", "$options": "i"}},
    ]})
    results["partner_catalog_items"] = r.deleted_count

    # marketplace_listings: name OR partner_name
    r = await db.marketplace_listings.delete_many({"$or": [
        {"name": name_rx},
        {"partner_name": {"$regex": "^TEST_", "$options": "i"}},
        {"sku": {"$regex": "^TEST-", "$options": "i"}},
    ]})
    results["marketplace_listings"] = r.deleted_count

    # products collection: also scrub any TEST_ that sneaked in
    r = await db.products.delete_many({"name": name_rx})
    results["products"] = r.deleted_count

    return {"ok": True, "deleted": results}


class PublishCatalogPayload(BaseModel):
    partner_id: str
    country_code: str = "TZ"
    markup_multiplier: float = 1.35  # Konekt default markup over vendor cost
    branch: str = "Promotional Materials"
    confirm: str = ""


@router.post("/publish-partner-catalog-to-products")
async def publish_partner_catalog_to_products(payload: PublishCatalogPayload, request: Request):
    """Promote every partner_catalog_items row for a given vendor into the live `products`
    collection so they appear on the public Konekt marketplace. Applies a default markup
    to compute `customer_price` from the vendor's base_partner_price.
    Idempotent: re-running updates existing rows (matched by sku)."""
    await _assert_admin(request)
    if payload.confirm != "PUBLISH":
        raise HTTPException(status_code=400, detail="Pass confirm='PUBLISH' to proceed")
    if not payload.partner_id:
        raise HTTPException(status_code=400, detail="partner_id required")

    partner = None
    try:
        if len(payload.partner_id) == 24:
            partner = await db.partners.find_one({"_id": ObjectId(payload.partner_id)}) or None
    except Exception:
        partner = None
    if not partner:
        partner = await db.partners.find_one({"id": payload.partner_id}) or {}
    partner_name = (partner or {}).get("name") or (partner or {}).get("company_name") or ""

    cursor = db.partner_catalog_items.find({"partner_id": payload.partner_id})
    inserted = 0
    updated = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    async for src in cursor:
        name = (src.get("name") or "").strip()
        sku = src.get("sku") or ""
        if not name:
            skipped += 1
            continue
        base_cost = float(src.get("base_partner_price") or 0)
        customer_price = round(base_cost * (payload.markup_multiplier or 1), 0) if base_cost > 0 else 0

        doc = {
            "name": name,
            "description": src.get("description") or "",
            "sku": sku,
            "vendor_sku": src.get("vendor_sku") or "",
            "category": src.get("category") or "",
            "branch": payload.branch,
            "brand": src.get("brand") or "",
            "vendor_id": payload.partner_id,
            "partner_id": payload.partner_id,
            "partner_name": partner_name or src.get("partner_name") or "",
            "base_price": customer_price,
            "customer_price": customer_price,
            "vendor_cost": base_cost,
            "unit": src.get("unit") or "piece",
            "image_url": src.get("image_url") or "",
            "source_url": src.get("source_url") or "",
            "country_code": (src.get("country_code") or payload.country_code).upper()[:2],
            "stock": int(src.get("partner_available_qty") or 0),
            "is_active": True,
            "status": "published",
            "approval_status": "approved",
            "source": "partner_catalog_publish",
            "updated_at": now,
        }

        existing = await db.products.find_one({"sku": sku}) if sku else None
        if not existing and name:
            existing = await db.products.find_one({"name": name, "partner_id": payload.partner_id})

        if existing:
            await db.products.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated += 1
        else:
            doc["id"] = str(uuid4())
            doc["created_at"] = now
            await db.products.insert_one(doc)
            inserted += 1

    return {
        "ok": True,
        "partner_id": payload.partner_id,
        "partner_name": partner_name,
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "total_live_products": await db.products.count_documents({"is_active": True}),
    }
