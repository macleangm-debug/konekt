"""
Notification Registry Service — Single source of truth for sidebar badge counts.
Provides structured summary with new_count and action_required_count per section.
"""
from datetime import datetime, timezone


async def build_notification_summary(db):
    """Query actual MongoDB collections for live badge counts."""
    now = datetime.now(timezone.utc)

    # Requests Inbox — action-needed (submitted/pending/new/in_review)
    requests_action = await db.requests.count_documents({
        "status": {"$in": ["submitted", "pending", "new", "in_review"]}
    })

    # Orders — new (pending/new/submitted) + action-needed (processing)
    orders_new = await db.orders.count_documents({
        "current_status": {"$in": ["pending", "new", "submitted"]}
    })
    orders_action = await db.orders.count_documents({
        "current_status": {"$in": ["processing", "payment_pending"]}
    })

    # Payments Queue — action-needed (submitted/pending review)
    payments_action = await db.payment_proofs.count_documents({
        "status": {"$in": ["submitted", "pending"]}
    })

    # Deliveries — active tracking (pending + in transit + ready for pickup)
    deliveries_active = await db.vendor_orders.count_documents({
        "delivery_status": {"$in": ["pending", "ready_for_pickup", "in_transit", "ready_for_dispatch"]}
    })

    # Quotes — expiring soon (sent status, could add valid_until check later)
    quotes_expiring = await db.quotes_v2.count_documents({
        "status": "sent"
    })
    # Fallback collection
    quotes_expiring_legacy = await db.quotes.count_documents({
        "status": "sent"
    })

    # Customers — new/inactive (registered but no orders)
    customers_new = await db.users.count_documents({
        "role": "customer",
        "status": {"$in": ["pending", "new"]}
    })

    return {
        "requests_inbox": {
            "new_count": 0,
            "action_required_count": requests_action,
            "badge_count": requests_action,
            "badge_type": "action",
        },
        "orders": {
            "new_count": orders_new,
            "action_required_count": orders_action,
            "badge_count": orders_new + orders_action,
            "badge_type": "action" if orders_action > 0 else "new",
        },
        "payments_queue": {
            "new_count": 0,
            "action_required_count": payments_action,
            "badge_count": payments_action,
            "badge_type": "action",
        },
        "deliveries": {
            "new_count": 0,
            "action_required_count": deliveries_active,
            "badge_count": deliveries_active,
            "badge_type": "attention",
        },
        "quotes": {
            "new_count": 0,
            "action_required_count": quotes_expiring + quotes_expiring_legacy,
            "badge_count": quotes_expiring + quotes_expiring_legacy,
            "badge_type": "time_sensitive",
        },
        "customers": {
            "new_count": customers_new,
            "action_required_count": 0,
            "badge_count": customers_new,
            "badge_type": "new",
        },
        "generated_at": now.isoformat(),
    }
