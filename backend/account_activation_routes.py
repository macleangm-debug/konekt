"""
Account Activation Routes (public, no auth required)
Customer activates account via invite token, sets password.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
import bcrypt

router = APIRouter(prefix="/api/auth", tags=["Account Activation"])


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.get("/activate/validate")
async def validate_activation_token(token: str, request: Request):
    """Validate an activation token without consuming it."""
    db = request.app.mongodb
    invite = await db.customer_invites.find_one({"invite_token": token})
    if not invite:
        raise HTTPException(400, "Invalid activation token")

    if invite.get("status") == "accepted":
        raise HTTPException(400, "This invitation has already been used")

    if invite.get("status") == "expired" or invite.get("status") == "cancelled":
        raise HTTPException(400, "This invitation has expired or been cancelled")

    # Check expiry
    expires_at = invite.get("expires_at", "")
    if expires_at:
        from datetime import datetime as dt
        try:
            exp = dt.fromisoformat(expires_at.replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                await db.customer_invites.update_one({"invite_token": token}, {"$set": {"status": "expired"}})
                raise HTTPException(400, "This invitation has expired")
        except (ValueError, TypeError):
            pass

    return {
        "valid": True,
        "customer_name": invite.get("customer_name"),
        "customer_email": invite.get("customer_email"),
    }


@router.post("/activate")
async def activate_account(payload: dict, request: Request):
    """
    Customer sets password and activates their account.
    Input: { "token": "...", "password": "..." }
    """
    db = request.app.mongodb
    token = payload.get("token", "").strip()
    password = payload.get("password", "").strip()

    if not token:
        raise HTTPException(400, "Token is required")
    if not password or len(password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    invite = await db.customer_invites.find_one({"invite_token": token})
    if not invite:
        raise HTTPException(400, "Invalid activation token")

    if invite.get("status") == "accepted":
        raise HTTPException(400, "This invitation has already been used")

    if invite.get("status") in ("expired", "cancelled"):
        raise HTTPException(400, "This invitation has expired or been cancelled")

    # Check expiry
    expires_at = invite.get("expires_at", "")
    if expires_at:
        from datetime import datetime as dt
        try:
            exp = dt.fromisoformat(expires_at.replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                await db.customer_invites.update_one({"invite_token": token}, {"$set": {"status": "expired"}})
                raise HTTPException(400, "This invitation has expired")
        except (ValueError, TypeError):
            pass

    # Activate the account
    now = _now()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    await db.users.update_one(
        {"id": invite.get("customer_user_id")},
        {"$set": {
            "password_hash": password_hash,
            "account_status": "active",
            "is_active": True,
            "activated_at": now,
            "updated_at": now,
        }}
    )

    # Mark invite as accepted
    await db.customer_invites.update_one(
        {"invite_token": token},
        {"$set": {"status": "accepted", "accepted_at": now}}
    )

    return {
        "ok": True,
        "message": "Account activated successfully. You can now log in.",
        "customer_email": invite.get("customer_email"),
        "customer_name": invite.get("customer_name"),
    }
