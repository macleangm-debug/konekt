from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException
from referral_commission_governance_routes import create_commissions_for_order

router = APIRouter(prefix="/api/admin-flow-fixes", tags=["Admin Flow Fixes"])

def _money(v):
    return round(float(v or 0), 2)

def _now():
    return datetime.now(timezone.utc).isoformat()

@router.post("/promo/request-customization-quote")
async def request_promo_customization_quote(payload: dict, request: Request):
    db = request.app.mongodb
    customer_id = payload.get("customer_id")
    item_id = payload.get("item_id")
    if not customer_id or not item_id:
        raise HTTPException(status_code=400, detail="customer_id and item_id required")
    now = _now()
    lead = {
        "id": str(uuid4()),
        "customer_id": customer_id,
        "type": "promotional_material_customization",
        "item_id": item_id,
        "item_name": payload.get("item_name", "Promotional Item"),
        "selected_color": payload.get("selected_color"),
        "selected_size": payload.get("selected_size"),
        "blank_unit_price": _money(payload.get("blank_unit_price", 0)),
        "quantity": int(payload.get("quantity", 1) or 1),
        "customization_brief": payload.get("customization_brief", ""),
        "status": "new",
        "created_at": now,
    }
    await db.leads.insert_one(lead)
    lead.pop("_id", None)
    return {"ok": True, "lead": lead}

