"""
Konekt Order Operations Routes
- List/get orders
- Update order status
- Reserve inventory for orders
- Assign tasks from orders
- Send orders to production
With workflow-linked notifications for status changes
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

from order_ops_models import (
    ReserveInventoryRequest,
    AssignOrderTaskRequest,
    ProductionQueueCreate,
)
from notification_trigger_service import (
    notify_customer_order_dispatched,
    notify_customer_order_confirmed,
    notify_ops_order_dispatched,
)

router = APIRouter(prefix="/api/admin/orders-ops", tags=["Order Operations"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        if "id" not in doc or not doc["id"]:
            doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    for k, v in item.items():
                        if isinstance(v, datetime):
                            item[k] = v.isoformat()
    return doc


@router.get("/stats")
async def orders_stats():
    """Order stat cards."""
    total = await db.orders.count_documents({})
    new_count = await db.orders.count_documents({"status": {"$in": ["new", "pending", "submitted"]}})
    assigned = await db.orders.count_documents({"status": {"$in": ["assigned", "ready_to_fulfill", "processing"]}})
    in_progress = await db.orders.count_documents({"status": {"$in": ["in_progress", "work_scheduled"]}})
    completed = await db.orders.count_documents({"status": {"$in": ["completed", "delivered", "fulfilled"]}})
    return {"total": total, "new": new_count, "assigned": assigned, "in_progress": in_progress, "completed": completed}


@router.get("")
async def list_orders(
    status: Optional[str] = None,
    tab: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all orders with enrichment for admin table"""
    query = {}
    if status:
        query = {"$or": [{"current_status": status}, {"status": status}]}
    if tab == "assigned":
        query["status"] = {"$in": ["assigned", "ready_to_fulfill", "processing"]}
    elif tab == "in_progress":
        query["status"] = {"$in": ["in_progress", "work_scheduled"]}
    elif tab == "completed":
        query["status"] = {"$in": ["completed", "delivered", "fulfilled"]}
    elif tab == "new":
        query["status"] = {"$in": ["new", "pending"]}

    docs = await db.orders.find(query if (status or tab) else {}).sort("created_at", -1).to_list(length=limit)
    out = []
    for doc in docs:
        order = serialize_doc(doc)
        if search:
            haystack = f"{order.get('order_number','')} {order.get('customer_name','')} {order.get('customer_email','')}".lower()
            if search.lower() not in haystack:
                continue
        # Enrich customer_name, email, phone
        if not order.get("customer_name") or not order.get("customer_email"):
            cid = order.get("customer_id") or order.get("user_id")
            if cid:
                cust = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1, "email": 1, "phone": 1})
                if cust:
                    order["customer_name"] = order.get("customer_name") or cust.get("full_name", "")
                    order["customer_email"] = order.get("customer_email") or cust.get("email", "")
                    order["customer_phone"] = cust.get("phone", "")
        # Vendor info
        vendor_orders = await db.vendor_orders.find({"order_id": order.get("id")}).to_list(5)
        order["vendor_count"] = len(vendor_orders)
        vendor_name = "-"
        vendor_email = ""
        vendor_phone = ""
        if vendor_orders:
            vid = vendor_orders[0].get("vendor_id")
            if vid:
                vp = await db.partner_users.find_one({"partner_id": vid}, {"_id": 0, "name": 1, "company_name": 1, "full_name": 1, "phone": 1, "email": 1})
                vendor_name = (vp or {}).get("company_name") or (vp or {}).get("full_name") or (vp or {}).get("name") or vid[:12]
                vendor_email = (vp or {}).get("email", "")
                vendor_phone = (vp or {}).get("phone", "")
        order["vendor_name"] = vendor_name
        order["vendor_email"] = vendor_email
        order["vendor_phone"] = vendor_phone
        # Sales assignment — full details
        assignment = await db.sales_assignments.find_one({"order_id": order.get("id")})
        order["sales_owner"] = (assignment or {}).get("sales_owner_name") or ""
        _invalid = {"unassigned", "auto-sales", ""}
        sales_id = (assignment or {}).get("sales_owner_id") or order.get("assigned_sales_id")
        if sales_id and sales_id in _invalid:
            sales_id = order.get("assigned_sales_id")
        if sales_id and sales_id in _invalid:
            sales_id = None
        if sales_id:
            su = await db.users.find_one({"id": sales_id}, {"_id": 0, "full_name": 1, "email": 1, "phone": 1})
            order["sales_name"] = (su or {}).get("full_name", order["sales_owner"])
            order["sales_email"] = (su or {}).get("email", "")
            order["sales_phone"] = (su or {}).get("phone", "")
        else:
            order["sales_name"] = order["sales_owner"]
            order["sales_email"] = ""
            order["sales_phone"] = ""
        # --- Payer + Approval enrichment (multi-source waterfall) ---
        inv_id = order.get("invoice_id")
        inv = None
        if inv_id:
            inv = await db.invoices.find_one({"id": inv_id}, {"_id": 0, "payer_name": 1, "billing": 1, "customer_name": 1, "approved_by": 1, "approved_at": 1, "paid_at": 1, "payment_status": 1})
            if not inv:
                try:
                    inv = await db.invoices.find_one({"_id": ObjectId(inv_id)}, {"payer_name": 1, "billing": 1, "customer_name": 1, "approved_by": 1, "approved_at": 1, "paid_at": 1, "payment_status": 1})
                    if inv:
                        inv.pop("_id", None)
                except Exception:
                    inv = None
        if not inv:
            inv = await db.invoices.find_one(
                {"$or": [{"order_id": order.get("id")}, {"linked_order_id": order.get("id")}]},
                {"_id": 0, "id": 1, "payer_name": 1, "billing": 1, "customer_name": 1, "approved_by": 1, "approved_at": 1, "paid_at": 1, "payment_status": 1}
            )

        # Payer name waterfall: order.payer_name → invoice.payer_name → invoice.billing.invoice_client_name → payment_proof.payer_name → order_number proof lookup
        payer = order.get("payer_name") or ""
        if not payer and inv:
            payer = inv.get("payer_name") or (inv.get("billing") or {}).get("invoice_client_name") or ""
        if not payer:
            _proof_query = []
            if inv_id:
                _proof_query.append({"invoice_id": inv_id})
            if inv and inv.get("id") and inv["id"] != inv_id:
                _proof_query.append({"invoice_id": inv["id"]})
            if order.get("order_number"):
                _proof_query.append({"order_number": order["order_number"]})
            if order.get("id"):
                _proof_query.append({"order_id": order["id"]})
            if _proof_query:
                proof = await db.payment_proofs.find_one(
                    {"$or": _proof_query},
                    {"_id": 0, "payer_name": 1},
                    sort=[("created_at", -1)]
                )
                payer = (proof or {}).get("payer_name") or ""
        order["payer_name"] = payer or "-"

        # Approval info waterfall
        if inv:
            order["approved_at"] = order.get("approved_at") or inv.get("approved_at") or inv.get("paid_at") or ""
            order["approved_by"] = order.get("approved_by") or inv.get("approved_by") or ""
        if "approved_at" not in order:
            order["approved_at"] = ""
        if "approved_by" not in order:
            order["approved_by"] = ""
        # States
        order["payment_state"] = order.get("payment_status") or "paid"
        order["fulfillment_state"] = order.get("status") or "new"
        # Ensure critical fields are never null
        order["customer_name"] = order.get("customer_name") or order.get("customer_email") or "-"
        out.append(order)
    return out


