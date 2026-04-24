"""
Vendor Admin Routes — CRUD for vendor profiles, supply records, and taxonomy seed.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
import uuid

from services.taxonomy_seed_service import seed_taxonomy


router = APIRouter(prefix="/api/admin/vendors", tags=["Vendor Admin"])


# ─── Models ──────────────────────────────────────────────────────────
class VendorCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    capability_type: str = "products"  # products | promotional_materials | services | multi
    taxonomy_ids: list = Field(default_factory=list)
    notes: Optional[str] = ""


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    capability_type: Optional[str] = None
    taxonomy_ids: Optional[list] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SupplyRecordCreate(BaseModel):
    product_id: str
    base_price_vat_inclusive: float
    quantity: int = 0
    lead_time_days: int = 0
    supply_mode: str = "in_stock"  # in_stock | made_to_order | on_demand


# ─── Taxonomy Seed ───────────────────────────────────────────────────
@router.post("/taxonomy/seed")
async def seed_default_taxonomy(request: Request):
    """Idempotent seed of default taxonomy. Never overwrites admin edits."""
    db = request.app.mongodb
    result = await seed_taxonomy(db)
    return result


@router.get("/taxonomy")
async def list_taxonomy(request: Request, group: Optional[str] = None):
    """List taxonomy records, optionally filtered by group."""
    db = request.app.mongodb
    query = {}
    if group:
        query["group"] = group
    docs = await db.taxonomy.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs


# ─── Vendor CRUD ─────────────────────────────────────────────────────
@router.get("")
async def list_vendors(request: Request, status: Optional[str] = None, capability: Optional[str] = None):
    """List all vendors with enriched counts.

    Accepts users with role ∈ {vendor, partner_vendor, supplier} so both
    legacy and partner-linked vendors surface in the admin list.
    """
    db = request.app.mongodb
    query = {"role": {"$in": ["vendor", "partner_vendor", "supplier"]}}
    if status:
        query["vendor_status"] = status
    if capability:
        query["capability_type"] = capability

    vendors = await db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(500)

    result = []
    for v in vendors:
        vid = v.get("id", "")
        partner_id = v.get("partner_id")

        # Enrich with product count — supply_records for legacy vendors,
        # products table for partner-linked vendors (Darcity).
        active_products = await db.vendor_supply.count_documents({"vendor_id": vid})
        if partner_id and not active_products:
            active_products = await db.products.count_documents({"partner_id": partner_id, "is_active": True})

        # Resolve taxonomy names from taxonomy_ids OR from distinct product categories
        taxonomy_ids = v.get("taxonomy_ids", []) or []
        taxonomy_names = []
        if taxonomy_ids:
            tax_docs = await db.taxonomy.find({"id": {"$in": taxonomy_ids}}, {"_id": 0, "name": 1}).to_list(50)
            taxonomy_names = [t["name"] for t in tax_docs]
        # Fallback — derive branches from the vendor's products
        if not taxonomy_names and partner_id:
            branches = await db.products.distinct("branch", {"partner_id": partner_id, "is_active": True})
            categories = await db.products.distinct("category", {"partner_id": partner_id, "is_active": True})
            taxonomy_names = sorted(set([b for b in branches if b] + [c for c in categories if c]))[:8]

        result.append({
            "id": vid,
            "partner_id": partner_id,
            "name": v.get("full_name", v.get("name", "")) or v.get("company_name", ""),
            "email": v.get("email", ""),
            "phone": v.get("phone", ""),
            "company": v.get("company", v.get("company_name", "")),
            "capability_type": v.get("capability_type", "products"),
            "taxonomy_ids": taxonomy_ids,
            "taxonomy_names": taxonomy_names,
            "status": v.get("vendor_status", v.get("status", "active")),
            "active_products": active_products,
            "supply_records": active_products,
            "notes": v.get("notes", ""),
            "created_at": v.get("created_at", ""),
            "updated_at": v.get("updated_at", v.get("created_at", "")),
        })

    return result


@router.get("/stats")
async def vendor_stats(request: Request):
    """Vendor stat cards — includes legacy `vendor` and `partner_vendor` roles."""
    db = request.app.mongodb
    ROLE_FILTER = {"role": {"$in": ["vendor", "partner_vendor", "supplier"]}}
    total = await db.users.count_documents(ROLE_FILTER)
    active = await db.users.count_documents({**ROLE_FILTER, "vendor_status": "active"})
    inactive = await db.users.count_documents({**ROLE_FILTER, "vendor_status": {"$in": ["inactive", "suspended"]}})
    products = await db.users.count_documents({**ROLE_FILTER, "capability_type": "products"})
    services = await db.users.count_documents({**ROLE_FILTER, "capability_type": "services"})
    promo = await db.users.count_documents({**ROLE_FILTER, "capability_type": "promotional_materials"})
    multi = await db.users.count_documents({**ROLE_FILTER, "capability_type": "multi"})
    # Count without explicit capability — fallback
    no_cap = total - products - services - promo - multi
    return {
        "total": total,
        "active": active if active else total,
        "inactive": inactive,
        "products": products + max(no_cap, 0),
        "services": services,
        "promotional_materials": promo,
        "multi": multi,
    }


@router.post("")
async def create_vendor(payload: VendorCreate, request: Request):
    """Create a new vendor."""
    db = request.app.mongodb
    vendor_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "id": vendor_id,
        "full_name": payload.name,
        "email": payload.email or "",
        "phone": payload.phone or "",
        "company": payload.company or "",
        "role": "vendor",
        "capability_type": payload.capability_type,
        "taxonomy_ids": payload.taxonomy_ids,
        "vendor_status": "active",
        "notes": payload.notes or "",
        "created_at": now,
        "updated_at": now,
    }
    await db.users.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/{vendor_id}")
async def get_vendor(vendor_id: str, request: Request):
    """Get vendor profile with supply records."""
    db = request.app.mongodb
    vendor = await db.users.find_one({"id": vendor_id, "role": "vendor"}, {"_id": 0, "password": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Enrich with supply records
    supply_records = await db.vendor_supply.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(500)

    # Resolve taxonomy names
    taxonomy_ids = vendor.get("taxonomy_ids", [])
    taxonomy_names = []
    if taxonomy_ids:
        tax_docs = await db.taxonomy.find({"id": {"$in": taxonomy_ids}}, {"_id": 0, "name": 1, "group": 1}).to_list(50)
        taxonomy_names = [{"name": t["name"], "group": t.get("group", "")} for t in tax_docs]

    return {
        "id": vendor.get("id"),
        "name": vendor.get("full_name", ""),
        "email": vendor.get("email", ""),
        "phone": vendor.get("phone", ""),
        "company": vendor.get("company", ""),
        "capability_type": vendor.get("capability_type", "products"),
        "taxonomy_ids": taxonomy_ids,
        "taxonomy_names": taxonomy_names,
        "status": vendor.get("vendor_status", "active"),
        "notes": vendor.get("notes", ""),
        "supply_records": supply_records,
        "created_at": vendor.get("created_at", ""),
        "updated_at": vendor.get("updated_at", ""),
    }


@router.put("/{vendor_id}")
async def update_vendor(vendor_id: str, payload: VendorUpdate, request: Request):
    """Update vendor profile."""
    db = request.app.mongodb
    update = {"updated_at": datetime.now(timezone.utc)}
    if payload.name is not None:
        update["full_name"] = payload.name
    if payload.email is not None:
        update["email"] = payload.email
    if payload.phone is not None:
        update["phone"] = payload.phone
    if payload.company is not None:
        update["company"] = payload.company
    if payload.capability_type is not None:
        update["capability_type"] = payload.capability_type
    if payload.taxonomy_ids is not None:
        update["taxonomy_ids"] = payload.taxonomy_ids
    if payload.status is not None:
        update["vendor_status"] = payload.status
    if payload.notes is not None:
        update["notes"] = payload.notes

    result = await db.users.update_one({"id": vendor_id, "role": "vendor"}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"ok": True}


# ─── Supply Records ──────────────────────────────────────────────────
@router.post("/{vendor_id}/supply")
async def add_supply_record(vendor_id: str, payload: SupplyRecordCreate, request: Request):
    """Add a supply record (products and promo blanks only — not services)."""
    db = request.app.mongodb
    vendor = await db.users.find_one({"id": vendor_id, "role": "vendor"})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    record_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "id": record_id,
        "vendor_id": vendor_id,
        "product_id": payload.product_id,
        "base_price_vat_inclusive": payload.base_price_vat_inclusive,
        "quantity": payload.quantity,
        "lead_time_days": payload.lead_time_days,
        "supply_mode": payload.supply_mode,
        "created_at": now,
        "updated_at": now,
    }
    await db.vendor_supply.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/{vendor_id}/supply")
async def list_supply_records(vendor_id: str, request: Request):
    """List vendor supply records."""
    db = request.app.mongodb
    records = await db.vendor_supply.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(500)
    return records
