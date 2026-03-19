"""
Production Progress Routes
Handle job status updates and cost changes with workflow-linked notifications.

Key workflows:
- Job status update → notify customer (visible milestones), sales, admin (issues), partner
- Cost update → notify sales (margin impact), admin
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import os

from notification_service import build_notification_doc

router = APIRouter(prefix="/api/production-progress", tags=["Production Progress"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def _user_meta(user):
    """Extract user metadata for notification tracking"""
    return {
        "triggered_by_user_id": str(user.get("_id")) if user and user.get("_id") else user.get("id") if user else None,
        "triggered_by_role": user.get("role") if user else None,
    }


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


async def _notify_job_progress(db, *, job, status_label, user):
    """Send notifications based on job progress update"""
    meta = _user_meta(user)

    # Customer notification for visible milestones only
    customer_visible_statuses = {
        "in_production": "Your job is now in production.",
        "site_visit_scheduled": "Your site visit has been scheduled.",
        "ready_for_dispatch": "Your order is ready for dispatch.",
        "dispatched": "Your order has been dispatched.",
        "completed": "Your order/job has been completed.",
        "delayed": "Your order/job has encountered a delay.",
    }
    
    customer_user_id = job.get("customer_user_id") or job.get("customer_id")
    if customer_user_id and status_label in customer_visible_statuses:
        await db.notifications.insert_one(build_notification_doc(
            notification_type="job_progress_customer",
            title="Job progress updated",
            message=customer_visible_statuses[status_label],
            target_url=f"/dashboard/orders/{job.get('order_id')}" if job.get('order_id') else "/dashboard/service-requests",
            recipient_user_id=customer_user_id,
            entity_type="production_job",
            entity_id=str(job.get("_id")) if job.get("_id") else job.get("id"),
            priority="high" if status_label in {"delayed", "dispatched", "completed"} else "normal",
            action_key="job_progress_update",
            **meta,
        ))

    # Sales owner sees all major changes
    sales_user_id = job.get("assigned_sales_id") or job.get("assigned_to")
    if sales_user_id:
        await db.notifications.insert_one(build_notification_doc(
            notification_type="job_progress_sales",
            title="Assigned job updated",
            message=f"{job.get('job_title') or job.get('service_name') or 'Job'} is now: {status_label}.",
            target_url=f"/staff/opportunities/{job.get('sales_opportunity_id')}" if job.get('sales_opportunity_id') else "/staff/opportunities",
            recipient_user_id=sales_user_id,
            entity_type="production_job",
            entity_id=str(job.get("_id")) if job.get("_id") else job.get("id"),
            priority="high" if status_label in {"delayed", "blocked"} else "normal",
            action_key="job_progress_update",
            **meta,
        ))

    # Supervisor/admin for blocked or delayed jobs
    if status_label in {"blocked", "delayed", "cost_risk"}:
        await db.notifications.insert_one(build_notification_doc(
            notification_type="job_progress_admin_alert",
            title="Production attention needed",
            message=f"{job.get('job_title') or job.get('service_name') or 'Job'} requires attention: {status_label}.",
            target_url="/admin/production-jobs",
            recipient_role="admin",
            entity_type="production_job",
            entity_id=str(job.get("_id")) if job.get("_id") else job.get("id"),
            priority="urgent",
            action_key="job_progress_update",
            **meta,
        ))

    # Partner if partner execution is involved
    partner_user_id = job.get("partner_user_id") or job.get("partner_id")
    if partner_user_id and status_label in {"assigned_to_partner", "awaiting_partner_update", "delayed", "completed"}:
        await db.notifications.insert_one(build_notification_doc(
            notification_type="job_progress_partner",
            title="Partner job update",
            message=f"{job.get('job_title') or job.get('service_name') or 'Job'} is now: {status_label}.",
            target_url="/partner/fulfillment",
            recipient_user_id=partner_user_id,
            entity_type="production_job",
            entity_id=str(job.get("_id")) if job.get("_id") else job.get("id"),
            priority="high" if status_label == "delayed" else "normal",
            action_key="job_progress_update",
            **meta,
        ))


async def _notify_cost_change(db, *, job, old_cost, new_cost, user):
    """Send notifications when production cost changes"""
    meta = _user_meta(user)
    delta = round(float(new_cost or 0) - float(old_cost or 0), 2)
    msg = f"Production cost changed from {old_cost:,.2f} to {new_cost:,.2f} (delta {delta:+,.2f})."

    # Notify sales owner about cost impact on margin
    sales_user_id = job.get("assigned_sales_id") or job.get("assigned_to")
    if sales_user_id:
        await db.notifications.insert_one(build_notification_doc(
            notification_type="production_cost_sales",
            title="Production cost updated",
            message=msg,
            target_url=f"/staff/opportunities/{job.get('sales_opportunity_id')}" if job.get('sales_opportunity_id') else "/staff/opportunities",
            recipient_user_id=sales_user_id,
            entity_type="production_job",
            entity_id=str(job.get("_id")) if job.get("_id") else job.get("id"),
            priority="high",
            action_key="production_cost_update",
            **meta,
        ))

    # Always notify admin about cost changes
    await db.notifications.insert_one(build_notification_doc(
        notification_type="production_cost_admin",
        title="Production cost updated",
        message=msg,
        target_url="/admin/production-jobs",
        recipient_role="admin",
        entity_type="production_job",
        entity_id=str(job.get("_id")) if job.get("_id") else job.get("id"),
        priority="urgent" if delta > 0 else "normal",
        action_key="production_cost_update",
        **meta,
    ))


@router.get("")
async def list_production_jobs(request: Request, status: str = None, limit: int = 500):
    """List production jobs with optional status filter"""
    query = {}
    if status:
        query["status"] = status
    
    docs = await db.production_jobs.find(query).sort("updated_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{job_id}")
async def get_production_job(job_id: str, request: Request):
    """Get a single production job by ID"""
    try:
        job = await db.production_jobs.find_one({"_id": ObjectId(job_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")
    
    return serialize_doc(job)


@router.post("")
async def create_production_job(payload: dict, request: Request):
    """Create a new production job"""
    user = getattr(request.state, "user", None)
    now = datetime.now(timezone.utc)
    
    doc = {
        "job_title": payload.get("job_title", ""),
        "order_id": payload.get("order_id"),
        "order_number": payload.get("order_number"),
        "service_request_id": payload.get("service_request_id"),
        "service_name": payload.get("service_name"),
        "sales_opportunity_id": payload.get("sales_opportunity_id"),
        "customer_user_id": payload.get("customer_user_id"),
        "customer_name": payload.get("customer_name"),
        "assigned_sales_id": payload.get("assigned_sales_id"),
        "assigned_to": payload.get("assigned_to"),
        "partner_user_id": payload.get("partner_user_id"),
        "partner_id": payload.get("partner_id"),
        "status": payload.get("status", "new"),
        "production_cost": float(payload.get("production_cost", 0) or 0),
        "progress_note": payload.get("progress_note", ""),
        "progress_history": [],
        "cost_history": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": str(user.get("_id")) if user and user.get("_id") else user.get("id") if user else None,
    }
    
    result = await db.production_jobs.insert_one(doc)
    created = await db.production_jobs.find_one({"_id": result.inserted_id})
    
    return serialize_doc(created)


@router.put("/{job_id}/status")
async def update_job_status(job_id: str, payload: dict, request: Request):
    """Update production job status with notifications"""
    user = getattr(request.state, "user", None)
    now = datetime.now(timezone.utc)

    try:
        job = await db.production_jobs.find_one({"_id": ObjectId(job_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    previous_status = job.get("status", "new")
    new_status = payload.get("status", previous_status)
    note = payload.get("progress_note", "")

    # Idempotency check
    if new_status == previous_status and not note:
        return serialize_doc(job)

    await db.production_jobs.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$set": {
                "status": new_status,
                "progress_note": note,
                "updated_at": now.isoformat(),
                "last_progress_by": str(user.get("_id")) if user and user.get("_id") else user.get("id") if user else None,
            },
            "$push": {
                "progress_history": {
                    "status": new_status,
                    "previous_status": previous_status,
                    "note": note,
                    "timestamp": now.isoformat(),
                    "user_id": str(user.get("_id")) if user and user.get("_id") else user.get("id") if user else None,
                    "role": user.get("role") if user else None,
                }
            },
        },
    )

    updated = await db.production_jobs.find_one({"_id": ObjectId(job_id)})
    
    # Send notifications only if status actually changed
    if new_status != previous_status:
        await _notify_job_progress(db, job=updated, status_label=new_status, user=user)

    return serialize_doc(updated)


@router.put("/{job_id}/cost")
async def update_job_cost(job_id: str, payload: dict, request: Request):
    """Update production job cost with notifications"""
    user = getattr(request.state, "user", None)
    now = datetime.now(timezone.utc)

    try:
        job = await db.production_jobs.find_one({"_id": ObjectId(job_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    old_cost = float(job.get("production_cost", 0) or 0)
    new_cost = float(payload.get("production_cost", old_cost) or old_cost)
    cost_note = payload.get("cost_note", "")

    # Idempotency check
    if old_cost == new_cost and not cost_note:
        return serialize_doc(job)

    await db.production_jobs.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$set": {
                "production_cost": new_cost,
                "cost_note": cost_note,
                "updated_at": now.isoformat(),
            },
            "$push": {
                "cost_history": {
                    "old_cost": old_cost,
                    "new_cost": new_cost,
                    "note": cost_note,
                    "timestamp": now.isoformat(),
                    "user_id": str(user.get("_id")) if user and user.get("_id") else user.get("id") if user else None,
                    "role": user.get("role") if user else None,
                }
            },
        },
    )

    updated = await db.production_jobs.find_one({"_id": ObjectId(job_id)})
    
    # Send notifications only if cost actually changed
    if old_cost != new_cost:
        await _notify_cost_change(db, job=updated, old_cost=old_cost, new_cost=new_cost, user=user)

    return serialize_doc(updated)
