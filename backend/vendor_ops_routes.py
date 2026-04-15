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

    vendor_cost = float(body.get("vendor_cost", 0) or 0)
    input_sell_price = float(body.get("selling_price", 0) or 0)

    # Apply pricing engine: sell price must respect margin rules
    from services.pricing_engine import calculate_sell_price
    pricing = await calculate_sell_price(db, vendor_cost, category=body.get("category", ""), override_sell_price=input_sell_price if input_sell_price > 0 else None)
    final_sell_price = pricing["sell_price"] if vendor_cost > 0 else input_sell_price

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
        "selling_price": final_sell_price,
        "original_price": float(body.get("original_price", 0) or 0),
        "vendor_cost": vendor_cost,
        "margin_pct": pricing.get("margin_pct", 0),
        "margin_amount": pricing.get("margin_amount", 0),
        "pricing_rule_source": pricing.get("rule_source", ""),
        "pricing_warning": pricing.get("warning"),
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
    # Query partners with type OR partner_type matching vendor/supplier/manufacturer/product
    docs = await db.partners.find(
        {"$or": [
            {"type": {"$in": ["vendor", "supplier", "manufacturer"]}},
            {"partner_type": {"$in": ["vendor", "supplier", "manufacturer", "product", "service", "hybrid"]}}
        ]}
    ).sort("created_at", -1).to_list(200)
    
    # Serialize: convert _id to id string
    vendors = []
    for doc in docs:
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id", ""))
        vendors.append(doc)
    
    if not vendors:
        docs = await db.vendors.find({}).sort("created_at", -1).to_list(200)
        for doc in docs:
            doc = dict(doc)
            doc["id"] = str(doc.pop("_id", ""))
            vendors.append(doc)
    
    return {"vendors": vendors, "total": len(vendors)}


# ═══ PRICE REQUESTS ═══

@router.post("/price-requests")
async def create_price_request(request: Request):
    """Create a price request (from sales or system)."""
    user = await _require_ops_role(request)
    db = request.app.mongodb
    body = await request.json()
    now = datetime.now(timezone.utc).isoformat()

    # Load sourcing settings
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    s = settings_row.get("value", {}) if settings_row else {}
    vo = s.get("vendor_ops", {})
    category = body.get("category", "")
    sourcing_mode = vo.get("sourcing_mode_by_category", {}).get(category, vo.get("default_sourcing_mode", "preferred"))
    default_expiry = vo.get("default_quote_expiry_hours", 48)
    default_lead = vo.get("lead_time_by_category", {}).get(category, vo.get("default_lead_time_days", 3))

    doc = {
        "id": str(uuid4()),
        "product_or_service": body.get("product_or_service", ""),
        "description": body.get("description", ""),
        "category": category,
        "quantity": body.get("quantity", 1),
        "unit_of_measurement": body.get("unit_of_measurement", "Piece"),
        "requested_by": body.get("requested_by", user.get("id", "")),
        "requested_by_name": body.get("requested_by_name", ""),
        "requested_by_role": body.get("requested_by_role", "sales"),
        "sourcing_mode": sourcing_mode,
        "vendor_quotes": [],
        "selected_vendor_id": "",
        "selected_quote_index": -1,
        "final_base_price": None,
        "final_sell_price": None,
        "final_lead_time": "",
        "default_quote_expiry_hours": default_expiry,
        "default_lead_time_days": default_lead,
        "status": "new",
        "notes_from_sales": body.get("notes", ""),
        "internal_notes": "",
        "created_by": user.get("id"),
        "created_by_role": user.get("role"),
        "created_at": now,
        "updated_at": now,
    }
    await db.price_requests.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "price_request": doc}


@router.get("/price-requests")
async def list_price_requests(request: Request, status: str = None, tab: str = None):
    """List price requests with optional tab filtering."""
    await _require_ops_role(request)
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    elif tab:
        if tab == "new":
            query["status"] = {"$in": ["new", "pending_vendor_response"]}
        elif tab == "awaiting":
            query["status"] = {"$in": ["sent_to_vendors", "partially_quoted", "awaiting_quotes"]}
        elif tab == "ready":
            query["status"] = {"$in": ["ready_for_sales", "response_received"]}
        elif tab == "closed":
            query["status"] = {"$in": ["closed", "expired", "quoted_to_customer"]}
    requests_list = await db.price_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"price_requests": requests_list, "total": len(requests_list)}


