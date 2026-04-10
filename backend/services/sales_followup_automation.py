"""
Sales Follow-Up Automation Service.
Background task that periodically checks for:
1. Overdue follow-ups (next_follow_up_at passed, not won/lost)
2. Stale leads (no update in X days, not won/lost)
3. Quotes awaiting customer response beyond threshold
4. Approved deals awaiting payment
Creates notifications for sales team and admins.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from uuid import uuid4

logger = logging.getLogger("sales_followup_automation")

CHECK_INTERVAL_SECONDS = 3600  # Run every hour
STALE_LEAD_DAYS_DEFAULT = 7
QUOTE_RESPONSE_DAYS_DEFAULT = 5
PAYMENT_OVERDUE_DAYS_DEFAULT = 7


async def _get_crm_settings(db) -> dict:
    row = await db.crm_settings.find_one({}, {"_id": 0})
    return row or {}


async def _create_alert(db, *, alert_type: str, title: str, message: str,
                        target_url: str, entity_id: str = "", priority: str = "normal",
                        recipient_role: str = "admin", assigned_to: str = None):
    """Create a notification alert (deduplicated by entity_id + alert_type within 24h)."""
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(hours=24)).isoformat()

    # Deduplicate: don't re-alert if same entity+type was alerted in last 24h
    existing = await db.notifications.find_one({
        "notification_type": alert_type,
        "entity_id": entity_id,
        "created_at": {"$gte": cutoff},
    })
    if existing:
        return False

    doc = {
        "id": str(uuid4()),
        "notification_type": alert_type,
        "entity_id": entity_id,
        "title": title,
        "message": message,
        "target_url": target_url,
        "recipient_role": recipient_role,
        "priority": priority,
        "is_read": False,
        "created_at": now.isoformat(),
    }
    if assigned_to:
        doc["user_id"] = assigned_to
    await db.notifications.insert_one(doc)
    return True


async def check_overdue_followups(db):
    """Find leads with next_follow_up_at in the past."""
    now = datetime.now(timezone.utc)
    cursor = db.crm_leads.find({
        "next_follow_up_at": {"$lt": now.isoformat()},
        "stage": {"$nin": ["won", "lost"]},
    }, {"_id": 0}).limit(50)

    count = 0
    async for lead in cursor:
        lead_id = lead.get("id", "")
        company = lead.get("company_name") or lead.get("contact_name") or "Lead"
        assigned = lead.get("assigned_to")
        await _create_alert(
            db,
            alert_type="overdue_followup",
            title="Overdue Follow-Up",
            message=f"Follow-up for {company} is overdue. Please reach out.",
            target_url=f"/admin/crm?lead={lead_id}",
            entity_id=lead_id,
            priority="high",
            assigned_to=assigned,
        )
        count += 1
    return count


async def check_stale_leads(db, stale_days: int):
    """Find leads with no update in X days."""
    now = datetime.now(timezone.utc)
    stale_cutoff = (now - timedelta(days=stale_days)).isoformat()

    cursor = db.crm_leads.find({
        "updated_at": {"$lt": stale_cutoff},
        "stage": {"$nin": ["won", "lost"]},
    }, {"_id": 0}).limit(50)

    count = 0
    async for lead in cursor:
        lead_id = lead.get("id", "")
        company = lead.get("company_name") or lead.get("contact_name") or "Lead"
        assigned = lead.get("assigned_to")
        await _create_alert(
            db,
            alert_type="stale_lead",
            title="Stale Lead",
            message=f"{company} has had no activity for {stale_days}+ days.",
            target_url=f"/admin/crm?lead={lead_id}",
            entity_id=lead_id,
            priority="normal",
            assigned_to=assigned,
        )
        count += 1
    return count


async def check_quotes_awaiting_response(db, response_days: int):
    """Find quotes sent but not responded to within threshold."""
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=response_days)).isoformat()

    cursor = db.quotes_v2.find({
        "status": {"$in": ["sent", "quote_sent", "pending"]},
        "created_at": {"$lt": cutoff},
    }, {"_id": 0}).limit(50)

    count = 0
    async for quote in cursor:
        q_id = quote.get("id") or quote.get("quote_number", "")
        customer = quote.get("customer_name") or quote.get("customer_company") or "Customer"
        await _create_alert(
            db,
            alert_type="quote_awaiting_response",
            title="Quote Awaiting Response",
            message=f"Quote for {customer} has been pending for {response_days}+ days.",
            target_url=f"/admin/quotes",
            entity_id=q_id,
            priority="normal",
        )
        count += 1
    return count


async def check_deals_awaiting_payment(db, payment_days: int):
    """Find approved orders with no payment for X days."""
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=payment_days)).isoformat()

    cursor = db.orders.find({
        "status": {"$in": ["approved", "confirmed", "pending_payment"]},
        "created_at": {"$lt": cutoff},
    }, {"_id": 0}).limit(50)

    count = 0
    async for order in cursor:
        o_id = order.get("id") or order.get("order_number", "")
        customer = order.get("customer_name") or "Customer"
        await _create_alert(
            db,
            alert_type="deal_awaiting_payment",
            title="Deal Awaiting Payment",
            message=f"Order for {customer} approved but no payment in {payment_days}+ days.",
            target_url=f"/admin/orders",
            entity_id=o_id,
            priority="high",
        )
        count += 1
    return count


async def sales_followup_loop(app):
    """Main background loop that runs periodic checks."""
    logger.info("Sales follow-up automation started")
    await asyncio.sleep(30)  # Initial delay to let app fully start

    while True:
        try:
            db = app.mongodb

            settings = await _get_crm_settings(db)
            stale_days = int(settings.get("stale_lead_days", STALE_LEAD_DAYS_DEFAULT) or STALE_LEAD_DAYS_DEFAULT)
            quote_days = int(settings.get("quote_response_days", QUOTE_RESPONSE_DAYS_DEFAULT) or QUOTE_RESPONSE_DAYS_DEFAULT)
            payment_days = int(settings.get("payment_overdue_days", PAYMENT_OVERDUE_DAYS_DEFAULT) or PAYMENT_OVERDUE_DAYS_DEFAULT)

            overdue = await check_overdue_followups(db)
            stale = await check_stale_leads(db, stale_days)
            quotes = await check_quotes_awaiting_response(db, quote_days)
            payments = await check_deals_awaiting_payment(db, payment_days)

            if overdue or stale or quotes or payments:
                logger.info(f"Follow-up check: {overdue} overdue, {stale} stale, {quotes} quote alerts, {payments} payment alerts")

        except Exception as e:
            logger.error(f"Sales follow-up automation error: {e}")

        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
