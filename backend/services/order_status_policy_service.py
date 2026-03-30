"""
Pack 1 — Order Status Policy Service
Wraps status_transition_policy for order-level operations.
"""
from services.status_transition_policy import can_transition, normalize_status


async def update_order_status(db, order_id: str, new_status: str, role: str, actor_id: str = "", actor_name: str = "") -> dict:
    """
    Update an order's status using centralized transition policy.
    Returns {"ok": True, "status": new_status} or raises.
    """
    from fastapi import HTTPException
    from services.order_timeline_service import log_order_event

    order = await db.orders.find_one({"id": order_id}, {"_id": 0, "status": 1, "current_status": 1})
    if not order:
        raise HTTPException(404, "Order not found")

    current = order.get("status") or order.get("current_status") or "pending"
    new_status = normalize_status(new_status)
    allowed, reason = can_transition(role, current, new_status)
    if not allowed:
        raise HTTPException(400, reason)

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": new_status, "current_status": new_status, "updated_at": now}}
    )
    await log_order_event(db, order_id, f"status_change_{new_status}", f"{role}:{actor_id}", actor_name)

    return {"ok": True, "status": new_status}
