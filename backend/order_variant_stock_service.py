"""
Konekt Order Variant Stock Service
Handles stock reservation and deduction for orders
"""
from datetime import datetime, timezone
from bson import ObjectId


async def reserve_stock_for_order(db, order: dict):
    """Reserve stock when order is confirmed"""
    line_items = order.get("line_items", []) or []
    now = datetime.now(timezone.utc)

    for item in line_items:
        variant_id = item.get("variant_id")
        quantity = int(item.get("quantity", 0) or 0)
        if not variant_id or quantity <= 0:
            continue

        try:
            variant = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
        except Exception:
            continue
            
        if not variant:
            continue

        stock_on_hand = int(variant.get("stock_on_hand", 0) or 0)
        reserved_stock = int(variant.get("reserved_stock", 0) or 0)
        available = stock_on_hand - reserved_stock

        if available < quantity:
            raise ValueError(f"Insufficient stock for SKU {variant.get('sku')} (available: {available}, requested: {quantity})")

        await db.inventory_variants.update_one(
            {"_id": ObjectId(variant_id)},
            {
                "$inc": {"reserved_stock": quantity},
                "$set": {"updated_at": now},
            },
        )

        await db.stock_movements.insert_one(
            {
                "movement_type": "reserve",
                "variant_id": variant_id,
                "sku": variant.get("sku"),
                "warehouse": variant.get("warehouse_location"),
                "quantity": quantity,
                "reference_type": "order",
                "reference_id": str(order.get("_id") or order.get("id")),
                "created_at": now,
            }
        )


async def deduct_stock_for_order(db, order: dict):
    """Deduct stock when production starts or goods are issued"""
    line_items = order.get("line_items", []) or []
    now = datetime.now(timezone.utc)

    for item in line_items:
        variant_id = item.get("variant_id")
        quantity = int(item.get("quantity", 0) or 0)
        if not variant_id or quantity <= 0:
            continue

        try:
            variant = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
        except Exception:
            continue
            
        if not variant:
            continue

        await db.inventory_variants.update_one(
            {"_id": ObjectId(variant_id)},
            {
                "$inc": {
                    "stock_on_hand": -quantity,
                    "reserved_stock": -quantity,
                },
                "$set": {"updated_at": now},
            },
        )

        await db.stock_movements.insert_one(
            {
                "movement_type": "deduct",
                "variant_id": variant_id,
                "sku": variant.get("sku"),
                "warehouse": variant.get("warehouse_location"),
                "quantity": -quantity,
                "reference_type": "order",
                "reference_id": str(order.get("_id") or order.get("id")),
                "created_at": now,
            }
        )


async def release_reserved_stock(db, order: dict):
    """Release reserved stock if order is cancelled"""
    line_items = order.get("line_items", []) or []
    now = datetime.now(timezone.utc)

    for item in line_items:
        variant_id = item.get("variant_id")
        quantity = int(item.get("quantity", 0) or 0)
        if not variant_id or quantity <= 0:
            continue

        try:
            variant = await db.inventory_variants.find_one({"_id": ObjectId(variant_id)})
        except Exception:
            continue
            
        if not variant:
            continue

        await db.inventory_variants.update_one(
            {"_id": ObjectId(variant_id)},
            {
                "$inc": {"reserved_stock": -quantity},
                "$set": {"updated_at": now},
            },
        )

        await db.stock_movements.insert_one(
            {
                "movement_type": "release",
                "variant_id": variant_id,
                "sku": variant.get("sku"),
                "warehouse": variant.get("warehouse_location"),
                "quantity": quantity,
                "reference_type": "order_cancelled",
                "reference_id": str(order.get("_id") or order.get("id")),
                "created_at": now,
            }
        )
