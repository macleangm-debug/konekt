"""
Customer Orders Routes
Get orders for the authenticated customer + Quick Reorder (Phase C.5)
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.requests import Request
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt
from customer_timeline_mapping_service import get_customer_timeline
from services.product_promotion_enrichment import resolve_checkout_item_price

router = APIRouter(prefix="/api/customer/orders", tags=["Customer Orders"])
security = HTTPBearer(auto_error=False)

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        if "id" not in doc or not doc["id"]:
            doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


async def enrich_order(order):
    order = serialize_doc(order)
    order_id = order.get("id")

    # Customer name from user record
    if not order.get("customer_name"):
        cid = order.get("customer_id") or order.get("user_id")
        if cid:
            cust_user = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1, "email": 1})
            if cust_user:
                order["customer_name"] = cust_user.get("full_name") or cust_user.get("email") or ""

    # Payer name from payment proofs
    if not order.get("payer_name"):
        inv_id = order.get("invoice_id")
        # Try direct invoice_id lookup
        if inv_id:
            proof = await db.payment_proofs.find_one(
                {"invoice_id": inv_id},
                {"_id": 0, "payer_name": 1},
                sort=[("created_at", -1)]
            )
            if proof and proof.get("payer_name"):
                order["payer_name"] = proof["payer_name"]
        # Reverse lookup: find invoice by order reference
        if not order.get("payer_name"):
            inv = await db.invoices.find_one(
                {"$or": [
                    {"order_id": order_id},
                    {"linked_order_id": order_id},
                    {"checkout_id": order.get("checkout_id")},
                ]},
                {"_id": 0, "id": 1, "payer_name": 1, "billing": 1}
            )
            if inv:
                payer = inv.get("payer_name") or (inv.get("billing") or {}).get("invoice_client_name") or ""
                if payer:
                    order["payer_name"] = payer
                elif inv.get("id"):
                    proof = await db.payment_proofs.find_one(
                        {"invoice_id": inv["id"]},
                        {"_id": 0, "payer_name": 1},
                        sort=[("created_at", -1)]
                    )
                    if proof and proof.get("payer_name"):
                        order["payer_name"] = proof["payer_name"]

    # Sales contact (safe for customer)
    sales_assignment = await db.sales_assignments.find_one({"order_id": order_id}, {"_id": 0})
    sales_id = None
    invalid_ids = {"unassigned", "auto-sales", ""}
    if sales_assignment and sales_assignment.get("sales_owner_id") and sales_assignment["sales_owner_id"] not in invalid_ids:
        sales_id = sales_assignment["sales_owner_id"]
    if not sales_id and order.get("assigned_sales_id") and order["assigned_sales_id"] not in invalid_ids:
        sales_id = order["assigned_sales_id"]
    if sales_id:
        sales_user = await db.users.find_one({"id": sales_id}, {"_id": 0})
        if sales_user:
            order["sales"] = {
                "name": sales_user.get("full_name"),
                "email": sales_user.get("email"),
                "phone": sales_user.get("phone"),
            }
            order["assigned_sales_name"] = sales_user.get("full_name", "")
            order["sales_owner_name"] = sales_user.get("full_name", "")
    # Fallback: if no sales user found but assignment has name, use it
    if not order.get("sales") and (sales_assignment or order.get("assigned_sales_name")):
        name = (sales_assignment or {}).get("sales_owner_name") or order.get("assigned_sales_name") or ""
        if name and name not in ("Unassigned", "unassigned", "auto-sales"):
            order["sales"] = {"name": name, "email": "", "phone": ""}
            order["assigned_sales_name"] = name
            order["sales_owner_name"] = name

    # Determine internal status from vendor orders (most advanced status)
    internal_status = order.get("status") or "processing"
    vendor_orders = await db.vendor_orders.find({"order_id": order_id}).to_list(10)
    if vendor_orders:
        vo_statuses = [vo.get("status", "processing") for vo in vendor_orders]
        status_priority = ["completed", "delivered", "dispatched", "ready", "quality_check", "in_production", "in_progress", "work_scheduled", "acknowledged", "assigned", "accepted", "ready_to_fulfill", "processing"]
        for sp in status_priority:
            if sp in vo_statuses:
                internal_status = sp
                break

    # Apply customer-safe status mapping from propagation service
    from services.status_propagation_service import map_status_for_role
    customer_display_status = map_status_for_role(internal_status, "customer")

    # Customer-safe timeline
    source_type = order.get("type") or order.get("source_type") or "product"
    timeline_data = get_customer_timeline(source_type, internal_status)
    order["timeline_steps"] = timeline_data["steps"]
    order["timeline_index"] = timeline_data["current_index"]
    order["customer_status"] = customer_display_status or timeline_data["current_label"]
    order["status_description"] = timeline_data["description"]

    # DO NOT expose vendor identity to customer
    order.pop("vendor_ids", None)
    order.pop("vendor", None)
    # DO NOT expose internal routing/ownership to customer
    order.pop("assigned_sales_owner_id", None)
    order.pop("ownership_company_id", None)
    order.pop("ownership_individual_id", None)
    order.pop("ownership_resolution", None)
    order.pop("sales_owner_id", None)
    order.pop("assigned_sales_id", None)

    return order


@router.get("")
async def get_my_orders(user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")
    orders = await db.orders.find({
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email}
        ]
    }).sort("created_at", -1).to_list(length=100)
    return [await enrich_order(o) for o in orders]


@router.get("/{order_id}")
async def get_order_detail(order_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")
    base_query = {
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email}
        ]
    }

    order = None
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id), **base_query})
    except Exception:
        order = await db.orders.find_one({"order_number": order_id, **base_query})
    if not order:
        order = await db.orders.find_one({"id": order_id, **base_query})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return await enrich_order(order)


@router.post("/{order_id}/rate")
async def rate_order(order_id: str, request: Request, user: dict = Depends(get_user)):
    """
    Customer submits a 1-5 star rating + optional comment for a completed order.
    One rating per order. Rating is stored as subdocument on the order.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    stars = int(body.get("stars", 0))
    comment = str(body.get("comment", ""))[:500]

    if stars < 1 or stars > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5 stars")

    user_email = user.get("email")
    user_id = user.get("id")
    ownership_query = {
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email}
        ]
    }

    order = None
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id), **ownership_query})
    except Exception:
        order = await db.orders.find_one({"order_number": order_id, **ownership_query})
    if not order:
        order = await db.orders.find_one({"id": order_id, **ownership_query})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if already rated
    if order.get("rating"):
        raise HTTPException(status_code=400, detail="This order has already been rated")

    from datetime import datetime, timezone
    rating_doc = {
        "stars": stars,
        "comment": comment,
        "rated_by": user_id,
        "rated_by_name": user.get("full_name", ""),
        "rated_at": datetime.now(timezone.utc).isoformat(),
    }

    oid = order["_id"]
    await db.orders.update_one(
        {"_id": oid},
        {"$set": {"rating": rating_doc}},
    )

    return {"ok": True, "rating": rating_doc}


