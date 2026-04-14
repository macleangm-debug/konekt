"""
Vendor Ops Routes — Product management, image pipeline, price requests.
Accessible by admin and vendor_ops roles.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional
import json
import os
import jwt

router = APIRouter(prefix="/api/vendor-ops", tags=["Vendor Ops"])

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")
UNITS_OF_MEASUREMENT = ["piece", "box", "kg", "litre", "pack", "set", "service", "unit"]


async def _require_ops_role(request: Request):
    """Require admin or vendor_ops role."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        db = request.app.mongodb
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "super_admin", "vendor_ops"):
            raise HTTPException(status_code=403, detail="Vendor Ops or Admin access required")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ═══ IMAGE UPLOAD + PROCESSING ═══

@router.post("/images/upload")
async def upload_product_image(
    request: Request,
    file: UploadFile = File(...),
    crop_x: int = Form(0),
    crop_y: int = Form(0),
    crop_width: int = Form(0),
    crop_height: int = Form(0),
):
    """Upload and process a product image (crop + WebP + variants)."""
    await _require_ops_role(request)
    
    file_bytes = await file.read()
    from services.image_pipeline import validate_image_file, process_product_image

    is_valid, error = validate_image_file(file_bytes)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    crop_data = None
    if crop_width > 0 and crop_height > 0:
        crop_data = {"x": crop_x, "y": crop_y, "width": crop_width, "height": crop_height}

    result = process_product_image(file_bytes, file.filename, crop_data)
    return {"ok": True, **result}


# ═══ PRODUCTS CRUD ═══

@router.post("/products")
async def create_product(request: Request):
    """Create a new product (Vendor Ops / Admin)."""
    user = await _require_ops_role(request)
    db = request.app.mongodb
    body = await request.json()

    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Product name required")

    images = body.get("images", [])
    if not images:
        raise HTTPException(status_code=400, detail="At least 1 image required")
    if len(images) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images")

    primary_image = images[0] if images else ""
    now = datetime.now(timezone.utc).isoformat()

    variants_input = body.get("variants", [])
    variants = []
    for v in variants_input:
        variants.append({
            "id": str(uuid4())[:8],
            "attributes": v.get("attributes", {}),
            "price_override": v.get("price_override"),
            "stock": int(v.get("stock", 0)),
            "sku": v.get("sku", ""),
        })

    import re
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    slug = f"{slug}-{str(uuid4())[:6]}"

    doc = {
        "id": str(uuid4()),
        "slug": slug,
        "name": name,
        "description": body.get("description", ""),
        "category": body.get("category", ""),
        "subcategory": body.get("subcategory", ""),
        "brand": body.get("brand", ""),
        "images": images,
        "image_url": primary_image,
        "selling_price": float(body.get("selling_price", 0) or 0),
        "original_price": float(body.get("original_price", 0) or 0),
        "vendor_cost": float(body.get("vendor_cost", 0) or 0),
        "unit_of_measurement": body.get("unit_of_measurement", "piece"),
        "sku": body.get("sku", ""),
        "stock": int(body.get("stock", 0)),
        "variants": variants,
        "has_variants": len(variants) > 0,
        "vendor_id": body.get("vendor_id", ""),
        "vendor_name": body.get("vendor_name", ""),
        "status": body.get("status", "draft"),
        "is_active": body.get("status") == "active",
        "created_by": user.get("id"),
        "created_by_role": user.get("role"),
        "created_at": now,
        "updated_at": now,
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "product": doc}


