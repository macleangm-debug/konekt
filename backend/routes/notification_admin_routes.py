"""
Admin Notification Settings, Templates, and Test Routes.
"""
import os
import logging
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from services.notification_service import NotificationService

logger = logging.getLogger("notification_admin")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/api/admin/notifications", tags=["Notification Admin"])


def _svc():
    return NotificationService(db)


# ─── Settings ─────────────────────────────────────────────

@router.get("/settings")
async def get_notification_settings():
    return await _svc().get_settings()


@router.post("/settings/seed")
async def seed_notification_defaults():
    return await _svc().seed_defaults()


@router.put("/settings/trigger")
async def update_trigger(payload: dict):
    event_key = payload.get("event_key")
    enabled = payload.get("enabled", False)
    updated_by = payload.get("updated_by", "admin")
    if not event_key:
        return {"ok": False, "error": "event_key required"}
    return await _svc().update_trigger(event_key, enabled, updated_by)


@router.put("/settings/provider")
async def update_provider_settings(payload: dict):
    return await _svc().update_provider(payload)


# ─── Templates ────────────────────────────────────────────

@router.get("/templates")
async def get_notification_templates():
    return await _svc().get_templates()


@router.put("/templates")
async def upsert_notification_template(payload: dict):
    template_key = payload.get("template_key")
    if not template_key:
        return {"ok": False, "error": "template_key required"}
    return await _svc().upsert_template(
        template_key,
        payload.get("subject", ""),
        payload.get("body", ""),
    )


# ─── Test Dispatch ────────────────────────────────────────

@router.post("/test")
async def test_notification_dispatch(payload: dict):
    """Send a test notification for any event_key."""
    event_key = payload.get("event_key", "customer_order_received")
    recipient = payload.get("recipient_email", "test@example.com")
    context = payload.get("context", {
        "customer_name": "Test Customer",
        "order_number": "ORD-TEST-000001",
        "total": "50,000",
        "items_summary": "A5 Notebook x5, Branded Pen x10",
        "bank_name": "CRDB Bank PLC",
        "account_name": "KONEKT LIMITED",
        "account_number": "015C8841347002",
        "payment_proof_link": "#",
        "account_link": "#",
        "admin_link": "#",
        "amount": "50,000",
        "payer_name": "Test Payer",
        "customer_email": "test@example.com",
        "bank_reference": "TXN-TEST",
        "is_guest": "Yes",
    })
    result = await _svc().dispatch(event_key, recipient, context)
    return {"ok": True, "dispatch_result": result}


# ─── Logs ─────────────────────────────────────────────────

@router.get("/logs")
async def get_notification_logs(limit: int = 50, event_key: str = None):
    query = {}
    if event_key:
        query["event_key"] = event_key
    logs = []
    async for doc in db.notification_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit):
        logs.append(doc)
    return {"logs": logs, "count": len(logs)}
