"""
Konekt Admin Routes - CRM, Inventory, Invoices, Tasks, Quotes
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from admin_models import (
    CRMLeadCreate,
    TaskCreate,
    InventoryItemCreate,
    StockMovementCreate,
    InvoiceCreate,
    QuoteCreate,
)

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])

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
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    # Convert datetime objects to ISO strings
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


# ==================== DASHBOARD ====================

@router.get("/dashboard/summary")
async def admin_dashboard_summary():
    """Get admin dashboard summary metrics"""
    try:
        total_orders = await db.orders.count_documents({})
        total_service_orders = await db.service_orders.count_documents({})
        total_leads = await db.crm_leads.count_documents({})
        open_tasks = await db.admin_tasks.count_documents({"status": {"$ne": "done"}})
        total_invoices = await db.invoices.count_documents({})
        total_quotes = await db.quotes.count_documents({})
        
        # Low stock items (where quantity <= reorder_level)
        low_stock_items = await db.inventory_items.count_documents({
            "$expr": {"$lte": ["$quantity_on_hand", "$reorder_level"]}
        })
        
        # Pending orders
        pending_orders = await db.orders.count_documents({"current_status": "pending"})
        
        # Revenue from paid invoices
        paid_invoices = await db.invoices.find({"status": "paid"}).to_list(length=1000)
        total_revenue = sum(inv.get("total", 0) for inv in paid_invoices)
        
        # New leads today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        new_leads_today = await db.crm_leads.count_documents({
            "created_at": {"$gte": today_start.isoformat()}
        })

        return {
            "orders": total_orders,
            "service_orders": total_service_orders,
            "leads": total_leads,
            "new_leads_today": new_leads_today,
            "open_tasks": open_tasks,
            "invoices": total_invoices,
            "quotes": total_quotes,
            "low_stock_items": low_stock_items,
            "pending_orders": pending_orders,
            "total_revenue": total_revenue,
        }
    except Exception as e:
        return {"error": str(e)}


# ==================== CRM / LEADS ====================

@router.post("/crm/leads")
async def create_lead(payload: CRMLeadCreate):
    """Create a new CRM lead"""
    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    doc["activities"] = []

    result = await db.crm_leads.insert_one(doc)
    created = await db.crm_leads.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/crm/leads")
async def list_leads(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all CRM leads"""
    query = {}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    docs = await db.crm_leads.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/crm/leads/{lead_id}")
async def get_lead(lead_id: str):
    """Get a specific lead"""
    try:
        doc = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Lead not found")
        return serialize_doc(doc)
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")


class LeadStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


