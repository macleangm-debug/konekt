from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Query, Request, HTTPException

from core.live_commerce_service import LiveCommerceService

router = APIRouter(prefix="/api/admin", tags=["Admin Facade"])

def _now():
    return datetime.now(timezone.utc).isoformat()

def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
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
    all_proofs = await service.finance_queue(customer_query=search)
    if status:
        all_proofs = [p for p in all_proofs if p.get("status") == status]
    return all_proofs

@router.get("/payments/{payment_proof_id}")
async def payment_detail(payment_proof_id: str, request: Request):
    db = request.app.mongodb
    proof = await db.payment_proofs.find_one({"id": payment_proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    payment = await db.payments.find_one({"id": proof.get("payment_id")})
    invoice = await db.invoices.find_one({"id": proof.get("invoice_id")})
    return {
        "proof": _clean(proof),
        "payment": _clean(payment),
        "invoice": _clean(invoice),
    }

@router.post("/payments/{payment_proof_id}/approve")
async def approve_payment(payment_proof_id: str, payload: dict, request: Request):
    service = LiveCommerceService(request.app.mongodb)
    result = await service.approve_payment_proof(
        payment_proof_id=payment_proof_id,
        approver_role=payload.get("approver_role", "admin"),
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
    for inv in rows:
        inv = _clean(inv)
        if search:
            haystack = f"{inv.get('invoice_number','')} {inv.get('customer_name','')} {inv.get('customer_email','')}".lower()
            if search.lower() not in haystack:
                continue
        proof = await db.payment_proofs.find_one({"invoice_id": inv.get("id")}, sort=[("created_at", -1)])
        inv["rejection_reason"] = (proof or {}).get("rejection_reason", "") if (proof or {}).get("status") == "rejected" else ""
        inv["source_type"] = "Quote" if inv.get("quote_id") else "Cart"
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
    order = await db.orders.find_one({"invoice_id": invoice_id})
    return {
        "invoice": _clean(invoice),
        "payments": payments,
        "proofs": proofs,
        "order": _clean(order),
    }

# ─── ORDERS ───────────────────────────────────────────────────────────────────

@router.get("/orders/list")
async def orders_list(request: Request, search: Optional[str] = Query(default=None), status: Optional[str] = Query(default=None), tab: Optional[str] = Query(default=None)):
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    if tab == "awaiting_release":
        query["$or"] = [{"release_state": {"$exists": False}}, {"release_state": "awaiting"}]
        query["status"] = {"$nin": ["cancelled"]}
    elif tab == "released":
        query["release_state"] = {"$in": ["released_by_payment", "manual"]}
    elif tab == "completed":
        query["status"] = {"$in": ["completed", "delivered"]}
    elif tab == "manual_released":
        query["release_type"] = "manual"

    rows = await db.orders.find(query).sort("created_at", -1).to_list(length=500)
    out = []
    for order in rows:
        order = _clean(order)
        if search:
            haystack = f"{order.get('order_number','')} {order.get('customer_name','')}".lower()
            if search.lower() not in haystack:
                continue
        # Determine release state
        if not order.get("release_state"):
            order["release_state"] = "released_by_payment" if order.get("payment_status") == "paid" else "awaiting"
        vendor_orders = await db.vendor_orders.find({"order_id": order.get("id")}).to_list(20)
        order["vendor_count"] = len(vendor_orders)
        assignment = await db.sales_assignments.find_one({"order_id": order.get("id")})
        order["sales_owner"] = (assignment or {}).get("sales_owner_name", "Unassigned")
        out.append(order)
    return out

@router.get("/orders/{order_id}")
async def order_detail(order_id: str, request: Request):
    db = request.app.mongodb
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    invoice = await db.invoices.find_one({"id": order.get("invoice_id")})
    vendor_orders = [_clean(v) for v in await db.vendor_orders.find({"order_id": order_id}).to_list(50)]
    assignment = await db.sales_assignments.find_one({"order_id": order_id})
    events = [_clean(e) for e in await db.order_events.find({"order_id": order_id}).sort("created_at", 1).to_list(100)]
    commissions = [_clean(c) for c in await db.commissions.find({"order_id": order_id}).to_list(50)]
    return {
        "order": _clean(order),
        "invoice": _clean(invoice),
        "vendor_orders": vendor_orders,
        "sales_assignment": _clean(assignment),
        "events": events,
        "commissions": commissions,
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
