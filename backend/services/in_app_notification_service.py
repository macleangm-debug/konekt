"""
In-App Notification Service
Creates actionable notifications in the existing notifications collection.
No new routes — extends the existing notification_routes.py flow.
"""
from datetime import datetime, timezone
from uuid import uuid4
import logging

logger = logging.getLogger("in_app_notifications")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NOTIFICATION EVENT DEFINITIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTIFICATION_EVENTS = {
    # ── Customer notifications ──
    "order_created": {
        "title": "Order Received",
        "message_tpl": "Your order {order_number} has been received and is being processed.",
        "type": "info",
        "priority": "normal",
        "cta_label": "View Order",
        "roles": ["customer"],
    },
    "payment_verified": {
        "title": "Payment Verified",
        "message_tpl": "Your payment for order {order_number} has been verified. Your order is now being processed.",
        "type": "success",
        "priority": "normal",
        "cta_label": "Track Order",
        "roles": ["customer"],
    },
    "order_in_fulfillment": {
        "title": "Order In Fulfillment",
        "message_tpl": "Your order {order_number} is now being fulfilled.",
        "type": "info",
        "priority": "normal",
        "cta_label": "Track Order",
        "roles": ["customer"],
    },
    "order_dispatched": {
        "title": "Order Dispatched",
        "message_tpl": "Your order {order_number} has been dispatched and is on its way.",
        "type": "success",
        "priority": "normal",
        "cta_label": "Track Delivery",
        "roles": ["customer"],
    },
    "order_delivered": {
        "title": "Order Delivered",
        "message_tpl": "Your order {order_number} has been delivered.",
        "type": "success",
        "priority": "normal",
        "cta_label": "View Order",
        "roles": ["customer"],
    },
    "order_delayed": {
        "title": "Order Delayed",
        "message_tpl": "Your order {order_number} has been delayed. Our team is working to resolve this.",
        "type": "warning",
        "priority": "high",
        "cta_label": "View Order",
        "roles": ["customer"],
    },
    "referral_reward": {
        "title": "Referral Reward Earned!",
        "message_tpl": "You earned TZS {reward_amount} from a referral purchase.",
        "type": "success",
        "priority": "normal",
        "cta_label": "View Rewards",
        "cta_path": "/account/referrals",
        "roles": ["customer"],
    },
    "referral_milestone": {
        "title": "Referral Milestone Reached!",
        "message_tpl": "You've reached {milestone_value} {milestone_type}. Keep sharing to earn more.",
        "type": "success",
        "priority": "normal",
        "cta_label": "View Progress",
        "cta_path": "/account/referrals",
        "roles": ["customer"],
    },
    # ── Sales notifications ──
    "sales_order_assigned": {
        "title": "New Order Assigned",
        "message_tpl": "Order {order_number} has been assigned to you.",
        "type": "info",
        "priority": "normal",
        "cta_label": "Open Order",
        "roles": ["sales"],
    },
    "sales_delay_flagged": {
        "title": "Order Delay Flagged",
        "message_tpl": "Order {order_number} has been flagged as delayed by the vendor.",
        "type": "warning",
        "priority": "high",
        "cta_label": "Review Delay",
        "roles": ["sales"],
    },
    # ── Vendor notifications ──
    "vendor_order_assigned": {
        "title": "New Order Assignment",
        "message_tpl": "A new order has been assigned to you: {vendor_order_no}.",
        "type": "info",
        "priority": "normal",
        "cta_label": "View Assignment",
        "roles": ["vendor"],
    },
    # ── Admin notifications ──
    "admin_sales_override": {
        "title": "Sales Status Override",
        "message_tpl": "Sales team overrode status on order {order_number}: {previous_status} → {new_status}.",
        "type": "warning",
        "priority": "normal",
        "cta_label": "Review Order",
        "roles": ["admin"],
    },
    "admin_delay_flagged": {
        "title": "Vendor Delay Reported",
        "message_tpl": "Vendor flagged a delay on order {order_number}.",
        "type": "warning",
        "priority": "high",
        "cta_label": "Review Order",
        "roles": ["admin"],
    },
    # ── Report notifications ──
    "weekly_report": {
        "title": "Weekly Performance Report",
        "message_tpl": "{report_summary}",
        "type": "info",
        "priority": "normal",
        "cta_label": "View Full Report",
        "roles": ["admin", "sales_manager", "finance_manager"],
    },
}

# ── Role → CTA deep link templates ──
ROLE_DEEP_LINKS = {
    "customer": "/account/orders/{order_id}",
    "sales": "/staff/orders",
    "vendor": "/partner/orders",
    "admin": "/admin/orders",
}

# ── Event-specific deep links (override role-based links) ──
EVENT_DEEP_LINKS = {
    "weekly_report": "/admin/reports/weekly-performance?weeks_back=1",
}

