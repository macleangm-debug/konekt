"""
Sample Flow Routes
Promotional sample request → quote → approve → actual production order.
Sales/admin override for sample approval.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

router = APIRouter(prefix="/api/admin/samples", tags=["Sample Flow"])
_security = HTTPBearer()


def _now():
    return datetime.now(timezone.utc).isoformat()


def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def _require_staff(request: Request, credentials: HTTPAuthorizationCredentials = Depends(_security)):
    JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "sales", "staff"):
            raise HTTPException(403, "Staff access required")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


@router.get("")
async def list_sample_workflows(request: Request, user: dict = Depends(_require_staff)):
    db = request.app.mongodb
    docs = await db.sample_workflows.find().sort("created_at", -1).to_list(200)
    results = []
    for d in docs:
        row = _clean(d)
        # Enrich with request info
        if row.get("request_id"):
            req = await db.requests.find_one({"id": row["request_id"]}, {"_id": 0, "title": 1, "guest_name": 1, "customer_user_id": 1})
            row["request_title"] = (req or {}).get("title", "")
        results.append(row)
    return results


@router.post("/from-request/{request_id}")
async def create_sample_workflow(request_id: str, payload: dict, request: Request, user: dict = Depends(_require_staff)):
    """Create a sample workflow from a promo_sample request."""
    db = request.app.mongodb
    from services.sample_flow_engine import create_sample_quote_from_request

    req = await db.requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(404, "Request not found")
    if req.get("request_type") != "promo_sample":
        raise HTTPException(400, "Only promo_sample requests can start sample flow")

    vendor_cost = float(payload.get("vendor_cost", 0))
    if vendor_cost <= 0:
        raise HTTPException(400, "vendor_cost required")

    margin_rule = await db.margin_rules.find_one({"scope": "global", "active": True})
    margin_percent = (margin_rule or {}).get("value", 20)

    # Create sample quote
    quote_data = create_sample_quote_from_request(req, vendor_cost, margin_percent)
    now = _now()
    quote_id = str(uuid4())
    quote_number = f"SQ-SAM-{datetime.now(timezone.utc).strftime('%y%m%d')}-{quote_id[:6].upper()}"

    quote_doc = {
        **quote_data,
        "id": quote_id,
        "quote_number": quote_number,
        "customer_user_id": req.get("customer_user_id"),
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now,
    }
    await db.quotes.insert_one(quote_doc)

    # Create sample workflow
    wf_id = str(uuid4())
    wf = {
        "id": wf_id,
        "request_id": request_id,
        "sample_quote_id": quote_id,
        "sample_invoice_id": None,
        "sample_status": "quoted",
        "approved_by_customer": False,
        "approved_by_sales_override": False,
        "approved_by_admin_override": False,
        "actual_order_quote_id": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.sample_workflows.insert_one(wf)

    # Update request
    await db.requests.update_one({"id": request_id}, {"$set": {"status": "quoted", "linked_sample_workflow_id": wf_id, "updated_at": now}})

    return {"ok": True, "sample_workflow_id": wf_id, "sample_quote_id": quote_id, "quote_number": quote_number, "selling_price": quote_data["selling_price"]}


@router.put("/{workflow_id}/update-status")
async def update_sample_status(workflow_id: str, payload: dict, request: Request, user: dict = Depends(_require_staff)):
    """Update sample workflow status. Follows SAMPLE_FLOW progression."""
    from services.sample_flow_engine import SAMPLE_FLOW

    db = request.app.mongodb
    wf = await db.sample_workflows.find_one({"id": workflow_id})
    if not wf:
        raise HTTPException(404, "Sample workflow not found")

    new_status = payload.get("status")
    if new_status not in SAMPLE_FLOW:
        raise HTTPException(400, f"Invalid status. Must be one of: {SAMPLE_FLOW}")

    now = _now()
    updates = {"sample_status": new_status, "updated_at": now}

    await db.sample_workflows.update_one({"id": workflow_id}, {"$set": updates})
    return {"ok": True, "status": new_status}


@router.post("/{workflow_id}/approve")
async def approve_sample(workflow_id: str, payload: dict, request: Request, user: dict = Depends(_require_staff)):
    """Customer approves sample, or sales/admin override."""
    db = request.app.mongodb
    wf = await db.sample_workflows.find_one({"id": workflow_id})
    if not wf:
        raise HTTPException(404, "Sample workflow not found")

    now = _now()
    approval_type = payload.get("approval_type", "customer")  # customer, sales_override, admin_override
    updates = {"updated_at": now, "sample_status": "approved"}

    if approval_type == "customer":
        updates["approved_by_customer"] = True
    elif approval_type == "sales_override":
        updates["approved_by_sales_override"] = True
    elif approval_type == "admin_override":
        updates["approved_by_admin_override"] = True

    await db.sample_workflows.update_one({"id": workflow_id}, {"$set": updates})
    return {"ok": True, "status": "approved", "approval_type": approval_type}


@router.post("/{workflow_id}/create-actual-order-quote")
async def create_actual_order_quote(workflow_id: str, payload: dict, request: Request, user: dict = Depends(_require_staff)):
    """After sample approval, create the actual production order quote."""
    db = request.app.mongodb
    from services.sample_flow_engine import can_progress_to_actual_order, create_actual_order_quote_from_approved_sample

    wf = await db.sample_workflows.find_one({"id": workflow_id})
    if not wf:
        raise HTTPException(404, "Sample workflow not found")

    wf_clean = _clean(wf)
    if not can_progress_to_actual_order(wf_clean):
        raise HTTPException(400, "Sample must be approved before creating actual order quote")

    actual_vendor_cost = float(payload.get("vendor_cost", 0))
    if actual_vendor_cost <= 0:
        raise HTTPException(400, "vendor_cost required for actual order")

    margin_rule = await db.margin_rules.find_one({"scope": "global", "active": True})
    margin_percent = (margin_rule or {}).get("value", 20)

    quote_data = create_actual_order_quote_from_approved_sample(wf_clean, actual_vendor_cost, margin_percent)
    now = _now()
    quote_id = str(uuid4())
    quote_number = f"Q-PRD-{datetime.now(timezone.utc).strftime('%y%m%d')}-{quote_id[:6].upper()}"

    quote_doc = {
        **quote_data,
        "id": quote_id,
        "quote_number": quote_number,
        "customer_user_id": (await db.requests.find_one({"id": wf.get("request_id")}, {"_id": 0, "customer_user_id": 1}) or {}).get("customer_user_id"),
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now,
    }
    await db.quotes.insert_one(quote_doc)

    await db.sample_workflows.update_one({"id": workflow_id}, {"$set": {"actual_order_quote_id": quote_id, "updated_at": now}})

    return {"ok": True, "quote_id": quote_id, "quote_number": quote_number, "selling_price": quote_data["selling_price"]}
