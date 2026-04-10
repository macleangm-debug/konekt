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

from notification_service import build_notification_doc
from collection_mode_service import get_quote_collection

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


# ──────────────────────────────────────────
# PRICING ENGINE — uses platform_settings
# ──────────────────────────────────────────

async def _get_margin_settings():
    """Get margin settings from platform_settings.commercial_rules."""
    row = await db.platform_settings.find_one({"key": "commercial_rules"})
    if row and row.get("value"):
        return float(row["value"].get("minimum_company_margin_percent", 30) or 30)
    return 30.0  # Default margin pct


async def _apply_pricing_engine(partner_cost: float) -> dict:
    """Apply the margin engine to a partner cost.
    Returns dict with selling_price, margin_pct, margin_amount."""
    margin_pct = await _get_margin_settings()
    selling_price = round(partner_cost * (1 + margin_pct / 100), 2)
    margin_amount = round(selling_price - partner_cost, 2)
    return {
        "selling_price": selling_price,
        "margin_pct": margin_pct,
        "margin_amount": margin_amount,
    }


async def _propagate_cost_to_quote(task, partner_cost: float, selling_price: float):
    """When a linked service task receives partner cost,
    auto-update the related quote line with selling price.
    
    Rules:
    - Only touches service-type quote lines
    - Updates effective_cost, unit_price, total on the line
    - Recalculates quote subtotal and total
    - Adds service_task_id and cost_source markers for traceability
    """
    quote_id = task.get("quote_id")
    line_index = task.get("quote_line_index")
    if quote_id is None or line_index is None:
        return False

    quotes_collection = await get_quote_collection(db)
    try:
        quote = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
    except Exception:
        quote = await quotes_collection.find_one({"id": quote_id})
    if not quote:
        return False

    items = quote.get("line_items") or quote.get("items") or []
    idx = int(line_index)
    if idx < 0 or idx >= len(items):
        return False

    line = items[idx]
    # Only update service-type lines
    if line.get("type") not in ("service", "logistics", "partner_cost"):
        return False

    qty = int(line.get("quantity", 1))
    line["effective_cost"] = partner_cost
    line["unit_price"] = selling_price
    line["total"] = round(selling_price * qty, 2)
    line["service_task_id"] = str(task.get("_id", ""))
    line["cost_source"] = "partner_submitted"

    items[idx] = line

    # Recalculate quote totals
    new_subtotal = sum(float(it.get("total", 0) or 0) for it in items)
    tax = float(quote.get("tax", 0) or 0)
    discount = float(quote.get("discount", 0) or 0)
    new_total = new_subtotal + tax - discount

    items_field = "line_items" if "line_items" in quote else "items"
    now = datetime.now(timezone.utc).isoformat()
    await quotes_collection.update_one(
        {"_id": quote["_id"]},
        {"$set": {
            items_field: items,
            "subtotal": round(new_subtotal, 2),
            "total": round(new_total, 2),
            "updated_at": now,
        }}
    )
    return True


# ──────────────────────────────────────────
# AUTOMATED PARTNER ASSIGNMENT ENGINE (V1)
# ──────────────────────────────────────────

