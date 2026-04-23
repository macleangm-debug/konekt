"""
Weekly Operations Digest Service.
Generates a short, executive-level summary of operational health.
Delivered as in-app notification (email-ready structure for later).
Uses existing scheduler pattern.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from uuid import uuid4

logger = logging.getLogger("weekly_digest")

DIGEST_CHECK_INTERVAL = 300  # Check every 5 mins if it's time


async def _is_digest_due(db) -> bool:
    """Check if weekly digest should be generated (Monday morning, once per week)."""
    now = datetime.now(timezone.utc)
    if now.weekday() != 0:  # Only on Monday
        return False
    if now.hour < 6 or now.hour > 10:  # Between 6-10 AM UTC
        return False

    # Check if we already sent one this week
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    existing = await db.notifications.find_one({
        "notification_type": "weekly_operations_digest",
        "created_at": {"$gte": week_start},
    })
    return existing is None


async def generate_digest(db) -> dict:
    """Generate the weekly operations digest data."""
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    # Section 1: Service Task Pipeline
    total_tasks = await db.service_tasks.count_documents({"created_at": {"$gte": week_ago}})
    auto_assigned = await db.service_tasks.count_documents({"created_at": {"$gte": week_ago}, "auto_assigned": True})
    unassigned = await db.service_tasks.count_documents({"status": "unassigned"})
    overdue_partner = await db.service_tasks.count_documents({
        "status": {"$in": ["assigned", "awaiting_cost"]},
        "created_at": {"$lte": (now - timedelta(hours=48)).isoformat()},
    })
    auto_rate = round((auto_assigned / total_tasks * 100), 0) if total_tasks > 0 else 0

    task_summary = f"{total_tasks} tasks created — {auto_rate}% auto-assigned\n"
    task_summary += f"{unassigned} unassigned | {overdue_partner} overdue responses"

    # Section 2: Partner Performance
    pipeline = [
        {"$match": {"cost_submitted_at": {"$exists": True, "$gte": week_ago}}},
        {"$group": {
            "_id": "$partner_name",
            "avg_hours": {"$avg": {"$subtract": [
                {"$dateFromString": {"dateString": "$cost_submitted_at"}},
                {"$dateFromString": {"dateString": "$created_at"}}
            ]}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"avg_hours": 1}},
    ]
    partner_stats = []
    try:
        async for row in db.service_tasks.aggregate(pipeline):
            hours = round((row.get("avg_hours", 0) or 0) / 3600000, 1)
            partner_stats.append({
                "name": row["_id"] or "Unknown",
                "avg_response_hours": hours,
                "tasks_completed": row["count"],
            })
    except Exception:
        pass

    fastest = partner_stats[0]["name"] if partner_stats else "—"
    slowest = partner_stats[-1]["name"] if len(partner_stats) > 1 else "—"
    avg_response = round(sum(p["avg_response_hours"] for p in partner_stats) / len(partner_stats), 1) if partner_stats else 0

    partner_summary = f"Avg response: {avg_response}h\n"
    partner_summary += f"Fastest: {fastest}\nSlowest: {slowest}"

    # Section 3: Revenue Flow
    quotes_created = await db.quotes_v2.count_documents({"created_at": {"$gte": week_ago}})
    orders_created = await db.orders.count_documents({"created_at": {"$gte": week_ago}})
    conversion = round((orders_created / quotes_created * 100), 0) if quotes_created > 0 else 0
    payments_approved = await db.payment_proofs.count_documents({
        "status": {"$in": ["approved", "verified"]},
        "created_at": {"$gte": week_ago},
    })

    revenue_summary = f"{quotes_created} quotes -> {orders_created} orders ({conversion}%)\n"
    revenue_summary += f"{payments_approved} payments approved"

    # Section 4: Alerts Summary
    alerts = []
    if unassigned > 0:
        alerts.append(f"{unassigned} tasks need partner assignment")
    if overdue_partner > 0:
        alerts.append(f"{overdue_partner} partner responses overdue")

    overdue_followups = await db.crm_leads.count_documents({
        "next_follow_up_at": {"$lt": now.isoformat()},
        "stage": {"$nin": ["won", "lost"]},
    })
    if overdue_followups > 0:
        alerts.append(f"{overdue_followups} CRM follow-ups overdue")

    alert_summary = "\n".join(alerts) if alerts else "No critical alerts"

    return {
        "task_pipeline": task_summary,
        "partner_performance": partner_summary,
        "revenue_flow": revenue_summary,
        "alerts": alert_summary,
        "generated_at": now.isoformat(),
        "period": f"{(now - timedelta(days=7)).strftime('%b %d')} — {now.strftime('%b %d, %Y')}",
    }


async def deliver_digest(db, digest: dict):
    """Create in-app notification + email digest to all admins with email prefs on."""
    now = datetime.now(timezone.utc).isoformat()

    # Build clean message body
    body = (
        f"Weekly Operations Digest ({digest['period']})\n\n"
        f"SERVICE TASKS\n{digest['task_pipeline']}\n\n"
        f"PARTNER PERFORMANCE\n{digest['partner_performance']}\n\n"
        f"REVENUE FLOW\n{digest['revenue_flow']}\n\n"
        f"ALERTS\n{digest['alerts']}"
    )

    await db.notifications.insert_one({
        "id": str(uuid4()),
        "notification_type": "weekly_operations_digest",
        "title": f"Weekly Operations Digest — {digest['period']}",
        "message": body,
        "target_url": "/admin",
        "recipient_role": "admin",
        "priority": "normal",
        "is_read": False,
        "digest_data": digest,
        "created_at": now,
    })

    # Email (best-effort) — only if Resend is configured and the weekly_operations_digest event isn't system-off
    try:
        import os
        api_key = os.getenv("RESEND_API_KEY")
        from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
        if not api_key:
            return
        cfg = await db.system_notification_config.find_one({"event_key": "weekly_operations_digest"}, {"_id": 0})
        if cfg and cfg.get("email_enabled") is False:
            logger.info("Weekly digest email suppressed by system config")
            return

        admins = await db.users.find({"role": "admin", "email": {"$exists": True, "$ne": ""}}, {"_id": 0, "email": 1, "full_name": 1}).to_list(50)
        if not admins:
            return

        html = f"""
        <div style='font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px'>
          <h2 style='color:#20364D'>Konekt — Weekly Operations Digest</h2>
          <p style='color:#475569;font-size:13px'>{digest['period']}</p>
          <pre style='white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;font-family:ui-monospace,monospace;font-size:12px;color:#1f2937'>{body}</pre>
          <p style='color:#94a3b8;font-size:11px'>Generated automatically · view the full dashboard at <a href='https://konekt.co.tz/admin'>konekt.co.tz/admin</a></p>
        </div>
        """
        import resend
        import asyncio
        resend.api_key = api_key
        for admin in admins:
            try:
                await asyncio.to_thread(
                    resend.Emails.send,
                    {"from": from_email, "to": [admin["email"]],
                     "subject": f"Konekt weekly digest — {digest['period']}", "html": html},
                )
            except Exception as mail_err:
                logger.warning("Digest email to %s failed: %s", admin.get("email"), mail_err)
    except Exception as e:
        logger.error("Digest email section failed: %s", e)

    logger.info(f"Weekly digest delivered for period {digest['period']}")


async def weekly_digest_loop(app):
    """Background loop that checks if digest is due."""
    logger.info("Weekly digest scheduler started")
    await asyncio.sleep(60)

    while True:
        try:
            db = app.mongodb
            if await _is_digest_due(db):
                digest = await generate_digest(db)
                await deliver_digest(db, digest)
        except Exception as e:
            logger.error(f"Weekly digest error: {e}")

        await asyncio.sleep(DIGEST_CHECK_INTERVAL)
