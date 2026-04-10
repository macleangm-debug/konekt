"""
Pipeline Intelligence Service
Auto-stage movement, stuck deal detection, and conversion metrics.
Extends existing CRM — does NOT rebuild it.
"""
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("pipeline_intelligence")

STALE_THRESHOLDS = {
    "new_lead": 3,
    "contacted": 5,
    "qualified": 5,
    "meeting_demo": 5,
    "quote_sent": 3,
    "negotiation": 5,
}

STAGE_LABELS = {
    "new_lead": "New Lead",
    "contacted": "Contacted",
    "qualified": "Qualified",
    "meeting_demo": "Meeting / Demo",
    "quote_sent": "Quote Sent",
    "negotiation": "Negotiation",
    "won": "Won",
    "lost": "Lost",
    "dormant": "Dormant",
}


def _now():
    return datetime.now(timezone.utc)


async def auto_advance_stage(db, lead_id: str, new_stage: str, reason: str = ""):
    """Move a CRM lead to a new stage with timeline entry. Idempotent."""
    lead = await db.crm_leads.find_one({"$or": [{"id": lead_id}, {"_id": lead_id}]})
    if not lead:
        return
    current = lead.get("stage", "")
    if current == new_stage:
        return
    if current in ("won", "lost"):
        return

    now = _now()
    timeline_entry = {
        "label": f"Stage auto-moved to {STAGE_LABELS.get(new_stage, new_stage)}",
        "event_type": "stage_change",
        "note": reason or f"Automated: {current} → {new_stage}",
        "created_at": now.isoformat(),
        "actor": "system",
    }
    await db.crm_leads.update_one(
        {"_id": lead["_id"]},
        {
            "$set": {
                "stage": new_stage,
                "updated_at": now.isoformat(),
                "last_activity_at": now.isoformat(),
            },
            "$push": {"timeline": timeline_entry},
        },
    )
    logger.info("[pipeline] auto-advanced lead %s: %s → %s (%s)", lead_id, current, new_stage, reason)


async def on_quote_created(db, lead_id: str):
    """Called when a quote is created for a lead."""
    await auto_advance_stage(db, lead_id, "quote_sent", "Quote created for this lead")


async def on_quote_sent(db, lead_id: str):
    """Called when a quote is sent/shared with the client."""
    await auto_advance_stage(db, lead_id, "quote_sent", "Quote sent to client")


async def on_quote_approved(db, lead_id: str):
    """Called when the client approves a quote."""
    await auto_advance_stage(db, lead_id, "negotiation", "Quote approved by client")


async def on_payment_submitted(db, lead_id: str):
    """Called when payment proof is submitted."""
    await auto_advance_stage(db, lead_id, "negotiation", "Payment proof submitted")


async def on_payment_approved(db, lead_id: str):
    """Called when payment is verified/approved."""
    await auto_advance_stage(db, lead_id, "won", "Payment approved — deal closed")


async def on_deal_lost(db, lead_id: str, reason: str = ""):
    """Mark a deal as lost."""
    await auto_advance_stage(db, lead_id, "lost", reason or "Deal marked as lost")


async def detect_stale_deals(db) -> list:
    """Find deals that have been inactive beyond their stage threshold."""
    now = _now()
    stale = []

    for stage, days in STALE_THRESHOLDS.items():
        cutoff = (now - timedelta(days=days)).isoformat()
        cursor = db.crm_leads.find(
            {
                "stage": stage,
                "$or": [
                    {"last_activity_at": {"$lt": cutoff}},
                    {"last_activity_at": {"$exists": False}, "updated_at": {"$lt": cutoff}},
                ],
            },
            {"_id": 0, "id": 1, "contact_name": 1, "company_name": 1, "stage": 1,
             "expected_value": 1, "assigned_to": 1, "updated_at": 1, "last_activity_at": 1},
        )
        async for lead in cursor:
            last = lead.get("last_activity_at") or lead.get("updated_at", "")
            days_inactive = (now - datetime.fromisoformat(last.replace("Z", "+00:00"))).days if last else days + 1
            stale.append({
                **lead,
                "days_inactive": days_inactive,
                "threshold_days": days,
                "stale_since": last,
            })

    stale.sort(key=lambda x: x.get("days_inactive", 0), reverse=True)
    return stale