@router.post("/leads/update-status")
async def update_lead_status(payload: dict, request: Request):
    db = request.app.mongodb
    lead_id = payload.get("lead_id")
    new_status = payload.get("status")
    if not lead_id or not new_status:
        raise HTTPException(status_code=400, detail="lead_id and status required")
    result = await db.leads.update_one({"id": lead_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"ok": True}

@router.get("/finance/queue")
async def finance_queue(request: Request, q: str = ""):
    db = request.app.mongodb
    proofs = await db.payment_proofs.find({}).sort("created_at", -1).to_list(length=500)
    rows = []
    q_lower = (q or "").strip().lower()
    for proof in proofs:
        proof.pop("_id", None)
        invoice = await db.invoices.find_one({"id": proof.get("invoice_id")}) or {}
        customer_id = proof.get("customer_id") or invoice.get("customer_id")
        customer = await db.customer_profiles.find_one({"customer_id": customer_id}) or {}
        customer_name = customer.get("contact_name") or customer.get("business_name") or customer_id or "Customer"
        payment = await db.payments.find_one({"id": proof.get("payment_id")}) or {}
        row = {
            "payment_proof_id": proof.get("id"),
            "payment_id": proof.get("payment_id"),
            "invoice_id": proof.get("invoice_id"),
            "invoice_number": invoice.get("invoice_number", ""),
            "customer_id": customer_id,
            "customer_name": customer_name,
            "payer_name": proof.get("payer_name", ""),
            "amount_paid": proof.get("amount_paid", 0),
            "amount_due": payment.get("amount_due", invoice.get("total_amount", 0)),
            "total_invoice": invoice.get("total_amount", 0),
            "payment_mode": payment.get("payment_mode", "full"),
            "file_url": proof.get("file_url", ""),
            "status": proof.get("status", ""),
            "items": invoice.get("items", []),
            "created_at": str(proof.get("created_at", "")),
        }
        hay = " ".join([str(row.get("customer_name", "")), str(row.get("invoice_number", "")), str(row.get("payer_name", ""))]).lower()
        if q_lower and q_lower not in hay:
            continue
        rows.append(row)
    return rows

@router.post("/finance/approve-proof")
async def finance_approve_proof(payload: dict, request: Request):
    db = request.app.mongodb
    payment_proof_id = payload.get("payment_proof_id")
    approver_role = payload.get("approver_role", "finance")
    if approver_role not in ["finance", "admin"]:
        raise HTTPException(status_code=403, detail="Only finance/admin can approve")
    proof = await db.payment_proofs.find_one({"id": payment_proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    invoice = await db.invoices.find_one({"id": proof.get("invoice_id")})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    now = _now()
    await db.payment_proofs.update_one({"id": payment_proof_id}, {"$set": {
        "status": "approved", "approved_at": now, "approved_by_role": approver_role,
    }})
    await db.payment_proof_submissions.update_one({"id": payment_proof_id}, {"$set": {
        "status": "approved", "approved_by": approver_role, "approved_at": now,
    }})
    await db.invoices.update_one({"id": invoice["id"]}, {"$set": {"status": "paid", "payment_status": "paid"}})
    existing_order = await db.orders.find_one({"invoice_id": invoice["id"]})
    order_doc = None
    if not existing_order:
        order_id = str(uuid4())
        ts = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')

        # Auto-resolve vendor_ids from product owners if not explicit
        vendor_ids = invoice.get("vendor_ids") or []
        if not vendor_ids:
            for item in invoice.get("items", []):
                vid = item.get("vendor_id")
                if vid and vid not in vendor_ids:
                    vendor_ids.append(vid)

        # Auto-resolve sales assignment
        assigned_sales_id = payload.get("assigned_sales_id")
        assigned_sales_name = "Unassigned"
        if not assigned_sales_id:
            # Try to find an available sales person via round-robin
            sales_users = await db.users.find({"role": "sales", "is_active": True}, {"_id": 0, "id": 1, "full_name": 1}).to_list(50)
            if sales_users:
                # Simple round-robin: pick the one with fewest active assignments
                best = None
                best_count = float("inf")
                for su in sales_users:
                    cnt = await db.sales_assignments.count_documents({"sales_owner_id": su["id"], "status": "active_followup"})
                    if cnt < best_count:
                        best_count = cnt
                        best = su
                if best:
                    assigned_sales_id = best["id"]
                    assigned_sales_name = best.get("full_name", "Sales")
        else:
            su = await db.users.find_one({"id": assigned_sales_id}, {"_id": 0, "full_name": 1})
            if su:
                assigned_sales_name = su.get("full_name", "Sales")

        order_doc = {
            "id": order_id,
            "order_number": f"KON-ORD-{ts}",
            "invoice_id": invoice.get("id"),
            "checkout_id": invoice.get("checkout_id"),
            "quote_id": invoice.get("quote_id"),
            "customer_id": invoice.get("customer_id"),
            "user_id": invoice.get("customer_id"),
            "customer_name": invoice.get("customer_name") or "",
            "customer_email": invoice.get("customer_email") or "",
            "type": invoice.get("type", "product"),
            "status": "assigned",
            "current_status": "assigned",
            "payment_status": "paid",
            "items": invoice.get("items", []),
            "subtotal_amount": invoice.get("subtotal_amount", 0),
            "vat_amount": invoice.get("vat_amount", 0),
            "total_amount": invoice.get("total_amount", 0),
            "total": invoice.get("total_amount", 0),
            "delivery": invoice.get("delivery", {}),
            "delivery_phone": (invoice.get("delivery") or {}).get("phone", ""),
            "vendor_ids": vendor_ids,
            "assigned_sales_id": assigned_sales_id,
            "created_at": now, "updated_at": now,
        }
        await db.orders.insert_one(order_doc)
        order_doc.pop("_id", None)

        # Sales assignment record
        await db.sales_assignments.insert_one({
            "id": str(uuid4()), "customer_id": invoice.get("customer_id"),
            "invoice_id": invoice.get("id"), "order_id": order_id,
            "sales_owner_id": assigned_sales_id, "sales_owner_name": assigned_sales_name,
            "status": "active_followup", "created_at": now,
        })

        # Sales notification
        if assigned_sales_id:
            await db.notifications.insert_one({
                "id": str(uuid4()), "recipient_user_id": assigned_sales_id,
                "recipient_role": "sales",
                "title": "New Order Assigned to You",
                "message": f"Order {order_doc['order_number']} has been assigned to you.",
                "type": "info", "is_read": False, "created_at": now,
            })

        # Create vendor orders + notifications for each vendor
        for vid in vendor_ids:
            vitems = [x for x in invoice.get("items", []) if x.get("vendor_id") == vid]
            vo_id = str(uuid4())
            await db.vendor_orders.insert_one({
                "id": vo_id, "vendor_id": vid, "order_id": order_id,
                "customer_id": invoice.get("customer_id"),
                "assigned_sales_id": assigned_sales_id,
                "status": "assigned", "items": vitems, "created_at": now,
            })
            await db.notifications.insert_one({
                "id": str(uuid4()), "target_type": "vendor", "target_id": vid,
                "recipient_role": "partner", "recipient_user_id": vid,
                "title": "New Order Assigned",
                "message": f"You have a new vendor order for order {order_doc['order_number']}",
                "type": "info", "is_read": False, "created_at": now,
            })

        # Customer notification
        customer_id = invoice.get("customer_id")
        if customer_id:
            await db.notifications.insert_one({
                "id": str(uuid4()), "recipient_user_id": customer_id,
                "recipient_role": "customer",
                "title": "Order Confirmed",
                "message": f"Your order {order_doc['order_number']} has been confirmed and is being processed.",
                "type": "success", "is_read": False, "created_at": now,
            })

        await db.order_events.insert_one({
            "id": str(uuid4()), "order_id": order_id,
            "customer_id": invoice.get("customer_id"),
            "event": "payment_approved_order_created", "created_at": now,
        })
        # Trigger non-margin-touching commissions after payment approval
        try:
            sales_assignment = await db.sales_assignments.find_one({"order_id": order_id})
            sales_owner_id = sales_assignment.get("sales_owner_id") if sales_assignment else payload.get("assigned_sales_id")
            await create_commissions_for_order(
                db, order_id=order_id, invoice_id=invoice.get("id"),
                customer_id=invoice.get("customer_id"),
                commissionable_base=float(invoice.get("total_amount", 0)),
                affiliate_id=invoice.get("affiliate_id"),
                promo_code=invoice.get("promo_code"),
                sales_owner_id=sales_owner_id,
            )
        except Exception:
            pass  # Commission creation should not block order approval
    return {"ok": True, "order": order_doc}

@router.post("/finance/reject-proof")
async def finance_reject_proof(payload: dict, request: Request):
    db = request.app.mongodb
    payment_proof_id = payload.get("payment_proof_id")
    approver_role = payload.get("approver_role", "finance")
    reason = payload.get("reason", "")
    if approver_role not in ["finance", "admin"]:
        raise HTTPException(status_code=403, detail="Only finance/admin can reject")
    proof = await db.payment_proofs.find_one({"id": payment_proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    now = _now()
    await db.payment_proofs.update_one({"id": payment_proof_id}, {"$set": {
        "status": "rejected", "rejected_by_role": approver_role, "rejection_reason": reason, "rejected_at": now,
    }})
    await db.invoices.update_one({"id": proof.get("invoice_id")}, {"$set": {
        "payment_status": "proof_rejected", "status": "pending_payment",
    }})
    return {"ok": True}

@router.get("/admin/orders-split")
async def admin_orders_split(request: Request, q: str = ""):
    db = request.app.mongodb
    orders = await db.orders.find({}).sort("created_at", -1).to_list(length=500)
    rows = []
    q_lower = (q or "").strip().lower()
    for order in orders:
        order.pop("_id", None)
        customer = await db.customer_profiles.find_one({"customer_id": order.get("customer_id")}) or {}
        customer_name = customer.get("contact_name") or customer.get("business_name") or order.get("customer_id") or "Customer"
        invoice = await db.invoices.find_one({"id": order.get("invoice_id")}) or {}
        row = {
            "id": order.get("id"),
            "order_number": order.get("order_number", ""),
            "customer_name": customer_name,
            "customer_id": order.get("customer_id"),
            "status": order.get("status", ""),
            "payment_status": order.get("payment_status", ""),
            "total_amount": order.get("total_amount", 0),
            "invoice_number": invoice.get("invoice_number", ""),
            "items": order.get("items", []),
            "delivery": order.get("delivery", {}),
            "created_at": str(order.get("created_at", "")),
        }
        hay = " ".join([row["order_number"], row["customer_name"], row["invoice_number"]]).lower()
        if q_lower and q_lower not in hay:
            continue
        rows.append(row)
    return rows

@router.get("/sales/service-leads")
async def sales_service_leads(request: Request, q: str = ""):
    db = request.app.mongodb
    leads = await db.leads.find({"type": {"$in": [
        "service_request", "promotional_material_customization",
    ]}}).sort("created_at", -1).to_list(length=500)
    service_reqs = await db.service_requests.find({}).sort("created_at", -1).to_list(length=500)
    rows = []
    q_lower = (q or "").strip().lower()
    for row in leads:
        row.pop("_id", None)
        customer = await db.customer_profiles.find_one({"customer_id": row.get("customer_id")}) or {}
        customer_name = customer.get("contact_name") or customer.get("business_name") or row.get("customer_id") or "Customer"
        item = {
            "id": row.get("id"),
            "customer_name": customer_name,
            "lead_type": row.get("type", "").replace("_", " ").title(),
            "title": row.get("item_name") or row.get("service_name") or "Lead",
            "status": row.get("status", "new"),
            "created_at": str(row.get("created_at", "")),
            "source": "leads",
        }
        hay = " ".join([item["customer_name"], item["title"], item["status"]]).lower()
        if q_lower and q_lower not in hay:
            continue
        rows.append(item)
    for sr in service_reqs:
        sr.pop("_id", None)
        cname = sr.get("customer_name") or sr.get("contact_name") or sr.get("customer_id") or "Customer"
        item = {
            "id": sr.get("id"),
            "customer_name": cname,
            "lead_type": "Service Request",
            "title": sr.get("service_name") or sr.get("service_key") or "Service",
            "status": sr.get("status", "new"),
            "created_at": str(sr.get("created_at", "")),
            "source": "service_requests",
        }
        hay = " ".join([item["customer_name"], item["title"], item["status"]]).lower()
        if q_lower and q_lower not in hay:
            continue
        rows.append(item)
    rows.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return rows
