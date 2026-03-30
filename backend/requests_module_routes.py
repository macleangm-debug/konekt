"""
Requests Module Routes
Public + authenticated request creation.
Sales/admin management: list, assign, convert to quote.
Types: product_bulk, promo_custom, promo_sample, service_quote
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import os

router = APIRouter(tags=["Requests Module"])
_security = HTTPBearer(auto_error=False)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def _optional_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(_security)):
    if not credentials:
        return None
    JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


async def _require_staff(request: Request, credentials: HTTPAuthorizationCredentials = Depends(_security)):
    if not credentials:
        raise HTTPException(401, "Authentication required")
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


# ─────────────────────────────────────────────
# Public / Authenticated Request Creation
# ─────────────────────────────────────────────

@router.post("/api/requests")
async def create_request(payload: dict, request: Request, user: dict = Depends(_optional_user)):
    """
    Create a request. Works for both guests and authenticated users.
    Types: product_bulk, promo_custom, promo_sample, service_quote
    """
    db = request.app.mongodb
    request_type = payload.get("request_type")
    valid_types = {"product_bulk", "promo_custom", "promo_sample", "service_quote", "contact_general", "business_pricing"}
    if request_type not in valid_types:
        raise HTTPException(400, f"request_type must be one of: {valid_types}")

    now = _now()
    req_id = str(uuid4())
    req_number = f"REQ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{req_id[:6].upper()}"

    # Determine source channel
    if user:
        source_channel = "customer_account"
        customer_user_id = user.get("id")
        guest_email = None
        guest_name = None
    else:
        source_channel = "public_frontend"
        customer_user_id = None
        guest_email = (payload.get("guest_email") or "").strip().lower()
        guest_name = payload.get("guest_name", "")

    doc = {
        "id": req_id,
        "request_number": req_number,
        "request_type": request_type,
        "source_channel": payload.get("source_channel") or source_channel,
        "customer_user_id": customer_user_id,
        "guest_email": guest_email,
        "guest_name": guest_name,
        "title": payload.get("title", f"{request_type.replace('_', ' ').title()} Request"),
        "status": "submitted",
        "sales_owner_id": None,
        "details": payload.get("details", {}),
        "notes": payload.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }
    await db.requests.insert_one(doc)

    # If guest, also create invited account
    invite_info = None
    if guest_email and not customer_user_id:
        existing_user = await db.users.find_one({"email": guest_email, "account_status": "active"})
        if not existing_user:
            from services.guest_checkout_activation_service import build_guest_checkout_account_invite, build_guest_activation_url
            invited_user = await db.users.find_one({"email": guest_email})
            if not invited_user:
                cust_id = str(uuid4())
                invited_user = {
                    "id": cust_id, "email": guest_email, "full_name": guest_name,
                    "role": "customer", "account_status": "invited",
                    "created_at": now, "updated_at": now,
                }
                await db.users.insert_one(invited_user)
            else:
                cust_id = invited_user.get("id", str(invited_user.get("_id", "")))

            # Update request with customer_user_id
            await db.requests.update_one({"id": req_id}, {"$set": {"customer_user_id": cust_id}})

            import secrets
            token = secrets.token_urlsafe(24)
            await db.customer_invites.insert_one({
                "id": str(uuid4()), "customer_user_id": cust_id, "customer_email": guest_email,
                "customer_name": guest_name, "invite_token": token, "status": "pending",
                "expires_at": (datetime.now(timezone.utc) + __import__("datetime").timedelta(days=7)).isoformat(),
                "created_at": now,
            })
            base_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", ""))
            invite_info = {"invite_token": token, "invite_url": f"{base_url}/activate-account?token={token}"}

    return {"ok": True, "request_id": req_id, "request_number": req_number, "status": "submitted", "account_invite": invite_info}


@router.get("/api/requests/ctas")
async def get_request_ctas():
    """Get CTA button configuration for each product category."""
    from services.request_cta_registry import FRONTEND_REQUEST_CTAS, ACCOUNT_SHORTCUT_CTAS
    return {"public": FRONTEND_REQUEST_CTAS, "account_shortcuts": ACCOUNT_SHORTCUT_CTAS}


# ─────────────────────────────────────────────
# Sales/Admin Requests Module
# ─────────────────────────────────────────────

@router.get("/api/admin/requests")
async def list_requests(
    request: Request,
    user: dict = Depends(_require_staff),
    request_type: Optional[str] = None,
    status: Optional[str] = None,
):
    """List all requests for sales/admin."""
    db = request.app.mongodb
    query = {}
    if request_type:
        query["request_type"] = request_type
    if status:
        query["status"] = status

    docs = await db.requests.find(query).sort("created_at", -1).to_list(500)
    results = []
    for doc in docs:
        row = _clean(doc)
        # Enrich with customer name
        if row.get("customer_user_id"):
            cust = await db.users.find_one({"id": row["customer_user_id"]}, {"_id": 0, "full_name": 1, "email": 1})
            row["customer_name"] = (cust or {}).get("full_name", row.get("guest_name", ""))
            row["customer_email"] = (cust or {}).get("email", row.get("guest_email", ""))
        else:
            row["customer_name"] = row.get("guest_name", "")
            row["customer_email"] = row.get("guest_email", "")
        results.append(row)
    return results


@router.get("/api/admin/requests/{request_id}")
async def get_request_detail(request_id: str, request: Request, user: dict = Depends(_require_staff)):
    db = request.app.mongodb
    doc = await db.requests.find_one({"id": request_id})
    if not doc:
        raise HTTPException(404, "Request not found")
    return _clean(doc)


@router.put("/api/admin/requests/{request_id}/assign")
async def assign_sales_owner(request_id: str, payload: dict, request: Request, user: dict = Depends(_require_staff)):
    """Assign a sales owner to a request."""
    db = request.app.mongodb
    sales_user_id = payload.get("sales_owner_id")
    now = _now()
    result = await db.requests.update_one(
        {"id": request_id},
        {"$set": {"sales_owner_id": sales_user_id, "status": "under_review", "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Request not found")
    return {"ok": True}


@router.post("/api/admin/requests/{request_id}/create-quote")
async def create_quote_from_request(request_id: str, payload: dict, request: Request, user: dict = Depends(_require_staff)):
    """Sales creates a quote from a request. Enters vendor cost, margin auto-applied."""
    db = request.app.mongodb
    from services.request_to_quote_service import create_quote_from_request as build_quote
    from services.margin_calculator import calculate_selling_price

    req = await db.requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(404, "Request not found")

    vendor_cost = float(payload.get("vendor_cost", 0))
    if vendor_cost <= 0:
        raise HTTPException(400, "vendor_cost required")

    # Get margin rule
    margin_rule = await db.margin_rules.find_one({"scope": "global", "active": True})
    margin_percent = (margin_rule or {}).get("value", 20)

    quote_data = build_quote(req, vendor_cost, margin_percent)
    now = _now()
    quote_id = str(uuid4())
    quote_number = f"Q-{datetime.now(timezone.utc).strftime('%y%m%d')}-{quote_id[:6].upper()}"

    quote_doc = {
        **quote_data,
        "id": quote_id,
        "quote_number": quote_number,
        "created_by": user.get("id"),
        "created_by_name": user.get("full_name", ""),
        "created_at": now,
        "updated_at": now,
    }
    await db.quotes.insert_one(quote_doc)

    # Update request status
    await db.requests.update_one({"id": request_id}, {"$set": {"status": "quoted", "linked_quote_id": quote_id, "updated_at": now}})

    return {"ok": True, "quote_id": quote_id, "quote_number": quote_number, "selling_price": quote_data["selling_price"]}


@router.post("/api/admin/requests/{request_id}/convert-to-lead")
async def convert_request_to_lead(request_id: str, request: Request, user: dict = Depends(_require_staff)):
    """Convert a request into a CRM lead."""
    db = request.app.mongodb
    from services.request_crm_bridge_service import convert_request_to_lead as crm_convert

    req = await db.requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(404, "Request not found")

    req.pop("_id", None)
    lead = await crm_convert(db, req, user)
    lead.pop("_id", None)
    return {"ok": True, "lead_id": lead.get("id"), "request_id": request_id}


@router.put("/api/admin/requests/{request_id}/status")
async def update_request_status(request_id: str, payload: dict, request: Request, user: dict = Depends(_require_staff)):
    """Update request CRM stage/status."""
    db = request.app.mongodb
    now = _now()
    updates = {"updated_at": now}
    if payload.get("status"):
        updates["status"] = payload["status"]
    if payload.get("crm_stage"):
        updates["crm_stage"] = payload["crm_stage"]
    if payload.get("contact_status"):
        updates["contact_status"] = payload["contact_status"]

    result = await db.requests.update_one({"id": request_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Request not found")
    return {"ok": True}
