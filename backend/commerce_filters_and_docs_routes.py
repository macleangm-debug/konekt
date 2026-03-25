from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional, Dict, Any
import os
import jwt

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

# Routers
admin_subgroups_router = APIRouter(prefix="/api/admin/product-subgroups", tags=["Admin Product Subgroups"])
admin_groups_router = APIRouter(prefix="/api/admin/product-groups", tags=["Admin Product Groups"])
vendor_products_router = APIRouter(prefix="/api/vendor/products", tags=["Vendor Products"])
marketplace_router = APIRouter(prefix="/api/marketplace", tags=["Marketplace"])
docs_router = APIRouter(prefix="/api/docs", tags=["Documents"])
sales_assist_router = APIRouter(prefix="/api/sales", tags=["Sales Assist"])

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    except:
        return None

# ==================== ADMIN PRODUCT GROUPS ====================

@admin_groups_router.get("")
async def list_product_groups():
    """List all product groups"""
    rows = await db.product_groups.find({"status": "active"}).sort("name", 1).to_list(length=500)
    out = []
    for row in rows:
        row["id"] = str(row["_id"])
        del row["_id"]
        out.append(row)
    return out

@admin_groups_router.post("")
async def create_product_group(payload: Dict[str, Any]):
    """Create a new product group"""
    doc = {
        "name": (payload.get("name") or "").strip(),
        "slug": (payload.get("slug") or "").strip(),
        "description": (payload.get("description") or "").strip(),
        "status": payload.get("status", "active"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.product_groups.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

# ==================== ADMIN PRODUCT SUBGROUPS ====================

@admin_subgroups_router.get("")
async def list_product_subgroups(group_slug: Optional[str] = None):
    """List all product subgroups, optionally filtered by group"""
    query = {}
    if group_slug:
        query["group_slug"] = group_slug
    rows = await db.product_subgroups.find(query).sort("name", 1).to_list(length=1000)
    out = []
    for row in rows:
        row["id"] = str(row["_id"])
        del row["_id"]
        out.append(row)
    return out

@admin_subgroups_router.post("")
async def create_product_subgroup(payload: Dict[str, Any]):
    """Create a new product subgroup"""
    doc = {
        "name": (payload.get("name") or "").strip(),
        "slug": (payload.get("slug") or "").strip(),
        "group_slug": (payload.get("group_slug") or "").strip(),
        "group_name": (payload.get("group_name") or "").strip(),
        "status": payload.get("status", "active"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.product_subgroups.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

# ==================== VENDOR PRODUCTS ====================

@vendor_products_router.post("")
async def create_vendor_product(payload: Dict[str, Any]):
    """Vendors can add products using the unified taxonomy"""
    doc = {
        "name": (payload.get("name") or "").strip(),
        "slug": (payload.get("slug") or "").strip(),
        "group_slug": (payload.get("group_slug") or "").strip(),
        "group_name": (payload.get("group_name") or "").strip(),
        "subgroup_slug": (payload.get("subgroup_slug") or "").strip(),
        "subgroup_name": (payload.get("subgroup_name") or "").strip(),
        "price": float(payload.get("price") or 0),
        "base_price": float(payload.get("price") or 0),  # Alias for compatibility
        "currency": payload.get("currency", "TZS"),
        "status": payload.get("status", "active"),
        "description": (payload.get("description") or "").strip(),
        "source": "vendor",
        "is_active": payload.get("status", "active") == "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.products.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

# ==================== MARKETPLACE FILTERS & SEARCH ====================

@marketplace_router.get("/filters")
async def marketplace_filters():
    """Get available filters for marketplace (groups and subgroups)"""
    groups = await db.product_groups.find({"status": "active"}).sort("name", 1).to_list(length=500)
    subgroups = await db.product_subgroups.find({"status": "active"}).sort("name", 1).to_list(length=1000)
    return {
        "groups": [{"id": str(x["_id"]), "name": x["name"], "slug": x["slug"]} for x in groups],
        "subgroups": [{"id": str(x["_id"]), "name": x["name"], "slug": x["slug"], "group_slug": x.get("group_slug", "")} for x in subgroups],
    }

@marketplace_router.get("/products/search")
async def search_products(q: Optional[str] = None, group_slug: Optional[str] = None, subgroup_slug: Optional[str] = None):
    """Search products with optional filters"""
    query = {"is_active": True}
    if group_slug:
        query["$or"] = [{"group_slug": group_slug}, {"branch": group_slug}]
    if subgroup_slug:
        query["subgroup_slug"] = subgroup_slug
    
    rows = await db.products.find(query).sort("name", 1).to_list(length=2000)
    
    q_norm = (q or "").strip().lower()
    
    def matches(row):
        if not q_norm:
            return True
        hay = " ".join([
            str(row.get("name", "")), 
            str(row.get("group_name", "")), 
            str(row.get("subgroup_name", "")), 
            str(row.get("description", "")),
            str(row.get("branch", "")),
            str(row.get("category", ""))
        ]).lower()
        return q_norm in hay
    
    filtered = [row for row in rows if matches(row)]
    out = []
    for row in filtered:
        row["id"] = str(row["_id"])
        del row["_id"]
        out.append(row)
    return out

# ==================== DOCUMENT PDF HOOKS ====================

@docs_router.get("/quote/{quote_id}/pdf")
async def quote_pdf(quote_id: str):
    """Get PDF download URL for a quote"""
    # Check if quote exists
    quote = await db.quotes.find_one({"$or": [{"id": quote_id}, {"_id": quote_id}]})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # If there's an existing PDF URL, return it
    if quote.get("pdf_url"):
        return {"ok": True, "download_url": quote["pdf_url"]}
    
    # Otherwise, return a hook to the PDF generation endpoint
    return {
        "ok": True, 
        "download_url": f"/api/pdf/quotes/{quote_id}", 
        "message": "PDF will be generated on download."
    }

@docs_router.get("/invoice/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: str):
    """Get PDF download URL for an invoice"""
    # Check if invoice exists
    invoice = await db.invoices_v2.find_one({"$or": [{"id": invoice_id}, {"_id": invoice_id}]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # If there's an existing PDF URL, return it
    if invoice.get("pdf_url"):
        return {"ok": True, "download_url": invoice["pdf_url"]}
    
    # Otherwise, return a hook to the PDF generation endpoint
    return {
        "ok": True, 
        "download_url": f"/api/pdf/invoices/{invoice_id}", 
        "message": "PDF will be generated on download."
    }

# ==================== SALES ASSIST REQUESTS ====================

@sales_assist_router.post("/assist-requests")
async def create_assist_request(payload: Dict[str, Any], user: dict = Depends(get_optional_user)):
    """Create a sales assist request from cart or service context"""
    doc = {
        "context_type": payload.get("context_type", "general"),
        "context_summary": payload.get("context_summary", ""),
        "items": payload.get("items", []),
        "service_context": payload.get("service_context"),
        "objective": (payload.get("objective") or "").strip(),
        "timeline": (payload.get("timeline") or "").strip(),
        "notes": (payload.get("notes") or "").strip(),
        "user_id": user.get("id") if user else None,
        "user_email": user.get("email") if user else None,
        "user_name": user.get("full_name") if user else None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.sales_assist_requests.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

@sales_assist_router.get("/assist-requests")
async def list_assist_requests():
    """List all sales assist requests (for admin/sales team)"""
    rows = await db.sales_assist_requests.find({}).sort("created_at", -1).to_list(length=500)
    out = []
    for row in rows:
        row["id"] = str(row["_id"])
        del row["_id"]
        out.append(row)
    return out
