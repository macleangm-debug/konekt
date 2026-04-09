"""
Pack 4 — Notification Dispatch Service
Centralizes notification creation and clickable routing logic.
Replaces inline notification inserts across live_commerce_service and other routes.

Notification click targets:
- payment_approved → /account/orders (Track Order)
- payment_rejected → /account/invoices (Open Invoice)
- vendor_order_assigned → /partner/orders (View Order)
- sales_order_assigned → /staff/orders (Open Order)
"""
import logging
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger("notification_dispatch")

# ---- Click target registry ----
NOTIFICATION_CLICK_TARGETS = {
    "payment_approved": {
        "target_url": "/account/orders",
        "cta_label": "Track Order",
    },
    "payment_rejected": {
        "target_url": "/account/invoices",
        "cta_label": "Open Invoice",
    },
    "vendor_order_assigned": {
        "target_url": "/partner/orders",
        "cta_label": "View Order",
    },
    "sales_order_assigned": {
        "target_url": "/staff/orders",
        "cta_label": "Open Order",
    },
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_notification(
    user_id: str,
    role: str,
    event_type: str,
    title: str,
    message: str,
    target_ref: str = "",
    extra: dict = None,
) -> dict:
    """Build a notification document using the click target registry."""
    click = NOTIFICATION_CLICK_TARGETS.get(event_type, {})
    doc = {
        "id": str(uuid4()),
        "user_id": user_id,
        "role": role,
        "event_type": event_type,
        "title": title,
        "message": message,
        "target_url": click.get("target_url", ""),
        "target_ref": target_ref,
        "cta_label": click.get("cta_label", ""),
        "read": False,
        "created_at": _now_iso(),
    }
    if extra:
        doc.update(extra)
    return doc


async def dispatch_notification(db, notification_doc: dict):
    """
    Persist a notification — routes through multichannel service to enforce
    user preferences (check → then send) instead of sending blindly.
    """
    event_type = notification_doc.get("event_type", "")
    user_id = notification_doc.get("user_id", "")
    role = notification_doc.get("role", "customer")

    try:
        from services.notification_multichannel_service import dispatch_notification as mc_dispatch
        await mc_dispatch(
            db=db,
            event_key=event_type,
            recipient_user_id=user_id,
            recipient_role=role,
            title=notification_doc.get("title", ""),
            message=notification_doc.get("message", ""),
            target_url=notification_doc.get("target_url", ""),
            cta_label=notification_doc.get("cta_label", ""),
            entity_type=notification_doc.get("entity_type", "order"),
            entity_id=notification_doc.get("target_ref", ""),
            context=notification_doc,
        )
    except Exception as e:
        # Fallback: direct insert to ensure notifications never get lost
        logger.warning("Multichannel dispatch failed, falling back: %s", str(e))
        await db.notifications.insert_one(notification_doc)

    logger.info(
        "[notification_dispatch] dispatched event=%s to user=%s",
        event_type,
        user_id,
    )


async def notify_payment_approved(db, user_id: str, invoice: dict, order: dict = None):
    """Dispatch a payment approved notification to the customer."""
    notif = build_notification(
        user_id=user_id,
        role="customer",
        event_type="payment_approved",
        title="Payment Approved",
        message=f"Your payment for invoice {invoice.get('invoice_number', '')} has been approved. You can now track your order progress.",
        target_ref=(order or {}).get("order_number") or invoice.get("invoice_number") or invoice.get("id"),
    )
    await dispatch_notification(db, notif)


async def notify_payment_rejected(db, user_id: str, invoice: dict, reason: str = ""):
    """Dispatch a payment rejected notification to the customer."""
    notif = build_notification(
        user_id=user_id,
        role="customer",
        event_type="payment_rejected",
        title="Payment Rejected",
        message=f"Your payment submission for invoice {invoice.get('invoice_number', '')} was rejected. Reason: {reason or 'Not specified'}. Please review and resubmit.",
        target_ref=invoice.get("invoice_number") or invoice.get("id"),
    )
    await dispatch_notification(db, notif)


async def notify_vendor_order_assigned(db, partner_id: str, vendor_order: dict):
    """Dispatch a vendor order assignment notification."""
    notif = build_notification(
        user_id=partner_id,
        role="vendor",
        event_type="vendor_order_assigned",
        title="New Order Assigned",
        message="A new vendor order has been assigned to you.",
        target_ref=vendor_order.get("id"),
        extra={"partner_id": partner_id},
    )
    await dispatch_notification(db, notif)


async def notify_sales_order_assigned(db, sales_user_id: str, order: dict):
    """Dispatch a sales order assignment notification."""
    notif = build_notification(
        user_id=sales_user_id,
        role="sales",
        event_type="sales_order_assigned",
        title="Order Assigned",
        message="A new order has been assigned to you for follow-up.",
        target_ref=order.get("id"),
    )
    await dispatch_notification(db, notif)
