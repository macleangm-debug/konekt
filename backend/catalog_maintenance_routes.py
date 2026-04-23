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
db = client[os.environ["DB_NAME"]]
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
