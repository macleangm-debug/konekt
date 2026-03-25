from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/payments-governance", tags=["Payments Governance"])

def _money(v):
    return round(float(v or 0), 2)

def _now():
    return datetime.now(timezone.utc).isoformat()

def _stamp():
    return datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')

# ─── Quote Accept → Invoice ────────────────────────────────────
@router.post("/quote/accept")
async def accept_quote_create_invoice(payload: dict, request: Request):
    db = request.app.mongodb
    quote_id = payload.get("quote_id")
    if not quote_id:
        raise HTTPException(status_code=400, detail="quote_id is required")
    accepted_by_role = payload.get("accepted_by_role", "customer")
    if accepted_by_role not in ["customer", "sales"]:
        raise HTTPException(status_code=400, detail="accepted_by_role must be customer or sales")
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    now = _now()
    invoice_id = str(uuid4())
    total = _money(quote.get("total_amount", 0))
    invoice = {
        "id": invoice_id,
        "invoice_number": f"KON-INV-{_stamp()}",
        "customer_id": quote.get("customer_id"),
        "user_id": quote.get("customer_id"),
        "quote_id": quote_id,
        "status": "pending_payment",
        "payment_status": "pending",
        "type": quote.get("type", "service"),
        "items": quote.get("items", []),
        "subtotal_amount": _money(quote.get("subtotal_amount", total)),
        "vat_amount": _money(quote.get("vat_amount", 0)),
        "total_amount": total,
        "total": total,
        "amount_due": total,
        "quote_details": quote.get("quote_details", {}),
        "created_at": now,
    }
    await db.invoices.insert_one(invoice)
    invoice.pop("_id", None)
    await db.quotes.update_one({"id": quote_id}, {"$set": {
        "status": "approved",
        "invoice_id": invoice_id,
        "accepted_by_role": accepted_by_role,
        "approved_at": now,
    }})
    return {"ok": True, "invoice": invoice}

# ─── Fixed-Price Product Checkout → Invoice (no order yet) ─────


async def _create_notification(db, *, recipient_user_id=None, recipient_role=None, title='', message='', target_url='/', priority='normal'):
    doc = {
        'id': str(uuid4()),
        'recipient_user_id': recipient_user_id,
        'recipient_role': recipient_role,
        'title': title,
        'message': message,
        'target_url': target_url,
        'priority': priority,
        'is_read': False,
        'created_at': _now(),
        'updated_at': _now(),
    }
    await db.notifications.insert_one(doc)
    return doc

@router.post("/product-checkout")
async def product_checkout_to_invoice(payload: dict, request: Request):
    db = request.app.mongodb
    customer_id = payload.get("customer_id")
    items = payload.get("items", [])
    delivery = payload.get("delivery", {})
    quote_details = payload.get("quote_details", {})
    if not customer_id or not items:
        raise HTTPException(status_code=400, detail="customer_id and items required")
    normalized, vendor_ids, subtotal = [], set(), 0
    for item in items:
        qty = max(1, int(item.get("quantity", 1) or 1))
        price = _money(item.get("price", 0))
        line_total = _money(qty * price)
        subtotal += line_total
        normalized.append({
            "product_id": item.get("id"),
            "name": item.get("name", "Product"),
            "quantity": qty,
            "unit_price": price,
            "line_total": line_total,
            "vendor_id": item.get("vendor_id"),
        })
        if item.get("vendor_id"):
            vendor_ids.add(item["vendor_id"])
    vat_pct = float(payload.get("vat_percent", 18) or 18)
    vat = _money(subtotal * vat_pct / 100.0)
    total = _money(subtotal + vat)
    now = _now()
    invoice_id = str(uuid4())
    checkout_id = str(uuid4())
    checkout_doc = {
        "id": checkout_id, "customer_id": customer_id, "type": "product",
        "status": "awaiting_payment", "items": normalized,
        "subtotal_amount": subtotal, "vat_amount": vat, "total_amount": total,
        "delivery": delivery, "quote_details": quote_details,
        "vendor_ids": list(vendor_ids), "created_at": now,
    }
    invoice_doc = {
        "id": invoice_id, "invoice_number": f"KON-INV-{_stamp()}",
        "customer_id": customer_id, "user_id": customer_id,
        "checkout_id": checkout_id,
        "status": "pending_payment", "payment_status": "pending",
        "type": "product",
        "items": normalized, "subtotal_amount": subtotal,
        "vat_amount": vat, "total_amount": total, "total": total,
        "amount_due": total,
        "delivery": delivery, "quote_details": quote_details,
        "vendor_ids": list(vendor_ids),
        "created_at": now,
    }
    await db.product_checkouts.insert_one(checkout_doc)
    checkout_doc.pop("_id", None)
    await db.invoices.insert_one(invoice_doc)
    invoice_doc.pop("_id", None)
    return {"ok": True, "checkout": checkout_doc, "invoice": invoice_doc}