@router.get("/price-requests/stats")
async def price_request_stats(request: Request):
    """Get price request stats for dashboard."""
    await _require_ops_role(request)
    db = request.app.mongodb
    new_count = await db.price_requests.count_documents({"status": {"$in": ["new", "pending_vendor_response"]}})
    awaiting = await db.price_requests.count_documents({"status": {"$in": ["sent_to_vendors", "partially_quoted", "awaiting_quotes"]}})
    ready = await db.price_requests.count_documents({"status": {"$in": ["ready_for_sales", "response_received"]}})
    overdue = 0  # Future: check quote expiry
    return {"new": new_count, "awaiting": awaiting, "ready": ready, "overdue": overdue}


@router.get("/price-requests/{request_id}")
async def get_price_request(request_id: str, request: Request):
    """Get single price request with full detail."""
    await _require_ops_role(request)
    db = request.app.mongodb
    pr = await db.price_requests.find_one({"id": request_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Price request not found")
    return {"price_request": pr}


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

    for key in ["base_price", "lead_time", "notes", "status", "vendor_id", "sourcing_mode",
                "internal_notes", "final_base_price", "final_sell_price", "final_lead_time",
                "selected_vendor_id", "selected_quote_index", "notes_from_sales",
                "category", "quantity", "unit_of_measurement"]:
        if key in body:
            update[key] = body[key]

    # Legacy compat: auto-transition from pending to response_received
    if body.get("base_price") is not None and pr.get("status") in ("pending_vendor_response", "new"):
        update["status"] = "response_received"

    await db.price_requests.update_one({"id": request_id}, {"$set": update})
    return {"ok": True}


@router.post("/price-requests/{request_id}/send-to-vendors")
async def send_to_vendors(request_id: str, request: Request):
    """Send price request to selected vendors."""
    user = await _require_ops_role(request)
    db = request.app.mongodb
    body = await request.json()

    pr = await db.price_requests.find_one({"id": request_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Price request not found")

    vendor_ids = body.get("vendor_ids", [])
    if not vendor_ids:
        raise HTTPException(status_code=400, detail="At least one vendor required")

    now = datetime.now(timezone.utc).isoformat()

    quotes = pr.get("vendor_quotes", [])
    existing_vendor_ids = {q["vendor_id"] for q in quotes}

    for vid in vendor_ids:
        if vid in existing_vendor_ids:
            continue
        # Try to find vendor by id field first, then by _id (ObjectId)
        vendor = await db.partners.find_one({"id": vid}, {"_id": 0})
        if not vendor:
            try:
                from bson import ObjectId
                vendor = await db.partners.find_one({"_id": ObjectId(vid)})
                if vendor:
                    vendor = dict(vendor)
                    vendor.pop("_id", None)
            except Exception:
                pass
        if not vendor:
            vendor = await db.vendors.find_one({"id": vid}, {"_id": 0})
        quotes.append({
            "vendor_id": vid,
            "vendor_name": (vendor or {}).get("company_name") or (vendor or {}).get("name", "Unknown"),
            "status": "awaiting_response",
            "base_price": None,
            "lead_time": "",
            "quote_expiry": "",
            "notes": "",
            "submitted_at": None,
            "sent_at": now,
        })

    await db.price_requests.update_one({"id": request_id}, {"$set": {
        "vendor_quotes": quotes,
        "status": "sent_to_vendors",
        "updated_at": now,
        "updated_by": user.get("id"),
    }})
    return {"ok": True, "vendors_contacted": len(vendor_ids)}


@router.post("/price-requests/{request_id}/submit-quote")
async def submit_vendor_quote(request_id: str, request: Request):
    """Submit or update a vendor's quote for a price request."""
    user = await _require_ops_role(request)
    db = request.app.mongodb
    body = await request.json()

    pr = await db.price_requests.find_one({"id": request_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Price request not found")

    vendor_id = body.get("vendor_id", "")
    if not vendor_id:
        raise HTTPException(status_code=400, detail="vendor_id required")

    now = datetime.now(timezone.utc).isoformat()
    quotes = pr.get("vendor_quotes", [])
    found = False

    for q in quotes:
        if q["vendor_id"] == vendor_id:
            q["base_price"] = float(body.get("base_price", 0)) if body.get("base_price") is not None else None
            q["lead_time"] = body.get("lead_time", "")
            q["quote_expiry"] = body.get("quote_expiry", "")
            q["notes"] = body.get("notes", "")
            q["status"] = "quoted"
            q["submitted_at"] = now
            found = True
            break

    if not found:
        # Auto-create quote entry
        quotes.append({
            "vendor_id": vendor_id,
            "vendor_name": body.get("vendor_name", ""),
            "status": "quoted",
            "base_price": float(body.get("base_price", 0)) if body.get("base_price") is not None else None,
            "lead_time": body.get("lead_time", ""),
            "quote_expiry": body.get("quote_expiry", ""),
            "notes": body.get("notes", ""),
            "submitted_at": now,
            "sent_at": now,
        })

    # Auto-update status
    quoted_count = sum(1 for q in quotes if q.get("status") == "quoted")
    new_status = pr.get("status", "new")
    if quoted_count > 0 and quoted_count < len(quotes):
        new_status = "partially_quoted"
    elif quoted_count > 0 and quoted_count >= len(quotes):
        new_status = "partially_quoted"
    if quoted_count > 0:
        new_status = "partially_quoted"

    await db.price_requests.update_one({"id": request_id}, {"$set": {
        "vendor_quotes": quotes,
        "status": new_status,
        "updated_at": now,
        "updated_by": user.get("id"),
    }})
    return {"ok": True}


@router.post("/price-requests/{request_id}/select-vendor")
async def select_vendor_quote(request_id: str, request: Request):
    """Select the winning vendor and calculate final sell price."""
    user = await _require_ops_role(request)
    db = request.app.mongodb
    body = await request.json()

    pr = await db.price_requests.find_one({"id": request_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Price request not found")

    vendor_id = body.get("vendor_id", "")
    quote_index = body.get("quote_index", -1)
    quotes = pr.get("vendor_quotes", [])

    selected = None
    for i, q in enumerate(quotes):
        if q["vendor_id"] == vendor_id or i == quote_index:
            selected = q
            quote_index = i
            break

    if not selected or selected.get("base_price") is None:
        raise HTTPException(status_code=400, detail="No valid quote found for this vendor")

    base = float(selected["base_price"])
    # Apply margin from settings
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    s = settings_row.get("value", {}) if settings_row else {}
    min_margin = s.get("commercial", {}).get("minimum_company_margin_percent", 20)
    sell_price = round(base * (1 + min_margin / 100))

    # Allow override
    if body.get("final_sell_price"):
        sell_price = float(body["final_sell_price"])

    now = datetime.now(timezone.utc).isoformat()
    await db.price_requests.update_one({"id": request_id}, {"$set": {
        "selected_vendor_id": vendor_id,
        "selected_quote_index": quote_index,
        "final_base_price": base,
        "final_sell_price": sell_price,
        "final_lead_time": selected.get("lead_time", ""),
        "status": "ready_for_sales",
        "updated_at": now,
        "updated_by": user.get("id"),
    }})
    return {"ok": True, "base_price": base, "sell_price": sell_price, "lead_time": selected.get("lead_time", "")}


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
    new_requests = await db.price_requests.count_documents({"status": {"$in": ["new", "pending_vendor_response"]}})
    awaiting_quotes = await db.price_requests.count_documents({"status": {"$in": ["sent_to_vendors", "partially_quoted", "awaiting_quotes"]}})
    ready_for_sales = await db.price_requests.count_documents({"status": {"$in": ["ready_for_sales", "response_received"]}})

    return {
        "total_vendors": total_vendors,
        "total_products": total_products,
        "active_products": active_products,
        "draft_products": draft_products,
        "pending_price_requests": new_requests,
        "awaiting_quotes": awaiting_quotes,
        "ready_for_sales": ready_for_sales,
    }


# ═══ CATALOG CONFIG ═══

@router.get("/catalog-config")
async def get_catalog_config(request: Request):
    """Get catalog configuration (units, categories, variant types, SKU format)."""
    db = request.app.mongodb
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    s = settings_row.get("value", {}) if settings_row else {}
    catalog = s.get("catalog", {})

    from services.settings_resolver import PLATFORM_DEFAULTS
    defaults = PLATFORM_DEFAULTS.get("catalog", {})

    all_units = catalog.get("units_of_measurement", defaults.get("units_of_measurement", []))
    active_units = [u for u in all_units if u.get("active", True)]

    raw_cats = catalog.get("product_categories", defaults.get("product_categories", []))
    # Normalize: support legacy string arrays and new rich objects
    categories = []
    for c in raw_cats:
        if isinstance(c, str):
            categories.append({"name": c, "display_mode": "visual", "commercial_mode": "fixed_price", "sourcing_mode": "preferred", "show_on_marketplace": True, "require_images": True, "quote_enabled": False, "search_first": False, "active": True})
        else:
            categories.append(c)

    return {
        "units": active_units,
        "categories": categories,
        "variant_types": catalog.get("variant_types", defaults.get("variant_types", [])),
        "sku_prefix": catalog.get("sku_prefix", defaults.get("sku_prefix", "KNT")),
        "sku_format": catalog.get("sku_format", defaults.get("sku_format", "{PREFIX}-{CATEGORY}-{RANDOM}")),
    }
