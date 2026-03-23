from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid

router = APIRouter(prefix="/api/admin/catalog", tags=["Admin Catalog Setup"])

# ==================== MODELS ====================

class SubService(BaseModel):
    id: Optional[str] = None
    name: str

class ServiceCreate(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    sub_services: List[SubService] = []
    status: str = "active"

class ProductVariant(BaseModel):
    id: Optional[str] = None
    name: str

class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    variants: List[ProductVariant] = []
    status: str = "active"

# ==================== SERVICES CRUD ====================

@router.get("/services")
async def list_catalog_services(request: Request):
    """List all services in the catalog"""
    db = request.app.mongodb
    services = await db.catalog_services.find(
        {"status": {"$ne": "deleted"}},
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return services

@router.post("/services")
async def create_catalog_service(data: ServiceCreate, request: Request):
    """Create a new service in the catalog"""
    db = request.app.mongodb
    
    service_id = str(uuid.uuid4())
    service_doc = {
        "id": service_id,
        "name": data.name,
        "category": data.category or "General",
        "description": data.description or "",
        "sub_services": [
            {"id": sub.id or str(uuid.uuid4()), "name": sub.name}
            for sub in data.sub_services
        ],
        "status": data.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.catalog_services.insert_one(service_doc)
    return {"id": service_id, "message": "Service created successfully"}

@router.put("/services/{service_id}")
async def update_catalog_service(service_id: str, data: ServiceCreate, request: Request):
    """Update a service in the catalog"""
    db = request.app.mongodb
    
    existing = await db.catalog_services.find_one({"id": service_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_doc = {
        "name": data.name,
        "category": data.category or "General",
        "description": data.description or "",
        "sub_services": [
            {"id": sub.id or str(uuid.uuid4()), "name": sub.name}
            for sub in data.sub_services
        ],
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.catalog_services.update_one({"id": service_id}, {"$set": update_doc})
    return {"id": service_id, "message": "Service updated successfully"}

@router.delete("/services/{service_id}")
async def delete_catalog_service(service_id: str, request: Request):
    """Soft delete a service from the catalog"""
    db = request.app.mongodb
    
    result = await db.catalog_services.update_one(
        {"id": service_id},
        {"$set": {"status": "deleted", "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service deleted successfully"}

# ==================== PRODUCTS CRUD ====================

@router.get("/products")
async def list_catalog_products(request: Request):
    """List all products in the catalog"""
    db = request.app.mongodb
    products = await db.catalog_products.find(
        {"status": {"$ne": "deleted"}},
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return products

@router.post("/products")
async def create_catalog_product(data: ProductCreate, request: Request):
    """Create a new product category in the catalog"""
    db = request.app.mongodb
    
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        "name": data.name,
        "category": data.category or "General",
        "description": data.description or "",
        "variants": [
            {"id": var.id or str(uuid.uuid4()), "name": var.name}
            for var in data.variants
        ],
        "status": data.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.catalog_products.insert_one(product_doc)
    return {"id": product_id, "message": "Product category created successfully"}

@router.put("/products/{product_id}")
async def update_catalog_product(product_id: str, data: ProductCreate, request: Request):
    """Update a product category in the catalog"""
    db = request.app.mongodb
    
    existing = await db.catalog_products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_doc = {
        "name": data.name,
        "category": data.category or "General",
        "description": data.description or "",
        "variants": [
            {"id": var.id or str(uuid.uuid4()), "name": var.name}
            for var in data.variants
        ],
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.catalog_products.update_one({"id": product_id}, {"$set": update_doc})
    return {"id": product_id, "message": "Product category updated successfully"}

@router.delete("/products/{product_id}")
async def delete_catalog_product(product_id: str, request: Request):
    """Soft delete a product category from the catalog"""
    db = request.app.mongodb
    
    result = await db.catalog_products.update_one(
        {"id": product_id},
        {"$set": {"status": "deleted", "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product category deleted successfully"}

# ==================== PUBLIC TREE ENDPOINT ====================

@router.get("/tree")
async def get_catalog_tree(request: Request):
    """Get the full catalog tree for dropdowns"""
    db = request.app.mongodb
    
    services = await db.catalog_services.find(
        {"status": "active"},
        {"_id": 0}
    ).to_list(500)
    
    products = await db.catalog_products.find(
        {"status": "active"},
        {"_id": 0}
    ).to_list(500)
    
    # Group services by category
    service_groups = {}
    for svc in services:
        cat = svc.get("category", "General")
        if cat not in service_groups:
            service_groups[cat] = {"id": cat.lower().replace(" ", "_"), "name": cat, "children": []}
        service_groups[cat]["children"].append({
            "id": svc["id"],
            "name": svc["name"],
            "children": [{"id": sub["id"], "name": sub["name"]} for sub in svc.get("sub_services", [])]
        })
    
    # Group products by category
    product_groups = {}
    for prod in products:
        cat = prod.get("category", "General")
        if cat not in product_groups:
            product_groups[cat] = {"id": cat.lower().replace(" ", "_"), "name": cat, "children": []}
        product_groups[cat]["children"].append({
            "id": prod["id"],
            "name": prod["name"],
            "children": [{"id": var["id"], "name": var["name"]} for var in prod.get("variants", [])]
        })
    
    return {
        "services": list(service_groups.values()),
        "products": list(product_groups.values())
    }