@router.get("/{order_id}")
async def get_order(order_id: str):
    """Get a specific order by ID — enriched with customer, vendor, sales, timeline, payment info"""
    try:
        doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        doc = None
    if not doc:
        doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    order = serialize_doc(doc)
    oid = order.get("id") or order_id

    # Invoice — try both id field and ObjectId, plus reverse lookup
    invoice = None
    if order.get("invoice_id"):
        inv = await db.invoices.find_one({"id": order["invoice_id"]})
        if not inv:
            try:
                inv = await db.invoices.find_one({"_id": ObjectId(order["invoice_id"])})
            except Exception:
                pass
        if inv:
            invoice = serialize_doc(inv)
    # Reverse lookup: find invoice that created this order
    if not invoice:
        inv = await db.invoices.find_one({"order_id": oid})
        if not inv:
            inv = await db.invoices.find_one({"linked_order_id": oid})
        if inv:
            invoice = serialize_doc(inv)

    # Customer info
    customer = None
    cust_id = order.get("customer_id") or order.get("user_id")
    if cust_id:
        customer = await db.users.find_one({"id": cust_id}, {"_id": 0, "full_name": 1, "email": 1, "phone": 1})

    # Vendor orders with vendor details
    raw_vos = await db.vendor_orders.find({"order_id": oid}).to_list(50)
    vendor_orders = []
    for vo in raw_vos:
        vo = serialize_doc(vo)
        vid = vo.get("vendor_id", "")
        vp = await db.partner_users.find_one({"partner_id": vid}, {"_id": 0, "name": 1, "full_name": 1, "company_name": 1, "phone": 1, "email": 1})
        vo["vendor_name"] = (vp or {}).get("company_name") or (vp or {}).get("full_name") or (vp or {}).get("name") or vid[:12]
        vo["vendor_phone"] = (vp or {}).get("phone", "")
        vo["vendor_email"] = (vp or {}).get("email", "")
        vendor_orders.append(vo)

    # Sales assignment
    assignment = await db.sales_assignments.find_one({"order_id": oid})
    assignment = serialize_doc(assignment) if assignment else None
    sales_user = None
    _invalid_detail = {"unassigned", "auto-sales", ""}
    sales_id = (assignment or {}).get("sales_owner_id") or order.get("assigned_sales_id")
    if sales_id and sales_id in _invalid_detail:
        sales_id = order.get("assigned_sales_id")
    if sales_id and sales_id in _invalid_detail:
        sales_id = None
    if sales_id:
        sales_user = await db.users.find_one({"id": sales_id}, {"_id": 0, "full_name": 1, "phone": 1, "email": 1})

    # Events timeline
    events = [serialize_doc(e) for e in await db.order_events.find({"order_id": oid}).sort("created_at", 1).to_list(100)]

    # Payment info from invoice + proof — STRICT payer separation
    payment_proof = None
    if invoice:
        payer = invoice.get("payer_name") or (invoice.get("billing") or {}).get("invoice_client_name") or ""
        if not payer:
            proof_doc = await db.payment_proofs.find_one(
                {"$or": [
                    {"invoice_id": invoice.get("id")},
                    {"order_number": order.get("order_number")},
                    {"order_id": oid},
                ]},
                {"_id": 0, "payer_name": 1},
                sort=[("created_at", -1)]
            )
            if proof_doc:
                payer = proof_doc.get("payer_name") or ""
        payment_proof = {
            "payer_name": payer or "-",
            "approved_by": invoice.get("approved_by") or "-",
            "approved_at": invoice.get("approved_at") or invoice.get("paid_at") or "",
            "payment_status": invoice.get("payment_status") or invoice.get("status") or "-",
        }

    # Quote link
    quote = None
    if order.get("quote_id"):
        q = await db.quotes.find_one({"id": order["quote_id"]}, {"_id": 0, "id": 1, "quote_number": 1})
        if q:
            quote = dict(q)

    # Commissions
    commissions = [serialize_doc(c) for c in await db.commissions.find({"order_id": oid}).to_list(50)]

    return {
        "order": order,
        "invoice": invoice,
        "vendor_orders": vendor_orders,
        "sales_assignment": assignment,
        "sales_user": sales_user,
        "customer": customer,
        "events": events,
        "commissions": commissions,
        "quote": quote,
        "payment_proof": payment_proof,
        # Flat enriched fields for drawer/detail consumption
        "customer_name": (customer or {}).get("full_name") or order.get("customer_name") or "-",
        "customer_email": (customer or {}).get("email") or order.get("customer_email") or "-",
        "customer_phone": (customer or {}).get("phone") or order.get("delivery_phone") or "-",
        "sales_name": (sales_user or {}).get("full_name") or (assignment or {}).get("sales_owner_name") or "",
        "sales_email": (sales_user or {}).get("email") or "",
        "sales_phone": (sales_user or {}).get("phone") or "",
        "vendor_name": vendor_orders[0].get("vendor_name") if vendor_orders else "-",
        "vendor_email": vendor_orders[0].get("vendor_email") if vendor_orders else "",
        "vendor_phone": vendor_orders[0].get("vendor_phone") if vendor_orders else "",
        "payer_name": (payment_proof or {}).get("payer_name") or order.get("payer_name") or "-",
        "approved_at": (payment_proof or {}).get("approved_at") or order.get("approved_at") or "",
        "approved_by": (payment_proof or {}).get("approved_by") or order.get("approved_by") or "",
    }


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str, 
    status: str = Query(...), 
    note: Optional[str] = Query(default=None),
    triggered_by_user_id: Optional[str] = Query(default=None),
    triggered_by_role: str = Query(default="admin"),
):
    """Update order status with history tracking and workflow-linked notifications"""
    now = datetime.now(timezone.utc)

    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check idempotency - track previous status
    previous_status = order.get("current_status") or order.get("status")

    history_item = {
        "status": status,
        "note": note or f"Order moved to {status}",
        "timestamp": now.isoformat(),
    }

    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "status": status,
                "current_status": status,
                "updated_at": now.isoformat(),
            },
            "$push": {"status_history": history_item},
        },
    )

    updated = await db.orders.find_one({"_id": ObjectId(order_id)})
    
    # Send workflow-linked notifications based on status change
    customer_user_id = order.get("customer_user_id") or order.get("customer_id") or order.get("user_id")
    order_number = order.get("order_number") or order.get("order_id") or f"ORD-{order_id[:8]}"
    
    # Only notify if status actually changed (idempotency)
    if status != previous_status:
        if status == "confirmed":
            await notify_customer_order_confirmed(
                db,
                customer_user_id=customer_user_id,
                order_id=order_id,
                order_number=order_number,
                triggered_by_user_id=triggered_by_user_id,
                triggered_by_role=triggered_by_role,
            )
        elif status in ["dispatched", "shipped", "out_for_delivery"]:
            await notify_customer_order_dispatched(
                db,
                customer_user_id=customer_user_id,
                order_id=order_id,
                order_number=order_number,
                triggered_by_user_id=triggered_by_user_id,
                triggered_by_role=triggered_by_role,
            )
            # Also notify operations if assigned
            await notify_ops_order_dispatched(
                db,
                ops_user_id=order.get("assigned_operations_id") or order.get("assigned_to"),
                order_id=order_id,
                order_number=order_number,
                triggered_by_user_id=triggered_by_user_id,
                triggered_by_role=triggered_by_role,
            )

    return serialize_doc(updated)