# ─── Payment Intent (full or deposit) ──────────────────────────
@router.post("/invoice/payment-intent")
async def create_payment_intent(payload: dict, request: Request):
    db = request.app.mongodb
    invoice_id = payload.get("invoice_id")
    payment_mode = payload.get("payment_mode", "full")
    deposit_percent = float(payload.get("deposit_percent", 0) or 0)
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    total = _money(invoice.get("total_amount", 0))
    if payment_mode == "deposit":
        if deposit_percent <= 0 or deposit_percent >= 100:
            raise HTTPException(status_code=400, detail="deposit_percent must be between 0 and 100")
        amount_due = _money(total * deposit_percent / 100.0)
    else:
        amount_due = total
    now = _now()
    payment_id = str(uuid4())
    payment = {
        "id": payment_id, "invoice_id": invoice_id,
        "customer_id": invoice.get("customer_id"),
        "status": "awaiting_payment_proof", "review_status": "pending",
        "payment_mode": payment_mode,
        "deposit_percent": deposit_percent if payment_mode == "deposit" else None,
        "amount_due": amount_due, "total_invoice_amount": total,
        "created_at": now,
    }
    await db.payments.insert_one(payment)
    payment.pop("_id", None)
    await db.invoices.update_one({"id": invoice_id}, {"$set": {
        "payment_status": "awaiting_payment_proof",
        "current_payment_id": payment_id,
    }})
    return {"ok": True, "payment": payment}

# ─── Payment Proof Upload (no transaction reference) ───────────
@router.post("/payment-proof")
async def upload_payment_proof(payload: dict, request: Request):
    db = request.app.mongodb
    payment_id = payload.get("payment_id")
    payer_name = payload.get("payer_name", "")
    amount_paid = _money(payload.get("amount_paid", 0))
    file_url = payload.get("file_url", "")
    if not payment_id or amount_paid <= 0:
        raise HTTPException(status_code=400, detail="payment_id and amount_paid required")
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment intent not found")
    now = _now()
    proof_id = str(uuid4())
    proof = {
        "id": proof_id, "payment_id": payment_id,
        "invoice_id": payment.get("invoice_id"),
        "customer_id": payment.get("customer_id"),
        "payer_name": payer_name, "amount_paid": amount_paid,
        "file_url": file_url, "status": "uploaded",
        "visible_roles": ["sales", "finance", "admin"],
        "approvable_roles": ["finance", "admin"],
        "created_at": now,
    }
    await db.payment_proofs.insert_one(proof)
    proof.pop("_id", None)
    admin_proof = {
        **proof,
        "customer_email": payload.get("customer_email", ""),
        "payment_method": "bank_transfer",
        "payment_date": now,
        "invoice_number": "",
    }
    inv = await db.invoices.find_one({"id": payment.get("invoice_id")})
    if inv:
        admin_proof["invoice_number"] = inv.get("invoice_number", "")
    await db.payment_proof_submissions.insert_one(admin_proof)
    await db.payments.update_one({"id": payment_id}, {"$set": {
        "status": "proof_uploaded", "review_status": "under_review",
        "payment_proof_id": proof_id,
    }})
    await db.invoices.update_one({"id": payment.get("invoice_id")}, {"$set": {
        "payment_status": "payment_under_review",
        "status": "payment_under_review",
    }})
    await _create_notification(db, recipient_role='finance', title='New payment proof submitted', message=f'Invoice {payment.get("invoice_id")} is ready for review.', target_url='/admin/payments', priority='high')
    if payment.get('customer_id'):
        await _create_notification(db, recipient_user_id=payment.get('customer_id'), title='Payment submitted', message='Your payment proof has been submitted and is under review.', target_url='/dashboard/invoices', priority='normal')
    return {"ok": True, "payment_proof": proof}

