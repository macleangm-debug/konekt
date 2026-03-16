"""
Konekt Invoice Routes - Create, manage, convert from orders
With canonical collection mode
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

from quote_models import InvoiceCreateNew, ConvertOrderToInvoiceRequest
from payment_terms_utils import resolve_payment_terms, calculate_due_date
from collection_mode_service import get_invoice_collection

router = APIRouter(prefix="/api/admin/invoices-v2", tags=["Invoices V2"])

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
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.post("")
async def create_invoice(payload: InvoiceCreateNew):
    """Create a new invoice with auto-applied customer payment terms and due date"""
    now = datetime.now(timezone.utc)
    invoice_number = f"INV-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    # Look up customer by email to auto-apply payment terms
    customer = await db.customers.find_one({"email": payload.customer_email})
    resolved_terms = resolve_payment_terms(customer)
    
    # Calculate due date from payment terms if not provided
    due_date = payload.due_date
    if not due_date:
        due_date = calculate_due_date(
            issue_date=now,
            payment_term_type=resolved_terms["payment_term_type"],
            payment_term_days=resolved_terms["payment_term_days"],
        )

    doc = payload.model_dump()
    doc["invoice_number"] = invoice_number
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    doc["payments"] = []
    doc["amount_paid"] = 0
    
    # Auto-apply customer payment terms
    doc["payment_term_type"] = resolved_terms["payment_term_type"]
    doc["payment_term_days"] = resolved_terms["payment_term_days"]
    doc["payment_term_label"] = resolved_terms["payment_term_label"]
    doc["payment_term_notes"] = resolved_terms["payment_term_notes"]
    
    # Set calculated due date
    if due_date:
        doc["due_date"] = due_date.isoformat() if hasattr(due_date, "isoformat") else str(due_date)
    
    # If terms are not provided, use payment term notes or default
    if not doc.get("terms"):
        settings = await db.company_settings.find_one({})
        doc["terms"] = resolved_terms["payment_term_notes"] or (settings.get("invoice_terms") if settings else None)

    # Use canonical invoice collection
    invoices_collection = await get_invoice_collection(db)
    result = await invoices_collection.insert_one(doc)
    created = await invoices_collection.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("")
async def list_invoices(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all invoices from canonical collection with fallback"""
    query = {}
    if status:
        query["status"] = status
    if customer_email:
        query["customer_email"] = customer_email
    
    # Get canonical collection
    invoices_collection = await get_invoice_collection(db)
    docs = await invoices_collection.find(query).sort("created_at", -1).to_list(length=limit)
    
    # Also get from fallback collection
    fallback = db.invoices if invoices_collection.name == "invoices_v2" else db.invoices_v2
    legacy_docs = await fallback.find(query).sort("created_at", -1).to_list(length=limit)
    
    # Combine and dedupe by invoice_number
    seen = set()
    combined = []
    for doc in docs + legacy_docs:
        inv_num = doc.get("invoice_number")
        if inv_num and inv_num not in seen:
            seen.add(inv_num)
            combined.append(serialize_doc(doc))
    
    return combined[:limit]


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get a specific invoice from canonical collection with fallback"""
    try:
        invoices_collection = await get_invoice_collection(db)
        doc = await invoices_collection.find_one({"_id": ObjectId(invoice_id)})
        if not doc:
            fallback = db.invoices if invoices_collection.name == "invoices_v2" else db.invoices_v2
            doc = await fallback.find_one({"_id": ObjectId(invoice_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return serialize_doc(doc)
    except Exception:
        raise HTTPException(status_code=404, detail="Invoice not found")


@router.get("/{invoice_id}/payments")
async def get_invoice_payments(invoice_id: str):
    """Get payment history for an invoice"""
    try:
        invoices_collection = await get_invoice_collection(db)
        doc = await invoices_collection.find_one({"_id": ObjectId(invoice_id)})
        if not doc:
            fallback = db.invoices if invoices_collection.name == "invoices_v2" else db.invoices_v2
            doc = await fallback.find_one({"_id": ObjectId(invoice_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return doc.get("payments", [])
    except Exception:
        raise HTTPException(status_code=404, detail="Invoice not found")


@router.patch("/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str = Query(...)):
    """Update invoice status"""
    valid_statuses = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc)
    invoices_collection = await get_invoice_collection(db)
    result = await invoices_collection.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"status": status, "updated_at": now.isoformat()}}
    )
    if result.matched_count == 0:
        fallback = db.invoices if invoices_collection.name == "invoices_v2" else db.invoices_v2
        result = await fallback.update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": {"status": status, "updated_at": now.isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        updated = await fallback.find_one({"_id": ObjectId(invoice_id)})
    else:
        updated = await invoices_collection.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(updated)


class PaymentRecord(BaseModel):
    amount: float
    payment_method: Optional[str] = "bank_transfer"
    method: Optional[str] = None  # Backward compat
    reference: Optional[str] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{invoice_id}/payments")
async def add_payment(invoice_id: str, payload: PaymentRecord):
    """Add a payment to an invoice"""
    now = datetime.now(timezone.utc)
    
    invoices_collection = await get_invoice_collection(db)
    try:
        invoice = await invoices_collection.find_one({"_id": ObjectId(invoice_id)})
        if not invoice:
            fallback = db.invoices if invoices_collection.name == "invoices_v2" else db.invoices_v2
            invoice = await fallback.find_one({"_id": ObjectId(invoice_id)})
            if invoice:
                invoices_collection = fallback
    except Exception:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
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
    
    await invoices_collection.update_one(
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
    
    updated = await invoices_collection.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(updated)


@router.post("/convert-from-order")
async def convert_order_to_invoice(payload: ConvertOrderToInvoiceRequest):
    """Convert an order to an invoice with customer payment terms"""
    try:
        order = await db.orders.find_one({"_id": ObjectId(payload.order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    now = datetime.now(timezone.utc)
    invoice_number = f"INV-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    # Look up customer by email to auto-apply payment terms
    customer_email = order.get("customer_email") or order.get("email")
    customer = await db.customers.find_one({"email": customer_email}) if customer_email else None
    resolved_terms = resolve_payment_terms(customer)
    
    # Calculate due date from payment terms if not provided
    due_date = payload.due_date
    if not due_date:
        due_date = calculate_due_date(
            issue_date=now,
            payment_term_type=resolved_terms["payment_term_type"],
            payment_term_days=resolved_terms["payment_term_days"],
        )
    
    # Get company settings for default terms
    settings = await db.company_settings.find_one({})

    invoice_doc = {
        "invoice_number": invoice_number,
        "customer_name": order.get("customer_name"),
        "customer_email": customer_email,
        "customer_company": order.get("customer_company"),
        "customer_phone": order.get("customer_phone") or order.get("phone"),
        "order_id": str(order["_id"]),
        "order_number": order.get("order_number"),
        "quote_id": order.get("quote_id"),
        "currency": order.get("currency", "TZS"),
        "line_items": order.get("line_items") or order.get("items", []),
        "subtotal": order.get("subtotal", 0),
        "tax": order.get("tax", 0),
        "discount": order.get("discount", 0),
        "total": order.get("total", 0),
        "due_date": due_date.isoformat() if due_date and hasattr(due_date, "isoformat") else due_date,
        "notes": order.get("notes"),
        "terms": resolved_terms["payment_term_notes"] or (settings.get("invoice_terms") if settings else None),
        # Payment Terms
        "payment_term_type": resolved_terms["payment_term_type"],
        "payment_term_days": resolved_terms["payment_term_days"],
        "payment_term_label": resolved_terms["payment_term_label"],
        "payment_term_notes": resolved_terms["payment_term_notes"],
        "status": "draft",
        "payments": [],
        "amount_paid": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    # Use canonical invoice collection
    invoices_collection = await get_invoice_collection(db)
    result = await invoices_collection.insert_one(invoice_doc)
    
    # Update order with invoice reference
    await db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {
            "invoice_id": str(result.inserted_id),
            "invoice_number": invoice_number,
            "updated_at": now.isoformat()
        }}
    )
    
    created = await invoices_collection.find_one({"_id": result.inserted_id})
    return serialize_doc(created)
