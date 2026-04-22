"""
Vendor Payables & Payment Modality — Session 3A

Key concepts:
  • payment_modality per vendor: "pay_per_order" (default, new) | "monthly_statement" (trusted)
  • Pay-per-order flow: each vendor order becomes a payable the moment it is released.
    Vendor uploads invoice against the order; Ops marks it paid; order is released/fulfilled.
  • Monthly-statement flow: at end-of-calendar-month we generate one aggregated statement
    per vendor listing all vendor_orders of that month. Vendor uploads ONE invoice against
    the statement; Ops marks it paid.
  • Modality upgrade: vendor can REQUEST upgrade from pay-per-order → monthly_statement;
    admin approves / denies.  Admin can also change modality directly per vendor.

Data model
----------
users (vendors):
    payment_modality: "pay_per_order" | "monthly_statement"

vendor_orders (existing collection, augmented):
    vendor_invoice_number: str
    vendor_invoice_file: str
    vendor_invoice_uploaded_at: ISO
    vendor_payment_status: "pending"|"invoice_uploaded"|"paid"
    vendor_payment_reference: str
    vendor_paid_at: ISO
    payable_group: "order" | "statement:<statement_id>"   ← so we don't double-count

vendor_statements (new):
    id, vendor_id, vendor_name, country_code
    period: "YYYY-MM"
    period_start / period_end (ISO)
    orders: [vendor_order_id, ...]
    total_amount
    status: "open" | "invoice_uploaded" | "paid"
    vendor_invoice_number, vendor_invoice_file, vendor_invoice_uploaded_at
    paid_reference, paid_at
    created_at, updated_at

vendor_modality_requests (new):
    id, vendor_id, vendor_name
    requested_modality
    reason, requested_at
    status: "pending" | "approved" | "denied"
    decided_by, decided_at, decision_note
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Header, Request, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
from uuid import uuid4
from bson import ObjectId
import os
import calendar

from partner_access_service import get_partner_user_from_header


client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

admin_router = APIRouter(prefix="/api/admin/vendor-payables", tags=["Vendor Payables (Admin)"])
vendor_router = APIRouter(prefix="/api/vendor/payables", tags=["Vendor Payables (Vendor)"])

# Local disk dir for vendor-uploaded invoice PDFs (served via /uploads)
INVOICE_DIR = Path("/app/uploads/vendor_invoices")
INVOICE_DIR.mkdir(parents=True, exist_ok=True)

VALID_MODALITIES = {"pay_per_order", "monthly_statement"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _vendor_order_amount(vo: dict) -> float:
    """Return vendor base cost (inclusive) for a vendor order."""
    total = 0.0
    for item in vo.get("items") or []:
        unit = item.get("vendor_price") or item.get("base_price") or item.get("unit_price") or item.get("price") or 0
        total += float(unit or 0) * float(item.get("quantity") or 1)
    if not total:
        total = float(vo.get("vendor_total") or vo.get("base_price") or vo.get("total_amount") or vo.get("total") or 0)
    return round(total, 2)


def _strip_id(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


async def _get_vendor_doc(vendor_id: str) -> Optional[dict]:
    """Return the vendor profile from partners collection (preferred) or users collection."""
    # Partner lookup — vendor_id is the ObjectId string
    doc = None
    try:
        if len(vendor_id) == 24:
            doc = await db.partners.find_one({"_id": ObjectId(vendor_id)}, {"_id": 0,
                "name": 1, "company_name": 1, "email": 1, "country_code": 1, "payment_modality": 1,
                "payment_modality_updated_at": 1, "payment_modality_updated_by": 1, "partner_type": 1, "status": 1})
    except Exception:
        doc = None
    if not doc:
        doc = await db.users.find_one(
            {"id": vendor_id, "role": "vendor"},
            {"_id": 0, "full_name": 1, "company": 1, "email": 1, "country_code": 1,
             "payment_modality": 1, "payment_modality_updated_at": 1, "payment_modality_updated_by": 1, "vendor_status": 1},
        )
    if not doc:
        return None
    # Normalize into common shape
    return {
        "id": vendor_id,
        "name": doc.get("company_name") or doc.get("company") or doc.get("name") or doc.get("full_name") or "—",
        "email": doc.get("email", ""),
        "country_code": doc.get("country_code", ""),
        "payment_modality": doc.get("payment_modality") or "pay_per_order",
        "status": doc.get("status") or doc.get("vendor_status") or "",
        "partner_type": doc.get("partner_type", ""),
        "source": "partners" if "partner_type" in doc else "users",
    }


async def _set_vendor_modality(vendor_id: str, modality: str, note: str = "", actor: str = "admin") -> bool:
    """Update modality in whichever collection stores this vendor. Returns True if updated."""
    now = _now_iso()
    update = {"payment_modality": modality, "payment_modality_updated_at": now,
              "payment_modality_updated_by": actor, "payment_modality_note": note}
    # Try partners first
    try:
        if len(vendor_id) == 24:
            res = await db.partners.update_one({"_id": ObjectId(vendor_id)}, {"$set": update})
            if res.matched_count:
                return True
    except Exception:
        pass
    res = await db.users.update_one({"id": vendor_id, "role": "vendor"}, {"$set": update})
    return bool(res.matched_count)


async def _get_vendor_modality(vendor_id: str) -> str:
    v = await _get_vendor_doc(vendor_id)
    return (v or {}).get("payment_modality") or "pay_per_order"


# ═══════════════════════════════════════════════════════════════════════
#                           ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@admin_router.get("/stats")
async def payables_stats(country: Optional[str] = None):
    """Aggregate outstanding payables across all vendors."""
    base_q = {"vendor_payment_status": {"$ne": "paid"}, "status": {"$nin": ["cancelled", "refunded", "draft"]}}
    if country:
        base_q["country_code"] = country

    orders_outstanding = 0.0
    orders_count = 0
    stmt_outstanding = 0.0
    stmt_count = 0

    async for vo in db.vendor_orders.find(base_q, {"_id": 0}):
        # skip orders already rolled into a statement
        if str(vo.get("payable_group") or "").startswith("statement:"):
            continue
        # Only count pay-per-order vendors here
        vid = vo.get("vendor_id")
        if not vid:
            continue
        modality = await _get_vendor_modality(vid)
        if modality != "pay_per_order":
            continue
        orders_outstanding += _vendor_order_amount(vo)
        orders_count += 1

    stmt_q = {"status": {"$ne": "paid"}}
    if country:
        stmt_q["country_code"] = country
    async for st in db.vendor_statements.find(stmt_q, {"_id": 0}):
        stmt_outstanding += float(st.get("total_amount") or 0)
        stmt_count += 1

    total_vendors_ppo = (
        await db.partners.count_documents({"payment_modality": "pay_per_order"})
        + await db.users.count_documents({"role": "vendor", "payment_modality": "pay_per_order"})
    )
    total_vendors_monthly = (
        await db.partners.count_documents({"payment_modality": "monthly_statement"})
        + await db.users.count_documents({"role": "vendor", "payment_modality": "monthly_statement"})
    )
    pending_requests = await db.vendor_modality_requests.count_documents({"status": "pending"})

    return {
        "orders_outstanding": round(orders_outstanding, 2),
        "orders_count": orders_count,
        "statements_outstanding": round(stmt_outstanding, 2),
        "statements_count": stmt_count,
        "total_outstanding": round(orders_outstanding + stmt_outstanding, 2),
        "vendors_pay_per_order": total_vendors_ppo,
        "vendors_monthly_statement": total_vendors_monthly,
        "pending_modality_requests": pending_requests,
    }


@admin_router.get("/ledger")
async def payables_ledger(
    country: Optional[str] = None,
    vendor_id: Optional[str] = None,
    status: Optional[str] = None,  # "pending" | "invoice_uploaded" | "paid"
    modality: Optional[str] = None,
):
    """Unified ledger of per-order payables (for pay-per-order vendors)."""
    q = {"status": {"$nin": ["cancelled", "refunded", "draft"]}}
    if country:
        q["country_code"] = country
    if vendor_id:
        q["vendor_id"] = vendor_id
    if status:
        q["vendor_payment_status"] = status

    rows = []
    async for vo in db.vendor_orders.find(q, {"_id": 0}).sort("created_at", -1).limit(800):
        vid = vo.get("vendor_id")
        if not vid:
            continue
        m = await _get_vendor_modality(vid)
        if modality and m != modality:
            continue
        # Monthly statement vendors: only show orders NOT yet rolled into a statement
        is_in_stmt = str(vo.get("payable_group") or "").startswith("statement:")
        vendor_doc = await _get_vendor_doc(vid)
        rows.append({
            "id": vo.get("id"),
            "vendor_order_no": vo.get("vendor_order_no") or (vo.get("id") or "")[:12],
            "vendor_id": vid,
            "vendor_name": (vendor_doc or {}).get("name") or "—",
            "modality": m,
            "country_code": vo.get("country_code", ""),
            "created_at": str(vo.get("created_at") or "")[:19],
            "status": vo.get("status"),
            "amount": _vendor_order_amount(vo),
            "vendor_payment_status": vo.get("vendor_payment_status") or "pending",
            "vendor_invoice_number": vo.get("vendor_invoice_number", ""),
            "vendor_invoice_file": vo.get("vendor_invoice_file", ""),
            "vendor_paid_at": vo.get("vendor_paid_at", ""),
            "vendor_payment_reference": vo.get("vendor_payment_reference", ""),
            "payable_group": vo.get("payable_group") or "order",
            "in_statement": is_in_stmt,
        })
    return rows


class MarkPaidPayload(BaseModel):
    reference: str = ""
    note: Optional[str] = ""


@admin_router.post("/orders/{vendor_order_id}/mark-paid")
async def mark_order_paid(vendor_order_id: str, payload: MarkPaidPayload):
    now = _now_iso()
    update = {
        "vendor_payment_status": "paid",
        "vendor_payment_reference": payload.reference or "",
        "vendor_paid_at": now,
        "updated_at": now,
    }
    if payload.note:
        update["vendor_payment_note"] = payload.note
    res = await db.vendor_orders.update_one({"id": vendor_order_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor order not found")
    return {"ok": True}


class ModalityChangePayload(BaseModel):
    modality: str
    note: Optional[str] = ""


@admin_router.post("/vendors/{vendor_id}/modality")
async def set_vendor_modality(vendor_id: str, payload: ModalityChangePayload):
    """Admin-initiated modality change (instant)."""
    if payload.modality not in VALID_MODALITIES:
        raise HTTPException(status_code=400, detail=f"Invalid modality. Allowed: {sorted(VALID_MODALITIES)}")
    ok = await _set_vendor_modality(vendor_id, payload.modality, payload.note or "", actor="admin")
    if not ok:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Notify vendor
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "target_type": "vendor",
        "target_id": vendor_id,
        "title": "Payment terms updated",
        "message": f"Your payment terms were set to {payload.modality.replace('_', ' ')}.",
        "read": False,
        "created_at": _now_iso(),
    })
    return {"ok": True, "modality": payload.modality}


@admin_router.get("/modality-requests")
async def list_modality_requests(status: Optional[str] = "pending"):
    q = {}
    if status:
        q["status"] = status
    docs = await db.vendor_modality_requests.find(q, {"_id": 0}).sort("requested_at", -1).to_list(200)
    return docs


class ModalityDecisionPayload(BaseModel):
    note: Optional[str] = ""


@admin_router.post("/modality-requests/{request_id}/approve")
async def approve_modality_request(request_id: str, payload: ModalityDecisionPayload):
    req = await db.vendor_modality_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {req.get('status')}")
    now = _now_iso()
    await db.vendor_modality_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved", "decided_by": "admin", "decided_at": now, "decision_note": payload.note or ""}},
    )
    # Apply the modality change
    await _set_vendor_modality(req["vendor_id"], req["requested_modality"], note=payload.note or "", actor="admin_approval")
    # Notify vendor
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "target_type": "vendor",
        "target_id": req["vendor_id"],
        "title": "Payment-terms upgrade approved",
        "message": f"Your request to switch to {req['requested_modality'].replace('_', ' ')} has been approved.",
        "read": False,
        "created_at": now,
    })
    return {"ok": True}


@admin_router.post("/modality-requests/{request_id}/deny")
async def deny_modality_request(request_id: str, payload: ModalityDecisionPayload):
    req = await db.vendor_modality_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {req.get('status')}")
    now = _now_iso()
    await db.vendor_modality_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "denied", "decided_by": "admin", "decided_at": now, "decision_note": payload.note or ""}},
    )
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "target_type": "vendor",
        "target_id": req["vendor_id"],
        "title": "Payment-terms upgrade not approved",
        "message": payload.note or "Your modality upgrade request was not approved at this time.",
        "read": False,
        "created_at": now,
    })
    return {"ok": True}


# ─── Monthly statements ──────────────────────────────────────────────

@admin_router.post("/statements/generate")
async def generate_monthly_statements(period: Optional[str] = None):
    """Generate end-of-calendar-month aggregated statements for all monthly_statement vendors.

    `period` is YYYY-MM.  If omitted → previous calendar month.
    Idempotent: re-running for the same period updates the existing statement (only unpaid).
    """
    now = datetime.now(timezone.utc)
    if not period:
        # default = previous month
        first_of_this = now.replace(day=1)
        last_prev = first_of_this - timedelta(days=1)
        period = last_prev.strftime("%Y-%m")

    try:
        y, m = [int(x) for x in period.split("-")]
    except Exception:
        raise HTTPException(status_code=400, detail="period must be YYYY-MM")

    last_day = calendar.monthrange(y, m)[1]
    period_start = datetime(y, m, 1, tzinfo=timezone.utc)
    period_end = datetime(y, m, last_day, 23, 59, 59, tzinfo=timezone.utc)

    created = 0
    updated = 0

    # Build the union of monthly_statement vendors from both collections
    monthly_vendors = []
    async for p in db.partners.find(
        {"payment_modality": "monthly_statement"},
        {"_id": 1, "name": 1, "company_name": 1, "country_code": 1},
    ):
        monthly_vendors.append({
            "id": str(p["_id"]),
            "name": p.get("company_name") or p.get("name") or "—",
            "country_code": p.get("country_code") or "TZ",
        })
    async for u in db.users.find(
        {"role": "vendor", "payment_modality": "monthly_statement"},
        {"_id": 0, "id": 1, "full_name": 1, "company": 1, "country_code": 1},
    ):
        monthly_vendors.append({
            "id": u["id"],
            "name": u.get("company") or u.get("full_name") or "—",
            "country_code": u.get("country_code") or "TZ",
        })

    for v in monthly_vendors:
        vid = v["id"]
        vorders = await db.vendor_orders.find(
            {
                "vendor_id": vid,
                "status": {"$nin": ["cancelled", "refunded", "draft"]},
                # Match on created_at OR released_at if present
                "created_at": {"$gte": period_start, "$lte": period_end},
            },
            {"_id": 0},
        ).to_list(2000)

        if not vorders:
            continue

        total = sum(_vendor_order_amount(vo) for vo in vorders)
        order_ids = [vo["id"] for vo in vorders if vo.get("id")]

        existing = await db.vendor_statements.find_one({"vendor_id": vid, "period": period})
        if existing and existing.get("status") == "paid":
            continue  # frozen
        stmt_id = (existing or {}).get("id") or str(uuid4())
        doc = {
            "id": stmt_id,
            "vendor_id": vid,
            "vendor_name": v.get("name") or "—",
            "country_code": v.get("country_code") or "TZ",
            "period": period,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "orders": order_ids,
            "order_count": len(order_ids),
            "total_amount": round(total, 2),
            "status": (existing or {}).get("status", "open"),
            "updated_at": _now_iso(),
        }
        if not existing:
            doc["created_at"] = _now_iso()
            await db.vendor_statements.insert_one(doc)
            created += 1
        else:
            await db.vendor_statements.update_one({"id": stmt_id}, {"$set": doc})
            updated += 1

        # Tag the underlying vendor_orders so they don't show up as separate payables
        if order_ids:
            await db.vendor_orders.update_many(
                {"id": {"$in": order_ids}},
                {"$set": {"payable_group": f"statement:{stmt_id}"}},
            )

        # Notify vendor
        await db.notifications.insert_one({
            "id": str(uuid4()),
            "target_type": "vendor",
            "target_id": vid,
            "title": f"Monthly statement ready — {period}",
            "message": f"Your {period} statement is ready with {len(order_ids)} orders. Please upload your invoice.",
            "read": False,
            "created_at": _now_iso(),
        })

    return {"ok": True, "period": period, "created": created, "updated": updated}


@admin_router.get("/statements")
async def list_statements(status: Optional[str] = None, vendor_id: Optional[str] = None, country: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    if vendor_id:
        q["vendor_id"] = vendor_id
    if country:
        q["country_code"] = country
    docs = await db.vendor_statements.find(q, {"_id": 0}).sort("period", -1).to_list(500)
    return docs


@admin_router.post("/statements/{statement_id}/mark-paid")
async def mark_statement_paid(statement_id: str, payload: MarkPaidPayload):
    stmt = await db.vendor_statements.find_one({"id": statement_id})
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    now = _now_iso()
    await db.vendor_statements.update_one(
        {"id": statement_id},
        {"$set": {"status": "paid", "paid_reference": payload.reference or "", "paid_at": now, "updated_at": now}},
    )
    # Flip every constituent vendor_order to paid too
    if stmt.get("orders"):
        await db.vendor_orders.update_many(
            {"id": {"$in": stmt["orders"]}},
            {"$set": {"vendor_payment_status": "paid", "vendor_paid_at": now,
                      "vendor_payment_reference": f"STMT:{statement_id}:{payload.reference or ''}"}},
        )
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "target_type": "vendor",
        "target_id": stmt["vendor_id"],
        "title": f"Statement paid — {stmt.get('period')}",
        "message": f"Your {stmt.get('period')} statement has been paid. Ref: {payload.reference or '—'}",
        "read": False,
        "created_at": now,
    })
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════
#                         VENDOR-FACING ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@vendor_router.get("/modality")
async def vendor_modality(authorization: Optional[str] = Header(None)):
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    m = await _get_vendor_modality(vid)
    # Pending request?
    pending = await db.vendor_modality_requests.find_one(
        {"vendor_id": vid, "status": "pending"}, {"_id": 0}
    )
    return {"modality": m, "pending_request": pending}


class VendorModalityRequestPayload(BaseModel):
    requested_modality: str
    reason: Optional[str] = ""


@vendor_router.post("/request-modality")
async def request_modality(payload: VendorModalityRequestPayload, authorization: Optional[str] = Header(None)):
    if payload.requested_modality not in VALID_MODALITIES:
        raise HTTPException(status_code=400, detail="Invalid modality")
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    current = await _get_vendor_modality(vid)
    if current == payload.requested_modality:
        raise HTTPException(status_code=400, detail="You are already on this modality")

    # Block duplicate pending
    existing = await db.vendor_modality_requests.find_one({"vendor_id": vid, "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request")

    req_id = str(uuid4())
    now = _now_iso()
    vendor_doc = await _get_vendor_doc(vid)
    await db.vendor_modality_requests.insert_one({
        "id": req_id,
        "vendor_id": vid,
        "vendor_name": (vendor_doc or {}).get("name") or "—",
        "current_modality": current,
        "requested_modality": payload.requested_modality,
        "reason": payload.reason or "",
        "status": "pending",
        "requested_at": now,
    })
    # Notify admin ops
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "target_type": "admin",
        "target_id": "ops",
        "title": "Vendor payment-terms request",
        "message": f"{(vendor_doc or {}).get('name') or 'A vendor'} requested {payload.requested_modality.replace('_', ' ')}.",
        "read": False,
        "created_at": now,
    })
    return {"ok": True, "id": req_id}


@vendor_router.get("/orders")
async def vendor_payables_orders(authorization: Optional[str] = Header(None)):
    """Vendor sees their own outstanding per-order payables (pay-per-order mode)."""
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    rows = []
    async for vo in db.vendor_orders.find(
        {"vendor_id": vid, "status": {"$nin": ["cancelled", "refunded", "draft"]}},
        {"_id": 0},
    ).sort("created_at", -1).limit(500):
        if str(vo.get("payable_group") or "").startswith("statement:"):
            continue
        rows.append({
            "id": vo.get("id"),
            "vendor_order_no": vo.get("vendor_order_no") or (vo.get("id") or "")[:12],
            "created_at": str(vo.get("created_at") or "")[:19],
            "status": vo.get("status"),
            "amount": _vendor_order_amount(vo),
            "vendor_payment_status": vo.get("vendor_payment_status") or "pending",
            "vendor_invoice_number": vo.get("vendor_invoice_number", ""),
            "vendor_invoice_file": vo.get("vendor_invoice_file", ""),
            "vendor_paid_at": vo.get("vendor_paid_at", ""),
            "vendor_payment_reference": vo.get("vendor_payment_reference", ""),
        })
    return rows


@vendor_router.get("/statements")
async def vendor_statements_list(authorization: Optional[str] = Header(None)):
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    docs = await db.vendor_statements.find(
        {"vendor_id": vid}, {"_id": 0}
    ).sort("period", -1).to_list(100)
    return docs


async def _save_invoice_file(upload: UploadFile, vendor_id: str, subfolder: str) -> dict:
    ext = (upload.filename or "invoice.pdf").rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "png", "jpg", "jpeg", "webp"):
        raise HTTPException(status_code=400, detail="Invoice must be PDF or image")
    vdir = INVOICE_DIR / vendor_id / subfolder
    vdir.mkdir(parents=True, exist_ok=True)
    fname = f"{uuid4()}.{ext}"
    path = vdir / fname
    data = await upload.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (20MB max)")
    with open(path, "wb") as f:
        f.write(data)
    return {
        "stored_path": str(path),
        "url": f"/uploads/vendor_invoices/{vendor_id}/{subfolder}/{fname}",
        "original_filename": upload.filename,
        "size": len(data),
    }


@vendor_router.post("/orders/{vendor_order_id}/upload-invoice")
async def vendor_upload_order_invoice(
    vendor_order_id: str,
    invoice_number: str = Form(...),
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    vo = await db.vendor_orders.find_one({"id": vendor_order_id, "vendor_id": vid}, {"_id": 0})
    if not vo:
        raise HTTPException(status_code=404, detail="Vendor order not found")

    saved = await _save_invoice_file(file, vid, f"orders/{vendor_order_id}")
    now = _now_iso()
    await db.vendor_orders.update_one(
        {"id": vendor_order_id, "vendor_id": vid},
        {"$set": {
            "vendor_invoice_number": invoice_number,
            "vendor_invoice_file": saved["url"],
            "vendor_invoice_original_filename": saved["original_filename"],
            "vendor_invoice_uploaded_at": now,
            "vendor_payment_status": "invoice_uploaded" if vo.get("vendor_payment_status") != "paid" else "paid",
            "updated_at": now,
        }},
    )
    # Notify ops
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "target_type": "admin",
        "target_id": "ops",
        "title": "Vendor invoice uploaded",
        "message": f"Vendor order {(vo.get('vendor_order_no') or vendor_order_id)[:14]} invoice #{invoice_number} is ready for payment.",
        "read": False,
        "created_at": now,
    })
    return {"ok": True, "invoice_url": saved["url"]}


@vendor_router.post("/statements/{statement_id}/upload-invoice")
async def vendor_upload_statement_invoice(
    statement_id: str,
    invoice_number: str = Form(...),
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    stmt = await db.vendor_statements.find_one({"id": statement_id, "vendor_id": vid}, {"_id": 0})
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    if stmt.get("status") == "paid":
        raise HTTPException(status_code=400, detail="This statement is already paid")

    saved = await _save_invoice_file(file, vid, f"statements/{statement_id}")
    now = _now_iso()
    await db.vendor_statements.update_one(
        {"id": statement_id},
        {"$set": {
            "vendor_invoice_number": invoice_number,
            "vendor_invoice_file": saved["url"],
            "vendor_invoice_original_filename": saved["original_filename"],
            "vendor_invoice_uploaded_at": now,
            "status": "invoice_uploaded",
            "updated_at": now,
        }},
    )
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "target_type": "admin",
        "target_id": "ops",
        "title": "Vendor statement invoice uploaded",
        "message": f"{stmt.get('vendor_name')} uploaded invoice for {stmt.get('period')}.",
        "read": False,
        "created_at": now,
    })
    return {"ok": True, "invoice_url": saved["url"]}
