from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
import os

from fastapi import APIRouter, Query, Request, HTTPException

from core.live_commerce_service import LiveCommerceService

router = APIRouter(prefix="/api/admin", tags=["Admin Facade"])

def _now():
    return datetime.now(timezone.utc).isoformat()

def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        if "id" not in doc or not doc["id"]:
            doc["id"] = str(doc["_id"])
        doc.pop("_id", None)
    return doc

# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@router.get("/dashboard/summary")
async def dashboard_summary(request: Request):
    db = request.app.mongodb
    pending_payments = await db.payment_proofs.count_documents({"status": "uploaded"})
    open_quotes = await db.quotes.count_documents({"status": {"$in": ["pending", "sent", "quoting"]}})
    active_orders = await db.orders.count_documents({"status": {"$nin": ["completed", "cancelled", "delivered"]}})
    manual_released = await db.orders.count_documents({"release_type": "manual"})
    active_affiliates = await db.affiliates.count_documents({"status": "active"})
    new_referrals = await db.referral_events.count_documents({})
    total_customers = await db.users.count_documents({"role": {"$in": ["customer", "user"]}})
    return {
        "pending_payments": pending_payments,
        "open_quotes": open_quotes,
        "active_orders": active_orders,
        "manually_released_orders": manual_released,
        "active_affiliates": active_affiliates,
        "new_referrals": new_referrals,
        "total_customers": total_customers,
    }

@router.get("/dashboard/pending-actions")
async def dashboard_pending_actions(request: Request):
    db = request.app.mongodb
    proofs = await db.payment_proofs.find({"status": "uploaded"}).sort("created_at", -1).to_list(length=10)
    quotes = await db.quotes.find({"status": {"$in": ["pending", "sent"]}}).sort("created_at", -1).to_list(length=10)
    return {
        "pending_proofs": [_clean(p) for p in proofs],
        "pending_quotes": [_clean(q) for q in quotes],
    }

# ─── PAYMENTS ─────────────────────────────────────────────────────────────────

