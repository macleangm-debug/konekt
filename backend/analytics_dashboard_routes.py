"""
Advanced Analytics Routes — Executive-grade business intelligence.
Revenue trends, channel performance, conversion funnel, operational health.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, Query
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/analytics", tags=["Analytics"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/dashboard")
async def analytics_dashboard(days: int = Query(default=30)):
    """Return comprehensive analytics data for the dashboard."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    prev_start = start - timedelta(days=days)

    # Current period orders
    orders = await db.orders.find(
        {"created_at": {"$gte": start}},
        {"_id": 0, "total_amount": 1, "total": 1, "status": 1, "sales_channel": 1,
         "is_walk_in": 1, "affiliate_code": 1, "created_at": 1, "fulfillment_status": 1}
    ).to_list(10000)

    # Previous period for comparison
    prev_orders = await db.orders.find(
        {"created_at": {"$gte": prev_start, "$lt": start}},
        {"_id": 0, "total_amount": 1, "total": 1}
    ).to_list(10000)

    # Calculate KPIs
    total_revenue = sum(o.get("total_amount") or o.get("total", 0) for o in orders)
    prev_revenue = sum(o.get("total_amount") or o.get("total", 0) for o in prev_orders)
    total_orders = len(orders)
    completed = [o for o in orders if o.get("status") in ("completed", "completed_signed", "completed_confirmed", "delivered")]
    completion_rate = round(len(completed) / max(total_orders, 1) * 100)
    avg_order = round(total_revenue / max(total_orders, 1))
    pending_conf = len([o for o in orders if o.get("fulfillment_status") == "dispatched" and o.get("status") not in ("completed", "completed_signed", "completed_confirmed", "cancelled")])

    # Channel breakdown
    walkin = [o for o in orders if o.get("is_walk_in") or o.get("sales_channel") == "walk_in"]
    affiliate = [o for o in orders if o.get("affiliate_code")]
    structured = [o for o in orders if not o.get("is_walk_in") and not o.get("affiliate_code")]
    walkin_rev = sum(o.get("total_amount") or o.get("total", 0) for o in walkin)
    affiliate_rev = sum(o.get("total_amount") or o.get("total", 0) for o in affiliate)
    structured_rev = total_revenue - walkin_rev - affiliate_rev

    # Revenue trend (daily buckets)
    daily = {}
    for o in orders:
        ca = o.get("created_at")
        if isinstance(ca, datetime):
            day = ca.strftime("%Y-%m-%d")
        elif isinstance(ca, str):
            day = ca[:10]
        else:
            continue
        daily[day] = daily.get(day, 0) + (o.get("total_amount") or o.get("total", 0))
    revenue_trend = [{"date": k, "revenue": v} for k, v in sorted(daily.items())]

    # Conversion funnel
    quotes_count = await db.quotes.count_documents({"created_at": {"$gte": start}}) if "quotes" in await db.list_collection_names() else 0
    invoices_count = await db.invoices.count_documents({"created_at": {"$gte": start}})

    # Top performers
    pipeline_sales = [
        {"$match": {"created_at": {"$gte": start}, "created_by": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$created_by", "revenue": {"$sum": {"$ifNull": ["$total_amount", "$total"]}}, "count": {"$sum": 1}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 5}
    ]
    top_sales = []
    try:
        top_sales = await db.orders.aggregate(pipeline_sales).to_list(5)
    except Exception:
        pass

    pipeline_customers = [
        {"$match": {"created_at": {"$gte": start}, "customer_name": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$customer_name", "revenue": {"$sum": {"$ifNull": ["$total_amount", "$total"]}}, "count": {"$sum": 1}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 5}
    ]
    top_customers = await db.orders.aggregate(pipeline_customers).to_list(5)

    # Operations health
    stale = await db.orders.count_documents({
        "status": {"$nin": ["completed", "completed_signed", "completed_confirmed", "delivered", "cancelled"]},
        "created_at": {"$lt": now - timedelta(days=7)}
    })
    overdue = await db.invoices.count_documents({
        "status": {"$nin": ["paid", "cancelled"]},
        "due_date": {"$lt": now.isoformat()}
    })

    rev_change = round(((total_revenue - prev_revenue) / max(prev_revenue, 1)) * 100) if prev_revenue else 0

    return {
        "period_days": days,
        "kpis": {
            "total_revenue": total_revenue,
            "revenue_change_pct": rev_change,
            "total_orders": total_orders,
            "completion_rate": completion_rate,
            "avg_order_value": avg_order,
            "pending_confirmations": pending_conf,
            "walkin_revenue_pct": round(walkin_rev / max(total_revenue, 1) * 100),
            "affiliate_revenue_pct": round(affiliate_rev / max(total_revenue, 1) * 100),
        },
        "channels": [
            {"name": "Structured", "revenue": structured_rev, "orders": len(structured), "pct": round(structured_rev / max(total_revenue, 1) * 100)},
            {"name": "Walk-in", "revenue": walkin_rev, "orders": len(walkin), "pct": round(walkin_rev / max(total_revenue, 1) * 100)},
            {"name": "Affiliate", "revenue": affiliate_rev, "orders": len(affiliate), "pct": round(affiliate_rev / max(total_revenue, 1) * 100)},
        ],
        "revenue_trend": revenue_trend,
        "funnel": {
            "quotes": quotes_count,
            "invoices": invoices_count,
            "orders": total_orders,
            "completed": len(completed),
        },
        "operations": {
            "stale_orders": stale,
            "overdue_invoices": overdue,
            "pending_confirmations": pending_conf,
        },
        "top_customers": [{"name": c["_id"], "revenue": c.get("revenue", 0), "orders": c["count"]} for c in top_customers],
        "top_sales": [{"name": s["_id"], "revenue": s.get("revenue", 0), "orders": s["count"]} for s in top_sales],
    }
