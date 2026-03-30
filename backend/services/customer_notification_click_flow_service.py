"""
Pack 4 — Customer Notification Click Flow Service (Hardened)
Now delegates to notification_dispatch_service for consistency.
Kept for backward compatibility — imports from this module still work.
"""
from services.notification_dispatch_service import NOTIFICATION_CLICK_TARGETS


def build_payment_approved_notification(order: dict, invoice: dict) -> dict:
    click = NOTIFICATION_CLICK_TARGETS.get("payment_approved", {})
    return {
        "role": "customer",
        "event_type": "payment_approved",
        "title": "Payment Approved",
        "message": "Your payment has been approved. You can now track your order progress.",
        "target_url": click.get("target_url", "/account/orders"),
        "target_ref": order.get("order_no") or order.get("id"),
        "cta_label": click.get("cta_label", "Track Order"),
    }


def build_payment_rejected_notification(invoice: dict) -> dict:
    click = NOTIFICATION_CLICK_TARGETS.get("payment_rejected", {})
    return {
        "role": "customer",
        "event_type": "payment_rejected",
        "title": "Payment Rejected",
        "message": "Your payment submission was rejected. Review the invoice and next steps.",
        "target_url": click.get("target_url", "/account/invoices"),
        "target_ref": invoice.get("invoice_no") or invoice.get("id"),
        "cta_label": click.get("cta_label", "Open Invoice"),
    }
