"""
Public Service Routes - Public-facing service catalog and details
"""
import os
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/public-services", tags=["Public Services"])

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
    return doc


@router.get("/groups")
async def get_active_service_groups():
    docs = await db.service_groups.find({"is_active": True}).sort("sort_order", 1).to_list(length=200)
    return [serialize_doc(doc) for doc in docs]


@router.get("/types")
async def get_active_service_types(group_key: str = None):
    query = {"is_active": True}
    if group_key:
        query["group_key"] = group_key
    docs = await db.service_types.find(query).sort("sort_order", 1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/types/{service_key}")
async def get_service_detail(service_key: str):
    service = await db.service_types.find_one({"key": service_key, "is_active": True})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    template = await db.service_form_templates.find_one({"service_key": service_key})
    response = serialize_doc(service)
    response["form_template"] = serialize_doc(template) if template else {"sections": [], "fields": []}
    
    # If service has product blanks, fetch them
    if service.get("has_product_blanks"):
        blanks = await db.blank_products.find({"is_active": True}).to_list(length=500)
        response["blank_products"] = [serialize_doc(b) for b in blanks]
    
    return response


@router.get("/by-slug/{slug}")
async def get_service_by_slug(slug: str):
    service = await db.service_types.find_one({"slug": slug, "is_active": True})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    template = await db.service_form_templates.find_one({"service_key": service.get("key")})
    response = serialize_doc(service)
    response["form_template"] = serialize_doc(template) if template else {"sections": [], "fields": []}
    
    return response


@router.get("/blank-products")
async def get_public_blank_products(category: str = None):
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


@router.get("/blank-products/categories")
async def get_blank_product_categories():
    categories = await db.blank_products.distinct("category", {"is_active": True})
    return categories
