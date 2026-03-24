from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException

profile_router = APIRouter(prefix="/api/customer-account", tags=["Customer Account"])
flow_router = APIRouter(prefix="/api/commercial-flow", tags=["Commercial Flow"])

PHONE_PREFIXES = ["+255", "+254", "+256", "+250", "+257"]
DEFAULT_PROFILE = {
    "account_type": "personal",
    "contact_name": "",
    "phone_prefix": "+255",
    "phone": "",
    "email": "",
    "business_name": "",
    "tin": "",
    "vat_number": "",
    "quote_client_name": "",
    "quote_client_phone_prefix": "+255",
    "quote_client_phone": "",
    "quote_client_email": "",
    "quote_client_tin": "",
    "delivery_addresses": [],
    "default_delivery_address_id": "",
}

def _sanitize_profile(value: dict):
    out = {**DEFAULT_PROFILE, **(value or {})}
    addresses = (out.get("delivery_addresses") or [])[:3]
    clean = []
    for a in addresses:
        clean.append({
            "id": a.get("id") or str(uuid4()),
            "label": a.get("label", "Address"),
            "recipient_name": a.get("recipient_name", ""),
            "phone_prefix": a.get("phone_prefix", "+255"),
            "phone": a.get("phone", ""),
            "address_line": a.get("address_line", ""),
            "city": a.get("city", ""),
            "region": a.get("region", ""),
            "is_default": bool(a.get("is_default", False)),
        })
    out["delivery_addresses"] = clean
    if not out.get("default_delivery_address_id") and clean:
        out["default_delivery_address_id"] = clean[0]["id"]
    return out

@profile_router.get("/profile")
async def get_profile(request: Request, customer_id: str):
    db = request.app.mongodb
    row = await db.customer_profiles.find_one({"customer_id": customer_id})
    data = _sanitize_profile(row or {})
    data["customer_id"] = customer_id
    data["phone_prefix_options"] = PHONE_PREFIXES
    data.pop("_id", None)
    return data

