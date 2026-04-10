"""
Service Task Routes — Unified service execution system.
Handles task creation, partner assignment, cost submission, status updates.
Works for both service partners and logistics partners.
"""
import os
from fastapi import APIRouter, HTTPException, Request, Header
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["Service Tasks"])

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize(doc):
    if not doc:
        return None
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["id"] = str(doc["_id"])
    return d


async def _get_partner(authorization: str):
    """Authenticate partner from Authorization header."""
    from partner_access_service import get_partner_user_from_header
    return await get_partner_user_from_header(authorization)


# ──────────────────────────────────────────
# ADMIN ENDPOINTS
# ──────────────────────────────────────────

@router.post("/admin/service-tasks")
async def create_service_task(request: Request, payload: dict):
    """Create a new service task and optionally assign to a partner."""

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "service_type": payload.get("service_type", "general"),
        "service_subtype": payload.get("service_subtype"),
        "description": payload.get("description", ""),
        "scope": payload.get("scope", ""),
        "quantity": payload.get("quantity", 1),
        "client_name": payload.get("client_name"),
        "client_id": payload.get("client_id"),
        "order_ref": payload.get("order_ref"),
        "quote_id": payload.get("quote_id"),
        "delivery_address": payload.get("delivery_address"),
        "contact_person": payload.get("contact_person"),
        "contact_phone": payload.get("contact_phone"),
        # Assignment
        "partner_id": payload.get("partner_id"),
        "partner_name": payload.get("partner_name"),
        "assigned_by": payload.get("assigned_by"),
        "assignment_mode": payload.get("assignment_mode", "direct"),  # direct | cost_request
        # Cost layer (partner sees only this)
        "partner_cost": None,
        "cost_notes": None,
        "cost_submitted_at": None,
        # Pricing layer (internal only — partner never sees)
        "base_price": payload.get("base_price"),
        "negotiated_cost": payload.get("negotiated_cost"),
        "selling_price": None,
        "margin_pct": None,
        "margin_amount": None,
        # Status
        "status": "assigned" if payload.get("partner_id") else "unassigned",
        "deadline": payload.get("deadline"),
        # Proof
        "proof_url": None,
        "proof_notes": None,
        "proof_uploaded_at": None,
        # Timeline
        "timeline": [{
            "action": "task_created",
            "by": payload.get("assigned_by", "system"),
            "at": now,
            "note": f"Service task created: {payload.get('service_type', 'general')}"
        }],
        "notes": [],
        "created_at": now,
        "updated_at": now,
    }

    if payload.get("partner_id"):
        doc["timeline"].append({
            "action": "assigned",
            "by": payload.get("assigned_by", "system"),
            "at": now,
            "note": f"Assigned to partner: {payload.get('partner_name', 'Unknown')}"
        })

    result = await db.service_tasks.insert_one(doc)
    created = await db.service_tasks.find_one({"_id": result.inserted_id}, {"_id": 0})
    created["id"] = str(result.inserted_id)
    return created


@router.get("/admin/service-tasks")
async def list_service_tasks(request: Request, status: str = None, service_type: str = None, partner_id: str = None):
    """List all service tasks with optional filters."""
    query = {}
    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    if partner_id:
        query["partner_id"] = partner_id

    docs = await db.service_tasks.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize(d) for d in docs]


