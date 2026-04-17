"""
Vendor Order Auto-Routing Service

When an order is created (from quote acceptance or direct), this service:
1. Reads line items and their categories
2. Looks up vendor assignments for each category
3. Splits items into vendor groups (single-source auto-assigns, competitive flags for quote)
4. Creates vendor_orders documents for each vendor group
5. Updates the parent order with vendor_order references

Called automatically after order creation and after payment confirmation.
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def auto_route_order_to_vendors(order_id: str, trigger: str = "order_created"):
    """Main entry point: auto-route an order's items to vendors.
    
    Args:
        order_id: The parent order ID (from orders collection)
        trigger: What triggered routing ("order_created", "payment_confirmed", "manual")
    
    Returns:
        dict with vendor_orders created, unassigned items, etc.
    """
    # Find the order
    order = await db.orders.find_one({"id": order_id})
    if not order:
        order = await db.orders.find_one({"order_number": order_id})
    if not order:
        return {"error": "Order not found", "vendor_orders_created": 0}

    oid = order.get("id") or order.get("order_number") or str(order.get("_id", ""))
    items = order.get("line_items") or order.get("items", [])
    if not items:
        return {"error": "No line items", "vendor_orders_created": 0}

    # Check if vendor orders already exist for this order
    existing_vos = await db.vendor_orders.count_documents({"order_id": oid})
    if existing_vos > 0 and trigger != "manual":
        return {"message": "Vendor orders already exist", "vendor_orders_created": existing_vos, "skipped": True}

    now = datetime.now(timezone.utc)

    # Group items by vendor based on category assignments
    vendor_groups = {}  # vendor_id -> {info + items}
    unassigned = []

    for item in items:
        category = item.get("category") or item.get("category_name") or ""
        if not category:
            unassigned.append({**item, "reason": "No category specified"})
            continue

        # Find vendor assignments for this category
        assignments = await db.vendor_assignments.find({
            "is_active": True,
            "categories": {"$elemMatch": {"name": category}},
        }).to_list(length=50)

        # Get category sourcing mode
        cat_doc = await db.catalog_categories.find_one({"name": category})
        sourcing_mode = (cat_doc or {}).get("sourcing_mode", "preferred")

        if not assignments:
            unassigned.append({**item, "reason": f"No vendor assigned to '{category}'"})
            continue

        if sourcing_mode == "preferred":
            # Single source: use preferred vendor or first assigned
            preferred = next((a for a in assignments if a.get("is_preferred")), assignments[0])
            vid = preferred.get("vendor_id", "")
            if vid not in vendor_groups:
                vendor_groups[vid] = {
                    "vendor_id": vid,
                    "vendor_name": preferred.get("vendor_name", ""),
                    "sourcing_mode": "single",
                    "items": [],
                    "needs_vendor_quote": False,
                }
            vendor_groups[vid]["items"].append(item)
        else:
            # Competitive: assign to first available for now, flag for vendor quote
            preferred = next((a for a in assignments if a.get("is_preferred")), assignments[0])
            vid = preferred.get("vendor_id", "")
            if vid not in vendor_groups:
                vendor_groups[vid] = {
                    "vendor_id": vid,
                    "vendor_name": preferred.get("vendor_name", ""),
                    "sourcing_mode": "competitive",
                    "items": [],
                    "needs_vendor_quote": True,
                }
            vendor_groups[vid]["items"].append(item)

    # Create vendor_orders for each vendor group
    created_vos = []
    for vid, group in vendor_groups.items():
        vo_id = str(uuid4())
        vo_number = f"VO-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

        # Calculate vendor subtotal (base costs)
        vendor_subtotal = sum(float(it.get("vendor_cost") or it.get("base_cost") or it.get("unit_price") or 0) * int(it.get("quantity", 1)) for it in group["items"])

        vo_doc = {
            "id": vo_id,
            "vo_number": vo_number,
            "order_id": oid,
            "order_number": order.get("order_number", ""),
            "vendor_id": group["vendor_id"],
            "vendor_name": group["vendor_name"],
            "sourcing_mode": group["sourcing_mode"],
            "needs_vendor_quote": group["needs_vendor_quote"],
            "customer_name": order.get("customer_name", ""),
            "customer_email": order.get("customer_email", ""),
            "items": group["items"],
            "item_count": len(group["items"]),
            "vendor_subtotal": vendor_subtotal,
            "currency": order.get("currency", "TZS"),
            "status": "pending" if trigger == "order_created" else "ready_to_fulfill",
            "released": trigger == "payment_confirmed",
            "released_at": now.isoformat() if trigger == "payment_confirmed" else None,
            "routing_trigger": trigger,
            "notes": "",
            "status_history": [{
                "status": "pending" if trigger == "order_created" else "ready_to_fulfill",
                "note": f"Auto-routed from order {order.get('order_number', oid)} ({trigger})",
                "timestamp": now.isoformat(),
            }],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        await db.vendor_orders.insert_one(vo_doc)
        created_vos.append({"id": vo_id, "vo_number": vo_number, "vendor_id": vid, "vendor_name": group["vendor_name"], "item_count": len(group["items"])})

    # Update parent order with routing info
    await db.orders.update_one(
        {"id": oid} if order.get("id") else {"order_number": oid},
        {"$set": {
            "vendor_routing": {
                "routed": True,
                "routed_at": now.isoformat(),
                "trigger": trigger,
                "vendor_order_count": len(created_vos),
                "unassigned_count": len(unassigned),
                "vendor_orders": [{"id": vo["id"], "vo_number": vo["vo_number"], "vendor_id": vo["vendor_id"]} for vo in created_vos],
            },
            "updated_at": now.isoformat(),
        }}
    )

    return {
        "order_id": oid,
        "vendor_orders_created": len(created_vos),
        "vendor_orders": created_vos,
        "unassigned_items": len(unassigned),
        "unassigned_details": unassigned,
    }