# ── Status → notification event mapping ──
# Maps (new_status, source_role) → list of notification events to fire
STATUS_TO_EVENTS = {
    "in_production": ["order_in_fulfillment"],
    "in_progress": ["order_in_fulfillment"],
    "in_fulfillment": ["order_in_fulfillment"],
    "dispatched": ["order_dispatched"],
    "in_transit": ["order_dispatched"],
    "picked_up": ["order_dispatched"],
    "delivered": ["order_delivered"],
    "completed": ["order_delivered"],
    "delayed": ["order_delayed", "sales_delay_flagged", "admin_delay_flagged"],
}


async def create_in_app_notification(
    db,
    event_key: str,
    recipient_user_id: str = None,
    recipient_role: str = None,
    entity_type: str = "order",
    entity_id: str = "",
    order_id: str = "",
    context: dict = None,
    skip_pref_check: bool = False,
):
    """
    Create an in-app notification in the existing notifications collection.
    Uses the same model the frontend NotificationBell expects.
    Enforces user preferences: check → then send.
    """
    ctx = context or {}
    event_def = NOTIFICATION_EVENTS.get(event_key)
    if not event_def:
        logger.warning("Unknown notification event: %s", event_key)
        return

    # ── Preference enforcement ──
    if not skip_pref_check:
        try:
            from services.notification_multichannel_service import get_user_preferences, _get_channel_prefs
            prefs = await get_user_preferences(db, recipient_user_id or "", recipient_role or "customer")
            channel = _get_channel_prefs(prefs, event_key, recipient_role or "customer")
            if not channel.get("in_app", True):
                logger.info("In-app suppressed by prefs: [%s] for %s", event_key, recipient_role or recipient_user_id)
                return
        except Exception as e:
            logger.warning("Pref check failed (allowing): %s", str(e))

    # Build the message from template
    try:
        message = event_def["message_tpl"].format(**ctx)
    except KeyError:
        message = event_def["message_tpl"]

    # Resolve deep link — event-specific links take priority
    if event_key in EVENT_DEEP_LINKS:
        target_url = EVENT_DEEP_LINKS[event_key]
    else:
        target_role = recipient_role or (event_def["roles"][0] if event_def["roles"] else "customer")
        link_tpl = ROLE_DEEP_LINKS.get(target_role, "/")
        target_url = link_tpl.format(order_id=order_id or entity_id)

    now = datetime.now(timezone.utc).isoformat()

    notif = {
        "id": str(uuid4()),
        "title": event_def["title"],
        "message": message,
        "type": event_def["type"],
        "priority": event_def["priority"],
        "action_key": event_key,
        "entity_type": entity_type,
        "entity_id": entity_id or order_id,
        "recipient_user_id": recipient_user_id or "",
        "recipient_role": recipient_role or target_role,
        "target_url": target_url,
        "cta_label": event_def["cta_label"],
        "is_read": False,
        "read": False,
        "created_at": now,
    }

    try:
        await db.notifications.insert_one(notif)
        logger.info("Notification created: [%s] → %s (%s)", event_key, recipient_role or recipient_user_id, message[:60])
    except Exception as e:
        logger.error("Failed to create notification [%s]: %s", event_key, str(e))


async def notify_on_status_change(
    db,
    new_status: str,
    order_number: str = "",
    order_id: str = "",
    customer_id: str = "",
    vendor_id: str = "",
    vendor_order_no: str = "",
    assigned_sales_id: str = "",
    source_role: str = "system",
    previous_status: str = "",
):
    """
    Fire role-appropriate notifications based on a status transition.
    Called from record_status_change() and other status update flows.
    Only fires on meaningful transitions defined in STATUS_TO_EVENTS.
    """
    event_keys = STATUS_TO_EVENTS.get(new_status, [])
    if not event_keys:
        return

    # Also fire sales_override notification if source is sales
    if source_role == "sales" and new_status not in ("delayed",):
        event_keys = list(event_keys) + ["admin_sales_override"]

    context = {
        "order_number": order_number,
        "vendor_order_no": vendor_order_no or order_number,
        "previous_status": (previous_status or "").replace("_", " "),
        "new_status": (new_status or "").replace("_", " "),
    }

    for event_key in event_keys:
        event_def = NOTIFICATION_EVENTS.get(event_key)
        if not event_def:
            continue

        for role in event_def["roles"]:
            recipient_user_id = None
            if role == "customer" and customer_id:
                recipient_user_id = customer_id
            elif role == "sales" and assigned_sales_id:
                recipient_user_id = assigned_sales_id
            elif role == "vendor" and vendor_id:
                recipient_user_id = vendor_id
            # admin notifications target by role, not user_id

            await create_in_app_notification(
                db=db,
                event_key=event_key,
                recipient_user_id=recipient_user_id,
                recipient_role=role,
                entity_type="order",
                entity_id=order_id,
                order_id=order_id,
                context=context,
            )