async def get_conversion_metrics(db) -> dict:
    """Calculate stage-by-stage conversion metrics."""
    pipeline = [
        {"$group": {
            "_id": "$stage",
            "count": {"$sum": 1},
            "total_value": {"$sum": {"$ifNull": ["$expected_value", 0]}},
        }},
    ]
    stage_counts = {}
    async for row in db.crm_leads.aggregate(pipeline):
        stage_counts[row["_id"]] = {
            "count": row["count"],
            "value": row.get("total_value", 0),
        }

    ordered_stages = ["new_lead", "contacted", "qualified", "meeting_demo", "quote_sent", "negotiation", "won"]
    funnel = []
    for i, stage in enumerate(ordered_stages):
        data = stage_counts.get(stage, {"count": 0, "value": 0})
        prev_count = stage_counts.get(ordered_stages[i - 1], {}).get("count", 0) if i > 0 else None
        conversion_from_prev = round((data["count"] / prev_count * 100), 1) if prev_count and prev_count > 0 else None
        funnel.append({
            "stage": stage,
            "label": STAGE_LABELS.get(stage, stage),
            "count": data["count"],
            "value": data["value"],
            "conversion_from_prev": conversion_from_prev,
        })

    total_leads = sum(s.get("count", 0) for s in stage_counts.values())
    won_count = stage_counts.get("won", {}).get("count", 0)
    lost_count = stage_counts.get("lost", {}).get("count", 0)
    closed_count = won_count + lost_count
    win_rate = round(won_count / closed_count * 100, 1) if closed_count > 0 else 0

    # Average time to close (won deals only)
    won_leads = await db.crm_leads.find(
        {"stage": "won"},
        {"created_at": 1, "updated_at": 1, "_id": 0}
    ).to_list(length=500)
    avg_days = 0
    if won_leads:
        total_days = 0
        valid = 0
        for lead in won_leads:
            try:
                created = datetime.fromisoformat(lead["created_at"].replace("Z", "+00:00"))
                closed = datetime.fromisoformat(lead["updated_at"].replace("Z", "+00:00"))
                total_days += (closed - created).days
                valid += 1
            except Exception:
                pass
        avg_days = round(total_days / valid, 1) if valid > 0 else 0

    return {
        "funnel": funnel,
        "total_leads": total_leads,
        "won_count": won_count,
        "lost_count": lost_count,
        "win_rate": win_rate,
        "avg_days_to_close": avg_days,
        "stage_counts": {k: v["count"] for k, v in stage_counts.items()},
    }


async def get_rep_conversion_stats(db) -> list:
    """Get per-rep conversion metrics (not just activity counts)."""
    pipeline = [
        {"$group": {
            "_id": "$assigned_to",
            "total": {"$sum": 1},
            "won": {"$sum": {"$cond": [{"$eq": ["$stage", "won"]}, 1, 0]}},
            "lost": {"$sum": {"$cond": [{"$eq": ["$stage", "lost"]}, 1, 0]}},
            "active": {"$sum": {"$cond": [{"$and": [{"$ne": ["$stage", "won"]}, {"$ne": ["$stage", "lost"]}, {"$ne": ["$stage", "dormant"]}]}, 1, 0]}},
            "pipeline_value": {"$sum": {"$ifNull": ["$expected_value", 0]}},
        }},
    ]
    results = []
    async for row in db.crm_leads.aggregate(pipeline):
        rep = row["_id"] or "Unassigned"
        total = row["total"]
        won = row["won"]
        lost = row["lost"]
        closed = won + lost
        conversion = round(won / closed * 100, 1) if closed > 0 else 0
        results.append({
            "rep": rep,
            "total_leads": total,
            "won": won,
            "lost": lost,
            "active": row["active"],
            "pipeline_value": row["pipeline_value"],
            "conversion_rate": conversion,
        })
    results.sort(key=lambda x: (x["conversion_rate"], x["won"]), reverse=True)
    return results