# ─── Finance Queue ──────────────────────────────────────────────
@router.get("/finance/queue")
async def finance_queue(request: Request):
    db = request.app.mongodb
    proofs = await db.payment_proofs.find({"status": "uploaded"}).sort("created_at", -1).to_list(length=300)
    out = []
    for proof in proofs:
        proof.pop("_id", None)
        payment = await db.payments.find_one({"id": proof.get("payment_id")})
        invoice = await db.invoices.find_one({"id": proof.get("invoice_id")})
        profile = await db.customer_profiles.find_one({"customer_id": proof.get("customer_id")})
        out.append({
            "payment_proof_id": proof.get("id"),
            "payment_id": proof.get("payment_id"),
            "invoice_id": proof.get("invoice_id"),
            "invoice_number": invoice.get("invoice_number", "") if invoice else "",
            "customer_id": proof.get("customer_id"),
            "customer_name": (profile or {}).get("contact_name", ""),
            "payer_name": proof.get("payer_name", ""),
            "amount_paid": proof.get("amount_paid", 0),
            "amount_due": (payment or {}).get("amount_due", 0),
            "total_invoice_amount": (payment or {}).get("total_invoice_amount", 0),
            "payment_mode": (payment or {}).get("payment_mode", ""),
            "file_url": proof.get("file_url", ""),
            "status": proof.get("status", ""),
            "items": (invoice or {}).get("items", []),
            "created_at": str(proof.get("created_at", "")),
        })
    return out