async def _auto_assign_partner(task_doc: dict) -> dict:
    """Attempt to automatically assign a partner to a service task.
    
    Matching logic (V1 — simple, deterministic):
    1. Match by service_key in partner_service_capabilities
    2. Filter by capability_status=active, cross-ref partner status=active
    3. Prefer preferred_routing=True, then priority_rank, then quality_score
    4. Fallback: match partners.categories against service_type
    5. If no match: return failure reason
    
    Returns: {"assigned": True/False, "partner_id": ..., "partner_name": ..., "reason": ...}
    """
    service_type = (task_doc.get("service_type") or "").lower().strip()
    if not service_type:
        return {"assigned": False, "reason": "No service type specified on task"}

    now = datetime.now(timezone.utc).isoformat()

    # Strategy 1: Match via partner_service_capabilities (most precise)
    caps = await db.partner_service_capabilities.find({
        "capability_status": "active",
        "$or": [
            {"service_key": {"$regex": service_type, "$options": "i"}},
            {"service_name": {"$regex": service_type, "$options": "i"}},
        ]
    }).sort([("preferred_routing", -1), ("priority_rank", 1), ("quality_score", -1)]).to_list(length=50)

    for cap in caps:
        pid = cap.get("partner_id")
        if not pid:
            continue
        # Verify partner is active
        partner = None
        try:
            partner = await db.partners.find_one({"_id": ObjectId(pid), "status": "active"})
        except Exception:
            partner = await db.partners.find_one({"id": pid, "status": "active"})
        if not partner:
            continue

        partner_id = str(partner["_id"])
        partner_name = cap.get("partner_name") or partner.get("name") or ""
        return {
            "assigned": True,
            "partner_id": partner_id,
            "partner_name": partner_name,
            "reason": f"Matched via capability: {cap.get('service_name', service_type)}",
            "match_source": "capability",
            "preferred": bool(cap.get("preferred_routing")),
        }

    # Strategy 2: Match via partners.categories (broader)
    partners = await db.partners.find({
        "status": "active",
        "partner_type": {"$in": ["service", "service_partner", "hybrid"]},
        "categories": {"$regex": service_type, "$options": "i"},
    }).to_list(length=20)

    if partners:
        partner = partners[0]
        partner_id = str(partner["_id"])
        partner_name = partner.get("name") or ""
        return {
            "assigned": True,
            "partner_id": partner_id,
            "partner_name": partner_name,
            "reason": f"Matched via category: {service_type}",
            "match_source": "category",
            "preferred": False,
        }

    # No match found
    return {
        "assigned": False,
        "reason": f"No eligible partner found for service type: {service_type}",
    }


async def _apply_auto_assignment(task_id: str, task_doc: dict) -> dict:
    """Run auto-assignment and update the task + send notifications.
    Returns assignment result."""
    result = await _auto_assign_partner(task_doc)
    now = datetime.now(timezone.utc).isoformat()

    if result["assigned"]:
        # Assign partner to task
        await db.service_tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {
                "partner_id": result["partner_id"],
                "partner_name": result["partner_name"],
                "status": "assigned",
                "auto_assigned": True,
                "assignment_attempted_at": now,
                "assignment_match_source": result.get("match_source"),
                "assignment_failure_reason": None,
                "updated_at": now,
            }, "$push": {"timeline": {
                "action": "auto_assigned",
                "by": "system",
                "at": now,
                "note": result["reason"],
            }}}
        )
        # Notify partner
        try:
            await _notify_partner_task_assigned(
                task_id=task_id,
                partner_id=result["partner_id"],
                partner_name=result["partner_name"],
                service_type=task_doc.get("service_type", "general"),
                assigned_by="system",
            )
        except Exception as e:
            print(f"Warning: Auto-assign notification failed: {e}")
    else:
        # Mark as unassigned with reason
        await db.service_tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {
                "auto_assigned": False,
                "assignment_attempted_at": now,
                "assignment_failure_reason": result["reason"],
                "updated_at": now,
            }, "$push": {"timeline": {
                "action": "auto_assignment_failed",
                "by": "system",
                "at": now,
                "note": result["reason"],
            }}}
        )
        # Create unassigned task alert for admin
        await _create_unassigned_alert(task_id, task_doc, result["reason"])

    return result


async def _create_unassigned_alert(task_id: str, task_doc: dict, reason: str):
    """Create an admin alert for an unassigned service task."""
    service_type = task_doc.get("service_type", "general")
    task_ref = f"ST-{task_id[-6:].upper()}"
    doc = build_notification_doc(
        notification_type="unassigned_task_alert",
        title="Unassigned Service Task",
        message=f"No eligible partner found for {task_ref} ({service_type}). {reason}",
        target_url=f"/admin/service-tasks?task={task_id}",
        recipient_role="admin",
        entity_type="service_task",
        entity_id=task_id,
        priority="high",
        action_key="assign_partner",
        triggered_by_role="system",
    )
    doc["cta_label"] = "Assign Partner"
    doc["alert_severity"] = "warning"
    await db.notifications.insert_one(doc)


async def _notify_partner_task_assigned(task_id: str, partner_id: str, partner_name: str, service_type: str, assigned_by: str = "admin"):
    """Send in-app notification to partner when a task is assigned or reassigned."""
    # Find the partner's user record to get recipient_user_id
    partner_user = await db.partner_users.find_one({"partner_id": partner_id}, {"_id": 0, "id": 1, "user_id": 1})
    recipient_id = (partner_user or {}).get("user_id") or (partner_user or {}).get("id")
    if not recipient_id:
        return
    doc = build_notification_doc(
        notification_type="service_task_assigned",
        title="New Task Assigned",
        message=f"A {service_type} task has been assigned to you. Please review and submit your cost.",
        target_url=f"/partner/assigned-work?task={task_id}",
        recipient_user_id=recipient_id,
        entity_type="service_task",
        entity_id=task_id,
        priority="high",
        action_key="partner_cost_request",
        triggered_by_user_id=assigned_by,
        triggered_by_role="admin",
    )
    doc["cta_label"] = "Submit Cost"
    await db.notifications.insert_one(doc)


