"""
Marketplace Taxonomy Routes
Public and admin endpoints for catalog taxonomy (groups/categories/subcategories).
"""
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient
from services.catalog_taxonomy_service import get_taxonomy_tree
from uuid import uuid4
from datetime import datetime, timezone

router = APIRouter(tags=["marketplace-taxonomy"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def _now():
    return datetime.now(timezone.utc).isoformat()


# ─── Public ───────────────────────────────────────────────

@router.get("/api/marketplace/taxonomy")
async def get_taxonomy():
    """Public: get full taxonomy tree for marketplace filters."""
    return await get_taxonomy_tree(db)


# ─── Admin CRUD ───────────────────────────────────────────

@router.get("/api/admin/catalog/groups")
async def list_groups():
    results = []
    async for g in db.catalog_groups.find({}, {"_id": 0}).sort("sort_order", 1):
        results.append(g)
    return results


@router.post("/api/admin/catalog/groups")
async def create_group(payload: dict):
    doc = {
        "id": str(uuid4()),
        "market_code": payload.get("market_code", "TZ"),
        "type": payload.get("type", "product"),
        "name": payload["name"],
        "slug": payload["name"].lower().replace(" & ", "-").replace(" ", "-"),
        "is_active": True,
        "sort_order": payload.get("sort_order", 99),
        "created_at": _now(),
    }
    await db.catalog_groups.insert_one(doc)
    doc.pop("_id", None)  # Remove MongoDB ObjectId before returning
    return doc


@router.put("/api/admin/catalog/groups/{group_id}")
async def update_group(group_id: str, payload: dict):
    update = {"name": payload["name"], "is_active": payload.get("is_active", True)}
    if "sort_order" in payload:
        update["sort_order"] = payload["sort_order"]
    await db.catalog_groups.update_one({"id": group_id}, {"$set": update})
    doc = await db.catalog_groups.find_one({"id": group_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Group not found")
    return doc


@router.delete("/api/admin/catalog/groups/{group_id}")
async def delete_group(group_id: str):
    await db.catalog_groups.update_one({"id": group_id}, {"$set": {"is_active": False}})
    return {"ok": True}


@router.get("/api/admin/catalog/categories")
async def list_categories(group_id: str = None):
    query = {}
    if group_id:
        query["group_id"] = group_id
    results = []
    async for c in db.catalog_categories.find(query, {"_id": 0}).sort("sort_order", 1):
        results.append(c)
    return results


@router.post("/api/admin/catalog/categories")
async def create_category(payload: dict):
    doc = {
        "id": str(uuid4()),
        "group_id": payload["group_id"],
        "name": payload["name"],
        "slug": payload["name"].lower().replace(" & ", "-").replace(" ", "-"),
        "is_active": True,
        "sort_order": payload.get("sort_order", 99),
        "created_at": _now(),
    }
    await db.catalog_categories.insert_one(doc)
    doc.pop("_id", None)  # Remove MongoDB ObjectId before returning
    return doc


@router.put("/api/admin/catalog/categories/{category_id}")
async def update_category(category_id: str, payload: dict):
    update = {"name": payload["name"], "is_active": payload.get("is_active", True)}
    if "sort_order" in payload:
        update["sort_order"] = payload["sort_order"]
    await db.catalog_categories.update_one({"id": category_id}, {"$set": update})
    doc = await db.catalog_categories.find_one({"id": category_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Category not found")
    return doc


@router.delete("/api/admin/catalog/categories/{category_id}")
async def delete_category(category_id: str):
    await db.catalog_categories.update_one({"id": category_id}, {"$set": {"is_active": False}})
    return {"ok": True}


@router.get("/api/admin/catalog/subcategories")
async def list_subcategories(category_id: str = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    results = []
    async for s in db.catalog_subcategories.find(query, {"_id": 0}).sort("sort_order", 1):
        results.append(s)
    return results


@router.post("/api/admin/catalog/subcategories")
async def create_subcategory(payload: dict):
    doc = {
        "id": str(uuid4()),
        "category_id": payload["category_id"],
        "group_id": payload.get("group_id", ""),
        "name": payload["name"],
        "slug": payload["name"].lower().replace(" & ", "-").replace(" ", "-"),
        "is_active": True,
        "sort_order": payload.get("sort_order", 99),
        "created_at": _now(),
    }
    await db.catalog_subcategories.insert_one(doc)
    doc.pop("_id", None)  # Remove MongoDB ObjectId before returning
    return doc


@router.delete("/api/admin/catalog/subcategories/{sub_id}")
async def delete_subcategory(sub_id: str):
    await db.catalog_subcategories.update_one({"id": sub_id}, {"$set": {"is_active": False}})
    return {"ok": True}


# ─── Admin Summary ────────────────────────────────────────

@router.get("/api/admin/catalog/summary")
async def get_catalog_summary():
    groups = await db.catalog_groups.count_documents({"is_active": True})
    categories = await db.catalog_categories.count_documents({"is_active": True})
    subcategories = await db.catalog_subcategories.count_documents({"is_active": True})
    products = await db.products.count_documents({"is_active": True})
    submissions = await db.vendor_product_submissions.count_documents({})
    pending = await db.vendor_product_submissions.count_documents({"review_status": "pending"})
    return {
        "groups": groups,
        "categories": categories,
        "subcategories": subcategories,
        "products": products,
        "vendor_submissions": submissions,
        "pending_submissions": pending,
    }