# ─── Finance Approve → Order Created ───────────────────────────
@router.post("/finance/approve")
async def finance_approve(payload: dict, request: Request):
    db = request.app.mongodb
    payment_proof_id = payload.get("payment_proof_id")
    approver_role = payload.get("approver_role")
    if approver_role not in ["finance", "admin"]:
        raise HTTPException(status_code=403, detail="Only finance/admin can approve")
    proof = await db.payment_proofs.find_one({"id": payment_proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    payment = await db.payments.find_one({"id": proof.get("payment_id")})
    invoice = await db.invoices.find_one({"id": proof.get("invoice_id")})
    if not payment or not invoice:
        raise HTTPException(status_code=404, detail="Related payment or invoice not found")
    now = _now()
    await db.payment_proofs.update_one({"id": payment_proof_id}, {"$set": {
        "status": "approved", "approved_by_role": approver_role, "approved_at": now,
    }})
    await db.payment_proof_submissions.update_one({"id": payment_proof_id}, {"$set": {
        "status": "approved", "approved_by": approver_role, "approved_at": now, "updated_at": now,
    }})
    await db.payments.update_one({"id": payment.get("id")}, {"$set": {
        "status": "approved", "review_status": "approved", "approved_at": now,
    }})
    invoice_total = _money(invoice.get("total_amount", 0))
    approved_paid = _money(proof.get("amount_paid", 0))
    fully_paid = approved_paid >= invoice_total
    await db.invoices.update_one({"id": invoice.get("id")}, {"$set": {
        "status": "paid" if fully_paid else "partially_paid",
        "payment_status": "paid" if fully_paid else "partially_paid",
    }})
    order_doc = None
    if fully_paid:
        order_id = str(uuid4())
        order_doc = {
            "id": order_id,
            "order_number": f"KON-ORD-{_stamp()}",
            "invoice_id": invoice.get("id"),
            "checkout_id": invoice.get("checkout_id"),
            "quote_id": invoice.get("quote_id"),
            "customer_id": invoice.get("customer_id"),
            "user_id": invoice.get("customer_id"),
            "customer_name": invoice.get("customer_name", ""),
            "customer_email": invoice.get("customer_email", ""),
            "type": invoice.get("type", "product"),
            "status": "processing",
            "current_status": "processing",
            "payment_status": "paid",
            "items": invoice.get("items", []),
            "subtotal_amount": invoice.get("subtotal_amount", 0),
            "vat_amount": invoice.get("vat_amount", 0),
            "total_amount": invoice_total,
            "total": invoice_total,
            "delivery": invoice.get("delivery", {}),
            "delivery_phone": (invoice.get("delivery") or {}).get("phone", ""),
            "vendor_ids": invoice.get("vendor_ids", []),
            "created_at": now, "updated_at": now,
        }
        await db.orders.insert_one(order_doc)
        order_doc.pop("_id", None)
        assigned_sales_id = payload.get("assigned_sales_id") or "auto-sales"
        assigned_sales_name = payload.get("assigned_sales_name") or "Assigned Sales"
        sa = {
            "id": str(uuid4()), "customer_id": invoice.get("customer_id"),
            "invoice_id": invoice.get("id"), "order_id": order_id,
            "sales_owner_id": assigned_sales_id,
            "sales_owner_name": assigned_sales_name,
            "status": "active_followup", "created_at": now,
        }
        await db.sales_assignments.insert_one(sa)
        # Update order with sales reference
        await db.orders.update_one({"id": order_id}, {"$set": {"sales_id": assigned_sales_id, "sales_name": assigned_sales_name}})
        vendor_ids = set()
        for item in invoice.get("items", []):
            if item.get("vendor_id"):
                vendor_ids.add(item["vendor_id"])
        for vid in vendor_ids:
            vitems = [x for x in invoice.get("items", []) if x.get("vendor_id") == vid]
            # Look up partner_id from partners collection for proper linkage
            partner_doc = await db.partner_users.find_one({"partner_id": vid}, {"_id": 0, "partner_id": 1})
            resolved_partner_id = partner_doc["partner_id"] if partner_doc else vid
            await db.vendor_orders.insert_one({
                "id": str(uuid4()), "vendor_id": vid, "partner_id": resolved_partner_id,
                "order_id": order_id, "order_number": order_doc.get("order_number"),
                "customer_id": invoice.get("customer_id"),
                "status": "ready_to_fulfill", "items": vitems, "created_at": now,
            })
        await db.order_events.insert_one({
            "id": str(uuid4()), "order_id": order_id,
            "customer_id": invoice.get("customer_id"),
            "event": "payment_approved_order_created", "created_at": now,
        })
        if invoice.get('customer_id'):
            await _create_notification(db, recipient_user_id=invoice.get('customer_id'), title='Payment approved', message='Your payment has been approved and your order is now in progress.', target_url='/dashboard/orders', priority='high')
        await _create_notification(db, recipient_role='sales', title='New active order assigned', message=f'Order {order_doc.get("order_number")} is ready for follow-up.', target_url='/staff/queue', priority='high')
        await _create_notification(db, recipient_role='vendor', title='New vendor job released', message=f'Order {order_doc.get("order_number")} is ready to fulfill.', target_url='/partner/fulfillment', priority='high')
    return {"ok": True, "fully_paid": fully_paid, "order": order_doc}

# ─── Finance Reject ─────────────────────────────────────────────
@router.post("/finance/reject")
async def finance_reject(payload: dict, request: Request):
    db = request.app.mongodb
    payment_proof_id = payload.get("payment_proof_id")
    approver_role = payload.get("approver_role")
    reason = payload.get("reason", "")
    if approver_role not in ["finance", "admin"]:
        raise HTTPException(status_code=403, detail="Only finance/admin can reject")
    proof = await db.payment_proofs.find_one({"id": payment_proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    now = _now()
    await db.payment_proofs.update_one({"id": payment_proof_id}, {"$set": {
        "status": "rejected", "rejected_by_role": approver_role,
        "rejection_reason": reason, "rejected_at": now,
    }})
    await db.payment_proof_submissions.update_one({"id": payment_proof_id}, {"$set": {
        "status": "rejected", "rejection_reason": reason, "updated_at": now,
    }})
    await db.payments.update_one({"id": proof.get("payment_id")}, {"$set": {
        "status": "proof_rejected", "review_status": "rejected",
    }})
    await db.invoices.update_one({"id": proof.get("invoice_id")}, {"$set": {
        "payment_status": "proof_rejected", "status": "pending_payment",
    }})
    if proof.get('customer_id'):
        await _create_notification(db, recipient_user_id=proof.get('customer_id'), title='Payment rejected', message=reason or 'Your payment proof was rejected. Please review and resubmit.', target_url='/dashboard/invoices', priority='high')
    return {"ok": True}

# ─── Customer: My Invoices ──────────────────────────────────────
@router.get("/customer/invoices")
async def customer_invoices(request: Request, customer_id: str):
    db = request.app.mongodb
    invoices = await db.invoices.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)
    out = []
    for inv in invoices:
        inv.pop("_id", None)
        out.append(inv)
    return out

# ─── Customer: My Payments ──────────────────────────────────────
@router.get("/customer/payments")
async def customer_payments(request: Request, customer_id: str):
    db = request.app.mongodb
    payments = await db.payments.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)
    for p in payments:
        p.pop("_id", None)
    return payments