async def _notify_admin_cost_submitted(task_id: str, partner_name: str, partner_cost: float, service_type: str):
    """Notify admins when a partner submits their cost for review."""
    doc = build_notification_doc(
        notification_type="partner_cost_submitted",
        title="Cost Submitted for Review",
        message=f"{partner_name} submitted TZS {partner_cost:,.0f} for a {service_type} task.",
        target_url=f"/admin/service-tasks?task={task_id}",
        recipient_role="admin",
        entity_type="service_task",
        entity_id=task_id,
        priority="high",
        action_key="review_partner_cost",
        triggered_by_role="partner",
    )
    doc["cta_label"] = "Review Cost"
    await db.notifications.insert_one(doc)


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
    task_id = str(result.inserted_id)
    created = await db.service_tasks.find_one({"_id": result.inserted_id}, {"_id": 0})
    created["id"] = task_id

    if payload.get("partner_id"):
        # Manual assignment — notify partner
        try:
            await _notify_partner_task_assigned(
                task_id=task_id,
                partner_id=payload["partner_id"],
                partner_name=payload.get("partner_name", ""),
                service_type=payload.get("service_type", "general"),
                assigned_by=payload.get("assigned_by", "admin"),
            )
        except Exception as e:
            print(f"Warning: Failed to send partner notification: {e}")
    else:
        # No partner specified — attempt auto-assignment
        try:
            assignment = await _apply_auto_assignment(task_id, doc)
            if assignment["assigned"]:
                created["partner_id"] = assignment["partner_id"]
                created["partner_name"] = assignment["partner_name"]
                created["status"] = "assigned"
                created["auto_assigned"] = True
        except Exception as e:
            print(f"Warning: Auto-assignment failed: {e}")

    return created


# ──────────────────────────────────────────
# QUOTE ↔ SERVICE TASK LINKING
# ──────────────────────────────────────────

