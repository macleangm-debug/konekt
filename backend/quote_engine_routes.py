"""
Quote System + Installment Logic Routes
Handles: create, send, accept, reject, invoice splits
"""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4

router = APIRouter(prefix="/api/quotes-engine", tags=["Quote Engine"])

def _now():
    return datetime.now(timezone.utc).isoformat()

def _stamp():
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

def _money(v):
    return round(float(v or 0), 2)

def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc

async def _notify(db, **kwargs):
    doc = {"id": str(uuid4()), "created_at": _now(), "is_read": False, **kwargs}
    await db.notifications.insert_one(doc)

# ─── Create Quote (Sales/Admin) ──────────────────────────────────
@router.post("/create")
async def create_quote(payload: dict, request: Request):
    db = request.app.mongodb
    request_id = payload.get("request_id")
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id required")

    items = payload.get("items", [])
    amount = _money(payload.get("amount", 0))
    if amount <= 0 and items:
        amount = sum(_money(i.get("unit_price", 0)) * int(i.get("quantity", 1)) for i in items)

    vat_rate = float(payload.get("vat_rate", 18)) / 100
    subtotal = amount
    vat = _money(subtotal * vat_rate)
    total = _money(subtotal + vat)

    quote_id = str(uuid4())
    valid_days = int(payload.get("valid_days", 30))

    quote_doc = {
        "id": quote_id,
        "quote_number": f"KON-QT-{_stamp()}",
        "request_id": request_id,
        "customer_id": customer_id,
        "customer_email": payload.get("customer_email", ""),
        "customer_name": payload.get("customer_name", ""),
        "assigned_sales_id": payload.get("assigned_sales_id", ""),
        "assigned_sales": payload.get("assigned_sales_name", ""),
        "type": payload.get("type", "service"),
        "status": "draft",
        "items": items,
        "subtotal_amount": subtotal,
        "vat_amount": vat,
        "total_amount": total,
        "currency": payload.get("currency", "TZS"),
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=valid_days)).isoformat(),
        "payment_type": payload.get("payment_type", "full"),
        "deposit_percent": float(payload.get("deposit_percent", 0)),
        "notes": payload.get("notes", ""),
        "created_at": _now(),
        "updated_at": _now(),
    }

    await db.quotes.insert_one(quote_doc)
    quote_doc.pop("_id", None)

    # If request_id provided, update the lead/request status
    if request_id:
        await db.leads.update_one({"id": request_id}, {"$set": {"status": "quoting", "quote_id": quote_id, "updated_at": _now()}})
        await db.service_requests.update_one({"id": request_id}, {"$set": {"status": "quoting", "quote_id": quote_id, "updated_at": _now()}})

    # Audit log
    await db.audit_logs.insert_one({
        "id": str(uuid4()), "action": "quote_created",
        "target_id": quote_id, "details": {"customer_id": customer_id, "amount": total},
        "created_at": _now(),
    })

    return quote_doc

# ─── Send Quote to Customer ──────────────────────────────────────
@router.post("/{quote_id}/send")
async def send_quote(quote_id: str, request: Request):
    db = request.app.mongodb
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "sent", "sent_at": _now(), "updated_at": _now()}})

    # Notify customer
    if quote.get("customer_id"):
        await _notify(db, recipient_user_id=quote["customer_id"], title="New Quote Ready",
            message=f"Quote {quote.get('quote_number', quote_id[:8])} is ready for your review.",
            target_url="/dashboard/quotes", priority="high")

    return {"ok": True, "status": "sent"}

