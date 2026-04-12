"""
Data Integrity Dashboard — Backend routes for system health monitoring.
Surfaces missing data, stuck records, and compliance gaps.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/data-integrity", tags=["Data Integrity"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/summary")
async def integrity_summary():
    """Return a comprehensive data integrity summary."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # 1. Business clients missing VRN/BRN
    total_business = await db.users.count_documents({
        "role": "customer",
        "$or": [{"client_type": "business"}, {"company": {"$exists": True, "$ne": ""}}]
    })
    missing_vrn = await db.users.count_documents({
        "role": "customer",
        "client_type": "business",
        "$or": [{"vrn": {"$exists": False}}, {"vrn": ""}, {"vrn": None}]
    })
    missing_brn = await db.users.count_documents({
        "role": "customer",
        "client_type": "business",
        "$or": [{"brn": {"$exists": False}}, {"brn": ""}, {"brn": None}]
    })

    # 2. Orders stuck in non-final states (older than 7 days)
    stuck_orders = await db.orders.count_documents({
        "status": {"$nin": ["delivered", "completed", "completed_signed", "completed_confirmed", "cancelled"]},
        "created_at": {"$lt": week_ago}
    })

    # 3. Unconfirmed deliveries (issued/in_transit for > 3 days)
    three_days_ago = now - timedelta(days=3)
    unconfirmed_deliveries = await db.delivery_notes.count_documents({
        "status": {"$in": ["issued", "in_transit", "pending_confirmation"]},
        "closure_locked": {"$ne": True},
        "created_at": {"$lt": three_days_ago}
    })

    # 4. Pending EFD requests
    pending_efd = await db.efd_receipts.count_documents({"status": "pending"})

    # 5. Invoices overdue (past due_date)
    overdue_invoices = await db.invoices.count_documents({
        "status": {"$nin": ["paid", "cancelled"]},
        "due_date": {"$lt": now.isoformat()}
    })

    # 6. Orphan records (orders without customer)
    orphan_orders = await db.orders.count_documents({
        "$or": [{"customer_id": {"$exists": False}}, {"customer_id": ""}, {"customer_id": None}]
    })

    # 7. Total counts for context
    total_orders = await db.orders.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    total_delivery_notes = await db.delivery_notes.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})

    # Health score (0-100)
    issues = missing_vrn + missing_brn + stuck_orders + unconfirmed_deliveries + pending_efd + overdue_invoices + orphan_orders
    total_records = max(total_orders + total_invoices + total_delivery_notes + total_customers, 1)
    health_score = max(0, min(100, round(100 - (issues / total_records * 100))))

    return {
        "health_score": health_score,
        "total_issues": issues,
        "categories": {
            "compliance": {
                "label": "Compliance",
                "total_business_clients": total_business,
                "missing_vrn": missing_vrn,
                "missing_brn": missing_brn,
                "pending_efd": pending_efd,
            },
            "orders": {
                "label": "Order Health",
                "total_orders": total_orders,
                "stuck_orders": stuck_orders,
                "orphan_orders": orphan_orders,
                "overdue_invoices": overdue_invoices,
            },
            "fulfillment": {
                "label": "Fulfillment",
                "total_delivery_notes": total_delivery_notes,
                "unconfirmed_deliveries": unconfirmed_deliveries,
            },
        },
        "context": {
            "total_customers": total_customers,
            "total_orders": total_orders,
            "total_invoices": total_invoices,
            "total_delivery_notes": total_delivery_notes,
        },
    }


@router.get("/details/{category}")
async def integrity_details(category: str):
    """Return detailed records for a specific issue category."""
    now = datetime.now(timezone.utc)

    def _safe(doc):
        d = dict(doc)
        d["id"] = str(d.pop("_id"))
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        return d

    if category == "missing_vrn":
        docs = await db.users.find({
            "role": "customer",
            "$or": [{"client_type": "business"}, {"company": {"$exists": True, "$ne": ""}}],
        }, {"_id": 1, "full_name": 1, "email": 1, "company": 1, "vrn": 1, "brn": 1, "client_type": 1}).to_list(50)
        return [_safe(d) for d in docs if not d.get("vrn")]

    if category == "stuck_orders":
        week_ago = now - timedelta(days=7)
        docs = await db.orders.find({
            "status": {"$nin": ["delivered", "completed", "completed_signed", "completed_confirmed", "cancelled"]},
            "created_at": {"$lt": week_ago}
        }, {"_id": 1, "order_number": 1, "customer_name": 1, "status": 1, "total_amount": 1, "created_at": 1}).sort("created_at", 1).to_list(50)
        return [_safe(d) for d in docs]

    if category == "unconfirmed_deliveries":
        three_days_ago = now - timedelta(days=3)
        docs = await db.delivery_notes.find({
            "status": {"$in": ["issued", "in_transit", "pending_confirmation"]},
            "closure_locked": {"$ne": True},
            "created_at": {"$lt": three_days_ago}
        }, {"_id": 1, "note_number": 1, "customer_name": 1, "status": 1, "created_at": 1}).sort("created_at", 1).to_list(50)
        return [_safe(d) for d in docs]

    if category == "overdue_invoices":
        docs = await db.invoices.find({
            "status": {"$nin": ["paid", "cancelled"]},
            "due_date": {"$lt": now.isoformat()}
        }, {"_id": 1, "invoice_number": 1, "customer_name": 1, "status": 1, "total_amount": 1, "due_date": 1}).sort("due_date", 1).to_list(50)
        return [_safe(d) for d in docs]

    if category == "pending_efd":
        docs = await db.efd_receipts.find({"status": "pending"}).sort("created_at", -1).to_list(50)
        return [_safe(d) for d in docs]

    return []
