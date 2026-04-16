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
from fastapi import APIRouter, HTTPException, Depends, Query, Header
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
    """Parse JWT from Authorization header value."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization required")
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(401, "Invalid token")


def _auth_header():
    """FastAPI dependency for Authorization header."""
    from fastapi import Header as H
    async def _dep(authorization: Optional[str] = H(None)):
        return authorization
    return _dep


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
    """List all published/active products with computed selling prices."""

    query = {"$or": [
        {"is_active": True},
        {"status": {"$in": ["active", "published", "approved"]}},
    ]}
    if category:
        query["category_name"] = {"$regex": category, "$options": "i"}
    
    # If text search is provided, add regex to MongoDB query for efficiency
    if q:
        search_regex = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"name": search_regex},
            {"brand": search_regex},
            {"sku": search_regex},
            {"category_name": search_regex},
            {"description": search_regex},
        ]
        # Combine with status/active filter using $and
        query = {"$and": [
            {"$or": [
                {"is_active": True},
                {"status": {"$in": ["active", "published", "approved"]}},
            ]},
            {"$or": [
                {"name": search_regex},
                {"brand": search_regex},
                {"sku": search_regex},
                {"category_name": search_regex},
                {"description": search_regex},
            ]}
        ]}
        if category:
            query["$and"].append({"category_name": {"$regex": category, "$options": "i"}})

    products = []
    async for p in db.products.find(query).sort("created_at", -1).limit(limit):
        p["id"] = str(p["_id"])
        del p["_id"]
        # Remove vendor internals
        p.pop("vendor_id", None)
        p.pop("vendor_name", None)
        p.pop("vendor_product_code", None)
        p.pop("source_submission_id", None)

        # Compute selling_price from pricing engine if not set
        if not p.get("selling_price") and p.get("base_price"):
            try:
                from services.pricing_engine import calculate_sell_price
                base = float(p["base_price"])
                result = await calculate_sell_price(db, base, category=p.get("category_name"))
                p["selling_price"] = result.get("sell_price", base)
            except Exception:
                p["selling_price"] = p.get("base_price")

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
    authorization: Optional[str] = Header(None),
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
    authorization: Optional[str] = Header(None),
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
async def account_get_order(order_id: str, authorization: Optional[str] = Header(None)):
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



# ─── Account Referrals ──────────────────────────────────────

@account_orders_router.get("/referrals")
async def account_referrals(authorization: Optional[str] = Header(None)):
    """Get customer referral code, link, stats, and history."""
    if not authorization:
        raise HTTPException(401, "Authorization required")
    user = await _get_customer(authorization)
    user_email = user.get("email", "")
    user_id = user.get("user_id", "")
    user_name = user.get("full_name") or user.get("name") or user_email.split("@")[0]

    # Generate referral code from user name
    import hashlib
    code_base = user_name.upper().replace(" ", "")[:8]
    code_hash = hashlib.md5(user_email.encode()).hexdigest()[:4].upper()
    referral_code = f"{code_base}{code_hash}"

    referral_link = f"https://konekt.co.tz/?ref={referral_code}"

    # Get referral history
    referrals = await db.referrals.find(
        {"referrer_email": user_email}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    total = len(referrals)
    successful = sum(1 for r in referrals if r.get("status") == "completed")
    reward_earned = sum(float(r.get("reward", 0)) for r in referrals if r.get("status") == "completed")

    history = []
    for r in referrals:
        history.append({
            "business_name": r.get("referred_name", r.get("referred_email", "—")),
            "status": r.get("status", "invited"),
            "reward": r.get("reward", 0),
            "date": str(r.get("created_at", ""))[:10] if r.get("created_at") else "",
        })

    return {
        "referral_code": referral_code,
        "referral_link": referral_link,
        "stats": {
            "total_referrals": total,
            "successful": successful,
            "reward_earned": round(reward_earned, 2),
        },
        "history": history,
    }
