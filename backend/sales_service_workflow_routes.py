"""
Sales Service Workflow + Customer Invite Routes
- Sales creates customers with invite flow
- Sales creates service quotes (vendor cost only, margin auto-applied)
- Quote acceptance → auto-creates invoice with service payment terms
- Vendor release after advance payment threshold
"""
from datetime import datetime, timezone
from uuid import uuid4
import secrets
import os
import jwt
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/sales", tags=["Sales Service Workflow"])
_security = HTTPBearer()


async def _get_sales_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(_security)):
    JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        role = user.get("role", "customer")
        if role not in ("admin", "sales", "staff"):
            raise HTTPException(403, "Sales access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def _now():
    return datetime.now(timezone.utc).isoformat()


def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


# ─────────────────────────────────────────────
# 1. Customer Creation + Invite
# ─────────────────────────────────────────────

@router.post("/customers/create-with-invite")
async def create_customer_with_invite(payload: dict, request: Request, user: dict = Depends(_get_sales_user)):
    """
    Sales creates a new customer account + generates invite token.
    Customer receives invite link to set password and activate.
    """
    db = request.app.mongodb
    email = (payload.get("email") or "").strip().lower()
    full_name = payload.get("full_name", "").strip()
    phone = payload.get("phone", "").strip()
    company = payload.get("company", "").strip()

    if not email:
        raise HTTPException(400, "Email is required")
    if not full_name:
        raise HTTPException(400, "Full name is required")

    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(409, f"User with email {email} already exists")

    now = _now()
    customer_id = str(uuid4())
    invite_token = secrets.token_urlsafe(32)

    # Create user account (status: invited, no password yet)
    user_doc = {
        "id": customer_id,
        "email": email,
        "full_name": full_name,
        "phone": phone,
        "company": company,
        "role": "customer",
        "account_status": "invited",
        "created_by_sales_user_id": user.get("id"),
        "created_at": now,
        "updated_at": now,
    }
    await db.users.insert_one(user_doc)

    # Create invite record
    from datetime import timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    invite_doc = {
        "id": str(uuid4()),
        "customer_user_id": customer_id,
        "customer_email": email,
        "customer_name": full_name,
        "created_by_sales_user_id": user.get("id"),
        "invite_token": invite_token,
        "status": "pending",
        "expires_at": expires_at,
        "accepted_at": None,
        "created_at": now,
    }
    await db.customer_invites.insert_one(invite_doc)

    # Build invite URL
    frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", ""))
    invite_url = f"{frontend_url}/activate-account?token={invite_token}"

    # Log email (mocked — actual email dispatch requires Resend/SMTP integration)
    email_log = {
        "id": str(uuid4()),
        "to": email,
        "subject": "Your Konekt account has been created",
        "body": f"Hello {full_name}, your Konekt account has been created. Activate here: {invite_url}",
        "status": "logged",
        "created_at": now,
    }
    await db.email_logs.insert_one(email_log)

    return {
        "ok": True,
        "customer_id": customer_id,
        "invite_token": invite_token,
        "invite_url": invite_url,
        "email_status": "logged (email sending mocked)",
        "customer": {
            "id": customer_id,
            "email": email,
            "full_name": full_name,
            "phone": phone,
            "company": company,
            "account_status": "invited",
        }
    }


@router.post("/customers/{customer_id}/resend-invite")
async def resend_customer_invite(customer_id: str, request: Request, user: dict = Depends(_get_sales_user)):
    """Resend invite to a customer (regenerate token if expired)."""
    db = request.app.mongodb
    invite = await db.customer_invites.find_one({"customer_user_id": customer_id, "status": "pending"})
    if not invite:
        raise HTTPException(404, "No pending invite found for this customer")

    now = _now()
    # Check if expired, regenerate token
    from datetime import timedelta
    new_token = secrets.token_urlsafe(32)
    new_expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    await db.customer_invites.update_one(
        {"customer_user_id": customer_id, "status": "pending"},
        {"$set": {"invite_token": new_token, "expires_at": new_expires, "updated_at": now}}
    )

    frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", ""))
    invite_url = f"{frontend_url}/activate-account?token={new_token}"

    return {"ok": True, "invite_url": invite_url, "new_token": new_token}


@router.get("/customers/invites")
async def list_customer_invites(request: Request, user: dict = Depends(_get_sales_user)):
    """List all customer invites created by this sales user."""
    db = request.app.mongodb
    query = {}
    if user.get("role") == "sales":
        query["created_by_sales_user_id"] = user["id"]
    invites = await db.customer_invites.find(query).sort("created_at", -1).to_list(200)
    return [_clean(i) for i in invites]


# ─────────────────────────────────────────────
# 2. Account Activation (public, no auth)
# ─────────────────────────────────────────────

# This is a separate public route, registered outside _get_sales_user


# ─────────────────────────────────────────────
# 3. Service Quote (vendor cost only, auto-margin)
# ─────────────────────────────────────────────

@router.post("/service-quotes")
async def create_service_quote(payload: dict, request: Request, user: dict = Depends(_get_sales_user)):
    """
    Sales creates a service quote. Enters vendor cost only.
    System auto-applies margin from margin_rules.
    Customer sees only final selling price.
    """
    db = request.app.mongodb
    from services.margin_calculator import calculate_selling_price as calc_price
    from services.service_phase_payment_setup import build_service_phase_plan

    customer_id = payload.get("customer_id")
    service_name = payload.get("service_name", "")
    vendor_cost = float(payload.get("vendor_cost", 0))
    vendor_id = payload.get("vendor_id")
    advance_percent = float(payload.get("advance_percent", 50))
    notes = payload.get("notes", "")

    if vendor_cost <= 0:
        raise HTTPException(400, "vendor_cost must be greater than 0")
    if not customer_id:
        raise HTTPException(400, "customer_id is required")

    # Get margin rule (product-level > group-level > global)
    margin_rule = await db.margin_rules.find_one({"scope": "global", "active": True})
    margin_method = (margin_rule or {}).get("method", "percentage")
    margin_value = (margin_rule or {}).get("value", 20)

    # Calculate selling price
    selling_price = calc_price(vendor_cost, margin_rule)
    margin_amount = round(selling_price - vendor_cost, 2)

    # Build payment terms
    payment_terms = build_service_phase_plan(selling_price, advance_percent)

    now = _now()
    quote_id = str(uuid4())
    quote_number = f"SQ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{quote_id[:6].upper()}"

    quote_doc = {
        "id": quote_id,
        "quote_number": quote_number,
        "type": "service",
        "customer_id": customer_id,
        "vendor_id": vendor_id,
        "service_name": service_name,
        "vendor_cost": vendor_cost,
        "margin_method": margin_method,
        "margin_value": margin_value,
        "margin_amount": margin_amount,
        "selling_price": selling_price,
        "payment_terms": payment_terms,
        "advance_percent": advance_percent,
        "notes": notes,
        "status": "draft",
        "created_by": user.get("id"),
        "created_by_name": user.get("full_name", ""),
        "margin_applied_automatically": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.quotes.insert_one(quote_doc)

    return _clean(quote_doc)


@router.post("/service-quotes/{quote_id}/send")
async def send_service_quote(quote_id: str, request: Request, user: dict = Depends(_get_sales_user)):
    """Send a draft service quote to the customer."""
    db = request.app.mongodb
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote.get("status") not in ("draft",):
        raise HTTPException(400, "Quote already sent or accepted")

    now = _now()
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "sent", "sent_at": now, "updated_at": now}})

    # Create customer notification
    customer_id = quote.get("customer_id")
    if customer_id:
        await db.notifications.insert_one({
            "id": str(uuid4()),
            "user_id": customer_id,
            "role": "customer",
            "event_type": "quote_sent",
            "title": "New Service Quote",
            "message": f"You have a new service quote ({quote.get('quote_number')}) to review.",
            "target_url": "/account/quotes",
            "read": False,
            "created_at": now,
        })

    return {"ok": True, "status": "sent"}


