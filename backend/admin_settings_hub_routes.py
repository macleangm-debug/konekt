from datetime import datetime
import os
import jwt
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/admin/settings-hub", tags=["Admin Settings Hub"])

security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def _require_admin(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "staff"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

from services.settings_resolver import PLATFORM_DEFAULTS, invalidate_settings_cache

DEFAULT_SETTINGS = {**PLATFORM_DEFAULTS, "updated_at": None}

@router.get("")
async def get_settings_hub(request: Request, _admin=Depends(_require_admin)):
    db = request.app.mongodb
    row = await db.admin_settings.find_one({"key": "settings_hub"})
    if not row:
        return DEFAULT_SETTINGS
    stored = row.get("value", {})
    # Deep merge with defaults so new fields are always present
    merged = {}
    for k, v in DEFAULT_SETTINGS.items():
        if isinstance(v, dict) and isinstance(stored.get(k), dict):
            merged[k] = {**v, **stored[k]}
        elif k in stored:
            merged[k] = stored[k]
        else:
            merged[k] = v
    return merged

@router.put("")
async def update_settings_hub(payload: dict, request: Request, _admin=Depends(_require_admin)):
    db = request.app.mongodb
    value = {**DEFAULT_SETTINGS, **payload, "updated_at": datetime.utcnow().isoformat()}
    await db.admin_settings.update_one(
        {"key": "settings_hub"},
        {"$set": {"key": "settings_hub", "value": value}},
        upsert=True,
    )
    invalidate_settings_cache()

    # Auto-sync categories to marketplace taxonomy
    try:
        from services.catalog_taxonomy_service import sync_settings_categories_to_taxonomy
        await sync_settings_categories_to_taxonomy(db)
    except Exception:
        pass

    return value


@router.get("/report-schedule")
async def get_report_schedule(request: Request, _admin=Depends(_require_admin)):
    """Get the scheduled report delivery configuration."""
    db = request.app.mongodb
    from services.scheduled_report_delivery import get_schedule_config, _get_last_delivery
    config = await get_schedule_config(db)
    last = await _get_last_delivery(db)
    last_row = await db.admin_settings.find_one({"key": "report_last_delivery"}, {"_id": 0})
    last_info = last_row.get("value", {}) if last_row else {}
    return {**config, "last_delivery": last_info}


@router.put("/report-schedule")
async def update_report_schedule(payload: dict, request: Request, _admin=Depends(_require_admin)):
    """Update the scheduled report delivery configuration."""
    db = request.app.mongodb
    from services.scheduled_report_delivery import save_schedule_config, DEFAULT_SCHEDULE
    config = {**DEFAULT_SCHEDULE, **payload}
    # Only keep valid fields
    clean = {
        "enabled": bool(config.get("enabled", True)),
        "day": str(config.get("day", "monday")).lower(),
        "time": str(config.get("time", "08:00")),
        "timezone": str(config.get("timezone", "Africa/Dar_es_Salaam")),
        "recipient_roles": list(config.get("recipient_roles", ["admin", "sales_manager", "finance_manager"])),
    }
    await save_schedule_config(db, clean)
    return clean


@router.post("/report-schedule/deliver-now")
async def deliver_report_now(request: Request, _admin=Depends(_require_admin)):
    """Manually trigger weekly report delivery (for testing)."""
    db = request.app.mongodb
    from services.scheduled_report_delivery import _deliver_report
    try:
        count = await _deliver_report(db)
        return {"status": "delivered", "recipients_count": count}
    except Exception as e:
        return {"status": "failed", "error": str(e)}
