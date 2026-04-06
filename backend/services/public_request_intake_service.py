"""
Public Request Intake Service
Central intake writer for all public-facing forms.
All submissions write to the unified `requests` collection.

Supported types: contact_general, service_quote, business_pricing,
                 product_bulk, promo_custom, promo_sample
"""
import logging
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

logger = logging.getLogger("public_request_intake")

VALID_PUBLIC_REQUEST_TYPES = {
    "contact_general",
    "service_quote",
    "business_pricing",
    "product_bulk",
    "promo_custom",
    "promo_sample",
    "marketplace_order",
}


def _now():
    return datetime.now(timezone.utc)


def _request_number():
    now = _now()
    short = uuid4().hex[:6].upper()
    return f"REQ-{now.strftime('%y%m%d')}-{short}"


def normalize_phone(prefix: str, number: str) -> str:
    prefix = (prefix or "+255").strip()
    number = (number or "").strip().replace(" ", "")
    if number.startswith("+"):
        return number
    if number.startswith("0"):
        number = number[1:]
    return f"{prefix}{number}"


async def create_public_request(db, payload: dict, user: Optional[dict] = None) -> dict:
    """
    Central public intake writer.
    Writes into `requests` so Sales/Admin see all public submissions in one queue.
    """
    request_type = (payload.get("request_type") or "").strip()
    if request_type not in VALID_PUBLIC_REQUEST_TYPES:
        raise ValueError(f"Unsupported request_type: {request_type}")

    now = _now()
    request_id = str(uuid4())

    guest_email = (payload.get("guest_email") or payload.get("email") or "").strip().lower()
    guest_name = (payload.get("guest_name") or payload.get("name") or payload.get("full_name") or "").strip()
    phone = normalize_phone(payload.get("phone_prefix", "+255"), payload.get("phone", ""))

    customer_user_id = user.get("id") if user else None
    source_channel = payload.get("source_channel") or ("customer_account" if user else "public_frontend")

    doc = {
        "id": request_id,
        "request_number": _request_number(),
        "request_type": request_type,
        "subtype": payload.get("subtype"),
        "title": payload.get("title") or payload.get("subject") or f"{request_type.replace('_', ' ').title()} Request",
        "status": "submitted",
        "crm_stage": "new",
        "contact_status": "pending",
        "source_channel": source_channel,
        "source_page": payload.get("source_page", ""),
        "source_service_slug": payload.get("service_slug"),
        "customer_user_id": customer_user_id,
        "guest_email": guest_email or None,
        "guest_name": guest_name or None,
        "phone_prefix": payload.get("phone_prefix") or "+255",
        "phone": phone,
        "company_name": payload.get("company_name") or payload.get("company") or "",
        "assigned_sales_owner_id": None,
        "linked_lead_id": None,
        "linked_quote_id": None,
        "budget_amount": payload.get("budget_amount"),
        "budget_currency": payload.get("budget_currency", "TZS"),
        "service_name": payload.get("service_name") or "",
        "details": payload.get("details", {}),
        "notes": payload.get("notes") or payload.get("message") or "",
        "timeline": [
            {
                "key": "submitted",
                "label": "Request submitted",
                "at": now.isoformat(),
                "by": customer_user_id or guest_email or "public_user",
            }
        ],
        "created_at": now,
        "updated_at": now,
    }

    await db.requests.insert_one(doc)
    logger.info("[public_intake] created request %s type=%s email=%s", doc["request_number"], request_type, guest_email)

    # --- Ownership Routing: resolve sales owner ---
    try:
        from services.ownership_routing_service import resolve_owner
        resolution = await resolve_owner(
            db,
            email=guest_email or (user.get("email", "") if user else ""),
            phone=phone or "",
            company_name=doc.get("company_name", ""),
            contact_name=guest_name or (user.get("full_name", "") if user else ""),
            created_by="public_request_intake",
        )
        if resolution.get("owner_sales_id"):
            await db.requests.update_one(
                {"id": request_id},
                {"$set": {
                    "assigned_sales_owner_id": resolution["owner_sales_id"],
                    "sales_owner_id": resolution["owner_sales_id"],
                    "ownership_company_id": resolution.get("company_id", ""),
                    "ownership_resolution": resolution.get("resolution_type", ""),
                }}
            )
    except Exception:
        pass  # Graceful fallback — don't block request creation

    # Auto-link or create invited account for guests
    invite_info = None
    if not customer_user_id and guest_email:
        invite_info = await _ensure_invited_account(db, request_id, guest_email, guest_name)

    return {
        "ok": True,
        "request_id": request_id,
        "request_number": doc["request_number"],
        "request_type": request_type,
        "status": doc["status"],
        "account_invite": invite_info,
    }


async def _ensure_invited_account(db, request_id: str, guest_email: str, guest_name: str):
    """Create or link an invited user account for the guest submitter."""
    now = _now()
    user = await db.users.find_one({"email": guest_email})

    if user and user.get("account_status") == "active":
        await db.requests.update_one(
            {"id": request_id},
            {"$set": {"customer_user_id": user.get("id"), "updated_at": now}},
        )
        return None

    if not user:
        user_id = str(uuid4())
        user = {
            "id": user_id,
            "email": guest_email,
            "full_name": guest_name,
            "role": "customer",
            "account_status": "invited",
            "created_at": now,
            "updated_at": now,
        }
        await db.users.insert_one(user)
    else:
        user_id = user.get("id", str(user.get("_id", "")))

    await db.requests.update_one(
        {"id": request_id},
        {"$set": {"customer_user_id": user_id, "updated_at": now}},
    )

    existing_invite = await db.customer_invites.find_one({
        "customer_user_id": user_id,
        "status": "pending",
    })
    if existing_invite:
        token = existing_invite.get("invite_token")
    else:
        token = secrets.token_urlsafe(24)
        await db.customer_invites.insert_one({
            "id": str(uuid4()),
            "customer_user_id": user_id,
            "customer_email": guest_email,
            "customer_name": guest_name,
            "invite_token": token,
            "status": "pending",
            "expires_at": (now + timedelta(days=7)).isoformat(),
            "created_at": now,
        })

    frontend = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", ""))
    return {
        "invite_token": token,
        "invite_url": f"{frontend.rstrip('/')}/activate-account?token={token}",
    }