@router.post("/service-quotes/{quote_id}/accept")
async def accept_service_quote(quote_id: str, request: Request):
    """
    Customer or sales accepts a service quote.
    Auto-creates invoice with service payment terms.
    """
    db = request.app.mongodb
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote.get("status") not in ("sent", "draft"):
        raise HTTPException(400, f"Quote cannot be accepted (current status: {quote.get('status')})")

    now = _now()
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}})

    # Auto-create invoice from accepted quote
    invoice_id = str(uuid4())
    inv_number = f"INV-{datetime.now(timezone.utc).strftime('%y%m%d')}-{invoice_id[:6].upper()}"

    customer = await db.users.find_one({"id": quote.get("customer_id")}, {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "company": 1})

    invoice_doc = {
        "id": invoice_id,
        "invoice_number": inv_number,
        "type": "service",
        "quote_id": quote_id,
        "quote_number": quote.get("quote_number"),
        "customer_id": quote.get("customer_id"),
        "customer_name": (customer or {}).get("full_name", ""),
        "customer_email": (customer or {}).get("email", ""),
        "total_amount": quote.get("selling_price"),
        "status": "pending_payment",
        "payment_status": "awaiting_payment_proof",
        "payment_terms": quote.get("payment_terms"),
        "advance_percent": quote.get("advance_percent", 50),
        "items": [{
            "name": quote.get("service_name"),
            "description": f"Service: {quote.get('service_name')}",
            "quantity": 1,
            "unit_price": quote.get("selling_price"),
            "total": quote.get("selling_price"),
        }],
        "auto_created_from_quote": True,
        "vendor_id": quote.get("vendor_id"),
        "vendor_cost": quote.get("vendor_cost"),
        "created_at": now,
        "updated_at": now,
    }
    await db.invoices.insert_one(invoice_doc)

    # Notify customer
    if quote.get("customer_id"):
        await db.notifications.insert_one({
            "id": str(uuid4()),
            "user_id": quote.get("customer_id"),
            "role": "customer",
            "event_type": "invoice_created",
            "title": "Invoice Ready",
            "message": f"Invoice {inv_number} has been created for your accepted quote.",
            "target_url": "/account/invoices",
            "read": False,
            "created_at": now,
        })

    return {
        "ok": True,
        "quote_status": "accepted",
        "invoice_id": invoice_id,
        "invoice_number": inv_number,
        "total_amount": quote.get("selling_price"),
        "payment_terms": quote.get("payment_terms"),
    }
