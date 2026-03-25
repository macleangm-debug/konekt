"""
SLA Alerts Routes - Monitor SLA risks and delays
"""
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/sla-alerts", tags=["SLA Alerts"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


def make_aware(dt):
    """Make a datetime timezone-aware (UTC) if it's naive"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def safe_days_old(now, created_at):
    """Calculate days old safely handling timezone-naive datetimes"""
    if created_at is None:
        return 0
    created_at = make_aware(created_at)
    return (now - created_at).days


@router.get("")
async def get_sla_alerts():
    """Get all current SLA alerts - delayed orders, at-risk assignments, etc."""
    alerts = []
    now = datetime.now(timezone.utc)
    
    # 1. Delayed orders (created more than 3 days ago, still pending)
    three_days_ago = now - timedelta(days=3)
    delayed_orders = await db.orders.find({
        "status": {"$in": ["pending", "processing"]},
        "created_at": {"$lt": three_days_ago}
    }).to_list(length=100)
    
    for order in delayed_orders:
        days_old = safe_days_old(now, order.get("created_at"))
        alerts.append({
            "alert_type": "delayed_order",
            "entity_type": "order",
            "entity_id": str(order["_id"]),
            "entity_number": order.get("order_number", str(order["_id"])),
            "customer_name": order.get("customer_name"),
            "customer_email": order.get("customer_email"),
            "status": order.get("status"),
            "days_old": days_old,
            "reason": f"Order pending for {days_old} days",
            "priority": "high" if days_old > 7 else "medium",
            "key_account_email": order.get("assigned_account_manager_email"),
            "created_at": order.get("created_at"),
        })
    
    # 2. Stale service requests
    stale_requests = await db.service_requests.find({
        "status": {"$in": ["new", "pending", "in_progress"]},
        "created_at": {"$lt": three_days_ago}
    }).to_list(length=100)
    
    for req in stale_requests:
        days_old = safe_days_old(now, req.get("created_at"))
        alerts.append({
            "alert_type": "stale_service_request",
            "entity_type": "service_request",
            "entity_id": str(req["_id"]),
            "service_name": req.get("service_name", req.get("service_key")),
            "customer_name": req.get("customer_name"),
            "customer_email": req.get("customer_email"),
            "status": req.get("status"),
            "days_old": days_old,
            "reason": f"Service request pending for {days_old} days",
            "priority": "high" if days_old > 5 else "medium",
            "key_account_email": req.get("assigned_account_manager_email"),
            "created_at": req.get("created_at"),
        })
    
    # 3. Overdue recurring plans
    overdue_plans = await db.recurring_service_plans.find({
        "status": "active",
        "next_scheduled_date": {"$lt": now.isoformat()}
    }).to_list(length=100)
    
    for plan in overdue_plans:
        alerts.append({
            "alert_type": "overdue_recurring_plan",
            "entity_type": "recurring_service_plan",
            "entity_id": str(plan["_id"]),
            "service_name": plan.get("service_name"),
            "customer_name": plan.get("customer_name"),
            "customer_email": plan.get("customer_email"),
            "company_name": plan.get("company_name"),
            "frequency": plan.get("frequency"),
            "next_scheduled_date": plan.get("next_scheduled_date"),
            "reason": "Recurring plan overdue for execution",
            "priority": "high",
            "key_account_email": plan.get("assigned_account_manager_email"),
            "created_at": plan.get("created_at"),
        })
    
    # 4. Unpaid invoices overdue
    thirty_days_ago = now - timedelta(days=30)
    overdue_invoices = await db.invoices_v2.find({
        "status": {"$in": ["sent", "unpaid", "overdue"]},
        "due_date": {"$lt": now.isoformat()},
        "created_at": {"$lt": thirty_days_ago}
    }).to_list(length=100)
    
    for inv in overdue_invoices:
        alerts.append({
            "alert_type": "overdue_invoice",
            "entity_type": "invoice",
            "entity_id": str(inv["_id"]),
            "entity_number": inv.get("invoice_number", str(inv["_id"])),
            "customer_name": inv.get("customer_name"),
            "customer_email": inv.get("customer_email"),
            "total": inv.get("total", 0),
            "due_date": inv.get("due_date"),
            "reason": "Invoice overdue for payment",
            "priority": "medium",
            "key_account_email": inv.get("assigned_account_manager_email"),
            "created_at": inv.get("created_at"),
        })
    
    # Sort by priority (high first) and then by date
    priority_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda x: (priority_order.get(x.get("priority", "low"), 2), x.get("created_at") or ""))
    
    return alerts


@router.get("/summary")
async def get_sla_summary():
    """Get a summary of SLA health"""
    now = datetime.now(timezone.utc)
    three_days_ago = now - timedelta(days=3)
    
    delayed_orders_count = await db.orders.count_documents({
        "status": {"$in": ["pending", "processing"]},
        "created_at": {"$lt": three_days_ago}
    })
    
    stale_requests_count = await db.service_requests.count_documents({
        "status": {"$in": ["new", "pending", "in_progress"]},
        "created_at": {"$lt": three_days_ago}
    })
    
    overdue_plans_count = await db.recurring_service_plans.count_documents({
        "status": "active",
        "next_scheduled_date": {"$lt": now.isoformat()}
    })
    
    total_alerts = delayed_orders_count + stale_requests_count + overdue_plans_count
    
    return {
        "total_alerts": total_alerts,
        "delayed_orders": delayed_orders_count,
        "stale_service_requests": stale_requests_count,
        "overdue_recurring_plans": overdue_plans_count,
        "health_status": "healthy" if total_alerts == 0 else ("at_risk" if total_alerts < 5 else "critical"),
    }