@router.get("/admin/service-tasks/{task_id}")
async def get_service_task(request: Request, task_id: str):
    """Get a single service task by ID."""
    doc = await db.service_tasks.find_one({"_id": ObjectId(task_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize(doc)


@router.put("/admin/service-tasks/{task_id}/assign")
async def assign_task_to_partner(request: Request, task_id: str, payload: dict):
    """Assign or reassign a task to a partner."""
    now = datetime.now(timezone.utc).isoformat()

    update = {
        "partner_id": payload["partner_id"],
        "partner_name": payload.get("partner_name", ""),
        "assigned_by": payload.get("assigned_by", "admin"),
        "assignment_mode": payload.get("assignment_mode", "direct"),
        "status": "assigned",
        "updated_at": now,
    }
    timeline_entry = {
        "action": "assigned",
        "by": payload.get("assigned_by", "admin"),
        "at": now,
        "note": f"Assigned to {payload.get('partner_name', 'partner')}"
    }

    result = await db.service_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update, "$push": {"timeline": timeline_entry}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True, "status": "assigned"}


@router.put("/admin/service-tasks/{task_id}/status")
async def admin_update_task_status(request: Request, task_id: str, payload: dict):
    """Admin override for task status."""
    now = datetime.now(timezone.utc).isoformat()
    new_status = payload["status"]

    timeline_entry = {
        "action": f"status_changed_to_{new_status}",
        "by": payload.get("by", "admin"),
        "at": now,
        "note": payload.get("note", f"Status updated to {new_status}")
    }

    result = await db.service_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": new_status, "updated_at": now}, "$push": {"timeline": timeline_entry}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True, "status": new_status}


@router.get("/admin/service-tasks/stats/summary")
async def service_task_stats(request: Request):
    """Get summary stats for service tasks."""
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    results = await db.service_tasks.aggregate(pipeline).to_list(length=50)
    stats = {r["_id"]: r["count"] for r in results}
    return {
        "assigned": stats.get("assigned", 0),
        "awaiting_cost": stats.get("awaiting_cost", 0),
        "cost_submitted": stats.get("cost_submitted", 0),
        "in_progress": stats.get("in_progress", 0),
        "completed": stats.get("completed", 0),
        "delayed": stats.get("delayed", 0),
        "failed": stats.get("failed", 0),
        "unassigned": stats.get("unassigned", 0),
        "total": sum(stats.values()),
    }


# ──────────────────────────────────────────
# PARTNER ENDPOINTS (partner sees cost only)
# ──────────────────────────────────────────

@router.get("/partner-portal/assigned-work")
async def partner_assigned_work(request: Request, authorization: str = Header(None)):
    """Get tasks assigned to the authenticated partner."""
    partner_user = await _get_partner(authorization)
    partner_id = partner_user.get("partner_id")

    docs = await db.service_tasks.find({"partner_id": partner_id}).sort("created_at", -1).to_list(length=300)

    # Sanitize: partner must NOT see margin/selling_price
    tasks = []
    for doc in docs:
        tasks.append({
            "id": str(doc["_id"]),
            "task_ref": f"ST-{str(doc['_id'])[-6:].upper()}",
            "service_type": doc.get("service_type"),
            "service_subtype": doc.get("service_subtype"),
            "description": doc.get("description", ""),
            "scope": doc.get("scope", ""),
            "quantity": doc.get("quantity", 1),
            "client_name": doc.get("client_name", "Client"),
            "delivery_address": doc.get("delivery_address"),
            "contact_person": doc.get("contact_person"),
            "contact_phone": doc.get("contact_phone"),
            "order_ref": doc.get("order_ref"),
            "status": doc.get("status"),
            "deadline": doc.get("deadline"),
            "partner_cost": doc.get("partner_cost"),
            "cost_notes": doc.get("cost_notes"),
            "cost_submitted_at": doc.get("cost_submitted_at"),
            "proof_url": doc.get("proof_url"),
            "proof_notes": doc.get("proof_notes"),
            "proof_uploaded_at": doc.get("proof_uploaded_at"),
            "timeline": doc.get("timeline", []),
            "notes": doc.get("notes", []),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        })

    return tasks


@router.get("/partner-portal/assigned-work/stats")
async def partner_work_stats(request: Request, authorization: str = Header(None)):
    """Get KPI stats for partner's assigned work."""
    partner_user = await _get_partner(authorization)
    partner_id = partner_user.get("partner_id")

    docs = await db.service_tasks.find({"partner_id": partner_id}).to_list(length=500)

    stats = {
        "assigned": 0, "awaiting_cost": 0, "in_progress": 0,
        "completed": 0, "delayed": 0, "total": len(docs),
    }
    for doc in docs:
        s = doc.get("status", "")
        if s in stats:
            stats[s] += 1

    return stats


@router.put("/partner-portal/assigned-work/{task_id}/submit-cost")
async def partner_submit_cost(request: Request, task_id: str, payload: dict, authorization: str = Header(None)):
    """Partner submits their cost for a task. Triggers margin engine."""
    partner_user = await _get_partner(authorization)
    partner_id = partner_user.get("partner_id")
    partner_name = partner_user.get("full_name", "Partner")

    # Verify task belongs to this partner
    task = await db.service_tasks.find_one({"_id": ObjectId(task_id), "partner_id": partner_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")

    partner_cost = float(payload["cost"])
    cost_notes = payload.get("notes", "")
    now = datetime.now(timezone.utc).isoformat()

    # Apply margin engine
    effective_cost = partner_cost
    margin_pct = 30.0  # Default 30% margin — will use margin engine rules later
    selling_price = round(effective_cost * (1 + margin_pct / 100), 2)
    margin_amount = round(selling_price - effective_cost, 2)

    timeline_entry = {
        "action": "cost_submitted",
        "by": partner_name,
        "at": now,
        "note": f"Cost submitted: TZS {partner_cost:,.0f}"
    }

    await db.service_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "partner_cost": partner_cost,
                "cost_notes": cost_notes,
                "cost_submitted_at": now,
                "selling_price": selling_price,
                "margin_pct": margin_pct,
                "margin_amount": margin_amount,
                "status": "cost_submitted",
                "updated_at": now,
            },
            "$push": {"timeline": timeline_entry}
        }
    )

    return {
        "ok": True,
        "status": "cost_submitted",
        "partner_cost": partner_cost,
        # Partner does NOT see selling_price or margin
    }


@router.put("/partner-portal/assigned-work/{task_id}/update-status")
async def partner_update_status(request: Request, task_id: str, payload: dict, authorization: str = Header(None)):
    """Partner updates execution status."""
    partner_user = await _get_partner(authorization)
    partner_id = partner_user.get("partner_id")
    partner_name = partner_user.get("full_name", "Partner")

    task = await db.service_tasks.find_one({"_id": ObjectId(task_id), "partner_id": partner_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")

    new_status = payload["status"]
    allowed = ["assigned", "accepted", "awaiting_cost", "cost_submitted", "in_progress", "completed", "delayed", "in_transit", "delivered", "failed"]
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    now = datetime.now(timezone.utc).isoformat()
    timeline_entry = {
        "action": f"status_{new_status}",
        "by": partner_name,
        "at": now,
        "note": payload.get("note", f"Status updated to {new_status}")
    }

    await db.service_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": new_status, "updated_at": now}, "$push": {"timeline": timeline_entry}}
    )
    return {"ok": True, "status": new_status}


@router.put("/partner-portal/assigned-work/{task_id}/upload-proof")
async def partner_upload_proof(request: Request, task_id: str, payload: dict, authorization: str = Header(None)):
    """Partner uploads proof of delivery/completion."""
    partner_user = await _get_partner(authorization)
    partner_id = partner_user.get("partner_id")
    partner_name = partner_user.get("full_name", "Partner")

    task = await db.service_tasks.find_one({"_id": ObjectId(task_id), "partner_id": partner_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")

    now = datetime.now(timezone.utc).isoformat()
    timeline_entry = {
        "action": "proof_uploaded",
        "by": partner_name,
        "at": now,
        "note": payload.get("notes", "Proof of completion uploaded")
    }

    await db.service_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "proof_url": payload.get("proof_url"),
                "proof_notes": payload.get("notes", ""),
                "proof_uploaded_at": now,
                "updated_at": now,
            },
            "$push": {"timeline": timeline_entry}
        }
    )
    return {"ok": True}


@router.post("/partner-portal/assigned-work/{task_id}/add-note")
async def partner_add_note(request: Request, task_id: str, payload: dict, authorization: str = Header(None)):
    """Partner adds a note to a task."""
    partner_user = await _get_partner(authorization)
    partner_id = partner_user.get("partner_id")
    partner_name = partner_user.get("full_name", "Partner")

    task = await db.service_tasks.find_one({"_id": ObjectId(task_id), "partner_id": partner_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    now = datetime.now(timezone.utc).isoformat()
    note = {
        "text": payload["note"],
        "by": partner_name,
        "at": now,
    }

    await db.service_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"notes": note, "timeline": {"action": "note_added", "by": partner_name, "at": now, "note": payload["note"]}}, "$set": {"updated_at": now}}
    )
    return {"ok": True}
