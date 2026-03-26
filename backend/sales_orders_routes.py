"""
Sales Orders Routes
Provides order list + detail for logged-in sales users, filtered by assigned_sales_id.
Reuses admin query logic with sales-specific filtering.
"""
import jwt
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from order_sales_enrichment_service import enrich_order_with_sales, enrich_orders_batch

router = APIRouter(prefix="/api/sales", tags=["Sales Orders"])
_security = HTTPBearer()


async def _get_sales_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(_security)):
    """Extract the current sales user from JWT."""
    import os
    JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        role = user.get("role", "customer")
        if role not in ("admin", "sales", "marketing", "production"):
            raise HTTPException(403, "Sales access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


@router.get("/orders")
async def list_sales_orders(
    request: Request,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    user: dict = Depends(_get_sales_user),
):
    db = request.app.mongodb
    query = {}

    # Sales users only see their assigned orders; admins see all
    if user.get("role") == "sales":
        query["assigned_sales_id"] = user["id"]

    if status:
        query["current_status"] = status
    if search:
        query["$or"] = [
            {"order_number": {"$regex": search, "$options": "i"}},
            {"delivery_phone": {"$regex": search, "$options": "i"}},
        ]

    total = await db.orders.count_documents(query)
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)

    # Enrich each order with customer + sales + vendor data
    for order in orders:
        cust = await db.users.find_one(
            {"id": order.get("user_id")},
            {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "company": 1},
        )
        if cust:
            order["customer_name"] = cust.get("full_name", "")
            order["customer_email"] = cust.get("email", "")
            order["customer_phone"] = cust.get("phone", "")
            order["customer_company"] = cust.get("company", "")

        # Vendor enrichment
        vendor_id = order.get("assigned_vendor_id")
        if vendor_id:
            from bson import ObjectId
            try:
                vendor = await db.partners.find_one({"_id": ObjectId(vendor_id)}, {"_id": 0, "company_name": 1, "contact_phone": 1, "contact_email": 1})
            except Exception:
                vendor = await db.partners.find_one({"id": vendor_id}, {"_id": 0, "company_name": 1, "contact_phone": 1, "contact_email": 1})
            if vendor:
                order["vendor_name"] = vendor.get("company_name", "")
                order["vendor_phone"] = vendor.get("contact_phone", "")
                order["vendor_email"] = vendor.get("contact_email", "")

    await enrich_orders_batch(orders, db)

    return {
        "orders": orders,
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.get("/orders/{order_id}")
async def get_sales_order_detail(
    order_id: str,
    request: Request,
    user: dict = Depends(_get_sales_user),
):
    db = request.app.mongodb

    order = await db.orders.find_one({"id": order_id})
    if not order:
        try:
            from bson import ObjectId
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
        except Exception:
            pass
    if not order:
        order = await db.orders.find_one({"order_number": order_id})
    if not order:
        raise HTTPException(404, "Order not found")

    order = dict(order)
    if "_id" in order:
        order["id"] = str(order["_id"])
        del order["_id"]

    # Sales users can only see their own assigned orders
    if user.get("role") == "sales" and order.get("assigned_sales_id") != user["id"]:
        raise HTTPException(403, "Not your assigned order")

    # Enrich with customer
    cust = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "password_hash": 0})
    if cust:
        if "_id" in cust:
            del cust["_id"]
        order["customer"] = cust
        order["customer_name"] = cust.get("full_name", "")
        order["customer_email"] = cust.get("email", "")
        order["customer_phone"] = cust.get("phone", "")
        order["customer_address"] = order.get("delivery", {}).get("address_line", "")

    # Enrich with vendor
    vendor_id = order.get("assigned_vendor_id")
    if vendor_id:
        from bson import ObjectId as OID
        try:
            vendor = await db.partners.find_one({"_id": OID(vendor_id)})
        except Exception:
            vendor = await db.partners.find_one({"id": vendor_id})
        if vendor:
            if "_id" in vendor:
                vendor["id"] = str(vendor["_id"])
                del vendor["_id"]
            order["vendor_name"] = vendor.get("company_name", "")
            order["vendor_phone"] = vendor.get("contact_phone", "")
            order["vendor_email"] = vendor.get("contact_email", "")
            order["vendor_scope"] = "Product fulfillment"

    # Enrich with sales
    await enrich_order_with_sales(order, db)

    # Linked documents
    order["invoice_no"] = order.get("invoice_number") or order.get("linked_invoice_number", "")
    order["quote_no"] = order.get("quote_number") or order.get("linked_quote_number", "")

    return order
