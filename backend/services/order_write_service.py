"""
Pack 1 — Order Write Service
Centralized order creation logic. Used by customer_order_routes and live_commerce_service.
Keeps endpoint inputs/outputs unchanged.
"""
from datetime import datetime, timezone
from uuid import uuid4


def build_order_document(order_data: dict, order_number: str = None) -> dict:
    """
    Build a standardized order document from input data.
    Normalizes field names regardless of source (guest checkout, admin, service quote).
    """
    now = datetime.now(timezone.utc).isoformat()
    if not order_number:
        order_number = f"ORD-{datetime.now(timezone.utc).strftime('%y%m%d')}-{str(uuid4())[:8].upper()}"

    return {
        "id": str(uuid4()),
        "order_number": order_number,
        "customer_name": order_data.get("customer_name", ""),
        "customer_email": order_data.get("customer_email", ""),
        "customer_id": order_data.get("customer_id"),
        "payer_name": order_data.get("payer_name", ""),
        "items": order_data.get("items", []),
        "total_amount": order_data.get("total_amount", 0),
        "status": order_data.get("status", "pending"),
        "payment_status": order_data.get("payment_status", "pending"),
        "type": order_data.get("type", "product"),
        "source_type": order_data.get("source_type", "checkout"),
        "delivery_address": order_data.get("delivery_address", ""),
        "notes": order_data.get("notes", ""),
        "approved_by": order_data.get("approved_by"),
        "assigned_sales_id": order_data.get("assigned_sales_id"),
        "assigned_vendor_id": order_data.get("assigned_vendor_id"),
        "created_at": now,
        "updated_at": now,
    }


async def create_vendor_order(db, order_doc: dict, vendor_id: str, sales_contact: dict = None) -> dict:
    """
    Create a vendor order linked to a parent order.
    Vendor sees only their base cost, never Konekt margin/public price.
    """
    now = datetime.now(timezone.utc).isoformat()
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
