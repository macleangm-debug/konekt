"""
CRM Timeline Service
Helper to add activity events to lead timeline
"""
from datetime import datetime


async def add_lead_timeline_event(
    db,
    *,
    lead_id,
    event_type: str,
    label: str,
    actor_email: str | None = None,
    note: str = "",
    meta: dict | None = None,
):
    """Add an event to a lead's activity timeline"""
    await db.crm_leads.update_one(
        {"_id": lead_id},
        {
            "$push": {
                "timeline": {
                    "event_type": event_type,
                    "label": label,
                    "actor_email": actor_email,
                    "note": note,
                    "meta": meta or {},
                    "created_at": datetime.utcnow(),
                }
            },
            "$set": {"updated_at": datetime.utcnow()},
        },
    )