@router.get("/payments/queue")
async def payments_queue(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    service = LiveCommerceService(request.app.mongodb)
    all_proofs = await service.finance_queue(customer_query=search, status_filter=status if status and status != "all" else None)
    return all_proofs

@router.get("/payments/{payment_proof_id}")
async def payment_detail(payment_proof_id: str, request: Request):
    db = request.app.mongodb
    proof = await db.payment_proofs.find_one({"id": payment_proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    payment = await db.payments.find_one({"id": proof.get("payment_id")})
    invoice = await db.invoices.find_one({"id": proof.get("invoice_id")})

    # Enrich with customer contact details
    cust_id = proof.get("customer_id") or (invoice or {}).get("customer_id") or (invoice or {}).get("user_id")
    customer_contact = {}
    if cust_id:
        cust_user = await db.users.find_one(
            {"$or": [{"id": cust_id}, {"email": proof.get("customer_email")}]},
            {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "company_name": 1}
        )
        if cust_user:
            customer_contact = {
                "full_name": cust_user.get("full_name", ""),
                "email": cust_user.get("email", ""),
                "phone": cust_user.get("phone", ""),
                "company_name": cust_user.get("company_name", ""),
            }

    # Fetch approval history from audit_logs
    approval_history = []
    logs = await db.audit_logs.find({"target_id": payment_proof_id}).sort("created_at", 1).to_list(20)
    for log in logs:
        approval_history.append({
            "action": log.get("action", ""),
            "actor_role": log.get("actor_role", ""),
            "details": log.get("details", {}),
            "created_at": str(log.get("created_at", "")),
        })

    return {
        "proof": _clean(proof),
        "payment": _clean(payment),
        "invoice": _clean(invoice),
        "customer_contact": customer_contact,
        "approval_history": approval_history,
    }

@router.post("/payments/{payment_proof_id}/approve")
async def approve_payment(payment_proof_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    # Resolve real admin identity from Authorization header
    approver_name = payload.get("approver_role", "admin")
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            import jwt as pyjwt
            token_payload = pyjwt.decode(auth_header.split(" ", 1)[1], os.getenv("JWT_SECRET", "konekt-secret"), algorithms=["HS256"])
            admin_user = await db.users.find_one({"id": token_payload.get("user_id")}, {"_id": 0, "full_name": 1, "email": 1, "id": 1})
            if admin_user:
                approver_name = admin_user.get("full_name") or admin_user.get("email") or admin_user.get("id") or approver_name
        except Exception:
            pass

    service = LiveCommerceService(db)
    result = await service.approve_payment_proof(
        payment_proof_id=payment_proof_id,
        approver_role=approver_name,
        assigned_sales_id=payload.get("assigned_sales_id"),
        assigned_sales_name=payload.get("assigned_sales_name"),
    )
    # Write audit log
    await request.app.mongodb.audit_logs.insert_one({
        "id": str(uuid4()),
        "action": "payment_approved",
        "target_id": payment_proof_id,
        "actor_role": payload.get("approver_role", "admin"),
        "details": {"fully_paid": result.get("fully_paid"), "order_created": bool(result.get("order"))},
        "created_at": _now(),
    })
    return result

@router.post("/payments/{payment_proof_id}/reject")
async def reject_payment(payment_proof_id: str, payload: dict, request: Request):
    reason = payload.get("reason", "")
    if not reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    service = LiveCommerceService(request.app.mongodb)
    result = await service.reject_payment_proof(
        payment_proof_id=payment_proof_id,
        approver_role=payload.get("approver_role", "admin"),
        reason=reason,
    )
    await request.app.mongodb.audit_logs.insert_one({
        "id": str(uuid4()),
        "action": "payment_rejected",
        "target_id": payment_proof_id,
        "actor_role": payload.get("approver_role", "admin"),
        "details": {"reason": reason},
        "created_at": _now(),
    })
    return result

# ─── INVOICES ─────────────────────────────────────────────────────────────────

@router.get("/invoices/list")
async def invoices_list(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["$or"] = [{"status": status}, {"payment_status": status}]
    rows = await db.invoices.find(query).sort("created_at", -1).to_list(length=500)
    out = []
    for raw_inv in rows:
        oid_str = str(raw_inv["_id"]) if "_id" in raw_inv else None
        inv = _clean(raw_inv)
        if search:
            haystack = f"{inv.get('invoice_number','')} {inv.get('customer_name','')} {inv.get('customer_email','')}".lower()
            if search.lower() not in haystack:
                continue
        # Try proof lookup by UUID id first, then by ObjectId string
        inv_id = inv.get("id")
        proof = None
        if inv_id:
            proof = await db.payment_proofs.find_one({"invoice_id": inv_id}, sort=[("created_at", -1)])
        if not proof and oid_str:
            proof = await db.payment_proofs.find_one({"invoice_id": oid_str}, sort=[("created_at", -1)])
        if proof:
            proof = _clean(proof)
        inv["rejection_reason"] = (proof or {}).get("rejection_reason", "") if (proof or {}).get("status") == "rejected" else ""
        inv["source_type"] = "Quote" if inv.get("quote_id") else "Cart"
        # Payer name priority: invoice.payer_name → proof.payer_name (NEVER customer_name)
        payer = inv.get("payer_name") or ""
        if not payer and proof:
            payer = (proof or {}).get("payer_name") or ""
        inv["payer_name"] = payer or "-"
        # Enrich customer_name from users collection if missing
        if not inv.get("customer_name") or inv.get("customer_name") == "-":
            cid = inv.get("customer_id") or inv.get("user_id") or inv.get("customer_user_id")
            if cid:
                cust = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1})
                if cust and cust.get("full_name"):
                    inv["customer_name"] = cust["full_name"]
        # Payment status (use payment_status first, fallback to status)
        inv["payment_state"] = inv.get("payment_status") or inv.get("status") or "draft"
        # Invoice status
        inv["invoice_status"] = inv.get("status") or "draft"
        # Linked ref (quote or order short ref)
        linked_ref = "-"
        if inv.get("quote_id"):
            q = await db.quotes.find_one({"id": inv["quote_id"]}, {"_id": 0, "quote_number": 1})
            linked_ref = (q or {}).get("quote_number", inv["quote_id"][:12])
        elif inv.get("order_id"):
            o = await db.orders.find_one({"id": inv["order_id"]}, {"_id": 0, "order_number": 1})
            linked_ref = (o or {}).get("order_number", inv["order_id"][:12])
        inv["linked_ref"] = linked_ref
        out.append(inv)
    return out

@router.get("/invoices/{invoice_id}")
async def invoice_detail(invoice_id: str, request: Request):
    db = request.app.mongodb
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    payments = [_clean(p) for p in await db.payments.find({"invoice_id": invoice_id}).to_list(100)]
    proofs = [_clean(p) for p in await db.payment_proofs.find({"invoice_id": invoice_id}).to_list(100)]
    proof_submissions = [_clean(p) for p in await db.payment_proof_submissions.find({"invoice_id": invoice_id}).to_list(100)]
    order = await db.orders.find_one({"invoice_id": invoice_id})
    splits = [_clean(s) for s in await db.invoice_splits.find({"invoice_id": invoice_id}).to_list(10)]
    return {
        "invoice": _clean(invoice),
        "payments": payments,
        "proofs": proofs,
        "proof_submissions": proof_submissions,
        "order": _clean(order),
        "splits": splits,
    }

# ─── ORDERS ───────────────────────────────────────────────────────────────────

@router.get("/orders/list")
async def orders_list(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None), tab: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    if tab == "assigned":
        query["status"] = {"$in": ["assigned", "ready_to_fulfill", "processing"]}
    elif tab == "in_progress":
        query["status"] = {"$in": ["in_progress", "work_scheduled"]}
    elif tab == "completed":
        query["status"] = {"$in": ["completed", "delivered", "fulfilled"]}
    elif tab == "new":
        query["status"] = {"$in": ["new", "pending"]}

    rows = await db.orders.find(query).sort("created_at", -1).to_list(length=500)
    out = []
    for order in rows:
        order = _clean(order)
        if search:
            haystack = f"{order.get('order_number','')} {order.get('customer_name','')}".lower()
            if search.lower() not in haystack:
                continue
        # Vendor info
        vendor_orders = await db.vendor_orders.find({"order_id": order.get("id")}).to_list(20)
        order["vendor_count"] = len(vendor_orders)
        vendor_name = "-"
        if vendor_orders:
            vid = vendor_orders[0].get("vendor_id")
            if vid:
                vp = await db.partner_users.find_one({"partner_id": vid}, {"_id": 0, "name": 1, "company_name": 1})
                if vp:
                    vendor_name = vp.get("company_name") or vp.get("name") or vid[:12]
                else:
                    vendor_name = vid[:12]
        order["vendor_name"] = vendor_name
        # Sales assignment
        assignment = await db.sales_assignments.find_one({"order_id": order.get("id")})
        order["sales_owner"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        # Payment status
        order["payment_state"] = order.get("payment_status") or "paid"
        order["fulfillment_state"] = order.get("status") or "new"
        # Enrich customer_name from users collection if missing
        if not order.get("customer_name") or order.get("customer_name") == "-":
            cid = order.get("customer_id") or order.get("user_id")
            if cid:
                cust = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1})
                if cust and cust.get("full_name"):
                    order["customer_name"] = cust["full_name"]
        out.append(order)
    return out

@router.get("/orders/{order_id}")
async def order_detail(order_id: str, request: Request):
    from bson import ObjectId
    db = request.app.mongodb
    order = await db.orders.find_one({"id": order_id})
    if not order:
        try:
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
        except:
            pass
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order = _clean(order)

    # Invoice
    invoice = await db.invoices.find_one({"id": order.get("invoice_id")})
    invoice = _clean(invoice)

    # Vendor orders with vendor names
    raw_vendor_orders = await db.vendor_orders.find({"order_id": order_id}).to_list(50)
    vendor_orders = []
    for vo in raw_vendor_orders:
        vo = _clean(vo)
        vid = vo.get("vendor_id", "")
        vp = await db.partner_users.find_one({"partner_id": vid}, {"_id": 0, "name": 1, "company_name": 1, "phone": 1, "email": 1})
        vo["vendor_name"] = (vp or {}).get("company_name") or (vp or {}).get("name") or vid[:12]
        vo["vendor_phone"] = (vp or {}).get("phone", "")
        vo["vendor_email"] = (vp or {}).get("email", "")
        vendor_orders.append(vo)

    # Sales assignment
    assignment = await db.sales_assignments.find_one({"order_id": order_id})
    assignment = _clean(assignment)
    sales_user = None
    sales_id = (assignment or {}).get("sales_owner_id") or order.get("assigned_sales_id")
    if sales_id:
        sales_user = await db.users.find_one({"id": sales_id}, {"_id": 0, "full_name": 1, "phone": 1, "email": 1})

    # Customer info
    cust_id = order.get("customer_id") or order.get("user_id")
    customer = None
    if cust_id:
        customer = await db.users.find_one({"id": cust_id}, {"_id": 0, "full_name": 1, "email": 1, "phone": 1})

    # Events / timeline
    events = [_clean(e) for e in await db.order_events.find({"order_id": order_id}).sort("created_at", 1).to_list(100)]

    # Commissions
    commissions = [_clean(c) for c in await db.commissions.find({"order_id": order_id}).to_list(50)]

    # Quote link
    quote = None
    quote_id = order.get("quote_id")
    if quote_id:
        quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0, "id": 1, "quote_number": 1})

    # Payment proof info — resolve payer_name from proof collection first
    payment_proof = None
    if invoice:
        inv_id = invoice.get("id")
        payer = invoice.get("payer_name") or ""
        if not payer and inv_id:
            pp = await db.payment_proofs.find_one(
                {"invoice_id": inv_id},
                {"_id": 0, "payer_name": 1, "customer_name": 1},
                sort=[("created_at", -1)]
            )
            if pp:
                payer = pp.get("payer_name") or pp.get("customer_name") or ""
        if not payer:
            payer = (invoice.get("billing") or {}).get("invoice_client_name") or invoice.get("customer_name") or "-"
        payment_proof = {
            "payer_name": payer,
            "approved_by": invoice.get("approved_by") or "-",
            "approved_at": invoice.get("approved_at") or invoice.get("paid_at") or "-",
            "payment_status": invoice.get("payment_status") or invoice.get("status") or "-",
        }

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
    }