@router.post("/{order_id}/reorder")
async def reorder(order_id: str, user: dict = Depends(get_user)):
    """
    Quick Reorder (Phase C.5)
    Fetches previous order items, validates each product exists/active,
    re-runs pricing + promotion engine, returns cart-ready items.
    Frontend pushes items into CartContext and redirects to /account/cart.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")
    ownership_query = {
        "$or": [
            {"user_id": user_id},
            {"customer_id": user_id},
            {"customer_email": user_email},
            {"customer.email": user_email},
        ]
    }

    # Find the order
    order = None
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id), **ownership_query})
    except Exception:
        order = await db.orders.find_one({"order_number": order_id, **ownership_query})
    if not order:
        order = await db.orders.find_one({"id": order_id, **ownership_query})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order = serialize_doc(order)
    source_items = order.get("items") or order.get("line_items") or []
    if not source_items:
        return {"ok": False, "error": "No items in this order", "cart_items": [], "warnings": []}

    cart_items = []
    warnings = []

    for item in source_items:
        product_id = item.get("product_id", "")
        item_name = item.get("name") or item.get("title") or "Unknown Item"
        qty = int(item.get("quantity", 1))

        if not product_id:
            warnings.append(f"{item_name}: missing product reference")
            continue

        # Validate product exists and is active
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            try:
                product = await db.products.find_one({"_id": ObjectId(product_id)})
                if product:
                    product = serialize_doc(product)
            except Exception:
                pass

        if not product:
            warnings.append(f"{item_name}: no longer available")
            continue

        if product.get("status") == "inactive" or product.get("is_deleted"):
            warnings.append(f"{item_name}: no longer available")
            continue

        # Re-run pricing + promotion engine (canonical path)
        current_price = float(
            product.get("selling_price")
            or product.get("customer_price")
            or product.get("price")
            or item.get("unit_price")
            or 0
        )

        pricing = await resolve_checkout_item_price({
            "product_id": product.get("id") or product_id,
            "unit_price": current_price,
            "category_name": product.get("category_name") or product.get("category") or "",
        }, db=db)

        final_price = pricing["unit_price"]
        cart_item = {
            "product_id": product.get("id") or product_id,
            "name": product.get("name") or item_name,
            "quantity": qty,
            "unit_price": final_price,
            "subtotal": round(final_price * qty, 2),
            "image": product.get("image") or product.get("thumbnail") or "",
            "size": item.get("size") or "",
            "color": item.get("color") or "",
            "print_method": item.get("print_method") or "",
            "category_name": product.get("category_name") or "",
        }

        # Attach promo info if applied
        if pricing.get("promo_applied"):
            cart_item["promo_applied"] = True
            cart_item["promo_label"] = pricing.get("promo_label", "")
            cart_item["original_price"] = pricing["original_price"]
        else:
            cart_item["promo_applied"] = False

        cart_items.append(cart_item)

    return {
        "ok": True,
        "cart_items": cart_items,
        "warnings": warnings,
        "added_count": len(cart_items),
        "skipped_count": len(warnings),
        "source_order": order.get("order_number") or order.get("id"),
    }

