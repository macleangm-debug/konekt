"""
Pack 7 — Guest Identity Link Service (Hardened)
Hardens the guest-to-invited-account flow.
Preserves current activation behavior.

Used by: customer_order_routes.py, requests_module_routes.py
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

logger = logging.getLogger("guest_identity_link")


def build_guest_checkout_account_invite(checkout: dict, customer_user: dict) -> dict:
    """Build an invite link for a guest checkout → account activation."""
    token = secrets.token_urlsafe(24)
    return {
        "guest_email": checkout.get("email"),
        "customer_user_id": customer_user.get("id"),
        "checkout_id": checkout.get("id"),
        "request_id": checkout.get("request_id"),
        "invite_token": token,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }


def build_guest_activation_url(base_url: str, invite_token: str) -> str:
    """Build the frontend activation URL."""
    return f"{base_url.rstrip('/')}/activate-account?token={invite_token}"


async def ensure_invited_user(db, email: str, full_name: str = "", phone: str = "") -> dict:
    """
    Ensure an invited user record exists for the given email.
    Returns the user document (existing or newly created).
    Does NOT overwrite active accounts.
    """
    email = (email or "").strip().lower()
    if not email:
        logger.warning("[guest_identity_link] empty email passed to ensure_invited_user")
        return {}

    # Check for active account first — never overwrite
    active = await db.users.find_one({"email": email, "account_status": "active"})
    if active:
        logger.info("[guest_identity_link] active account exists for %s, skipping invite", email)
        return {"id": active.get("id", str(active.get("_id", ""))), "already_active": True}

    # Check for existing invited user
    existing = await db.users.find_one({"email": email})
    if existing:
        logger.info("[guest_identity_link] invited user already exists for %s", email)
        return {"id": existing.get("id", str(existing.get("_id", ""))), "already_exists": True}

    # Create new invited user
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "phone": phone,
        "role": "customer",
        "account_status": "invited",
        "created_at": now,
        "updated_at": now,
    }
    await db.users.insert_one(user_doc)
    logger.info("[guest_identity_link] created invited user %s for %s", user_id, email)
    return {"id": user_id, "created": True}


async def create_guest_account_link(db, guest_email: str, order_id: str = None, request_id: str = None, customer_name: str = "", customer_phone: str = "") -> dict:
    """
    Full flow: ensure invited user + create link + create customer invite.
    Returns invite_info dict or None if user already active.
    """
    user_result = await ensure_invited_user(db, guest_email, full_name=customer_name, phone=customer_phone)
    if not user_result or user_result.get("already_active"):
        return None

    customer_id = user_result["id"]

    checkout_data = {"email": guest_email, "id": order_id, "request_id": request_id}
    user_ref = {"id": customer_id}
    link = build_guest_checkout_account_invite(checkout_data, user_ref)
    link["id"] = str(uuid4())
    await db.guest_checkout_account_links.insert_one(link)

    await db.customer_invites.insert_one({
        "id": str(uuid4()),
        "customer_user_id": customer_id,
        "customer_email": guest_email,
        "customer_name": customer_name,
        "created_by_sales_user_id": None,
        "invite_token": link["invite_token"],
        "status": "pending",
        "expires_at": link.get("expires_at"),
        "accepted_at": None,
        "created_at": link["created_at"],
    })

    import os
    base_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", ""))
    invite_url = build_guest_activation_url(base_url, link["invite_token"])

    logger.info("[guest_identity_link] account link created for %s, token=%s", guest_email, link["invite_token"])

    return {
        "invite_token": link["invite_token"],
        "invite_url": invite_url,
        "customer_id": customer_id,
    }
