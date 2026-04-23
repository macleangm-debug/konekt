"""
System Notification Control — Admin-only.

Provides:
  • Get/save system-wide enable/disable toggles per event-key × channel
  • Resend status + test email endpoint
  • Grouped event catalog (same structure as per-user prefs, plus every event for every role)

Backed by db.system_notification_config (one doc per event_key).  The dispatcher in
services/notification_multichannel_service.get_system_config reads it with defaults = ON.
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import jwt

from services.notification_multichannel_service import EVENT_CATALOG

router = APIRouter(prefix="/api/admin/notification-system", tags=["Notification System Control"])

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")
logger = logging.getLogger("notif_system")


async def _assert_admin(request: Request) -> dict:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") not in ("admin", "vendor_ops", "ops"):
        raise HTTPException(status_code=403, detail="Admin/Ops only")
    return payload


@router.get("/config")
async def get_system_config(request: Request):
    """Return grouped event catalog × current toggles.  Categories come from EVENT_CATALOG.group."""
    await _assert_admin(request)

    # Load current toggles
    stored = {d["event_key"]: d async for d in db.system_notification_config.find({}, {"_id": 0})}

    groups: dict[str, list] = {}
    for event_key, meta in EVENT_CATALOG.items():
        group = meta.get("group", "Other")
        cfg = stored.get(event_key, {})
        groups.setdefault(group, []).append({
            "event_key": event_key,
            "label": meta["label"],
            "roles": meta["roles"],
            "in_app_enabled": cfg.get("in_app_enabled", True),
            "email_enabled": cfg.get("email_enabled", True),
            "whatsapp_enabled": cfg.get("whatsapp_enabled", True),
            "updated_at": cfg.get("updated_at"),
            "updated_by": cfg.get("updated_by"),
        })

    # Channel availability
    resend_configured = bool(os.getenv("RESEND_API_KEY")) and bool(os.getenv("RESEND_FROM_EMAIL"))
    twilio_configured = all([
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN"),
        os.getenv("TWILIO_WHATSAPP_FROM"),
    ])

    return {
        "groups": groups,
        "total_events": len(EVENT_CATALOG),
        "channels": {
            "in_app": True,
            "email": resend_configured,
            "whatsapp": twilio_configured,
            "resend_from_email": os.getenv("RESEND_FROM_EMAIL", ""),
        },
    }


class ToggleItem(BaseModel):
    event_key: str
    channel: str   # "in_app" | "email" | "whatsapp"
    enabled: bool


class BulkTogglePayload(BaseModel):
    toggles: list[ToggleItem]


@router.put("/config")
async def save_system_config(payload: BulkTogglePayload, request: Request):
    """Set one or more system-wide toggles in a single call."""
    admin = await _assert_admin(request)
    actor = admin.get("email") or admin.get("user_id") or "admin"
    now = datetime.now(timezone.utc).isoformat()

    ALLOWED = {"in_app", "email", "whatsapp"}
    updated = 0
    for item in payload.toggles:
        if item.event_key not in EVENT_CATALOG:
            raise HTTPException(status_code=400, detail=f"Unknown event_key: {item.event_key}")
        if item.channel not in ALLOWED:
            raise HTTPException(status_code=400, detail=f"channel must be one of {sorted(ALLOWED)}")
        field = f"{item.channel}_enabled"
        await db.system_notification_config.update_one(
            {"event_key": item.event_key},
            {"$set": {
                "event_key": item.event_key,
                field: bool(item.enabled),
                "updated_at": now,
                "updated_by": actor,
            }},
            upsert=True,
        )
        updated += 1

    return {"ok": True, "updated": updated}


# ─── Resend diagnostics ───────────────────────────────────────

@router.get("/resend-status")
async def resend_status(request: Request):
    """Is Resend configured? — does NOT send anything."""
    await _assert_admin(request)
    api_key = os.getenv("RESEND_API_KEY", "")
    from_email = os.getenv("RESEND_FROM_EMAIL", "")
    configured = bool(api_key) and bool(from_email)
    return {
        "configured": configured,
        "from_email": from_email,
        "api_key_suffix": api_key[-4:] if api_key else "",
        "domain": from_email.split("@", 1)[1] if "@" in from_email else "",
        "is_default_domain": from_email.endswith("@resend.dev"),
        "advice": (
            "Default onboarding@resend.dev works for testing only. Verify a Konekt-owned "
            "domain in Resend dashboard and set RESEND_FROM_EMAIL to something like "
            "notifications@konekt.co.tz for production delivery."
        ) if from_email.endswith("@resend.dev") else "Looks good.",
    }


class ResendTestPayload(BaseModel):
    to: str
    subject: Optional[str] = "Konekt Resend test"


@router.post("/resend-test")
async def resend_test(payload: ResendTestPayload, request: Request):
    """Fire a one-off test email to verify Resend actually delivers."""
    await _assert_admin(request)
    api_key = os.getenv("RESEND_API_KEY", "")
    from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    if not api_key:
        raise HTTPException(status_code=400, detail="RESEND_API_KEY is not set")
    if not payload.to or "@" not in payload.to:
        raise HTTPException(status_code=400, detail="Valid destination email required")

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#20364D;margin:0 0 12px">Konekt Resend Test</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6">This is a diagnostic email to verify that Resend is configured correctly and emails from Konekt are reaching their destination.</p>
      <p style="color:#475569;font-size:13px">If you are receiving this, <b>email delivery is working</b> for <code>{from_email}</code>.</p>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px">Sent at {datetime.now(timezone.utc).isoformat()} UTC · by {_safe_actor(request)}</p>
    </div>
    """
    try:
        import resend
        import asyncio
        resend.api_key = api_key
        result = await asyncio.to_thread(
            resend.Emails.send,
            {"from": from_email, "to": [payload.to], "subject": payload.subject or "Konekt Resend test", "html": html},
        )
        return {"ok": True, "resend_response": result}
    except Exception as e:
        logger.error("Resend test failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Resend error: {str(e)[:250]}")


def _safe_actor(request: Request) -> str:
    try:
        token = (request.headers.get("authorization", "").split(" ", 1)[1])
        p = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return p.get("email") or p.get("user_id") or "admin"
    except Exception:
        return "admin"
