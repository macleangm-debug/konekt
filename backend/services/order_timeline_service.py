"""
Pack 1 — Order Timeline Service
Centralized status history/event logging.
"""
from datetime import datetime, timezone
from uuid import uuid4


async def log_order_event(db, order_id: str, event: str, actor: str, actor_name: str = "", details: dict = None):
    """Log an event in the order timeline."""
    await db.order_events.insert_one({
        "id": str(uuid4()),
        "order_id": order_id,
        "event": event,
        "actor": actor,
        "actor_name": actor_name,
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def get_order_timeline(db, order_id: str) -> list:
    """Get all events for an order, sorted chronologically."""
    events = await db.order_events.find(
        {"order_id": order_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return events