@router.put("/products/{product_id}")
async def update_product(product_id: str, request: Request):
    """Update a product."""
    user = await _require_ops_role(request)
    db = request.app.mongodb
    body = await request.json()

    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.now(timezone.utc).isoformat()
    update_fields = {"updated_at": now, "updated_by": user.get("id"), "updated_by_role": user.get("role")}

    for key in ["name", "description", "category", "subcategory", "brand", "images", "selling_price",
                "original_price", "vendor_cost", "unit_of_measurement", "sku", "stock", "variants",
                "vendor_id", "vendor_name", "status"]:
        if key in body:
            update_fields[key] = body[key]

    if "images" in body:
        update_fields["image_url"] = body["images"][0] if body["images"] else ""
    if "status" in body:
        update_fields["is_active"] = body["status"] == "active"
    if "variants" in body:
        update_fields["has_variants"] = len(body["variants"]) > 0

    await db.products.update_one({"id": product_id}, {"$set": update_fields})
    return {"ok": True}


@router.get("/products")
async def list_products(request: Request, status: str = None, vendor_id: str = None):
    """List products with filters."""
    await _require_ops_role(request)
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    if vendor_id:
        query["vendor_id"] = vendor_id
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"products": products, "total": len(products)}


@router.get("/products/{product_id}")
async def get_product(product_id: str, request: Request):
    """Get single product."""
    await _require_ops_role(request)
    db = request.app.mongodb
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"product": product}


# ═══ VENDORS ═══

@router.get("/vendors")
async def list_vendors(request: Request):
    """List all vendors."""
    await _require_ops_role(request)
    db = request.app.mongodb
    vendors = await db.partners.find(
        {"type": {"$in": ["vendor", "supplier", "manufacturer"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    if not vendors:
        vendors = await db.vendors.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"vendors": vendors, "total": len(vendors)}


# ═══ PRICE REQUESTS ═══

@router.post("/price-requests")
async def create_price_request(request: Request):
    """Create a price request (from sales or system)."""
    db = request.app.mongodb
    body = await request.json()
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid4()),
        "product_or_service": body.get("product_or_service", ""),
        "description": body.get("description", ""),
        "requested_by": body.get("requested_by", ""),
        "requested_by_role": body.get("requested_by_role", "sales"),
        "vendor_id": body.get("vendor_id", ""),
        "status": "pending_vendor_response",
        "base_price": None,
        "lead_time": "",
        "notes": "",
        "updated_by": "",
        "updated_by_role": "",
        "created_at": now,
        "updated_at": now,
    }
    await db.price_requests.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "price_request": doc}


@router.get("/price-requests")
async def list_price_requests(request: Request, status: str = None):
    """List price requests."""
    await _require_ops_role(request)
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    requests_list = await db.price_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"price_requests": requests_list, "total": len(requests_list)}


@router.put("/price-requests/{request_id}")
async def update_price_request(request_id: str, request: Request):
    """Update a price request (Vendor Ops enters vendor response)."""
    user = await _require_ops_role(request)
    db = request.app.mongodb
    body = await request.json()

    pr = await db.price_requests.find_one({"id": request_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Price request not found")

    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now, "updated_by": user.get("id"), "updated_by_role": user.get("role")}

    for key in ["base_price", "lead_time", "notes", "status", "vendor_id"]:
        if key in body:
            update[key] = body[key]

    if body.get("base_price") is not None and pr.get("status") == "pending_vendor_response":
        update["status"] = "response_received"

    await db.price_requests.update_one({"id": request_id}, {"$set": update})
    return {"ok": True}


# ═══ DASHBOARD STATS ═══

@router.get("/dashboard-stats")
async def get_dashboard_stats(request: Request):
    """Get vendor ops dashboard stats."""
    await _require_ops_role(request)
    db = request.app.mongodb

    total_vendors = await db.partners.count_documents({"type": {"$in": ["vendor", "supplier", "manufacturer"]}})
    if total_vendors == 0:
        total_vendors = await db.vendors.count_documents({})

    total_products = await db.products.count_documents({})
    active_products = await db.products.count_documents({"status": "active", "is_active": True})
    draft_products = await db.products.count_documents({"status": "draft"})
    pending_requests = await db.price_requests.count_documents({"status": "pending_vendor_response"})

    return {
        "total_vendors": total_vendors,
        "total_products": total_products,
        "active_products": active_products,
        "draft_products": draft_products,
        "pending_price_requests": pending_requests,
    }
