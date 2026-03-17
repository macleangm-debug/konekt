"""
Notification Service
Creates notification documents for various events

Priority levels:
- normal: routine updates (campaign available, settlement generated)
- high: action required (new assignment, payment submitted, quote approved)
- urgent: time-sensitive (SLA breach, stalled delivery, overdue updates)

Roles supported:
- admin, super_admin: system-wide alerts
- sales: assigned opportunities, customer updates
- operations: handoffs, delivery tasks
- supervisor: team alerts, performance issues
- affiliate: commissions, campaigns
- partner: jobs, settlements
- customer: orders, quotes, invoices, services
"""
from datetime import datetime, timezone
import uuid


def build_notification_doc(
    *,
    notification_type: str,
    title: str,
    message: str,
    target_url: str,
    recipient_role: str | None = None,
    recipient_user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    priority: str = "normal",  # normal | high | urgent
    action_key: str | None = None,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Build a notification document for insertion"""
    return {
        "id": str(uuid.uuid4()),
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "target_url": target_url,
        "recipient_role": recipient_role,
        "recipient_user_id": recipient_user_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "priority": priority,
        "action_key": action_key,
        "triggered_by_user_id": triggered_by_user_id,
        "triggered_by_role": triggered_by_role,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


async def create_notification(db, *, notification_type: str, title: str, message: str, 
                               target_url: str, recipient_role: str = None, 
                               recipient_user_id: str = None, entity_type: str = None,
                               entity_id: str = None, priority: str = "normal",
                               action_key: str = None, triggered_by_user_id: str = None,
                               triggered_by_role: str = None):
    """Create and insert a notification"""
    doc = build_notification_doc(
        notification_type=notification_type,
        title=title,
        message=message,
        target_url=target_url,
        recipient_role=recipient_role,
        recipient_user_id=recipient_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        priority=priority,
        action_key=action_key,
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)
    return doc


async def create_business_pricing_notification(db, *, company_name: str, customer_name: str, 
                                                 customer_email: str, assigned_sales_id: str = None):
    """Create notifications for a new business pricing request"""
    display_name = company_name or customer_name or customer_email
    
    # Admin notification
    admin_notification = build_notification_doc(
        notification_type="business_pricing_request",
        title="New business pricing request",
        message=f"{display_name} requested commercial pricing support.",
        target_url="/admin/business-pricing-requests",
        recipient_role="admin",
    )
    await db.notifications.insert_one(admin_notification)
    
    # Sales notification if assigned
    if assigned_sales_id:
        sales_notification = build_notification_doc(
            notification_type="business_pricing_request",
            title="New assigned pricing request",
            message=f"You have a new business pricing request from {display_name}.",
            target_url="/staff/opportunities",
            recipient_user_id=assigned_sales_id,
        )
        await db.notifications.insert_one(sales_notification)
    
    return {"ok": True}


async def create_payment_proof_notification(db, *, order_id: str, customer_name: str):
    """Create notification for new payment proof submission"""
    notification = build_notification_doc(
        notification_type="payment_proof",
        title="New payment proof submitted",
        message=f"{customer_name} submitted a payment proof for order {order_id}.",
        target_url="/admin/payment-proofs",
        recipient_role="admin",
    )
    await db.notifications.insert_one(notification)
    return {"ok": True}
