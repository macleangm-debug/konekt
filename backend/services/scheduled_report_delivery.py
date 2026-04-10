"""
Scheduled Weekly Report Delivery Service.
Runs as a lightweight asyncio background task inside the FastAPI app.
Checks every 60s if it's time to deliver the weekly report.
Reuses the existing weekly performance report generation logic.
Respects per-user notification preferences before dispatching.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from uuid import uuid4

logger = logging.getLogger("scheduled_report_delivery")

DAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}

DEFAULT_SCHEDULE = {
    "enabled": True,
    "day": "monday",
    "time": "08:00",
    "timezone": "Africa/Dar_es_Salaam",
    "recipient_roles": ["admin", "sales_manager", "finance_manager"],
}


async def get_schedule_config(db) -> dict:
    """Read schedule config from admin_settings, merge with defaults."""
    row = await db.admin_settings.find_one({"key": "report_schedule"}, {"_id": 0})
    stored = row.get("value", {}) if row else {}
    return {**DEFAULT_SCHEDULE, **stored}


async def save_schedule_config(db, config: dict):
    """Save schedule config to admin_settings."""
    await db.admin_settings.update_one(
        {"key": "report_schedule"},
        {"$set": {"key": "report_schedule", "value": config}},
        upsert=True,
    )


async def _get_last_delivery(db) -> str:
    """Get ISO timestamp of last successful delivery."""
    row = await db.admin_settings.find_one({"key": "report_last_delivery"}, {"_id": 0})
    return row.get("value", {}).get("delivered_at", "") if row else ""


async def _mark_delivery(db, delivered_at: str, recipients_count: int, status: str = "success", error: str = ""):
    """Record delivery timestamp and result."""
    await db.admin_settings.update_one(
        {"key": "report_last_delivery"},
        {"$set": {"key": "report_last_delivery", "value": {
            "delivered_at": delivered_at,
            "recipients_count": recipients_count,
            "status": status,
            "error": error,
        }}},
        upsert=True,
    )


def _get_tz_offset(tz_name: str) -> timedelta:
    """Simple timezone offset resolver for common African/business timezones."""
    offsets = {
        "Africa/Dar_es_Salaam": timedelta(hours=3),
        "Africa/Nairobi": timedelta(hours=3),
        "Africa/Lagos": timedelta(hours=1),
        "Africa/Johannesburg": timedelta(hours=2),
        "Africa/Cairo": timedelta(hours=2),
        "UTC": timedelta(hours=0),
        "Europe/London": timedelta(hours=0),
        "Asia/Dubai": timedelta(hours=4),
        "America/New_York": timedelta(hours=-5),
    }
    return offsets.get(tz_name, timedelta(hours=3))


def _is_delivery_time(config: dict) -> bool:
    """Check if current moment matches the scheduled delivery window."""
    if not config.get("enabled", True):
        return False

    tz_offset = _get_tz_offset(config.get("timezone", "Africa/Dar_es_Salaam"))
    now_local = datetime.now(timezone.utc) + tz_offset

    target_day = DAY_MAP.get(config.get("day", "monday"), 0)
    if now_local.weekday() != target_day:
        return False

    time_str = config.get("time", "08:00")
    parts = time_str.split(":")
    target_hour = int(parts[0]) if len(parts) > 0 else 8
    target_min = int(parts[1]) if len(parts) > 1 else 0

    # Match within a 2-minute window
    current_minutes = now_local.hour * 60 + now_local.minute
    target_minutes = target_hour * 60 + target_min
    return 0 <= (current_minutes - target_minutes) < 2


async def _already_delivered_this_week(db, config: dict) -> bool:
    """Prevent duplicate deliveries in the same week."""
    last = await _get_last_delivery(db)
    if not last:
        return False

    tz_offset = _get_tz_offset(config.get("timezone", "Africa/Dar_es_Salaam"))
    now_local = datetime.now(timezone.utc) + tz_offset

    try:
        last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
        last_local = last_dt + tz_offset
        # Same ISO week number = already delivered
        return last_local.isocalendar()[1] == now_local.isocalendar()[1] and last_local.year == now_local.year
    except Exception:
        return False


async def _generate_executive_snapshot(db) -> dict:
    """Generate a lightweight executive summary with week-over-week trends."""
    now = datetime.now(timezone.utc)
    week_end = now
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)
    ws = week_start.isoformat()
    we = week_end.isoformat()
    pws = prev_week_start.isoformat()

    all_orders = await db.orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0, "total_amount": 1, "total": 1, "payment_status": 1,
         "created_at": 1, "rating": 1}
    ).to_list(10000)

    def _in_range(ca, start, end):
        ca_str = ca.isoformat() if hasattr(ca, "isoformat") else str(ca or "")
        return start <= ca_str <= end

    # Current week
    week_orders = [o for o in all_orders if _in_range(o.get("created_at", ""), ws, we)]
    paid_week = [o for o in week_orders if o.get("payment_status") in ("paid", "verified")]
    revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in paid_week)
    orders_completed = len(paid_week)
    week_ratings = [o["rating"]["stars"] for o in week_orders if o.get("rating", {}).get("stars")]
    avg_rating = round(sum(week_ratings) / max(len(week_ratings), 1), 1) if week_ratings else 0

    # Previous week
    prev_orders = [o for o in all_orders if _in_range(o.get("created_at", ""), pws, ws)]
    prev_paid = [o for o in prev_orders if o.get("payment_status") in ("paid", "verified")]
    prev_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in prev_paid)
    prev_completed = len(prev_paid)
    prev_ratings = [o["rating"]["stars"] for o in prev_orders if o.get("rating", {}).get("stars")]
    prev_avg_rating = round(sum(prev_ratings) / max(len(prev_ratings), 1), 1) if prev_ratings else 0

    open_alerts = await db.action_alerts.count_documents({"status": "open"})
    prev_alerts = await db.action_alerts.count_documents({
        "status": "open",
        "created_at": {"$lt": week_start.isoformat()}
    })

    # Coaching signals count
    coaching_critical = 0
    try:
        from services.coaching_engine import generate_coaching_insights
        sales_users = await db.users.find(
            {"role": {"$in": ["sales", "staff"]}},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1}
        ).to_list(100)
        simple_table = []
        for u in sales_users:
            uid = u.get("id", "")
            rep_ords = [o for o in all_orders if o.get("assigned_sales_id") == uid]
            rep_paid_s = [o for o in rep_ords if o.get("payment_status") in ("paid", "verified")]
            rep_r = [o["rating"]["stars"] for o in rep_ords if o.get("rating", {}).get("stars")]
            simple_table.append({
                "id": uid, "name": u.get("full_name", ""),
                "deals": len(rep_paid_s), "revenue": 0, "pipeline": 0,
                "avg_rating": round(sum(rep_r) / max(len(rep_r), 1), 1) if rep_r else 0,
                "total_ratings": len(rep_r), "total_orders": len(rep_ords),
            })
        insights = await generate_coaching_insights(db, simple_table, all_orders, {})
        coaching_critical = sum(1 for i in insights if i["status"] in ("Critical", "Needs Attention"))
    except Exception as e:
        logger.warning("Coaching signals in snapshot failed: %s", e)

    period_start = week_start.strftime("%d %b")
    period_end = week_end.strftime("%d %b %Y")

    # Calculate trends
    def _pct_trend(curr, prev):
        if prev == 0:
            return "+100%" if curr > 0 else "0%"
        pct = round(((curr - prev) / prev) * 100)
        return f"+{pct}%" if pct >= 0 else f"{pct}%"

    def _abs_trend(curr, prev):
        diff = curr - prev
        return f"+{diff}" if diff >= 0 else str(diff)

    rev_trend = _pct_trend(revenue, prev_revenue)
    rev_arrow = "↑" if revenue >= prev_revenue else "↓"
    ord_diff = orders_completed - prev_completed
    ord_trend = f"+{ord_diff}" if ord_diff >= 0 else str(ord_diff)
    ord_arrow = "↑" if ord_diff >= 0 else "↓"
    rat_diff = round(avg_rating - prev_avg_rating, 1)
    rat_trend = f"+{rat_diff}" if rat_diff >= 0 else str(rat_diff)
    alert_diff = open_alerts - prev_alerts
    alert_trend = f"+{alert_diff}" if alert_diff >= 0 else str(alert_diff)

    return {
        "revenue": round(revenue, 0),
        "orders_completed": orders_completed,
        "avg_rating": avg_rating,
        "open_alerts": open_alerts,
        "period_label": f"{period_start} — {period_end}",
        "coaching_critical": coaching_critical,
        "trends": {
            "revenue": f"{rev_trend} {rev_arrow}",
            "orders": f"{ord_trend} {ord_arrow}",
            "rating": rat_trend,
            "alerts": f"{alert_trend}",
        },
    }


async def _deliver_report(db):
    """Generate snapshot and deliver to eligible recipients via multichannel dispatch."""
    config = await get_schedule_config(db)
    recipient_roles = config.get("recipient_roles", ["admin", "sales_manager", "finance_manager"])

    snapshot = await _generate_executive_snapshot(db)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Build notification content with trends
    rev_fmt = f"TZS {snapshot['revenue']:,.0f}"
    trends = snapshot.get("trends", {})
    message = (
        f"Weekly Performance ({snapshot['period_label']}): "
        f"Revenue {rev_fmt} ({trends.get('revenue', '')}) | "
        f"{snapshot['orders_completed']} orders ({trends.get('orders', '')}) | "
        f"Rating {snapshot['avg_rating']}/5 ({trends.get('rating', '')}) | "
        f"{snapshot['open_alerts']} alerts ({trends.get('alerts', '')} ⚠)"
    )

    # Add coaching flag if any reps need attention
    coaching_critical = snapshot.get("coaching_critical", 0)
    if coaching_critical > 0:
        message += f" | {coaching_critical} rep(s) need coaching attention"

    # Find eligible recipients by role
    role_queries = []
    for role in recipient_roles:
        if role == "admin":
            role_queries.append({"role": "admin"})
        elif role in ("sales_manager", "finance_manager"):
            role_queries.append({"role": "staff", "staff_role": role})

    recipients = []
    if role_queries:
        users = await db.users.find(
            {"$or": role_queries, "status": {"$ne": "inactive"}},
            {"_id": 0, "id": 1, "role": 1, "staff_role": 1, "full_name": 1, "email": 1}
        ).to_list(200)
        recipients = users

    delivered_count = 0
    for user in recipients:
        user_id = user.get("id", "")
        user_role = user.get("staff_role") or user.get("role", "admin")

        try:
            from services.notification_multichannel_service import dispatch_notification
            await dispatch_notification(
                db=db,
                event_key="weekly_report",
                recipient_user_id=user_id,
                recipient_role=user_role,
                title="Weekly Performance Report",
                message=message,
                target_url="/admin/reports/weekly-performance?weeks_back=1",
                cta_label="View Full Report",
                entity_type="report",
                entity_id=f"weekly-{now_iso[:10]}",
                context={
                    "report_summary": message,
                    "revenue": snapshot["revenue"],
                    "orders": snapshot["orders_completed"],
                    "rating": snapshot["avg_rating"],
                    "alerts": snapshot["open_alerts"],
                    "period": snapshot["period_label"],
                    "trends": snapshot.get("trends", {}),
                },
            )
            delivered_count += 1
        except Exception as e:
            logger.error("Failed to deliver report to %s: %s", user_id, str(e))

    await _mark_delivery(db, now_iso, delivered_count, "success")
    logger.info("Weekly report delivered to %d recipients", delivered_count)
    return delivered_count


async def scheduled_report_loop(app):
    """Background loop — checks every 60s if delivery is due."""
    await asyncio.sleep(10)  # Initial delay to let app fully start
    logger.info("Scheduled report delivery loop started")

    while True:
        try:
            db = app.mongodb
            config = await get_schedule_config(db)

            if config.get("enabled") and _is_delivery_time(config):
                if not await _already_delivered_this_week(db, config):
                    logger.info("Delivering scheduled weekly report...")
                    count = await _deliver_report(db)
                    logger.info("Scheduled delivery complete: %d recipients", count)
                else:
                    pass  # Already delivered this week
        except Exception as e:
            logger.error("Scheduled report loop error (non-fatal): %s", str(e))

        await asyncio.sleep(60)
