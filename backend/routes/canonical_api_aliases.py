"""
Canonical API Aliases
Wires the Postman-expected endpoints to existing service logic.

Endpoints:
  GET /api/public-marketplace/products       — Public product listing
  GET /api/public-marketplace/products/{id}  — Public product detail
  GET /api/account/marketplace/products      — Authenticated marketplace
  GET /api/account/marketplace/products/{id} — Authenticated product detail
  GET /api/account/orders                    — Customer order listing
  GET /api/account/orders/{id}               — Customer order detail
"""
import os
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

logger = logging.getLogger("canonical_api_aliases")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ─── Auth helpers ─────────────────────────────────────────

async def _get_customer(authorization: str = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization required")
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(401, "Invalid token")


# ─── Public Marketplace ──────────────────────────────────

public_marketplace_router = APIRouter(
    prefix="/api/public-marketplace",
    tags=["Public Marketplace"],
)


@public_marketplace_router.get("/products")
async def public_list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(50, le=200),
):
    """List all published/active products."""
    query = {"is_active": True}
    if category:
        query["category_name"] = {"$regex": category, "$options": "i"}

    products = []
    async for p in db.products.find(query).sort("created_at", -1).limit(limit):
        p["id"] = str(p["_id"])
        del p["_id"]
        # Remove vendor internals
        p.pop("vendor_id", None)
        p.pop("vendor_name", None)
        p.pop("vendor_product_code", None)
        p.pop("source_submission_id", None)
        # Text search filter
        if q:
            hay = " ".join([
                str(p.get("name", "")), str(p.get("brand", "")),
                str(p.get("category_name", "")), str(p.get("description", "")),
            ]).lower()
            if q.lower() not in hay:
                continue
        products.append(p)
    return products


@public_marketplace_router.get("/products/{product_id}")
async def public_get_product(product_id: str):
    """Get a single product by ID."""
    product = None
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(404, "Product not found")
    product["id"] = str(product["_id"])
    del product["_id"]
    product.pop("vendor_id", None)
    product.pop("vendor_name", None)
    product.pop("vendor_product_code", None)
    product.pop("source_submission_id", None)
    return product


# ─── Account Marketplace ─────────────────────────────────

account_marketplace_router = APIRouter(
    prefix="/api/account/marketplace",
    tags=["Account Marketplace"],
)


@account_marketplace_router.get("/products")
async def account_list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(50, le=200),
    authorization: Optional[str] = None,
):
    """List products for authenticated customers (same as public for now)."""
    return await public_list_products(q=q, category=category, limit=limit)


@account_marketplace_router.get("/products/{product_id}")
async def account_get_product(product_id: str, authorization: Optional[str] = None):
    """Get product detail for authenticated customer."""
    return await public_get_product(product_id)


# ─── Account Orders ──────────────────────────────────────

account_orders_router = APIRouter(
    prefix="/api/account",
    tags=["Account Orders"],
)


def _sanitize_order(order: dict) -> dict:
    """Remove internal fields from order for customer view."""
    order["id"] = str(order.get("_id", ""))
    order.pop("_id", None)
    order.pop("vendor_id", None)
    order.pop("vendor_name", None)
    order.pop("assigned_vendor_id", None)
    order.pop("assigned_vendor_name", None)
    order.pop("assigned_sales_id", None)
    order.pop("sales_owner_id", None)
    order.pop("ownership_resolution", None)
    order.pop("margin_data", None)
    order.pop("admin_notes", None)
    return order


@account_orders_router.get("/orders")
async def account_list_orders(
    authorization: Optional[str] = None,
):
    """List customer's own orders."""
    from fastapi import Header
    if not authorization:
        raise HTTPException(401, "Authorization required")
    user = await _get_customer(authorization)
    user_email = user.get("email", "")
    user_id = user.get("user_id", "")

    orders = []
    async for o in db.orders.find({
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email},
        ]
    }).sort("created_at", -1).limit(100):
        orders.append(_sanitize_order(o))
    return orders


@account_orders_router.get("/orders/{order_id}")
async def account_get_order(order_id: str, authorization: Optional[str] = None):
    """Get a specific order for the customer."""
    if not authorization:
        raise HTTPException(401, "Authorization required")
    user = await _get_customer(authorization)
    user_email = user.get("email", "")
    user_id = user.get("user_id", "")

    base_query = {
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email},
        ]
    }

    order = None
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id), **base_query})
    except Exception:
        order = await db.orders.find_one({"order_number": order_id, **base_query})

    if not order:
        raise HTTPException(404, "Order not found")
    return _sanitize_order(order)
