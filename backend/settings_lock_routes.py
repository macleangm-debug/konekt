"""
Settings Lock — Password-gated access to sensitive settings.
Admin must enter password to unlock for a time-limited session.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
import bcrypt

router = APIRouter(prefix="/api/admin/settings-lock", tags=["Settings Lock"])


@router.post("/unlock")
async def unlock_settings(request: Request):
    """Verify admin password and create a time-limited unlock session."""
    db = request.app.mongodb
    body = await request.json()
    email = body.get("email", "")
    password = body.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    pw_hash = user.get("password_hash", "")
    if not pw_hash or not bcrypt.checkpw(password.encode("utf-8"), pw_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid password")

    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=15)

    session = {
        "user_id": user["id"],
        "email": email,
        "unlocked_at": now.isoformat(),
        "expires_at": expires.isoformat(),
    }

    await db.settings_unlock_sessions.delete_many({"email": email})
    await db.settings_unlock_sessions.insert_one(session)

    return {"ok": True, "expires_at": expires.isoformat(), "minutes": 15}


@router.get("/status")
async def check_lock_status(request: Request, email: str = ""):
    """Check if settings are currently unlocked for the given admin email."""
    if not email:
        return {"unlocked": False}

    db = request.app.mongodb
    session = await db.settings_unlock_sessions.find_one(
        {"email": email}, {"_id": 0}
    )
    if not session:
        return {"unlocked": False}

    expires = session.get("expires_at", "")
    try:
        exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > exp_dt:
            await db.settings_unlock_sessions.delete_one({"email": email})
            return {"unlocked": False, "reason": "expired"}
    except ValueError:
        return {"unlocked": False}

    return {"unlocked": True, "expires_at": expires}


@router.post("/lock")
async def lock_settings(request: Request):
    """Manually re-lock settings."""
    db = request.app.mongodb
    body = await request.json()
    email = body.get("email", "")
    if email:
        await db.settings_unlock_sessions.delete_many({"email": email})
    return {"ok": True, "unlocked": False}