@router.post("/orders/{order_id}/release-to-vendor")
async def release_to_vendor(order_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"id": order_id}, {"$set": {"release_state": "manual", "release_type": "manual", "released_at": _now(), "released_by": payload.get("released_by", "admin")}})
    await db.vendor_orders.update_many({"order_id": order_id}, {"$set": {"status": "ready_to_fulfill", "released_at": _now()}})
    await db.audit_logs.insert_one({"id": str(uuid4()), "action": "manual_release_to_vendor", "target_id": order_id, "actor_role": payload.get("released_by", "admin"), "created_at": _now()})
    return {"ok": True}

@router.post("/orders/{order_id}/update-status")
async def update_order_status(order_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="status is required")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": new_status, "current_status": new_status, "updated_at": _now()}})
    await db.order_events.insert_one({"id": str(uuid4()), "order_id": order_id, "event": f"status_changed_to_{new_status}", "created_at": _now()})
    return {"ok": True}

# ─── QUOTES ───────────────────────────────────────────────────────────────────

@router.get("/quotes/list")
async def quotes_list(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    rows = await db.quotes.find(query).sort("created_at", -1).to_list(length=500)
    # Also include leads/service_requests as "requests"
    leads = await db.leads.find({}).sort("created_at", -1).to_list(length=200)
    service_reqs = await db.service_requests.find({}).sort("created_at", -1).to_list(length=200)

    out = []
    for q in rows:
        q = _clean(q)
        if search:
            haystack = f"{q.get('quote_number','')} {q.get('customer_name','')}".lower()
            if search.lower() not in haystack:
                continue
        q["record_type"] = "quote"
        assignment = await db.sales_assignments.find_one({"invoice_id": q.get("invoice_id")})
        q["assigned_sales"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        out.append(q)

    for lead in leads:
        lead = _clean(lead)
        if search:
            haystack = f"{lead.get('id','')} {lead.get('customer_id','')}".lower()
            if search.lower() not in haystack:
                continue
        if status and lead.get("status") != status:
            continue
        lead["record_type"] = lead.get("type", "request")
        lead["quote_number"] = lead.get("id", "")[:12]
        lead["customer_name"] = lead.get("customer_id", "")
        lead["total_amount"] = 0
        lead["assigned_sales"] = "Unassigned"
        out.append(lead)

    for sr in service_reqs:
        sr = _clean(sr)
        if search:
            haystack = f"{sr.get('id','')} {sr.get('customer_name','')}".lower()
            if search.lower() not in haystack:
                continue
        if status and sr.get("status") != status:
            continue
        sr["record_type"] = "service_request"
        sr["quote_number"] = sr.get("request_number", sr.get("id", "")[:12])
        sr["total_amount"] = sr.get("estimated_amount", 0)
        sr["assigned_sales"] = sr.get("assigned_to", "Unassigned")
        out.append(sr)

    out.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return out


# ─── SALES CRM ────────────────────────────────────────────────────────────────

@router.get("/sales-crm/leads")
async def sales_crm_leads(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    leads = await db.leads.find(query).sort("created_at", -1).to_list(length=500)
    service_reqs = await db.service_requests.find(query if status else {}).sort("created_at", -1).to_list(length=500)
    out = []
    for lead in leads:
        lead = _clean(lead)
        if search:
            haystack = f"{lead.get('customer_name','')} {lead.get('customer_id','')} {lead.get('id','')}".lower()
            if search.lower() not in haystack:
                continue
        lead["record_type"] = lead.get("type", "lead")
        out.append(lead)
    for sr in service_reqs:
        sr = _clean(sr)
        if search:
            haystack = f"{sr.get('customer_name','')} {sr.get('id','')}".lower()
            if search.lower() not in haystack:
                continue
        sr["record_type"] = "service_request"
        sr["customer_name"] = sr.get("customer_name", sr.get("customer_id", ""))
        out.append(sr)
    out.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return out

@router.get("/sales-crm/accounts")
async def sales_crm_accounts(request: Request, search: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    users = await db.users.find({"role": {"$in": ["customer", "user"]}}).sort("created_at", -1).to_list(500)
    out = []
    for u in users:
        u = _clean(u)
        if search:
            haystack = f"{u.get('full_name','')} {u.get('email','')} {u.get('company','')}".lower()
            if search.lower() not in haystack:
                continue
        order_count = await db.orders.count_documents({"customer_email": u.get("email")})
        assignment = await db.sales_assignments.find_one({"customer_email": u.get("email")})
        u["total_orders"] = order_count
        u["assigned_sales"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        out.append(u)
    return out

@router.get("/sales-crm/performance")
async def sales_crm_performance(request: Request):
    db = request.app.mongodb
    assignments = await db.sales_assignments.find({}).to_list(500)
    sales_map = {}
    for a in assignments:
        name = a.get("sales_owner_name", "Unknown")
        if name not in sales_map:
            sales_map[name] = {"name": name, "leads": 0, "orders": 0, "revenue": 0}
        if a.get("order_id"):
            sales_map[name]["orders"] += 1
        else:
            sales_map[name]["leads"] += 1
    return list(sales_map.values())

@router.post("/sales-crm/assign-lead")
async def assign_lead(payload: dict, request: Request):
    db = request.app.mongodb
    lead_id = payload.get("lead_id")
    sales_name = payload.get("sales_name", "")
    if not lead_id:
        raise HTTPException(status_code=400, detail="lead_id required")
    await db.leads.update_one({"id": lead_id}, {"$set": {"assigned_to": sales_name, "updated_at": _now()}})
    await db.sales_assignments.update_one(
        {"lead_id": lead_id},
        {"$set": {"lead_id": lead_id, "sales_owner_name": sales_name, "updated_at": _now()}},
        upsert=True,
    )
    return {"ok": True}

@router.post("/sales-crm/update-lead-status")
async def update_lead_status_facade(payload: dict, request: Request):
    db = request.app.mongodb
    lead_id = payload.get("lead_id")
    new_status = payload.get("status")
    if not lead_id or not new_status:
        raise HTTPException(status_code=400, detail="lead_id and status required")
    result = await db.leads.update_one({"id": lead_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    if result.matched_count == 0:
        await db.service_requests.update_one({"id": lead_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    return {"ok": True}

# ─── CUSTOMERS ────────────────────────────────────────────────────────────────

@router.get("/customers/list")
async def customers_list(request: Request, search: Optional[str] = Query(default=None), ctype: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {"role": {"$in": ["customer", "user"]}}
    rows = await db.users.find(query).sort("created_at", -1).to_list(500)
    out = []
    for u in rows:
        u = _clean(u)
        if search:
            haystack = f"{u.get('full_name','')} {u.get('email','')} {u.get('company','')}".lower()
            if search.lower() not in haystack:
                continue
        if ctype and u.get("customer_type") != ctype:
            continue
        order_count = await db.orders.count_documents({"customer_email": u.get("email")})
        u["total_orders"] = order_count
        referral = await db.referral_codes.find_one({"user_email": u.get("email")})
        u["referral_code"] = (referral or {}).get("code", "")
        assignment = await db.sales_assignments.find_one({"customer_email": u.get("email")})
        u["assigned_sales"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        out.append(u)
    return out

@router.get("/customers/detail/{customer_id}")
async def customer_detail_facade(customer_id: str, request: Request):
    db = request.app.mongodb
    user = await db.users.find_one({"id": customer_id})
    if not user:
        user = await db.users.find_one({"email": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    user = _clean(user)
    orders = [_clean(o) for o in await db.orders.find({"customer_email": user.get("email")}).sort("created_at", -1).to_list(20)]
    invoices = [_clean(i) for i in await db.invoices.find({"customer_email": user.get("email")}).sort("created_at", -1).to_list(20)]
    return {"customer": user, "orders": orders, "invoices": invoices}

@router.post("/customers/{customer_id}/assign-sales")
async def assign_sales_to_customer(customer_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    sales_name = payload.get("sales_name", "")
    user = await db.users.find_one({"id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.sales_assignments.update_one(
        {"customer_email": user.get("email")},
        {"$set": {"customer_email": user.get("email"), "sales_owner_name": sales_name, "updated_at": _now()}},
        upsert=True,
    )
    return {"ok": True}

# ─── VENDORS ──────────────────────────────────────────────────────────────────

@router.get("/vendors/list")
async def vendors_list(request: Request, search: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    partners = await db.partners.find({}).sort("created_at", -1).to_list(500)
    out = []
    for p in partners:
        p = _clean(p)
        if not p.get("id"):
            p["id"] = p.get("email", "")
        if search:
            haystack = f"{p.get('company_name','')} {p.get('name','')} {p.get('email','')}".lower()
            if search.lower() not in haystack:
                continue
        vendor_key = p.get("email") or p.get("id")
        active_orders = await db.vendor_orders.count_documents({"vendor_id": vendor_key, "status": {"$nin": ["completed", "cancelled"]}})
        released = await db.vendor_orders.count_documents({"vendor_id": vendor_key, "status": "ready_to_fulfill"})
        p["active_orders"] = active_orders
        p["released_jobs"] = released
        out.append(p)
    return out

@router.get("/vendors/{vendor_id:path}")
async def vendor_detail(vendor_id: str, request: Request):
    db = request.app.mongodb
    partner = await db.partners.find_one({"id": vendor_id})
    if not partner:
        partner = await db.partners.find_one({"email": vendor_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor_key = partner.get("email") or partner.get("id") or vendor_id
    orders = [_clean(o) for o in await db.vendor_orders.find({"vendor_id": vendor_key}).sort("created_at", -1).to_list(50)]
    return {"vendor": _clean(partner), "orders": orders}

@router.post("/vendors/{vendor_id:path}/toggle-status")
async def toggle_vendor_status(vendor_id: str, request: Request):
    db = request.app.mongodb
    partner = await db.partners.find_one({"id": vendor_id})
    if not partner:
        partner = await db.partners.find_one({"email": vendor_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Vendor not found")
    new_status = "inactive" if partner.get("status") == "active" else "active"
    query = {"email": partner.get("email")} if partner.get("email") else {"id": vendor_id}
    await db.partners.update_one(query, {"$set": {"status": new_status, "updated_at": _now()}})
    return {"ok": True, "new_status": new_status}

# ─── AFFILIATES & REFERRALS ──────────────────────────────────────────────────

@router.get("/affiliates/list")
async def affiliates_list_facade(request: Request, search: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    rows = await db.affiliates.find({}).sort("created_at", -1).to_list(500)
    out = []
    for a in rows:
        a = _clean(a)
        if search:
            haystack = f"{a.get('name','')} {a.get('email','')} {a.get('code','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(a)
    return out

@router.get("/referrals/list")
async def referrals_list(request: Request):
    db = request.app.mongodb
    events = await db.referral_events.find({}).sort("created_at", -1).to_list(500)
    codes = await db.referral_codes.find({}).to_list(500)
    return {"events": [_clean(e) for e in events], "codes": [_clean(c) for c in codes]}

@router.get("/commissions/list")
async def commissions_list_facade(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    rows = await db.commissions.find(query).sort("created_at", -1).to_list(500)
    out = []
    for c in rows:
        c = _clean(c)
        if search:
            haystack = f"{c.get('recipient_name','')} {c.get('order_id','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(c)
    return out

@router.get("/payouts/list")
async def payouts_list(request: Request):
    db = request.app.mongodb
    rows = await db.payouts.find({}).sort("created_at", -1).to_list(500)
    return [_clean(p) for p in rows]

@router.post("/affiliates/{affiliate_id}/toggle-status")
async def toggle_affiliate_status(affiliate_id: str, request: Request):
    db = request.app.mongodb
    aff = await db.affiliates.find_one({"id": affiliate_id})
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    new_status = "inactive" if aff.get("status") == "active" else "active"
    await db.affiliates.update_one({"id": affiliate_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    return {"ok": True, "new_status": new_status}

@router.post("/payouts/{payout_id}/approve")
async def approve_payout(payout_id: str, request: Request):
    db = request.app.mongodb
    await db.payouts.update_one({"id": payout_id}, {"$set": {"status": "approved", "approved_at": _now()}})
    return {"ok": True}

# ─── CATALOG ──────────────────────────────────────────────────────────────────

@router.get("/catalog/products")
async def catalog_products(request: Request, search: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    rows = await db.products.find({}).sort("created_at", -1).to_list(500)
    out = []
    for p in rows:
        p = _clean(p)
        if search:
            haystack = f"{p.get('name','')} {p.get('sku','')} {p.get('title','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(p)
    return out

@router.get("/catalog/services")
async def catalog_services(request: Request):
    db = request.app.mongodb
    rows = await db.service_catalog.find({}).sort("created_at", -1).to_list(500)
    return [_clean(s) for s in rows]

@router.get("/catalog/groups")
async def catalog_groups(request: Request):
    db = request.app.mongodb
    groups = await db.service_groups.find({}).to_list(200)
    return [_clean(g) for g in groups]

@router.get("/catalog/promo-items")
async def catalog_promo_items(request: Request):
    db = request.app.mongodb
    rows = await db.products.find({"category": {"$in": ["promotional", "promo"]}}).to_list(500)
    if not rows:
        rows = await db.products.find({"is_promotional": True}).to_list(500)
    return [_clean(p) for p in rows]

@router.get("/vendor-assignment/suggest")
async def suggest_vendor_assignment(
    request: Request,
    capabilities: Optional[str] = Query(default=None),
    limit: int = Query(default=5, ge=1, le=20),
):
    """Return ranked vendor candidates based on capabilities, availability, and workload."""
    from services.vendor_assignment_engine import get_vendor_candidates
    db = request.app.mongodb
    cap_list = [c.strip() for c in capabilities.split(",")] if capabilities else []
    candidates = await get_vendor_candidates(db, cap_list, limit)
    return {"candidates": candidates}


# ─── SETTINGS ─────────────────────────────────────────────────────────────────

@router.get("/settings/business-profile")
async def get_business_profile(request: Request):
    db = request.app.mongodb
    settings = await db.business_settings.find_one({"type": "company_profile"})
    if not settings:
        settings = await db.company_settings.find_one({})
    return _clean(settings) or {"country": "TZ", "currency": "TZS", "company_name": "Konekt"}

@router.post("/settings/business-profile")
async def update_business_profile(payload: dict, request: Request):
    db = request.app.mongodb
    payload["updated_at"] = _now()
    await db.business_settings.update_one({"type": "company_profile"}, {"$set": payload}, upsert=True)
    return {"ok": True}

@router.get("/settings/commercial-rules")
async def get_commercial_rules(request: Request):
    db = request.app.mongodb
    rules = await db.business_settings.find_one({"type": "commercial_rules"})
    return _clean(rules) or {"quote_validity_days": 30, "auto_release_on_payment": True}

@router.post("/settings/commercial-rules")
async def update_commercial_rules(payload: dict, request: Request):
    db = request.app.mongodb
    payload["type"] = "commercial_rules"
    payload["updated_at"] = _now()
    await db.business_settings.update_one({"type": "commercial_rules"}, {"$set": payload}, upsert=True)
    return {"ok": True}

@router.get("/settings/affiliate-defaults")
async def get_affiliate_defaults(request: Request):
    db = request.app.mongodb
    defaults = await db.business_settings.find_one({"type": "affiliate_defaults"})
    return _clean(defaults) or {"enabled": True, "default_commission_rate": 5, "referral_rewards": True}

@router.post("/settings/affiliate-defaults")
async def update_affiliate_defaults(payload: dict, request: Request):
    db = request.app.mongodb
    payload["type"] = "affiliate_defaults"
    payload["updated_at"] = _now()
    await db.business_settings.update_one({"type": "affiliate_defaults"}, {"$set": payload}, upsert=True)
    return {"ok": True}

@router.get("/settings/notifications")
async def get_notification_settings(request: Request):
    db = request.app.mongodb
    settings = await db.business_settings.find_one({"type": "notification_settings"})
    return _clean(settings) or {"email_on_payment": True, "email_on_order": True, "whatsapp_enabled": False}

@router.post("/settings/notifications")
async def update_notification_settings(payload: dict, request: Request):
    db = request.app.mongodb
    payload["type"] = "notification_settings"
    payload["updated_at"] = _now()
    await db.business_settings.update_one({"type": "notification_settings"}, {"$set": payload}, upsert=True)
    return {"ok": True}

# ─── USERS & ROLES ────────────────────────────────────────────────────────────

@router.get("/users/list")
async def users_list_facade(request: Request, search: Optional[str] = Query(default=None), role: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if role:
        query["role"] = role
    rows = await db.admin_users.find(query).sort("created_at", -1).to_list(500)
    if not rows:
        rows = await db.users.find(query).sort("created_at", -1).to_list(500)
    out = []
    for u in rows:
        u = _clean(u)
        if search:
            haystack = f"{u.get('full_name','')} {u.get('email','')} {u.get('role','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(u)
    return out

@router.post("/users/{user_id}/assign-role")
async def assign_role(user_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    new_role = payload.get("role")
    if not new_role:
        raise HTTPException(status_code=400, detail="role required")
    result = await db.admin_users.update_one({"id": user_id}, {"$set": {"role": new_role, "updated_at": _now()}})
    if result.matched_count == 0:
        await db.users.update_one({"id": user_id}, {"$set": {"role": new_role, "updated_at": _now()}})
    await db.audit_logs.insert_one({"id": str(uuid4()), "action": "role_assigned", "target_id": user_id, "details": {"new_role": new_role}, "created_at": _now()})
    return {"ok": True}

@router.post("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, request: Request):
    db = request.app.mongodb
    user = await db.admin_users.find_one({"id": user_id})
    coll = "admin_users"
    if not user:
        user = await db.users.find_one({"id": user_id})
        coll = "users"
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = "inactive" if user.get("status", "active") == "active" else "active"
    await db[coll].update_one({"id": user_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    return {"ok": True, "new_status": new_status}

# ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

@router.get("/audit/list")
async def audit_list(request: Request, search: Optional[str] = Query(default=None), action: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if action:
        query["action"] = action
    rows = await db.audit_logs.find(query).sort("created_at", -1).to_list(500)
    out = []
    for r in rows:
        r = _clean(r)
        if search:
            haystack = f"{r.get('action','')} {r.get('target_id','')} {r.get('actor_role','')}".lower()
            if search.lower() not in haystack:
                continue
        out.append(r)
    return out

@router.get("/audit/actions")
async def audit_actions(request: Request):
    db = request.app.mongodb
    actions = await db.audit_logs.distinct("action")
    return actions
