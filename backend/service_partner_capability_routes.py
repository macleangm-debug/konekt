from datetime import datetime
from fastapi import APIRouter, Request, HTTPException
from bson import ObjectId

router = APIRouter(prefix="/api/admin/service-partner-capabilities", tags=["Service Partner Capabilities"])


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("")
async def list_capabilities(
    request: Request,
    service_key: str | None = None,
    country_code: str | None = None,
    partner_id: str | None = None,
):
    db = request.app.mongodb
    query = {}

    if service_key:
        query["service_key"] = service_key
    if country_code:
        query["country_code"] = country_code
    if partner_id:
        query["partner_id"] = partner_id

    docs = await db.partner_service_capabilities.find(query).sort(
        [("service_key", 1), ("country_code", 1), ("priority_rank", 1), ("quality_score", -1)]
    ).to_list(length=1000)

    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_capability(payload: dict, request: Request):
    db = request.app.mongodb

    doc = {
        "partner_id": payload.get("partner_id"),
        "partner_name": payload.get("partner_name", ""),
        "service_key": payload.get("service_key"),
        "service_name": payload.get("service_name", ""),
        "country_code": payload.get("country_code", "TZ"),
        "regions": payload.get("regions", []),
        "capability_status": payload.get("capability_status", "active"),
        "priority_rank": int(payload.get("priority_rank", 1) or 1),
        "quality_score": float(payload.get("quality_score", 0) or 0),
        "avg_turnaround_days": float(payload.get("avg_turnaround_days", 0) or 0),
        "success_rate": float(payload.get("success_rate", 0) or 0),
        "current_active_queue": int(payload.get("current_active_queue", 0) or 0),
        "preferred_routing": bool(payload.get("preferred_routing", False)),
        "notes": payload.get("notes", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    if doc["preferred_routing"]:
        await db.partner_service_capabilities.update_many(
            {
                "service_key": doc["service_key"],
                "country_code": doc["country_code"],
                "preferred_routing": True,
            },
            {"$set": {"preferred_routing": False, "updated_at": datetime.utcnow()}},
        )

    result = await db.partner_service_capabilities.insert_one(doc)
    created = await db.partner_service_capabilities.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{capability_id}")
async def update_capability(capability_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    existing = await db.partner_service_capabilities.find_one({"_id": ObjectId(capability_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Capability mapping not found")

    update_doc = {
        "partner_name": payload.get("partner_name", existing.get("partner_name", "")),
        "service_key": payload.get("service_key", existing.get("service_key")),
        "service_name": payload.get("service_name", existing.get("service_name", "")),
        "country_code": payload.get("country_code", existing.get("country_code", "TZ")),
        "regions": payload.get("regions", existing.get("regions", [])),
        "capability_status": payload.get("capability_status", existing.get("capability_status", "active")),
        "priority_rank": int(payload.get("priority_rank", existing.get("priority_rank", 1)) or 1),
        "quality_score": float(payload.get("quality_score", existing.get("quality_score", 0)) or 0),
        "avg_turnaround_days": float(payload.get("avg_turnaround_days", existing.get("avg_turnaround_days", 0)) or 0),
        "success_rate": float(payload.get("success_rate", existing.get("success_rate", 0)) or 0),
        "current_active_queue": int(payload.get("current_active_queue", existing.get("current_active_queue", 0)) or 0),
        "preferred_routing": bool(payload.get("preferred_routing", existing.get("preferred_routing", False))),
        "notes": payload.get("notes", existing.get("notes", "")),
        "updated_at": datetime.utcnow(),
    }

    if update_doc["preferred_routing"]:
        await db.partner_service_capabilities.update_many(
            {
                "service_key": update_doc["service_key"],
                "country_code": update_doc["country_code"],
                "preferred_routing": True,
            },
            {"$set": {"preferred_routing": False, "updated_at": datetime.utcnow()}},
        )

    await db.partner_service_capabilities.update_one(
        {"_id": ObjectId(capability_id)},
        {"$set": update_doc},
    )

    updated = await db.partner_service_capabilities.find_one({"_id": ObjectId(capability_id)})
    return serialize_doc(updated)


@router.delete("/{capability_id}")
async def delete_capability(capability_id: str, request: Request):
    db = request.app.mongodb
    existing = await db.partner_service_capabilities.find_one({"_id": ObjectId(capability_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Capability mapping not found")

    await db.partner_service_capabilities.delete_one({"_id": ObjectId(capability_id)})
    return {"ok": True}


@router.get("/routing/best")
async def get_best_partner_for_service(
    request: Request,
    service_key: str,
    country_code: str = "TZ",
):
    db = request.app.mongodb
    docs = await db.partner_service_capabilities.find(
        {
            "service_key": service_key,
            "country_code": country_code,
            "capability_status": "active",
        }
    ).sort([
        ("preferred_routing", -1),
        ("priority_rank", 1),
        ("quality_score", -1),
        ("current_active_queue", 1),
        ("success_rate", -1),
    ]).to_list(length=20)

    if not docs:
        return {"best_partner": None}

    best = docs[0]
    return {"best_partner": serialize_doc(best)}
