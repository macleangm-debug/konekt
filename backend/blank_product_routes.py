"""
Blank Product Routes - Catalog of promotional materials, uniforms, workwear
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/blank-products", tags=["Blank Products"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("")
async def list_blank_products(category: str = None, is_active: bool = None):
    query = {}
    if category:
        query["category"] = category
    if is_active is not None:
        query["is_active"] = is_active
    docs = await db.blank_products.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/categories")
async def list_blank_product_categories():
    """Get distinct categories for filtering"""
    categories = await db.blank_products.distinct("category")
    return categories


@router.get("/{product_id}")
async def get_blank_product(product_id: str):
    doc = await db.blank_products.find_one({"_id": ObjectId(product_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Blank product not found")
    return serialize_doc(doc)


@router.post("")
async def create_blank_product(payload: dict):
    doc = {
        "name": payload.get("name"),
        "sku": payload.get("sku", ""),
        "category": payload.get("category"),
        "subcategory": payload.get("subcategory", ""),
        "description": payload.get("description", ""),
        "sizes": payload.get("sizes", []),
        "colors": payload.get("colors", []),
        "materials": payload.get("materials", []),
        "branding_methods": payload.get("branding_methods", []),
        "tailoring_supported": bool(payload.get("tailoring_supported", False)),
        "measurement_fields": payload.get("measurement_fields", []),
        "base_cost": float(payload.get("base_cost", 0) or 0),
        "min_order_qty": int(payload.get("min_order_qty", 1) or 1),
        "lead_time_days": int(payload.get("lead_time_days", 3) or 3),
        "images": payload.get("images", []),
        "is_active": bool(payload.get("is_active", True)),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.blank_products.insert_one(doc)
    created = await db.blank_products.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{product_id}")
async def update_blank_product(product_id: str, payload: dict):
    existing = await db.blank_products.find_one({"_id": ObjectId(product_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Blank product not found")
    
    updates = {
        "name": payload.get("name", existing.get("name")),
        "sku": payload.get("sku", existing.get("sku", "")),
        "category": payload.get("category", existing.get("category")),
        "subcategory": payload.get("subcategory", existing.get("subcategory", "")),
        "description": payload.get("description", existing.get("description", "")),
        "sizes": payload.get("sizes", existing.get("sizes", [])),
        "colors": payload.get("colors", existing.get("colors", [])),
        "materials": payload.get("materials", existing.get("materials", [])),
        "branding_methods": payload.get("branding_methods", existing.get("branding_methods", [])),
        "tailoring_supported": bool(payload.get("tailoring_supported", existing.get("tailoring_supported", False))),
        "measurement_fields": payload.get("measurement_fields", existing.get("measurement_fields", [])),
        "base_cost": float(payload.get("base_cost", existing.get("base_cost", 0)) or 0),
        "min_order_qty": int(payload.get("min_order_qty", existing.get("min_order_qty", 1)) or 1),
        "lead_time_days": int(payload.get("lead_time_days", existing.get("lead_time_days", 3)) or 3),
        "images": payload.get("images", existing.get("images", [])),
        "is_active": bool(payload.get("is_active", existing.get("is_active", True))),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.blank_products.update_one({"_id": ObjectId(product_id)}, {"$set": updates})
    updated = await db.blank_products.find_one({"_id": ObjectId(product_id)})
    return serialize_doc(updated)


@router.delete("/{product_id}")
async def delete_blank_product(product_id: str):
    result = await db.blank_products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blank product not found")
    return {"deleted": True}


# Public endpoint for browsing blank products
@router.get("/public/catalog")
async def public_blank_products_catalog(category: str = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    docs = await db.blank_products.find(query).sort("name", 1).to_list(length=500)
    # Remove cost info for public
    result = []
    for doc in docs:
        d = serialize_doc(doc)
        d.pop("base_cost", None)
        result.append(d)
    return result
