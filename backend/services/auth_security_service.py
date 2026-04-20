"""
Auth Security Service — Password Reset, Rate Limiting, Anti-Bot
Unified across all roles (customer, partner, staff, admin).
"""

import os
import secrets
import logging
from datetime import datetime, timezone, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════
#  PASSWORD RESET TOKEN MANAGEMENT
# ═══════════════════════════════════════════

async def create_password_reset_token(db, email: str) -> dict:
    """
    Generate a one-time password reset token.
    Token expires in 30 minutes. Old tokens for same email are invalidated.
    Returns token info (or None if email not found — but caller must NOT reveal this).
    """
    # Check user exists in any collection
    user = await _find_user_across_collections(db, email)
    if not user:
        # Return None but caller MUST still show neutral message
        logger.info(f"Password reset requested for non-existent email: {email}")
        return None

    # Invalidate any existing tokens for this email
    await db.password_reset_tokens.update_many(
        {"email": email.lower(), "used": False},
        {"$set": {"used": True, "invalidated_at": datetime.now(timezone.utc).isoformat()}}
    )

    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    doc = {
        "token": token,
        "email": email.lower(),
        "user_id": user.get("id") or str(user.get("_id", "")),
        "user_collection": user.get("_source_collection", "users"),
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.password_reset_tokens.insert_one(doc)

    # Audit log
    await _log_auth_event(db, "password_reset_requested", email, {
        "token_id": token[:8] + "...",
        "expires_at": expires_at.isoformat(),
    })

    return {"token": token, "email": email, "expires_at": expires_at.isoformat()}


async def validate_and_use_reset_token(db, token: str, new_password_hash: str) -> dict:
    """
    Validate a password reset token and update the user's password.
    Token is invalidated after use (one-time).
    """
    doc = await db.password_reset_tokens.find_one({"token": token})
    if not doc:
        return {"ok": False, "error": "Invalid or expired reset link"}

    if doc.get("used"):
        return {"ok": False, "error": "This reset link has already been used"}

    expires_at = doc.get("expires_at", "")
    if expires_at:
        exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00")) if isinstance(expires_at, str) else expires_at
        if datetime.now(timezone.utc) > exp_dt:
            return {"ok": False, "error": "This reset link has expired"}

    email = doc.get("email", "")
    collection = doc.get("user_collection", "users")

    # Update password in the correct collection
    if collection == "partner_users":
        result = await db.partner_users.update_one(
            {"email": email},
            {"$set": {"password_hash": new_password_hash}}
        )
    else:
        result = await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": new_password_hash}}
        )

    if result.modified_count == 0:
        return {"ok": False, "error": "User not found"}

    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token": token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Audit log
    await _log_auth_event(db, "password_reset_completed", email, {
        "token_id": token[:8] + "...",
    })

    return {"ok": True, "email": email}


# ═══════════════════════════════════════════
#  RATE LIMITING (in-memory, per-process)
# ═══════════════════════════════════════════

_rate_buckets = defaultdict(list)
_RATE_LIMITS = {
    "forgot_password": {"max": 3, "window_seconds": 300},   # 3 per 5 min
    "login": {"max": 10, "window_seconds": 300},             # 10 per 5 min
    "register": {"max": 5, "window_seconds": 600},           # 5 per 10 min
    "reset_password": {"max": 5, "window_seconds": 300},     # 5 per 5 min
}


def check_rate_limit(action: str, identifier: str) -> bool:
    """
    Returns True if rate limit is OK (allowed).
    Returns False if rate limit exceeded.
    """
    config = _RATE_LIMITS.get(action, {"max": 20, "window_seconds": 60})
    now = datetime.now(timezone.utc).timestamp()
    bucket_key = f"{action}:{identifier}"

    # Prune old entries
    _rate_buckets[bucket_key] = [
        t for t in _rate_buckets[bucket_key]
        if now - t < config["window_seconds"]
    ]

    if len(_rate_buckets[bucket_key]) >= config["max"]:
        return False

    _rate_buckets[bucket_key].append(now)
    return True


# ═══════════════════════════════════════════
#  HONEYPOT VALIDATION
# ═══════════════════════════════════════════

def check_honeypot(payload: dict) -> bool:
    """
    Returns True if honeypot is clean (not a bot).
    Returns False if honeypot field is filled (likely bot).
    Checks multiple common honeypot field names.
    """
    honeypot_fields = ["website", "url", "company_url", "homepage", "fax", "middle_name_2"]
    for field in honeypot_fields:
        if payload.get(field):
            logger.warning(f"Honeypot triggered on field '{field}': {payload[field]}")
            return False
    return True


def check_submission_timing(form_loaded_at: str) -> bool:
    """
    Returns True if timing is human-like (>2 seconds to fill form).
    Returns False if submitted too fast (likely bot).
    """
    if not form_loaded_at:
        return True  # No timing data = allow (backwards compat)
    try:
        loaded = datetime.fromisoformat(form_loaded_at.replace("Z", "+00:00"))
        elapsed = (datetime.now(timezone.utc) - loaded).total_seconds()
        if elapsed < 2.0:
            logger.warning(f"Bot timing detected: form submitted in {elapsed:.1f}s")
            return False
        return True
    except Exception:
        return True  # Parse error = allow


# ═══════════════════════════════════════════
#  EMAIL VERIFICATION
# ═══════════════════════════════════════════

async def create_email_verification_token(db, email: str, user_id: str) -> str:
    """Generate an email verification token."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    await db.email_verification_tokens.insert_one({
        "token": token,
        "email": email.lower(),
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return token


async def verify_email_token(db, token: str) -> dict:
    """Verify an email verification token."""
    doc = await db.email_verification_tokens.find_one({"token": token})
    if not doc:
        return {"ok": False, "error": "Invalid verification link"}

    if doc.get("verified"):
        return {"ok": True, "email": doc.get("email"), "already_verified": True}

    expires_at = doc.get("expires_at", "")
    if expires_at:
        exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00")) if isinstance(expires_at, str) else expires_at
        if datetime.now(timezone.utc) > exp_dt:
            return {"ok": False, "error": "Verification link has expired"}

    # Mark as verified
    await db.email_verification_tokens.update_one(
        {"token": token},
        {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Update user email_verified flag
    await db.users.update_one(
        {"email": doc["email"]},
        {"$set": {"email_verified": True}}
    )

    return {"ok": True, "email": doc.get("email")}


# ═══════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════

async def _find_user_across_collections(db, email: str) -> dict:
    """Find user across all auth collections."""
    email_lower = email.lower()

    # 1. Main users collection (customers, admin, staff)
    user = await db.users.find_one({"email": email_lower})
    if user:
        user["_source_collection"] = "users"
        return user

    # Case-insensitive fallback
    user = await db.users.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})
    if user:
        user["_source_collection"] = "users"
        return user

    # 2. Partner users collection
    partner = await db.partner_users.find_one({"email": email_lower})
    if not partner:
        partner = await db.partner_users.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})
    if partner:
        partner["_source_collection"] = "partner_users"
        return partner

    return None


async def _log_auth_event(db, event_type: str, email: str, details: dict = None):
    """Audit log for auth events."""
    await db.auth_audit_log.insert_one({
        "event": event_type,
        "email": email,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def ensure_auth_indexes(db):
    """Create indexes for auth security collections."""
    try:
        await db.password_reset_tokens.create_index("token")
        await db.password_reset_tokens.create_index("email")
        await db.email_verification_tokens.create_index("token")
        await db.auth_audit_log.create_index("timestamp")
        logger.info("Auth security indexes ensured")
    except Exception as e:
        logger.warning(f"Auth index creation: {e}")
