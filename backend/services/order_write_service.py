"""
Pack 1 — Order Write Service
Centralized order creation logic. Used by customer_order_routes and live_commerce_service.
Keeps endpoint inputs/outputs unchanged.

Safeguard logging is enabled for debugging during rollout.
"""
import logging
from datetime import datetime, timezone
from uuid import uuid4

from services.order_timeline_service import log_order_event
from services.order_assignment_orchestrator_service import orchestrate_order_assignment

logger = logging.getLogger("order_write_service")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_order_document(order_data: dict, order_number: str = None) -> dict:
    """
    Build a standardized order document from input data.
    Normalizes field names regardless of source (guest checkout, admin, service quote).
    """
    now = _now_iso()
    if not order_number:
        order_number = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    return {
        "id": str(uuid4()),
        "order_number": order_number,
        "customer_name": order_data.get("customer_name", ""),
        "customer_email": order_data.get("customer_email", ""),
        "customer_id": order_data.get("customer_id"),
        "payer_name": order_data.get("payer_name", ""),
        "items": order_data.get("items", []),
        "line_items": order_data.get("line_items", []),
        "total_amount": order_data.get("total_amount", 0),
        "total": order_data.get("total", 0),
        "subtotal": order_data.get("subtotal", 0),
        "tax": order_data.get("tax", 0),
        "discount": order_data.get("discount", 0),
        "status": order_data.get("status", "pending"),
        "current_status": order_data.get("current_status", "pending"),
        "payment_status": order_data.get("payment_status", "unpaid"),
        "type": order_data.get("type", "product"),
        "source_type": order_data.get("source_type", "checkout"),
        "delivery_address": order_data.get("delivery_address", ""),
        "city": order_data.get("city", ""),
        "country": order_data.get("country", ""),
        "notes": order_data.get("notes", ""),
        "approved_by": order_data.get("approved_by"),
        "assigned_sales_id": order_data.get("assigned_sales_id"),
        "assigned_vendor_id": order_data.get("assigned_vendor_id"),
        "is_guest_order": order_data.get("is_guest_order", False),
        "created_at": now,
        "updated_at": now,
    }


def seed_status_history(order_doc: dict, note: str = "Order submitted by customer") -> list:
    """Create initial status history entry."""
    return [{
        "status": order_doc.get("status", "pending"),
        "note": note,
        "timestamp": order_doc.get("created_at", _now_iso()),
    }]


async def create_guest_order_via_service(db, payload_dict: dict, order_number: str) -> dict:
    """
    Centralized guest order creation.
    Builds document, seeds status history, writes to DB, triggers assignment + timeline.
    Returns the inserted order document dict (without _id).
    """
    logger.info("[order_write_service] route entered — create_guest_order_via_service")

    # Build the normalized order document
    doc = build_order_document(payload_dict, order_number=order_number)

    # Merge any extra fields from payload that aren't in the base builder
    # (affiliate, campaign, etc. remain on the caller to set before passing)
    for key in payload_dict:
        if key not in doc:
            doc[key] = payload_dict[key]

    # Seed status history
    doc["status_history"] = seed_status_history(doc)

    logger.info("[order_write_service] service create called — inserting order %s", order_number)

    # Insert
    result = await db.orders.insert_one(doc)
    order_id = str(result.inserted_id)

    logger.info("[order_write_service] order created — id=%s, number=%s", order_id, order_number)

    # Trigger timeline event
    await log_order_event(
        db,
        order_id=doc.get("id", order_id),
        event="order_created",
        actor="guest",
        actor_name=doc.get("customer_name", ""),
        details={"source": "guest_checkout", "order_number": order_number},
    )
    logger.info("[order_write_service] timeline written for order %s", order_number)

    return doc, order_id


async def create_vendor_order(db, order_doc: dict, vendor_id: str, sales_contact: dict = None) -> dict:
    """
    Create a vendor order linked to a parent order.
    Vendor sees only their base cost, never Konekt margin/public price.
    """
    now = _now_iso()
    vo_id = str(uuid4())
    vo_number = f"VO-{datetime.now(timezone.utc).strftime('%y%m%d')}-{vo_id[:8].upper()}"

    vendor_items = []
    vendor_total = 0
    for item in order_doc.get("items", []):
        vendor_price = item.get("vendor_price") or item.get("base_price") or item.get("unit_price") or item.get("price") or 0
        qty = item.get("quantity", 1)
        vendor_items.append({
            "name": item.get("name", ""),
            "description": item.get("description", ""),
            "quantity": qty,
            "vendor_price": vendor_price,
            "specifications": item.get("specifications", ""),
            "sku": item.get("sku", ""),
        })
        vendor_total += float(vendor_price) * float(qty)

    vendor_order = {
        "id": vo_id,
        "vendor_order_no": vo_number,
        "order_id": order_doc.get("id"),
        "vendor_id": vendor_id,
        "customer_id": order_doc.get("customer_id"),
        "status": "assigned",
        "vendor_total": vendor_total,
        "items": vendor_items,
        "sales_name": (sales_contact or {}).get("name", ""),
        "sales_phone": (sales_contact or {}).get("phone", ""),
        "sales_email": (sales_contact or {}).get("email", ""),
        "created_at": now,
        "updated_at": now,
    }
    await db.vendor_orders.insert_one(vendor_order)
    return vendor_order
