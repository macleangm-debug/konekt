"""
Assignment Decision Service — Persists assignment decisions with full audit trail.
Every assignment records: engine used, candidates snapshot, chosen vendor,
reason code, fallback reason, and timestamp.

The /explain endpoint reads from this stored record — never reconstructs.
"""
from datetime import datetime, timezone
from uuid import uuid4


async def log_assignment_decision(
    db,
    *,
    order_id: str,
    order_type: str,
    engine_used: str,
    candidates_snapshot: list = None,
    chosen_vendor_id: str = None,
    chosen_vendor_name: str = None,
    reason_code: str = "",
    reason_detail: str = "",
    fallback_reason: str = None,
    item_assignments: list = None,
    all_vendor_ids: list = None,
    assigned_by: str = "system",
):
    """
    Persist a complete assignment decision record.
    """
    doc = {
        "id": str(uuid4()),
        "order_id": order_id,
        "order_type": order_type,
        "engine_used": engine_used,
        "candidates_snapshot": candidates_snapshot or [],
        "chosen_vendor_id": chosen_vendor_id,
        "chosen_vendor_name": chosen_vendor_name,
        "reason_code": reason_code,
        "reason_detail": reason_detail,
        "fallback_reason": fallback_reason,
        "item_assignments": item_assignments or [],
        "all_vendor_ids": all_vendor_ids or [],
        "assigned_by": assigned_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.assignment_decisions.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def get_assignment_explanation(db, order_id: str):
    """
    Retrieve the stored assignment decision for an order.
    Returns None if no decision was logged.
    """
    doc = await db.assignment_decisions.find_one(
        {"order_id": order_id},
        {"_id": 0}
    )
    return doc


async def list_assignment_decisions(db, limit: int = 50, engine_filter: str = None):
    """List recent assignment decisions, optionally filtered by engine type."""
    query = {}
    if engine_filter:
        query["engine_used"] = engine_filter
    docs = await db.assignment_decisions.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return docs