@router.post("/admin/service-tasks/from-quote-line")
async def create_task_from_quote_line(request: Request, payload: dict):
    """Create a service task linked to a specific quote line.
    
    Rules:
    - Only works for service/logistics/partner_cost type lines
    - Validates line_index exists
    - Prevents duplicate tasks for the same quote line
    """
    quote_id = payload.get("quote_id")
    line_index = payload.get("line_index")
    if quote_id is None or line_index is None:
        raise HTTPException(status_code=400, detail="quote_id and line_index are required")

    line_index = int(line_index)

    # Find the quote
    quotes_collection = await get_quote_collection(db)
    try:
        quote = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
    except Exception:
        quote = await quotes_collection.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    items = quote.get("line_items") or quote.get("items") or []
    if line_index < 0 or line_index >= len(items):
        raise HTTPException(status_code=400, detail=f"Invalid line_index {line_index}. Quote has {len(items)} items.")

    line = items[line_index]

    # Only service-type lines can create tasks
    line_type = line.get("type", "product")
    if line_type not in ("service", "logistics", "partner_cost"):
        raise HTTPException(status_code=400, detail=f"Cannot create task for '{line_type}' type line. Only service/logistics lines are supported.")

    # Prevent duplicate task for same quote line
    existing = await db.service_tasks.find_one({
        "quote_id": str(quote["_id"]),
        "quote_line_index": line_index,
    })
    if existing:
        raise HTTPException(status_code=409, detail=f"A task already exists for this quote line (Task ST-{str(existing['_id'])[-6:].upper()})")

    now = datetime.now(timezone.utc).isoformat()
    quote_number = quote.get("quote_number", "")

    doc = {
        "quote_id": str(quote["_id"]),
        "quote_number": quote_number,
        "quote_line_index": line_index,
        "service_type": line.get("service_type") or line.get("category") or line_type,
        "service_subtype": line.get("service_subtype") or line.get("subcategory") or "",
        "description": line.get("description") or line.get("name") or "",
        "scope": line.get("scope") or line.get("specifications") or "",
        "quantity": int(line.get("quantity", 1)),
        "client_name": quote.get("customer_name") or quote.get("client_name") or "",
        "delivery_address": quote.get("delivery_address") or "",
        "contact_person": quote.get("contact_person") or "",
        "contact_phone": quote.get("contact_phone") or "",
        "order_ref": quote_number,
        "partner_id": payload.get("partner_id"),
        "partner_name": payload.get("partner_name") or "",
        "partner_cost": None,
        "selling_price": None,
        "margin_pct": None,
        "margin_amount": None,
        "status": "assigned" if payload.get("partner_id") else "unassigned",
        "timeline": [{
            "action": "task_created_from_quote",
            "by": "admin",
            "at": now,
            "note": f"Created from quote {quote_number} line {line_index + 1}",
        }],
        "notes": [],
        "created_at": now,
        "updated_at": now,
    }

    result = await db.service_tasks.insert_one(doc)
    task_id = str(result.inserted_id)

    # Mark the quote line with the service_task_id
    items_field = "line_items" if "line_items" in quote else "items"
    items[line_index]["service_task_id"] = task_id
    items[line_index]["cost_source"] = "awaiting_partner"
    await quotes_collection.update_one(
        {"_id": quote["_id"]},
        {"$set": {f"{items_field}.{line_index}.service_task_id": task_id,
                  f"{items_field}.{line_index}.cost_source": "awaiting_partner",
                  "updated_at": now}}
    )

    # Notify partner if manually assigned
    if payload.get("partner_id"):
        try:
            await _notify_partner_task_assigned(
                task_id=task_id,
                partner_id=payload["partner_id"],
                partner_name=payload.get("partner_name", ""),
                service_type=doc["service_type"],
                assigned_by="admin",
            )
        except Exception as e:
            print(f"Warning: Failed to send partner notification: {e}")
    else:
        # No partner specified — attempt auto-assignment
        try:
            assignment = await _apply_auto_assignment(task_id, doc)
            if assignment["assigned"]:
                doc["partner_id"] = assignment["partner_id"]
                doc["partner_name"] = assignment["partner_name"]
                doc["status"] = "assigned"
        except Exception as e:
            print(f"Warning: Auto-assignment from quote line failed: {e}")

    created = await db.service_tasks.find_one({"_id": result.inserted_id}, {"_id": 0})
    created["id"] = task_id
    return created


