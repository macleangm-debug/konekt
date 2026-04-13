"""
Messaging Event Hooks — Event definitions and payload structures.
Prepares the system for future Twilio/Resend integration.
No fake UI. No simulated sending. Just clean event triggers and payloads.
"""
from datetime import datetime, timezone
from typing import Optional
from enum import Enum


class EventType(str, Enum):
    QUOTE_CREATED = "quote_created"
    QUOTE_APPROVED = "quote_approved"
    INVOICE_ISSUED = "invoice_issued"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_APPROVED = "payment_approved"
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_DISPATCHED = "order_dispatched"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    ORDER_COMPLETED = "order_completed"
    EFD_READY = "efd_ready"
    GROUP_DEAL_JOINED = "group_deal_joined"
    GROUP_DEAL_FINALIZED = "group_deal_finalized"
    GROUP_DEAL_FAILED = "group_deal_failed"
    REFUND_PROCESSED = "refund_processed"


def build_event_payload(
    event_type: EventType,
    recipient_phone: Optional[str] = None,
    recipient_email: Optional[str] = None,
    recipient_name: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_number: Optional[str] = None,
    entity_type: Optional[str] = None,
    amount: Optional[float] = None,
    currency: str = "TZS",
    extra: Optional[dict] = None,
) -> dict:
    """
    Build a standardized event payload for messaging hooks.
    This payload can be consumed by any future messaging service
    (Twilio WhatsApp, Resend Email, SMS, etc.)
    """
    payload = {
        "event_type": event_type.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "recipient": {
            "phone": recipient_phone,
            "email": recipient_email,
            "name": recipient_name,
        },
        "entity": {
            "id": entity_id,
            "number": entity_number,
            "type": entity_type,
        },
        "amount": amount,
        "currency": currency,
    }
    if extra:
        payload["extra"] = extra
    return payload


# ─── EVENT TRIGGER HELPERS ───
# These are called from business logic routes when events occur.
# Currently they just build the payload. When Twilio/Resend keys are available,
# these will dispatch to the actual messaging service.

_event_log = []


async def trigger_event(
    event_type: EventType,
    recipient_phone: Optional[str] = None,
    recipient_email: Optional[str] = None,
    recipient_name: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_number: Optional[str] = None,
    entity_type: Optional[str] = None,
    amount: Optional[float] = None,
    currency: str = "TZS",
    extra: Optional[dict] = None,
):
    """
    Trigger a messaging event. Currently logs the payload for future dispatch.
    When Twilio/Resend integration is active, this will send messages.
    """
    payload = build_event_payload(
        event_type=event_type,
        recipient_phone=recipient_phone,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        entity_id=entity_id,
        entity_number=entity_number,
        entity_type=entity_type,
        amount=amount,
        currency=currency,
        extra=extra,
    )

    # Log for now — replace with actual dispatch when keys are available
    _event_log.append(payload)

    # Keep log bounded
    if len(_event_log) > 500:
        _event_log.pop(0)

    return payload


def get_recent_events(limit: int = 50) -> list:
    """Return recent event payloads for admin debugging."""
    return list(reversed(_event_log[-limit:]))


# ─── MESSAGE TEMPLATES (for future use) ───
# Define human-readable message templates per event type.
# These will be used by the actual messaging service.

MESSAGE_TEMPLATES = {
    EventType.QUOTE_CREATED: {
        "subject": "Your Quote is Ready — {entity_number}",
        "body": "Hi {recipient_name}, your quote {entity_number} for {amount} {currency} is ready for review.",
    },
    EventType.QUOTE_APPROVED: {
        "subject": "Quote Approved — {entity_number}",
        "body": "Hi {recipient_name}, your quote {entity_number} has been approved. An invoice will follow shortly.",
    },
    EventType.INVOICE_ISSUED: {
        "subject": "Invoice {entity_number} — {amount} {currency}",
        "body": "Hi {recipient_name}, invoice {entity_number} for {amount} {currency} has been issued. Please proceed with payment.",
    },
    EventType.PAYMENT_RECEIVED: {
        "subject": "Payment Received — {entity_number}",
        "body": "Hi {recipient_name}, we've received your payment for {entity_number}. It's now under review.",
    },
    EventType.PAYMENT_APPROVED: {
        "subject": "Payment Approved — {entity_number}",
        "body": "Hi {recipient_name}, your payment for {entity_number} has been approved. Your order is being processed.",
    },
    EventType.ORDER_CONFIRMED: {
        "subject": "Order Confirmed — {entity_number}",
        "body": "Hi {recipient_name}, your order {entity_number} has been confirmed and is being prepared.",
    },
    EventType.ORDER_DISPATCHED: {
        "subject": "Order Dispatched — {entity_number}",
        "body": "Hi {recipient_name}, your order {entity_number} has been dispatched. You can track it in your account.",
    },
    EventType.AWAITING_CONFIRMATION: {
        "subject": "Please Confirm Delivery — {entity_number}",
        "body": "Hi {recipient_name}, your order {entity_number} has been delivered. Please confirm receipt in your account.",
    },
    EventType.ORDER_COMPLETED: {
        "subject": "Order Complete — {entity_number}",
        "body": "Hi {recipient_name}, your order {entity_number} is now complete. Thank you for your business.",
    },
    EventType.EFD_READY: {
        "subject": "EFD Receipt Ready — {entity_number}",
        "body": "Hi {recipient_name}, your EFD receipt for {entity_number} is ready for download.",
    },
    EventType.GROUP_DEAL_JOINED: {
        "subject": "You've Joined a Group Deal",
        "body": "Hi {recipient_name}, you've successfully joined the group deal. We'll notify you when the target is reached.",
    },
    EventType.GROUP_DEAL_FINALIZED: {
        "subject": "Group Deal Activated — Your Order is Being Processed",
        "body": "Hi {recipient_name}, the group deal has reached its target! Your order is now being processed.",
    },
    EventType.GROUP_DEAL_FAILED: {
        "subject": "Group Deal Did Not Complete — Refund Coming",
        "body": "Hi {recipient_name}, unfortunately the group deal did not reach its target. A refund is being processed.",
    },
    EventType.REFUND_PROCESSED: {
        "subject": "Refund Processed — {amount} {currency}",
        "body": "Hi {recipient_name}, your refund of {amount} {currency} has been processed.",
    },
}
