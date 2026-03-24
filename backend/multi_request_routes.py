from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/multi-request", tags=["Multi Requests"])

def _now():
    return datetime.now(timezone.utc).isoformat()

@router.get("/service-taxonomy")
async def get_service_taxonomy(request: Request):
    db = request.app.mongodb
    groups = await db.service_groups.find({}).sort("group_name", 1).to_list(length=500)
    out = []
    for g in groups:
        g.pop("_id", None)
        out.append({
            "id": g.get("id", g.get("key", "")),
            "group_key": g.get("group_key", g.get("key", "")),
            "group_name": g.get("group_name", g.get("name", "")),
            "subgroups": g.get("subgroups", []),
        })
    return out

@router.post("/seed-service-taxonomy")
async def seed_service_taxonomy(payload: dict, request: Request):
    db = request.app.mongodb
    groups = payload.get("service_groups", [])
    inserted = 0
    for group in groups:
        key = group.get("group_key")
        if not key:
            continue
        row = {
            "id": str(uuid4()),
            "group_key": key,
            "group_name": group.get("group_name", key),
            "subgroups": group.get("subgroups", []),
            "updated_at": _now(),
        }
        await db.service_groups.update_one({"group_key": key}, {"$set": row}, upsert=True)
        inserted += 1
    return {"ok": True, "groups_upserted": inserted}

@router.post("/service-bundle")
async def create_service_bundle(payload: dict, request: Request):
    db = request.app.mongodb
    customer_id = payload.get("customer_id")
    services = payload.get("services", [])
    if not customer_id or not services:
        raise HTTPException(status_code=400, detail="customer_id and services are required")
    lead = {
        "id": str(uuid4()),
        "customer_id": customer_id,
        "type": "service_bundle_request",
        "status": "new",
        "services": services,
        "contact_details": payload.get("contact_details", {}),
        "quote_details": payload.get("quote_details", {}),
        "brief": payload.get("brief", ""),
        "created_at": _now(),
    }
    await db.leads.insert_one(lead)
    lead.pop("_id", None)
    return {"ok": True, "lead": lead}

@router.post("/promo-bundle")
async def create_promo_bundle(payload: dict, request: Request):
    db = request.app.mongodb
    customer_id = payload.get("customer_id")
    items = payload.get("items", [])
    if not customer_id or not items:
        raise HTTPException(status_code=400, detail="customer_id and items are required")
    lead = {
        "id": str(uuid4()),
        "customer_id": customer_id,
        "type": "promotional_bundle_request",
        "status": "new",
        "items": items,
        "contact_details": payload.get("contact_details", {}),
        "quote_details": payload.get("quote_details", {}),
        "customization_brief": payload.get("customization_brief", ""),
        "created_at": _now(),
    }
    await db.leads.insert_one(lead)
    lead.pop("_id", None)
    return {"ok": True, "lead": lead}

@router.post("/service-group")
async def upsert_service_group(payload: dict, request: Request):
    db = request.app.mongodb
    key = (payload.get("group_key") or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="group_key is required")
    row = {
        "id": str(uuid4()),
        "group_key": key,
        "group_name": payload.get("group_name", key),
        "subgroups": payload.get("subgroups", []),
        "updated_at": _now(),
    }
    await db.service_groups.update_one({"group_key": key}, {"$set": row}, upsert=True)
    return {"ok": True, "group": row}

@router.delete("/service-group/{group_key}")
async def delete_service_group(group_key: str, request: Request):
    db = request.app.mongodb
    result = await db.service_groups.delete_one({"group_key": group_key})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"ok": True}