@router.patch("/crm/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str = Query(...)):
    """Update lead status"""
    now = datetime.now(timezone.utc)
    
    result = await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {
            "$set": {"status": status, "updated_at": now.isoformat()},
            "$push": {
                "activities": {
                    "action": "status_change",
                    "new_status": status,
                    "timestamp": now.isoformat()
                }
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    updated = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated)


@router.delete("/crm/leads/{lead_id}")
async def delete_lead(lead_id: str):
    """Delete a lead"""
    result = await db.crm_leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}


# ==================== TASKS ====================

@router.post("/tasks")
async def create_task(payload: TaskCreate):
    """Create a new task"""
    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()

    result = await db.admin_tasks.insert_one(doc)
    created = await db.admin_tasks.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/tasks")
async def list_tasks(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    department: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all tasks"""
    query = {}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    if department:
        query["department"] = department
    if priority:
        query["priority"] = priority

    docs = await db.admin_tasks.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.patch("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str = Query(...)):
    """Update task status"""
    now = datetime.now(timezone.utc)
    
    result = await db.admin_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": status, "updated_at": now.isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated = await db.admin_tasks.find_one({"_id": ObjectId(task_id)})
    return serialize_doc(updated)


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    result = await db.admin_tasks.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


# ==================== INVENTORY ====================

@router.post("/inventory/items")
async def create_inventory_item(payload: InventoryItemCreate):
    """Create a new inventory item"""
    existing = await db.inventory_items.find_one({"sku": payload.sku})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()

    result = await db.inventory_items.insert_one(doc)
    created = await db.inventory_items.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/inventory/items")
async def list_inventory_items(
    low_stock: bool = False,
    branch: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(default=200, le=500)
):
    """List all inventory items"""
    query = {"is_active": True}
    if branch:
        query["branch"] = branch
    if category:
        query["category"] = category
    
    docs = await db.inventory_items.find(query).sort("product_title", 1).to_list(length=limit)
    
    if low_stock:
        docs = [doc for doc in docs if doc.get("quantity_on_hand", 0) <= doc.get("reorder_level", 0)]

    return [serialize_doc(doc) for doc in docs]


@router.get("/inventory/items/{item_id}")
async def get_inventory_item(item_id: str):
    """Get a specific inventory item"""
    doc = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return serialize_doc(doc)


@router.post("/inventory/movements")
async def create_stock_movement(payload: StockMovementCreate):
    """Create a stock movement (in/out/adjustment)"""
    now = datetime.now(timezone.utc)

    item = await db.inventory_items.find_one({"sku": payload.sku})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    current_qty = item.get("quantity_on_hand", 0)
    new_qty = current_qty

    if payload.movement_type == "in":
        new_qty += payload.quantity
    elif payload.movement_type == "out":
        if current_qty < payload.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        new_qty -= payload.quantity
    elif payload.movement_type == "adjustment":
        new_qty = payload.quantity

    movement_doc = payload.model_dump()
    movement_doc["created_at"] = now.isoformat()
    movement_doc["previous_qty"] = current_qty
    movement_doc["new_qty"] = new_qty

    await db.stock_movements.insert_one(movement_doc)
    await db.inventory_items.update_one(
        {"sku": payload.sku},
        {"$set": {"quantity_on_hand": new_qty, "updated_at": now.isoformat()}}
    )

    updated = await db.inventory_items.find_one({"sku": payload.sku})
    return {
        "message": "Stock movement recorded",
        "movement_type": payload.movement_type,
        "quantity": payload.quantity,
        "previous_qty": current_qty,
        "new_qty": new_qty,
        "item": serialize_doc(updated),
    }


@router.get("/inventory/movements")
async def list_stock_movements(
    sku: Optional[str] = None,
    movement_type: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List stock movements"""
    query = {}
    if sku:
        query["sku"] = sku
    if movement_type:
        query["movement_type"] = movement_type
    
    docs = await db.stock_movements.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/inventory/low-stock")
async def get_low_stock_items():
    """Get items with low stock"""
    pipeline = [
        {"$match": {"is_active": True}},
        {"$match": {"$expr": {"$lte": ["$quantity_on_hand", "$reorder_level"]}}},
        {"$sort": {"quantity_on_hand": 1}}
    ]
    
    docs = await db.inventory_items.aggregate(pipeline).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


# ==================== INVOICES ====================

@router.post("/invoices")
async def create_invoice(payload: InvoiceCreate):
    """Create a new invoice"""
    now = datetime.now(timezone.utc)
    invoice_number = f"INV-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    doc = payload.model_dump()
    doc["invoice_number"] = invoice_number
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    doc["payments"] = []

    result = await db.invoices.insert_one(doc)
    created = await db.invoices.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/invoices")
async def list_invoices(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all invoices"""
    query = {}
    if status:
        query["status"] = status
    if customer_email:
        query["customer_email"] = customer_email
    
    docs = await db.invoices.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get a specific invoice"""
    doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_doc(doc)


@router.patch("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str = Query(...)):
    """Update invoice status"""
    valid_statuses = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc)
    
    result = await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"status": status, "updated_at": now.isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    updated = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(updated)


class PaymentRecord(BaseModel):
    amount: float
    method: str
    reference: Optional[str] = None
    notes: Optional[str] = None


@router.post("/invoices/{invoice_id}/payments")
async def add_payment(invoice_id: str, payload: PaymentRecord):
    """Add a payment to an invoice"""
    now = datetime.now(timezone.utc)
    
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payment = payload.model_dump()
    payment["timestamp"] = now.isoformat()
    
    # Calculate new paid amount
    existing_payments = invoice.get("payments", [])
    total_paid = sum(p.get("amount", 0) for p in existing_payments) + payload.amount
    invoice_total = invoice.get("total", 0)
    
    # Determine new status
    new_status = invoice.get("status")
    if total_paid >= invoice_total:
        new_status = "paid"
    elif total_paid > 0:
        new_status = "partially_paid"
    
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {
            "$push": {"payments": payment},
            "$set": {
                "status": new_status,
                "amount_paid": total_paid,
                "updated_at": now.isoformat()
            }
        }
    )
    
    updated = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(updated)


# ==================== QUOTES ====================

@router.post("/quotes")
async def create_quote(payload: QuoteCreate):
    """Create a new quote"""
    now = datetime.now(timezone.utc)
    quote_number = f"QT-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    doc = payload.model_dump()
    doc["quote_number"] = quote_number
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()

    result = await db.quotes.insert_one(doc)
    created = await db.quotes.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/quotes")
async def list_quotes(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all quotes"""
    query = {}
    if status:
        query["status"] = status
    if customer_email:
        query["customer_email"] = customer_email
    
    docs = await db.quotes.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str):
    """Get a specific quote"""
    doc = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Quote not found")
    return serialize_doc(doc)


@router.patch("/quotes/{quote_id}/status")
async def update_quote_status(quote_id: str, status: str = Query(...)):
    """Update quote status"""
    valid_statuses = ["draft", "sent", "accepted", "rejected", "expired", "converted"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc)
    
    result = await db.quotes.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": {"status": status, "updated_at": now.isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    updated = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    return serialize_doc(updated)


@router.post("/quotes/{quote_id}/convert-to-order")
async def convert_quote_to_order(quote_id: str):
    """Convert an accepted quote to an order"""
    now = datetime.now(timezone.utc)
    
    quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.get("status") not in ["accepted", "sent"]:
        raise HTTPException(status_code=400, detail="Quote must be accepted or sent to convert")
    
    # Create order from quote
    order_number = f"ORD-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
    
    order_doc = {
        "order_number": order_number,
        "quote_id": quote_id,
        "quote_number": quote.get("quote_number"),
        "customer_name": quote.get("customer_name"),
        "customer_email": quote.get("customer_email"),
        "customer_company": quote.get("customer_company"),
        "line_items": quote.get("line_items", []),
        "subtotal": quote.get("subtotal", 0),
        "tax": quote.get("tax", 0),
        "discount": quote.get("discount", 0),
        "total": quote.get("total", 0),
        "currency": quote.get("currency", "TZS"),
        "current_status": "pending",
        "status_history": [{
            "status": "pending",
            "note": f"Order created from quote {quote.get('quote_number')}",
            "timestamp": now.isoformat()
        }],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    
    await db.orders.insert_one(order_doc)
    
    # Update quote status
    await db.quotes.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": {"status": "converted", "converted_order_number": order_number, "updated_at": now.isoformat()}}
    )
    
    return {
        "message": "Quote converted to order successfully",
        "order_number": order_number,
        "quote_number": quote.get("quote_number")
    }


@router.post("/quotes/{quote_id}/convert-to-invoice")
async def convert_quote_to_invoice(quote_id: str):
    """Convert an accepted quote directly to an invoice"""
    now = datetime.now(timezone.utc)
    
    quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.get("status") not in ["accepted", "sent"]:
        raise HTTPException(status_code=400, detail="Quote must be accepted or sent to convert")
    
    invoice_number = f"INV-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
    
    invoice_doc = {
        "invoice_number": invoice_number,
        "quote_id": quote_id,
        "quote_number": quote.get("quote_number"),
        "customer_name": quote.get("customer_name"),
        "customer_email": quote.get("customer_email"),
        "customer_company": quote.get("customer_company"),
        "line_items": [
            {
                "description": item.get("product_name", "") + " - " + item.get("description", ""),
                "quantity": item.get("quantity", 1),
                "unit_price": item.get("unit_price", 0),
                "total": item.get("total", 0)
            }
            for item in quote.get("line_items", [])
        ],
        "subtotal": quote.get("subtotal", 0),
        "tax": quote.get("tax", 0),
        "discount": quote.get("discount", 0),
        "total": quote.get("total", 0),
        "currency": quote.get("currency", "TZS"),
        "status": "draft",
        "payments": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    
    await db.invoices.insert_one(invoice_doc)
    
    # Update quote status
    await db.quotes.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": {"status": "converted", "converted_invoice_number": invoice_number, "updated_at": now.isoformat()}}
    )
    
    return {
        "message": "Quote converted to invoice successfully",
        "invoice_number": invoice_number,
        "quote_number": quote.get("quote_number")
    }


# ==================== CUSTOMERS ====================

@router.get("/customers")
async def list_customers(
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all customers (from users collection)"""
    query = {"role": "customer"}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    
    docs = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str):
    """Get a specific customer with order history"""
    customer = await db.users.find_one({"id": customer_id}, {"password_hash": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get customer orders
    orders = await db.orders.find({"user_id": customer_id}).sort("created_at", -1).to_list(length=50)
    
    result = serialize_doc(customer)
    result["orders"] = [serialize_doc(o) for o in orders]
    result["total_orders"] = len(orders)
    result["total_spent"] = sum(o.get("total", 0) for o in orders)
    
    return result