# ─── Customer Accept Quote ───────────────────────────────────────
@router.post("/{quote_id}/accept")
async def accept_quote(quote_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.get("status") not in ("sent", "draft", "pending"):
        raise HTTPException(status_code=400, detail=f"Cannot accept quote in status '{quote.get('status')}'")

    now = _now()
    total = _money(quote.get("total_amount", 0))
    payment_type = quote.get("payment_type", "full")
    deposit_pct = float(quote.get("deposit_percent", 0))

    # Create invoice
    invoice_id = str(uuid4())
    invoice_doc = {
        "id": invoice_id,
        "invoice_number": f"KON-INV-{_stamp()}",
        "customer_id": quote.get("customer_id"),
        "customer_email": quote.get("customer_email", ""),
        "customer_name": quote.get("customer_name", ""),
        "user_id": quote.get("customer_id"),
        "quote_id": quote_id,
        "linked_quote_id": quote_id,
        "status": "pending_payment",
        "payment_status": "pending",
        "type": quote.get("type", "service"),
        "source_type": "Quote",
        "items": quote.get("items", []),
        "subtotal_amount": _money(quote.get("subtotal_amount", total)),
        "vat_amount": _money(quote.get("vat_amount", 0)),
        "total_amount": total,
        "total": total,
        "amount_due": total,
        "payment_type": payment_type,
        "deposit_percent": deposit_pct,
        "delivery": quote.get("delivery", {}),
        "vendor_ids": quote.get("vendor_ids", []),
        "notes": quote.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }
    await db.invoices.insert_one(invoice_doc)
    invoice_doc.pop("_id", None)

    # Create installment splits if needed
    splits = []
    if payment_type == "installment" and deposit_pct > 0:
        deposit_amount = _money(total * deposit_pct / 100)
        balance_amount = _money(total - deposit_amount)

        deposit_split = {
            "id": str(uuid4()), "invoice_id": invoice_id, "type": "deposit",
            "amount": deposit_amount, "status": "pending", "created_at": now,
        }
        balance_split = {
            "id": str(uuid4()), "invoice_id": invoice_id, "type": "balance",
            "amount": balance_amount, "status": "pending", "created_at": now,
        }
        await db.invoice_splits.insert_one(deposit_split)
        await db.invoice_splits.insert_one(balance_split)
        deposit_split.pop("_id", None)
        balance_split.pop("_id", None)
        splits = [deposit_split, balance_split]

        # Update invoice with split info
        await db.invoices.update_one({"id": invoice_id}, {"$set": {
            "has_installments": True, "amount_due": deposit_amount,
            "deposit_amount": deposit_amount, "balance_amount": balance_amount,
        }})
        invoice_doc["has_installments"] = True
        invoice_doc["deposit_amount"] = deposit_amount
        invoice_doc["balance_amount"] = balance_amount

    # Update quote status
    await db.quotes.update_one({"id": quote_id}, {"$set": {
        "status": "converted", "invoice_id": invoice_id, "approved_at": now,
        "accepted_by_role": payload.get("accepted_by_role", "customer"),
        "updated_at": now,
    }})

    # Update linked lead/request
    if quote.get("request_id"):
        await db.leads.update_one({"id": quote["request_id"]}, {"$set": {"status": "converted", "invoice_id": invoice_id, "updated_at": now}})
        await db.service_requests.update_one({"id": quote["request_id"]}, {"$set": {"status": "converted", "invoice_id": invoice_id, "updated_at": now}})

    # Notifications
    if quote.get("customer_id"):
        await _notify(db, recipient_user_id=quote["customer_id"], title="Invoice Created",
            message=f"Invoice for Quote {quote.get('quote_number', '')} is ready for payment.",
            target_url="/dashboard/invoices", priority="high")
    if quote.get("assigned_sales_id"):
        await _notify(db, recipient_user_id=quote["assigned_sales_id"], title="Quote Accepted",
            message=f"Quote {quote.get('quote_number', '')} was accepted. Invoice created.",
            target_url="/admin/quotes", priority="medium")

    # Audit
    await db.audit_logs.insert_one({
        "id": str(uuid4()), "action": "quote_accepted",
        "target_id": quote_id, "details": {"invoice_id": invoice_id, "total": total},
        "created_at": now,
    })

    return {"ok": True, "invoice": invoice_doc, "splits": splits}

# ─── Customer Reject Quote ───────────────────────────────────────
@router.post("/{quote_id}/reject")
async def reject_quote(quote_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    reason = payload.get("reason", "")
    await db.quotes.update_one({"id": quote_id}, {"$set": {
        "status": "rejected", "rejection_reason": reason, "rejected_at": _now(), "updated_at": _now(),
    }})

    if quote.get("assigned_sales_id"):
        await _notify(db, recipient_user_id=quote["assigned_sales_id"], title="Quote Rejected",
            message=f"Quote {quote.get('quote_number', '')} was rejected by customer. Reason: {reason or 'No reason given'}",
            target_url="/admin/crm", priority="high")

    return {"ok": True}

# ─── Get Quote Detail ────────────────────────────────────────────
@router.get("/{quote_id}")
async def get_quote_detail(quote_id: str, request: Request):
    db = request.app.mongodb
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    quote = _clean(quote)
    splits = [_clean(s) for s in await db.invoice_splits.find({"invoice_id": quote.get("invoice_id")}).to_list(10)]
    return {"quote": quote, "splits": splits}

# ─── Get Invoice Splits ──────────────────────────────────────────
@router.get("/invoice/{invoice_id}/splits")
async def get_invoice_splits(invoice_id: str, request: Request):
    db = request.app.mongodb
    splits = [_clean(s) for s in await db.invoice_splits.find({"invoice_id": invoice_id}).to_list(10)]
    return splits

# ─── Customer: My Quotes ─────────────────────────────────────────
@router.get("/customer/{customer_id}/quotes")
async def customer_quotes(customer_id: str, request: Request):
    db = request.app.mongodb
    quotes = await db.quotes.find({"customer_id": customer_id}).sort("created_at", -1).to_list(100)
    return [_clean(q) for q in quotes]
