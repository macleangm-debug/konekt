from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request
from dateutil import parser as dateparser

router = APIRouter(prefix="/api/sales-command", tags=["Sales Command Center"])

def _serialize(row):
    row["id"] = row.get("id") or str(row.get("_id"))
    row.pop("_id", None)
    return row

def _parse_date(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return dateparser.parse(str(val))
    except Exception:
        return None

@router.get("/dispatch-summary")
async def dispatch_summary(request: Request, sales_owner_id: str | None = None):
    db = request.app.mongodb
    lead_filter = {"assigned_to": sales_owner_id} if sales_owner_id else {}
    quote_filter = {"sales_owner_id": sales_owner_id} if sales_owner_id else {}

    new_leads = await db.leads.find({**lead_filter, "status": "new"}, {"_id": 0}).to_list(length=200)
    followups = await db.quotes.find({**quote_filter, "status": "pending"}, {"_id": 0}).to_list(length=200)
    ready_to_close = await db.quotes.find({**quote_filter, "status": "approved"}, {"_id": 0}).to_list(length=200)

    overdue_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    overdue = []
    for item in new_leads:
        created = _parse_date(item.get("created_at"))
        if created:
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created < overdue_cutoff:
                overdue.append(item)

    return {
        "counts": {
            "new_leads": len(new_leads),
            "followups_due": len(followups),
            "overdue_responses": len(overdue),
            "ready_to_close": len(ready_to_close),
        },
        "new_leads": new_leads[:10],
        "followups_due": followups[:10],
        "overdue_responses": overdue[:10],
        "ready_to_close": ready_to_close[:10],
    }

@router.post("/claim-lead")
async def claim_lead(payload: dict, request: Request):
    db = request.app.mongodb
    lead_id = payload.get("lead_id")
    sales_owner_id = payload.get("sales_owner_id")
    sales_owner_name = payload.get("sales_owner_name", "Sales Advisor")
    result = await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"assigned_to": sales_owner_id, "assigned_to_name": sales_owner_name, "status": "claimed"}}
    )
    return {"ok": True, "matched": result.matched_count, "modified": result.modified_count}

@router.post("/mark-followup")
async def mark_followup(payload: dict, request: Request):
    db = request.app.mongodb
    quote_id = payload.get("quote_id")
    result = await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"last_followup_at": datetime.now(timezone.utc).isoformat(), "followup_status": "done"}}
    )
    return {"ok": True, "matched": result.matched_count, "modified": result.modified_count}
