"""
Partner Catalog Routes
Partner product/service catalog with pricing
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient
from services.sku_service import generate_konekt_sku, matches_konekt_pattern

router = APIRouter(prefix="/api/admin/partner-catalog", tags=["Partner Catalog"])

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
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("")
async def list_partner_catalog(partner_id: str = None, country_code: str = None, category: str = None, limit: int = 500):
    """List partner catalog items with optional filters."""
    query = {}
    if partner_id:
        query["partner_id"] = partner_id
    if country_code:
        query["country_code"] = country_code.upper()
    if category:
        query["category"] = category
    docs = await db.partner_catalog_items.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{item_id}")
async def get_partner_catalog_item(item_id: str):
    """Get partner catalog item details."""
    doc = await db.partner_catalog_items.find_one({"_id": ObjectId(item_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    return serialize_doc(doc)


@router.post("")
async def create_partner_catalog_item(payload: dict):
    """Create a partner catalog item."""
    partner_id = payload.get("partner_id")
    partner = None
    if partner_id:
        try:
            partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
        except:
            pass
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Generate Konekt-owned SKU; keep vendor's own SKU separately
    country_code = (payload.get("country_code") or partner.get("country_code", "TZ")).upper()[:2]
    incoming_sku = (payload.get("sku") or "").strip()
    konekt_sku = incoming_sku if matches_konekt_pattern(incoming_sku) else await generate_konekt_sku(
        db, category_name=payload.get("category", ""), country_code=country_code
    )

    doc = {
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "source_type": payload.get("source_type", "product"),  # product | service
        "sku": konekt_sku,
        "vendor_sku": payload.get("vendor_sku") or (incoming_sku if incoming_sku and incoming_sku != konekt_sku else ""),
        "name": payload.get("name"),
        "description": payload.get("description", ""),
        "category": payload.get("category"),
        "base_partner_price": float(payload.get("base_partner_price", 0) or 0),
        "country_code": (payload.get("country_code") or partner.get("country_code", "TZ")).upper(),
        "regions": payload.get("regions") or partner.get("regions", []),
        "partner_available_qty": float(payload.get("partner_available_qty", 0) or 0),
        "partner_status": payload.get("partner_status", "in_stock"),  # in_stock | low_stock | out_of_stock | on_request
        "lead_time_days": int(payload.get("lead_time_days") or partner.get("lead_time_days", 2) or 2),
        "min_order_qty": int(payload.get("min_order_qty", 1) or 1),
        "unit": payload.get("unit", "piece"),
        "is_active": True,
        "is_approved": payload.get("is_approved", True),  # Admin can approve/reject
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.partner_catalog_items.insert_one(doc)
    created = await db.partner_catalog_items.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{item_id}")
async def update_partner_catalog_item(item_id: str, payload: dict):
    """Update a partner catalog item."""
    existing = await db.partner_catalog_items.find_one({"_id": ObjectId(item_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Catalog item not found")

    update_data = {
        "name": payload.get("name", existing.get("name")),
        "description": payload.get("description", existing.get("description")),
        "category": payload.get("category", existing.get("category")),
        "base_partner_price": float(payload.get("base_partner_price", existing.get("base_partner_price", 0)) or 0),
        "regions": payload.get("regions", existing.get("regions")),
        "partner_available_qty": float(payload.get("partner_available_qty", existing.get("partner_available_qty", 0)) or 0),
        "partner_status": payload.get("partner_status", existing.get("partner_status")),
        "lead_time_days": int(payload.get("lead_time_days", existing.get("lead_time_days", 2)) or 2),
        "min_order_qty": int(payload.get("min_order_qty", existing.get("min_order_qty", 1)) or 1),
        "unit": payload.get("unit", existing.get("unit")),
        "is_active": payload.get("is_active", existing.get("is_active")),
        "is_approved": payload.get("is_approved", existing.get("is_approved")),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.partner_catalog_items.update_one({"_id": ObjectId(item_id)}, {"$set": update_data})
    updated = await db.partner_catalog_items.find_one({"_id": ObjectId(item_id)})
    return serialize_doc(updated)


@router.delete("/{item_id}")
async def delete_partner_catalog_item(item_id: str):
    """Delete a partner catalog item (soft delete)."""
    result = await db.partner_catalog_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    return {"message": "Catalog item deactivated successfully"}