@router.post("/reserve-inventory")
async def reserve_inventory(payload: ReserveInventoryRequest):
    """Reserve inventory items for an order"""
    now = datetime.now(timezone.utc)

    try:
        order = await db.orders.find_one({"_id": ObjectId(payload.order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    reservation_results = []

    for item in payload.items:
        inventory = await db.inventory_items.find_one({"sku": item.sku})
        if not inventory:
            raise HTTPException(status_code=404, detail=f"Inventory item {item.sku} not found")

        available_qty = inventory.get("quantity_on_hand", 0) - inventory.get("reserved_quantity", 0)
        if available_qty < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient available stock for {item.sku}. Available: {available_qty}",
            )

        new_reserved = inventory.get("reserved_quantity", 0) + item.quantity

        await db.inventory_items.update_one(
            {"sku": item.sku},
            {
                "$set": {
                    "reserved_quantity": new_reserved,
                    "updated_at": now.isoformat(),
                }
            },
        )

        reservation_doc = {
            "order_id": payload.order_id,
            "order_number": order.get("order_number"),
            "sku": item.sku,
            "quantity": item.quantity,
            "created_at": now.isoformat(),
        }
        await db.inventory_reservations.insert_one(reservation_doc)

        reservation_results.append(
            {
                "sku": item.sku,
                "reserved_quantity": item.quantity,
                "order_number": order.get("order_number"),
            }
        )

    current_status = order.get("current_status") or order.get("status", "pending")
    await db.orders.update_one(
        {"_id": ObjectId(payload.order_id)},
        {
            "$set": {"inventory_reserved": True, "updated_at": now.isoformat()},
            "$push": {
                "status_history": {
                    "status": current_status,
                    "note": "Inventory reserved for this order",
                    "timestamp": now.isoformat(),
                }
            },
        },
    )

    return {
        "message": "Inventory reserved successfully",
        "reservations": reservation_results,
    }


@router.post("/assign-task")
async def assign_order_task(payload: AssignOrderTaskRequest):
    """Create a task linked to an order"""
    now = datetime.now(timezone.utc)

    try:
        order = await db.orders.find_one({"_id": ObjectId(payload.order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    task_doc = {
        "title": payload.title,
        "description": payload.description,
        "assigned_to": payload.assigned_to,
        "department": payload.department,
        "related_type": "order",
        "related_id": payload.order_id,
        "related_order_number": order.get("order_number"),
        "due_date": payload.due_date.isoformat() if payload.due_date else None,
        "priority": payload.priority,
        "status": "todo",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    result = await db.admin_tasks.insert_one(task_doc)
    created = await db.admin_tasks.find_one({"_id": result.inserted_id})

    return serialize_doc(created)


@router.post("/send-to-production")
async def send_order_to_production(payload: ProductionQueueCreate):
    """Add order to production queue"""
    now = datetime.now(timezone.utc)

    try:
        order = await db.orders.find_one({"_id": ObjectId(payload.order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    existing = await db.production_queue.find_one({
        "order_id": payload.order_id, 
        "status": {"$ne": "completed"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Order is already in production queue")

    production_doc = payload.model_dump()
    production_doc["created_at"] = now.isoformat()
    production_doc["updated_at"] = now.isoformat()
    production_doc["history"] = [
        {
            "status": payload.status,
            "note": payload.notes or "Added to production queue",
            "timestamp": now.isoformat(),
        }
    ]
    
    if production_doc.get("due_date"):
        dd = production_doc["due_date"]
        production_doc["due_date"] = dd.isoformat() if hasattr(dd, "isoformat") else str(dd)

    result = await db.production_queue.insert_one(production_doc)

    await db.orders.update_one(
        {"_id": ObjectId(payload.order_id)},
        {
            "$set": {
                "status": "in_production", 
                "current_status": "in_production",
                "updated_at": now.isoformat()
            },
            "$push": {
                "status_history": {
                    "status": "in_production",
                    "note": "Order sent to production queue",
                    "timestamp": now.isoformat(),
                }
            },
        },
    )

    created = await db.production_queue.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.post("/{order_id}/reserve-stock")
async def reserve_order_stock(order_id: str):
    """Reserve stock for order variants"""
    now = datetime.now(timezone.utc)
    
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    line_items = order.get("line_items", []) or order.get("items", []) or []
    
    for item in line_items:
        variant_id = item.get("variant_id")
        quantity = int(item.get("quantity", 0) or 0)
        if not variant_id or quantity <= 0:
            continue
        
        try:
            variant = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
        except Exception:
            continue
            
        if not variant:
            continue
        
        stock_on_hand = int(variant.get("stock_on_hand", 0) or 0)
        reserved_stock = int(variant.get("reserved_stock", 0) or 0)
        available = stock_on_hand - reserved_stock
        
        if available < quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for SKU {variant.get('sku')}. Available: {available}"
            )
        
        await db.inventory_variants.update_one(
            {"_id": ObjectId(variant_id)},
            {
                "$inc": {"reserved_stock": quantity},
                "$set": {"updated_at": now.isoformat()},
            },
        )
        
        await db.stock_movements.insert_one({
            "movement_type": "reserve",
            "variant_id": variant_id,
            "sku": variant.get("sku"),
            "warehouse": variant.get("warehouse_location"),
            "quantity": quantity,
            "reference_type": "order",
            "reference_id": order_id,
            "created_at": now.isoformat(),
        })
    
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "stock_status": "reserved",
                "updated_at": now.isoformat(),
            },
            "$push": {
                "status_history": {
                    "status": order.get("status", "pending"),
                    "note": "Stock reserved for order",
                    "timestamp": now.isoformat(),
                }
            },
        },
    )
    
    updated = await db.orders.find_one({"_id": ObjectId(order_id)})
    return serialize_doc(updated)


@router.post("/{order_id}/deduct-stock")
async def deduct_order_stock(order_id: str):
    """Deduct stock for order variants (goods issue)"""
    now = datetime.now(timezone.utc)
    
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    line_items = order.get("line_items", []) or order.get("items", []) or []
    
    for item in line_items:
        variant_id = item.get("variant_id")
        quantity = int(item.get("quantity", 0) or 0)
        if not variant_id or quantity <= 0:
            continue
        
        try:
            variant = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
        except Exception:
            continue
            
        if not variant:
            continue
        
        await db.inventory_variants.update_one(
            {"_id": ObjectId(variant_id)},
            {
                "$inc": {
                    "stock_on_hand": -quantity,
                    "reserved_stock": -quantity,
                },
                "$set": {"updated_at": now.isoformat()},
            },
        )
        
        await db.stock_movements.insert_one({
            "movement_type": "deduct",
            "variant_id": variant_id,
            "sku": variant.get("sku"),
            "warehouse": variant.get("warehouse_location"),
            "quantity": -quantity,
            "reference_type": "order",
            "reference_id": order_id,
            "created_at": now.isoformat(),
        })
    
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "stock_status": "deducted",
                "updated_at": now.isoformat(),
            },
            "$push": {
                "status_history": {
                    "status": order.get("status", "pending"),
                    "note": "Stock deducted from order",
                    "timestamp": now.isoformat(),
                }
            },
        },
    )
    
    updated = await db.orders.find_one({"_id": ObjectId(order_id)})
    return serialize_doc(updated)


@router.post("/{order_id}/release-to-vendor")
async def release_to_vendor(order_id: str, payload: dict = {}):
    """Manual release of an order to vendor(s)."""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        try:
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
        except Exception:
            pass
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    now = datetime.now(timezone.utc).isoformat()
    oid = order.get("id") or str(order["_id"])
    await db.orders.update_one(
        {"id": oid},
        {"$set": {"release_state": "manual", "release_type": "manual", "released_at": now, "released_by": payload.get("released_by", "admin")}}
    )
    await db.vendor_orders.update_many(
        {"order_id": oid},
        {"$set": {"status": "ready_to_fulfill", "released_at": now}}
    )
    return {"ok": True}


@router.get("/{order_id}/purchase-orders")
async def get_purchase_orders_for_order(order_id: str):
    """List all purchase orders (vendor orders) for a given parent order."""
    vos = await db.vendor_orders.find(
        {"$or": [{"order_id": order_id}, {"order_number": order_id}]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(length=50)
    # Enrich with vendor name
    for vo in vos:
        vendor_id = vo.get("vendor_id")
        if vendor_id:
            partner = await db.partner_users.find_one({"partner_id": vendor_id}, {"_id": 0, "full_name": 1, "company_name": 1})
            if partner:
                vo["vendor_name"] = partner.get("full_name") or partner.get("company_name") or ""
            else:
                user = await db.users.find_one({"id": vendor_id}, {"_id": 0, "full_name": 1})
                if user:
                    vo["vendor_name"] = user.get("full_name", "")
    return {"purchase_orders": vos, "count": len(vos)}
