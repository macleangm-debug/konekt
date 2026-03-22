from datetime import datetime
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/sales-provider-coordination", tags=["Sales Provider Coordination"])

@router.post("/follow-ups")
async def create_follow_up(payload: dict, request: Request):
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    doc = {
        "opportunity_id": payload.get("opportunity_id"),
        "service_request_id": payload.get("service_request_id"),
        "provider_id": payload.get("provider_id"),
        "sales_user_id": str((user or {}).get("_id")) if (user or {}).get("_id") else payload.get("sales_user_id"),
        "message": payload.get("message", ""),
        "status": "open",
        "due_at": payload.get("due_at"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.sales_provider_followups.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

@router.get("/follow-ups")
async def list_follow_ups(request: Request, opportunity_id: str | None = None, service_request_id: str | None = None):
    db = request.app.mongodb
    query = {}
    if opportunity_id:
        query["opportunity_id"] = opportunity_id
    if service_request_id:
        query["service_request_id"] = service_request_id
    docs = await db.sales_provider_followups.find(query).sort("created_at", -1).to_list(length=500)
    out = []
    for d in docs:
        d["id"] = str(d["_id"])
        del d["_id"]
        out.append(d)
    return out

@router.post("/nudges")
async def create_nudge(payload: dict, request: Request):
    db = request.app.mongodb
    doc = {
        "provider_id": payload.get("provider_id"),
        "service_request_id": payload.get("service_request_id"),
        "message": payload.get("message", "Please update progress."),
        "status": "sent",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.provider_nudges.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}
