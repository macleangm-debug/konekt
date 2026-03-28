from datetime import datetime, timezone
from uuid import uuid4


def build_customer_payment_approved_notification(invoice: dict, user_id: str, order=None) -> dict:
    return {
        "id": str(uuid4()),
        "user_id": user_id,
        "role": "customer",
        "event_type": "payment_approved",
        "title": "Payment Approved",
        "message": "Your payment has been approved. Open the invoice, then track your order progress.",
        "target_url": "/account/invoices",
        "target_ref": invoice.get("invoice_number") or invoice.get("id"),
        "cta_label": "Open Invoice",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def build_vendor_order_assigned_notification(vendor_order: dict, partner_id: str) -> dict:
    return {
        "id": str(uuid4()),
        "partner_id": partner_id,
        "user_id": partner_id,
        "role": "vendor",
        "event_type": "vendor_order_assigned",
        "title": "New Order Assigned",
        "message": "A new vendor order has been assigned to you.",
        "target_url": "/partner/orders",
        "target_ref": vendor_order.get("id"),
        "cta_label": "View Order",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def build_sales_order_assigned_notification(order: dict, sales_user_id: str) -> dict:
    return {
        "id": str(uuid4()),
        "user_id": sales_user_id,
        "role": "sales",
        "event_type": "sales_order_assigned",
        "title": "Order Assigned",
        "message": "A new order has been assigned to you for follow-up.",
        "target_url": "/staff/orders",
        "target_ref": order.get("id"),
        "cta_label": "Open Order",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
