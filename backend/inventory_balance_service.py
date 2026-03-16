"""
Inventory Balance Service
Handles reserve, issue, and receive operations with proper balance tracking
"""
from datetime import datetime, timezone


async def get_inventory_item_by_sku(db, sku: str):
    """Get inventory item by SKU from either inventory_items or raw_materials collection."""
    item = await db.inventory_items.find_one({"sku": sku})
    if item:
        item["_collection"] = "inventory_items"
        return item

    item = await db.raw_materials.find_one({"sku": sku})
    if item:
        item["_collection"] = "raw_materials"
    return item


async def reserve_inventory(db, *, sku: str, quantity: float):
    """
    Reserve stock for an order/quote.
    Reserved stock is not available for other orders but is still on-hand.
    """
    quantity = float(quantity or 0)
    item = await get_inventory_item_by_sku(db, sku)
    if not item:
        return {"ok": False, "reason": "Item not found", "sku": sku}

    on_hand = float(item.get("on_hand_qty", item.get("quantity", 0)) or 0)
    reserved = float(item.get("reserved_qty", 0) or 0)
    available = float(item.get("available_qty", on_hand - reserved) or 0)

    if available < quantity:
        return {
            "ok": False,
            "reason": "Insufficient stock",
            "available": available,
            "requested": quantity,
            "sku": sku,
        }

    new_reserved = reserved + quantity
    new_available = on_hand - new_reserved

    collection = db.inventory_items if item.get("_collection") == "inventory_items" else db.raw_materials

    await collection.update_one(
        {"sku": sku},
        {
            "$set": {
                "reserved_qty": new_reserved,
                "available_qty": new_available,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "ok": True,
        "sku": sku,
        "reserved_qty": new_reserved,
        "available_qty": new_available,
        "on_hand_qty": on_hand,
    }


async def release_reservation(db, *, sku: str, quantity: float):
    """
    Release reserved stock (e.g., when an order is cancelled).
    """
    quantity = float(quantity or 0)
    item = await get_inventory_item_by_sku(db, sku)
    if not item:
        return {"ok": False, "reason": "Item not found", "sku": sku}

    on_hand = float(item.get("on_hand_qty", item.get("quantity", 0)) or 0)
    reserved = float(item.get("reserved_qty", 0) or 0)

    new_reserved = max(0, reserved - quantity)
    new_available = on_hand - new_reserved

    collection = db.inventory_items if item.get("_collection") == "inventory_items" else db.raw_materials

    await collection.update_one(
        {"sku": sku},
        {
            "$set": {
                "reserved_qty": new_reserved,
                "available_qty": new_available,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "ok": True,
        "sku": sku,
        "reserved_qty": new_reserved,
        "available_qty": new_available,
        "on_hand_qty": on_hand,
    }


async def issue_reserved_inventory(db, *, sku: str, quantity: float):
    """
    Issue previously reserved stock (when fulfilling an order).
    This reduces both on-hand and reserved quantities.
    """
    quantity = float(quantity or 0)
    item = await get_inventory_item_by_sku(db, sku)
    if not item:
        return {"ok": False, "reason": "Item not found", "sku": sku}

    on_hand = float(item.get("on_hand_qty", item.get("quantity", 0)) or 0)
    reserved = float(item.get("reserved_qty", 0) or 0)

    if reserved < quantity:
        return {"ok": False, "reason": "Not enough reserved stock", "reserved": reserved, "requested": quantity, "sku": sku}

    new_on_hand = on_hand - quantity
    new_reserved = reserved - quantity
    new_available = new_on_hand - new_reserved

    collection = db.inventory_items if item.get("_collection") == "inventory_items" else db.raw_materials

    await collection.update_one(
        {"sku": sku},
        {
            "$set": {
                "on_hand_qty": new_on_hand,
                "quantity": new_on_hand,
                "reserved_qty": new_reserved,
                "available_qty": new_available,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "ok": True,
        "sku": sku,
        "on_hand_qty": new_on_hand,
        "reserved_qty": new_reserved,
        "available_qty": new_available,
    }


async def issue_unreserved_inventory(db, *, sku: str, quantity: float):
    """
    Issue stock that was not previously reserved (direct issue).
    """
    quantity = float(quantity or 0)
    item = await get_inventory_item_by_sku(db, sku)
    if not item:
        return {"ok": False, "reason": "Item not found", "sku": sku}

    on_hand = float(item.get("on_hand_qty", item.get("quantity", 0)) or 0)
    reserved = float(item.get("reserved_qty", 0) or 0)
    available = on_hand - reserved

    if available < quantity:
        return {"ok": False, "reason": "Insufficient available stock", "available": available, "requested": quantity, "sku": sku}

    new_on_hand = on_hand - quantity
    new_available = new_on_hand - reserved

    collection = db.inventory_items if item.get("_collection") == "inventory_items" else db.raw_materials

    await collection.update_one(
        {"sku": sku},
        {
            "$set": {
                "on_hand_qty": new_on_hand,
                "quantity": new_on_hand,
                "available_qty": new_available,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "ok": True,
        "sku": sku,
        "on_hand_qty": new_on_hand,
        "reserved_qty": reserved,
        "available_qty": new_available,
    }


async def receive_inventory(db, *, sku: str, quantity: float):
    """
    Receive stock into inventory (from purchase order or return).
    Increases on-hand and available quantities.
    """
    quantity = float(quantity or 0)
    item = await get_inventory_item_by_sku(db, sku)
    if not item:
        return {"ok": False, "reason": "Item not found", "sku": sku}

    on_hand = float(item.get("on_hand_qty", item.get("quantity", 0)) or 0)
    reserved = float(item.get("reserved_qty", 0) or 0)

    new_on_hand = on_hand + quantity
    new_available = new_on_hand - reserved

    collection = db.inventory_items if item.get("_collection") == "inventory_items" else db.raw_materials

    await collection.update_one(
        {"sku": sku},
        {
            "$set": {
                "on_hand_qty": new_on_hand,
                "quantity": new_on_hand,
                "available_qty": new_available,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "ok": True,
        "sku": sku,
        "on_hand_qty": new_on_hand,
        "reserved_qty": reserved,
        "available_qty": new_available,
    }


async def get_stock_balance(db, sku: str):
    """Get current stock balance for an item."""
    item = await get_inventory_item_by_sku(db, sku)
    if not item:
        return None

    on_hand = float(item.get("on_hand_qty", item.get("quantity", 0)) or 0)
    reserved = float(item.get("reserved_qty", 0) or 0)
    available = float(item.get("available_qty", on_hand - reserved) or 0)

    return {
        "sku": sku,
        "name": item.get("name"),
        "on_hand_qty": on_hand,
        "reserved_qty": reserved,
        "available_qty": available,
        "low_stock_threshold": item.get("low_stock_threshold", 0),
        "is_low_stock": available <= float(item.get("low_stock_threshold", 0) or 0),
    }
