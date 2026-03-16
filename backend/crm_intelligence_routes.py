"""
CRM Intelligence Routes
Lead activity timeline, follow-up scheduling, stage changes, and dashboard
"""
from datetime import datetime, timedelta
import os
from bson import ObjectId
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from crm_timeline_service import add_lead_timeline_event

router = APIRouter(prefix="/api/admin/crm-intelligence", tags=["CRM Intelligence"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("/leads/{lead_id}/note")
async def add_lead_note(lead_id: str, payload: dict):
    """Add a note to a lead's timeline"""
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    note = (payload.get("note") or "").strip()
    actor_email = payload.get("actor_email")

    if not note:
        raise HTTPException(status_code=400, detail="note is required")

    await add_lead_timeline_event(
        db,
        lead_id=ObjectId(lead_id),
        event_type="note",
        label="Note added",
        actor_email=actor_email,
        note=note,
    )

    updated = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated)


@router.post("/leads/{lead_id}/follow-up")
async def schedule_follow_up(lead_id: str, payload: dict):
    """Schedule a follow-up for a lead"""
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    next_follow_up_at = payload.get("next_follow_up_at")
    actor_email = payload.get("actor_email")
    note = payload.get("note", "")

    if not next_follow_up_at:
        raise HTTPException(status_code=400, detail="next_follow_up_at is required")

    next_dt = datetime.fromisoformat(next_follow_up_at.replace("Z", "+00:00"))

    await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {
            "$set": {
                "next_follow_up_at": next_dt,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    await add_lead_timeline_event(
        db,
        lead_id=ObjectId(lead_id),
        event_type="follow_up",
        label="Follow-up scheduled",
        actor_email=actor_email,
        note=note,
        meta={"next_follow_up_at": next_follow_up_at},
    )

    updated = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated)


@router.post("/leads/{lead_id}/status")
async def update_lead_stage(lead_id: str, payload: dict):
    """Update lead pipeline stage with win/loss reason"""
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    stage = payload.get("stage")
    actor_email = payload.get("actor_email")
    note = payload.get("note", "")
    lost_reason = payload.get("lost_reason")
    win_reason = payload.get("win_reason")

    if not stage:
        raise HTTPException(status_code=400, detail="stage is required")

    update_doc = {
        "stage": stage,
        "updated_at": datetime.utcnow(),
    }

    if stage == "lost":
        update_doc["lost_reason"] = lost_reason
    if stage == "won":
        update_doc["win_reason"] = win_reason

    await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": update_doc},
    )

    await add_lead_timeline_event(
        db,
        lead_id=ObjectId(lead_id),
        event_type="stage_change",
        label=f"Stage changed to {stage}",
        actor_email=actor_email,
        note=note,
        meta={"lost_reason": lost_reason, "win_reason": win_reason},
    )

    updated = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated)


@router.get("/dashboard")
async def crm_dashboard():
    """Get CRM dashboard with pipeline health, follow-ups, and source breakdown"""
    crm_settings = await db.crm_settings.find_one({}) or {}
    stale_days = int(crm_settings.get("stale_lead_days", 7) or 7)

    now = datetime.utcnow()
    stale_cutoff = now - timedelta(days=stale_days)

    total_leads = await db.crm_leads.count_documents({})
    won = await db.crm_leads.count_documents({"stage": "won"})
    lost = await db.crm_leads.count_documents({"stage": "lost"})
    quote_sent = await db.crm_leads.count_documents({"stage": "quote_sent"})
    overdue_followups = await db.crm_leads.count_documents({
        "next_follow_up_at": {"$lt": now},
        "stage": {"$nin": ["won", "lost"]},
    })
    stale_leads = await db.crm_leads.count_documents({
        "updated_at": {"$lt": stale_cutoff},
        "stage": {"$nin": ["won", "lost"]},
    })

    by_stage_cursor = db.crm_leads.aggregate([
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}}
    ])
    by_stage = {}
    async for row in by_stage_cursor:
        by_stage[row["_id"] or "unknown"] = row["count"]

    by_source_cursor = db.crm_leads.aggregate([
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ])
    by_source = {}
    async for row in by_source_cursor:
        by_source[row["_id"] or "unknown"] = row["count"]

    return {
        "summary": {
            "total_leads": total_leads,
            "won": won,
            "lost": lost,
            "quote_sent": quote_sent,
            "overdue_followups": overdue_followups,
            "stale_leads": stale_leads,
        },
        "by_stage": by_stage,
        "by_source": by_source,
    }