@router.get("/admin/quotes-v2/{quote_id}/linked-tasks")
async def get_linked_tasks(request: Request, quote_id: str):
    """Return all service tasks linked to a specific quote.
    Admin-safe: shows task ref, line index, partner, status, timestamps."""
    docs = await db.service_tasks.find({"quote_id": quote_id}).sort("quote_line_index", 1).to_list(length=100)
    tasks = []
    for doc in docs:
        tasks.append({
            "id": str(doc["_id"]),
            "task_ref": f"ST-{str(doc['_id'])[-6:].upper()}",
            "quote_line_index": doc.get("quote_line_index"),
            "service_type": doc.get("service_type"),
            "partner_name": doc.get("partner_name") or "Unassigned",
            "partner_id": doc.get("partner_id"),
            "status": doc.get("status"),
            "partner_cost": doc.get("partner_cost"),
            "selling_price": doc.get("selling_price"),
            "cost_submitted": doc.get("partner_cost") is not None,
            "cost_submitted_at": doc.get("cost_submitted_at"),
            "auto_assigned": doc.get("auto_assigned", False),
            "assignment_failure_reason": doc.get("assignment_failure_reason"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        })
    return tasks


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


@router.get("/admin/service-tasks/overdue-costs")
async def overdue_cost_tasks(request: Request):
    """Return tasks assigned to partners but still awaiting cost after 48h."""
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    docs = await db.service_tasks.find({
        "status": {"$in": ["assigned", "awaiting_cost"]},
        "partner_id": {"$ne": None},
        "partner_cost": None,
        "created_at": {"$lt": cutoff},
    }).sort("created_at", 1).to_list(length=100)
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

    # Notify partner of assignment
    try:
        task = await db.service_tasks.find_one({"_id": ObjectId(task_id)}, {"_id": 0, "service_type": 1})
        await _notify_partner_task_assigned(
            task_id=task_id,
            partner_id=payload["partner_id"],
            partner_name=payload.get("partner_name", ""),
            service_type=(task or {}).get("service_type", "general"),
            assigned_by=payload.get("assigned_by", "admin"),
        )
    except Exception as e:
        print(f"Warning: Failed to send partner assignment notification: {e}")

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




# ──────────────────────────────────────────
# PARTNER ENDPOINTS (partner sees cost only)
# ──────────────────────────────────────────

# Partner types that are allowed to see client delivery details
_LOGISTICS_TYPES = {"logistics", "distributor", "delivery"}


async def _resolve_partner_type(partner_id: str) -> str:
    """Look up partner_type from the partners collection."""
    try:
        partner = await db.partners.find_one({"_id": ObjectId(partner_id)}, {"_id": 0, "partner_type": 1})
        return (partner or {}).get("partner_type", "service")
    except Exception:
        return "service"


@router.get("/partner-portal/assigned-work")
async def partner_assigned_work(request: Request, authorization: str = Header(None)):
    """Get tasks assigned to the authenticated partner.
    
    DATA ACCESS RULES:
    - Service/product/hybrid partners: NEVER see client identity
    - Logistics/distributor/delivery partners: CAN see delivery name, phone, address
    """
    partner_user = await _get_partner(authorization)
    partner_id = partner_user.get("partner_id")

    # Resolve partner type for data filtering
    partner_type = await _resolve_partner_type(partner_id)
    is_logistics = partner_type in _LOGISTICS_TYPES

    docs = await db.service_tasks.find({"partner_id": partner_id}).sort("created_at", -1).to_list(length=300)

    # Sanitize: partner must NOT see margin/selling_price
    # Service partners must NOT see client identity
    tasks = []
    for doc in docs:
        task = {
            "id": str(doc["_id"]),
            "task_ref": f"ST-{str(doc['_id'])[-6:].upper()}",
            "service_type": doc.get("service_type"),
            "service_subtype": doc.get("service_subtype"),
            "description": doc.get("description", ""),
            "scope": doc.get("scope", ""),
            "quantity": doc.get("quantity", 1),
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
            "partner_type": partner_type,
            "is_logistics": is_logistics,
        }

        if is_logistics:
            # Logistics/delivery partners need delivery details
            task["client_name"] = doc.get("client_name", "Client")
            task["delivery_address"] = doc.get("delivery_address")
            task["contact_person"] = doc.get("contact_person")
            task["contact_phone"] = doc.get("contact_phone")
        else:
            # Service partners see only project reference, NEVER client identity
            task["client_name"] = None
            task["delivery_address"] = None
            task["contact_person"] = None
            task["contact_phone"] = None

        tasks.append(task)

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
    """Partner submits their cost for a task. Triggers margin engine + quote propagation."""
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

    # Apply pricing engine (uses platform_settings margin rules)
    pricing = await _apply_pricing_engine(partner_cost)
    selling_price = pricing["selling_price"]
    margin_pct = pricing["margin_pct"]
    margin_amount = pricing["margin_amount"]

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

    # Propagate cost to linked quote line (if quote_id + quote_line_index exist)
    quote_updated = False
    try:
        quote_updated = await _propagate_cost_to_quote(task, partner_cost, selling_price)
    except Exception as e:
        print(f"Warning: Failed to propagate cost to quote: {e}")

    # Notify admins that partner has submitted cost
    try:
        await _notify_admin_cost_submitted(
            task_id=task_id,
            partner_name=partner_name,
            partner_cost=partner_cost,
            service_type=task.get("service_type", "general"),
        )
        # If linked to a quote, send additional quote-specific notification
        if quote_updated and task.get("quote_id"):
            quote_number = task.get("quote_number") or ""
            doc = build_notification_doc(
                notification_type="quote_cost_updated",
                title="Quote Line Updated",
                message=f"{partner_name} submitted cost for a service line. Quote pricing has been auto-updated.",
                target_url=f"/admin/quotes/{task['quote_id']}",
                recipient_role="admin",
                entity_type="quote",
                entity_id=task["quote_id"],
                priority="high",
                action_key="review_quote_pricing",
                triggered_by_role="system",
            )
            doc["cta_label"] = "Review Quote"
            await db.notifications.insert_one(doc)
    except Exception as e:
        print(f"Warning: Failed to notify: {e}")

    return {
        "ok": True,
        "status": "cost_submitted",
        "partner_cost": partner_cost,
        "quote_updated": quote_updated,
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