@profile_router.put("/profile")
async def save_profile(payload: dict, request: Request):
    db = request.app.mongodb
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required")
    value = _sanitize_profile(payload)
    value["customer_id"] = customer_id
    value["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.customer_profiles.update_one({"customer_id": customer_id}, {"$set": value}, upsert=True)
    return {"ok": True, "value": value}

@profile_router.get("/prefill")
async def prefill(request: Request, customer_id: str):
    db = request.app.mongodb
    row = await db.customer_profiles.find_one({"customer_id": customer_id})
    data = _sanitize_profile(row or {})
    data.pop("_id", None)
    data["phone_prefix_options"] = PHONE_PREFIXES
    return data

def _money(v):
    return round(float(v or 0), 2)

def _status_label_map(status: str):
    mapping = {
        "pending": "Awaiting Your Approval",
        "pending_payment": "Unpaid",
        "payment_proof_uploaded": "Payment Under Review",
        "payment_under_review": "Payment Under Review",
        "paid": "Paid",
        "approved": "Accepted",
        "processing": "Processing",
        "ready_to_fulfill": "Ready to Fulfill",
        "pending_payment_confirmation": "Unpaid",
    }
    return mapping.get(status, status.replace("_", " ").title())

@flow_router.post("/create-product-checkout")
async def create_product_checkout(payload: dict, request: Request):
    db = request.app.mongodb
    customer_id = payload.get("customer_id")
    items = payload.get("items", [])
    delivery = payload.get("delivery", {})
    quote_details = payload.get("quote_details", {})
    if not customer_id or not items:
        raise HTTPException(status_code=400, detail="customer_id and items are required")
    normalized_items, vendor_ids, subtotal = [], set(), 0
    for item in items:
        qty = max(1, int(item.get("quantity", 1) or 1))
        price = _money(item.get("price", 0))
        line_total = _money(qty * price)
        subtotal += line_total
        normalized_items.append({
            "product_id": item.get("id"),
            "name": item.get("name", "Product"),
            "quantity": qty,
            "unit_price": price,
            "line_total": line_total,
            "vendor_id": item.get("vendor_id"),
        })
        if item.get("vendor_id"):
            vendor_ids.add(item["vendor_id"])
    vat_percent = float(payload.get("vat_percent", 18) or 18)
    vat_amount = _money(subtotal * vat_percent / 100.0)
    total_amount = _money(subtotal + vat_amount)
    now = datetime.now(timezone.utc).isoformat()
    ts_stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    checkout_id, invoice_id, order_id = str(uuid4()), str(uuid4()), str(uuid4())
    assigned_sales_id = payload.get("assigned_sales_id") or "auto-sales"
    assigned_sales_name = payload.get("assigned_sales_name") or "Assigned Sales"
    checkout_doc = {
        "id": checkout_id, "customer_id": customer_id, "type": "product",
        "status": "awaiting_payment", "items": normalized_items,
        "subtotal_amount": subtotal, "vat_amount": vat_amount, "total_amount": total_amount,
        "delivery": delivery, "quote_details": quote_details,
        "assigned_sales_id": assigned_sales_id, "assigned_sales_name": assigned_sales_name,
        "created_at": now,
    }
    invoice_doc = {
        "id": invoice_id, "invoice_number": f"KON-INV-{ts_stamp}",
        "customer_id": customer_id, "user_id": customer_id,
        "checkout_id": checkout_id,
        "status": "pending_payment", "payment_status": "pending", "type": "product",
        "items": normalized_items, "subtotal_amount": subtotal,
        "vat_amount": vat_amount, "total_amount": total_amount, "total": total_amount,
        "quote_details": quote_details, "created_at": now,
    }
    order_doc = {
        "id": order_id, "order_number": f"KON-ORD-{ts_stamp}",
        "customer_id": customer_id, "user_id": customer_id,
        "invoice_id": invoice_id, "checkout_id": checkout_id,
        "assigned_sales_id": assigned_sales_id, "assigned_sales_name": assigned_sales_name,
        "status": "pending_payment_confirmation",
        "current_status": "pending_payment",
        "type": "product",
        "items": normalized_items, "subtotal_amount": subtotal,
        "vat_amount": vat_amount, "total_amount": total_amount, "total": total_amount,
        "delivery": delivery,
        "delivery_phone": delivery.get("phone", ""),
        "vendor_ids": list(vendor_ids),
        "created_at": now, "updated_at": now,
    }
    await db.product_checkouts.insert_one(checkout_doc)
    checkout_doc.pop("_id", None)
    await db.invoices.insert_one(invoice_doc)
    invoice_doc.pop("_id", None)
    await db.orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    for vendor_id in vendor_ids:
        vendor_items = [x for x in normalized_items if x.get("vendor_id") == vendor_id]
        vdoc = {
            "id": str(uuid4()), "vendor_id": vendor_id, "order_id": order_id,
            "customer_id": customer_id, "status": "pending_payment_confirmation",
            "items": vendor_items, "assigned_sales_id": assigned_sales_id,
            "created_at": now,
        }
        await db.vendor_orders.insert_one(vdoc)
    sdoc = {
        "id": str(uuid4()), "customer_id": customer_id, "order_id": order_id,
        "invoice_id": invoice_id, "sales_owner_id": assigned_sales_id,
        "sales_owner_name": assigned_sales_name, "status": "active_followup",
        "created_at": now,
    }
    await db.sales_assignments.insert_one(sdoc)
    edoc = {
        "id": str(uuid4()), "order_id": order_id, "customer_id": customer_id,
        "event": "checkout_created", "created_at": now,
    }
    await db.order_events.insert_one(edoc)
    return {"ok": True, "checkout": checkout_doc, "invoice": invoice_doc, "order": order_doc}

@flow_router.post("/payment-proof")
async def upload_payment_proof(payload: dict, request: Request):
    db = request.app.mongodb
    invoice_id = payload.get("invoice_id")
    customer_id = payload.get("customer_id")
    amount_paid = _money(payload.get("amount_paid", 0))
    if not invoice_id or not customer_id or amount_paid <= 0:
        raise HTTPException(status_code=400, detail="invoice_id, customer_id, amount_paid required")
    now = datetime.now(timezone.utc).isoformat()
    proof_id = str(uuid4())
    doc = {
        "id": proof_id, "invoice_id": invoice_id, "customer_id": customer_id,
        "payer_name": payload.get("payer_name", ""),
        "reference_number": payload.get("reference_number", ""),
        "amount_paid": amount_paid, "file_url": payload.get("file_url", ""),
        "status": "uploaded",
        "visible_to_roles": ["admin", "finance", "sales"],
        "approvable_roles": ["admin", "finance"],
        "created_at": now,
    }
    await db.payment_proofs.insert_one(doc)
    doc.pop("_id", None)
    admin_proof = {
        **doc,
        "customer_email": payload.get("customer_email", ""),
        "payment_method": "bank_transfer",
        "payment_date": now,
        "invoice_number": "",
    }
    inv = await db.invoices.find_one({"id": invoice_id})
    if inv:
        admin_proof["invoice_number"] = inv.get("invoice_number", "")
        admin_proof["invoice_id"] = invoice_id
    await db.payment_proof_submissions.insert_one(admin_proof)
    admin_proof.pop("_id", None)
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {"payment_status": "proof_uploaded", "status": "payment_proof_uploaded"}}
    )
    order = await db.orders.find_one({"invoice_id": invoice_id})
    if order:
        await db.orders.update_one({"id": order["id"]}, {"$set": {"status": "payment_under_review", "current_status": "payment_proof_submitted"}})
    return {"ok": True, "payment_proof": doc}

