"""
Konekt Invoice Routes - Create, manage, convert from orders
With canonical collection mode and workflow-linked notifications
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
from notification_trigger_service import notify_customer_invoice_issued
from payment_timeline_service import trigger_invoice_issued

router = APIRouter(prefix="/api/admin/invoices", tags=["Invoices"])

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


@router.get("/stats")
async def invoices_stats():
    """Invoice stat cards."""
    total = await db.invoices.count_documents({})
    draft = await db.invoices.count_documents({"status": "draft"})
    sent = await db.invoices.count_documents({"status": {"$in": ["sent", "issued"]}})
    paid = await db.invoices.count_documents({"status": "paid"})
    overdue = await db.invoices.count_documents({"status": "overdue"})
    unpaid = await db.invoices.count_documents({"status": {"$in": ["unpaid", "pending", "partially_paid"]}})
    return {"total": total, "draft": draft, "sent": sent, "paid": paid, "overdue": overdue, "unpaid": unpaid}


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
    result = await db.invoices.insert_one(doc)
    created = await db.invoices.find_one({"_id": result.inserted_id})
    
    # Trigger Payment Timeline event for invoice issued
    try:
        await trigger_invoice_issued(
            db,
            invoice_id=str(result.inserted_id),
            invoice_number=invoice_number,
            customer_user_id=doc.get("customer_user_id"),
        )
    except Exception as e:
        print(f"Warning: Failed to create payment timeline event: {e}")
    
    return serialize_doc(created)


@router.get("")
async def list_invoices(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all invoices — enriched with payer_name and payment_status_label"""
    query = {}
    if status:
        query["status"] = status
    if customer_email:
        query["customer_email"] = customer_email

    docs = await db.invoices.find(query).sort("created_at", -1).to_list(length=limit)
    result = []
    for doc in docs:
        inv = serialize_doc(doc)
        # Resolve customer_name from users collection if missing
        if not inv.get("customer_name"):
            cid = inv.get("customer_id") or inv.get("customer_user_id") or inv.get("user_id")
            if cid:
                cust = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1, "email": 1})
                if cust:
                    inv["customer_name"] = cust.get("full_name") or cust.get("email") or ""
        # Resolve payer_name: invoice → proof → billing → customer_name
        payer = inv.get("payer_name") or ""
        if not payer:
            proof = await db.payment_proofs.find_one(
                {"invoice_id": inv.get("id")},
                {"_id": 0, "payer_name": 1, "customer_name": 1},
                sort=[("created_at", -1)]
            )
            if proof:
                payer = proof.get("payer_name") or proof.get("customer_name") or ""
        if not payer:
            billing = inv.get("billing") or {}
            payer = billing.get("invoice_client_name") or ""
        if not payer:
            payer = "-"
        inv["payer_name"] = payer
        # Payment status label
        ps = inv.get("payment_status") or inv.get("status") or "pending_payment"
        label_map = {
            "pending_payment": "Awaiting Payment",
            "awaiting_payment_proof": "Awaiting Payment",
            "pending": "Awaiting Payment",
            "under_review": "Payment Under Review",
            "pending_verification": "Payment Under Review",
            "approved": "Approved Payment",
            "paid": "Paid in Full",
            "partially_paid": "Partially Paid",
            "proof_rejected": "Payment Rejected",
            "rejected": "Payment Rejected",
        }
        inv["payment_status_label"] = label_map.get(ps, ps or "-")
        result.append(inv)
    return result


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get a specific invoice — enriched"""
    doc = None
    try:
        doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        pass
    if not doc:
        doc = await db.invoices.find_one({"id": invoice_id})
    if not doc:
        doc = await db.invoices.find_one({"invoice_number": invoice_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = serialize_doc(doc)
    # Resolve customer_name
    if not inv.get("customer_name"):
        cid = inv.get("customer_id") or inv.get("customer_user_id") or inv.get("user_id")
        if cid:
            cust = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1, "email": 1})
            if cust:
                inv["customer_name"] = cust.get("full_name") or cust.get("email") or ""
    # Resolve payer_name
    payer = inv.get("payer_name") or (inv.get("billing") or {}).get("invoice_client_name") or ""
    if not payer:
        proof = await db.payment_proofs.find_one(
            {"invoice_id": inv.get("id")},
            {"_id": 0, "payer_name": 1},
            sort=[("created_at", -1)]
        )
        payer = (proof or {}).get("payer_name") or ""
    inv["payer_name"] = payer or "-"
    inv.setdefault("total_amount", inv.get("total") or 0)
    return inv


@router.get("/{invoice_id}/payments")
async def get_invoice_payments(invoice_id: str):
    """Get payment history for an invoice"""
    try:
        doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return doc.get("payments", [])
    except Exception:
        raise HTTPException(status_code=404, detail="Invoice not found")


@router.patch("/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str = Query(...), triggered_by_user_id: str = Query(default=None), triggered_by_role: str = Query(default="admin")):
    """Update invoice status with workflow-linked notifications"""
    valid_statuses = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc)

    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    previous_status = invoice.get("status")

    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"status": status, "updated_at": now.isoformat()}}
    )

    updated = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    
    # Send notification only when status changes to "sent" (invoice issued)
    if status == "sent" and previous_status != "sent":
        await notify_customer_invoice_issued(
            db,
            customer_user_id=invoice.get("customer_user_id") or invoice.get("customer_id"),
            invoice_id=invoice_id,
            invoice_number=invoice.get("invoice_number", "Invoice"),
            triggered_by_user_id=triggered_by_user_id,
            triggered_by_role=triggered_by_role,
        )
    
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
    result = await db.invoices.insert_one(invoice_doc)
    
    # Update order with invoice reference
    await db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {
            "invoice_id": str(result.inserted_id),
            "invoice_number": invoice_number,
            "updated_at": now.isoformat()
        }}
    )
    
    created = await db.invoices.find_one({"_id": result.inserted_id})
    return serialize_doc(created)