@flow_router.post("/payment-proof/approve")
async def approve_payment_proof(payload: dict, request: Request):
    db = request.app.mongodb
    proof_id = payload.get("payment_proof_id")
    approver_role = payload.get("approver_role")
    if approver_role not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only admin and finance can approve payment proof")
    proof = await db.payment_proofs.find_one({"id": proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.payment_proofs.update_one(
        {"id": proof_id},
        {"$set": {"status": "approved", "approved_at": now, "approved_by_role": approver_role}}
    )
    await db.payment_proof_submissions.update_one(
        {"id": proof_id},
        {"$set": {"status": "approved", "approved_at": now, "approved_by": approver_role, "updated_at": now}}
    )
    await db.invoices.update_one(
        {"id": proof["invoice_id"]},
        {"$set": {"status": "paid", "payment_status": "paid"}}
    )
    order = await db.orders.find_one({"invoice_id": proof["invoice_id"]})
    if order:
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {"status": "processing", "current_status": "processing", "payment_status": "paid"}}
        )
        await db.vendor_orders.update_many(
            {"order_id": order["id"]},
            {"$set": {"status": "ready_to_fulfill"}}
        )
        await db.order_events.insert_one({
            "id": str(uuid4()), "order_id": order["id"],
            "customer_id": order["customer_id"],
            "event": "payment_approved", "created_at": now,
        })
    return {"ok": True}

@flow_router.post("/quote/accept-and-create-invoice")
async def accept_quote_and_create_invoice(payload: dict, request: Request):
    db = request.app.mongodb
    quote_id = payload.get("quote_id")
    payment_type = payload.get("payment_type", "full")
    if not quote_id:
        raise HTTPException(status_code=400, detail="quote_id required")
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    now = datetime.now(timezone.utc).isoformat()
    ts_stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    total = _money(quote.get("total_amount", 0))
    subtotal = _money(quote.get("subtotal_amount", total))
    vat = _money(quote.get("vat_amount", 0))
    if payment_type == "deposit":
        deposit_pct = float(payload.get("deposit_percent", 50))
        deposit_amount = _money(total * deposit_pct / 100.0)
        invoice_id = str(uuid4())
        invoice_doc = {
            "id": invoice_id,
            "invoice_number": f"KON-INV-{ts_stamp}-DEP",
            "customer_id": quote.get("customer_id"),
            "quote_id": quote_id,
            "type": quote.get("type", "service"),
            "invoice_type": "deposit",
            "status": "pending_payment",
            "payment_status": "pending",
            "items": quote.get("items", []),
            "subtotal_amount": subtotal,
            "vat_amount": vat,
            "total_amount": total,
            "amount_due": deposit_amount,
            "deposit_percent": deposit_pct,
            "quote_details": quote.get("quote_details", {}),
            "created_at": now,
        }
        await db.invoices.insert_one(invoice_doc)
        invoice_doc.pop("_id", None)
        await db.quotes.update_one(
            {"id": quote_id},
            {"$set": {
                "status": "approved",
                "invoice_id": invoice_id,
                "payment_type": "deposit",
                "approved_at": now,
            }}
        )
        return {"ok": True, "invoice": invoice_doc, "payment_type": "deposit"}
    else:
        invoice_id = str(uuid4())
        invoice_doc = {
            "id": invoice_id,
            "invoice_number": f"KON-INV-{ts_stamp}",
            "customer_id": quote.get("customer_id"),
            "quote_id": quote_id,
            "type": quote.get("type", "service"),
            "invoice_type": "full",
            "status": "pending_payment",
            "payment_status": "pending",
            "items": quote.get("items", []),
            "subtotal_amount": subtotal,
            "vat_amount": vat,
            "total_amount": total,
            "amount_due": total,
            "quote_details": quote.get("quote_details", {}),
            "created_at": now,
        }
        await db.invoices.insert_one(invoice_doc)
        invoice_doc.pop("_id", None)
        await db.quotes.update_one(
            {"id": quote_id},
            {"$set": {
                "status": "approved",
                "invoice_id": invoice_id,
                "payment_type": "full",
                "approved_at": now,
            }}
        )
        return {"ok": True, "invoice": invoice_doc, "payment_type": "full"}

@flow_router.get("/orders/split-view")
async def orders_split_view(request: Request, customer_id: str):
    db = request.app.mongodb
    orders = await db.orders.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)
    out = []
    for order in orders:
        oid = order.get("id")
        events = await db.order_events.find({"order_id": oid}).sort("created_at", 1).to_list(length=100)
        order["preview"] = {
            "status_label": _status_label_map(order.get("status", "")),
            "events": [
                {"event": e.get("event"), "created_at": str(e.get("created_at", ""))}
                for e in events
            ],
        }
        order.pop("_id", None)
        for e in events:
            e.pop("_id", None)
        out.append(order)
    return out

@flow_router.get("/invoices")
async def get_customer_invoices(request: Request, customer_id: str):
    db = request.app.mongodb
    invoices = await db.invoices.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)
    out = []
    for inv in invoices:
        inv.pop("_id", None)
        inv["status_label"] = _status_label_map(inv.get("status", ""))
        out.append(inv)
    return out

@flow_router.get("/payment-proofs")
async def get_payment_proofs(request: Request, invoice_id: str):
    db = request.app.mongodb
    proofs = await db.payment_proofs.find({"invoice_id": invoice_id}).sort("created_at", -1).to_list(length=50)
    for p in proofs:
        p.pop("_id", None)
    return proofs
