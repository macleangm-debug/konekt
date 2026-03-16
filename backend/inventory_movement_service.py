"""
Inventory Movement Service
Centralized logging for all stock changes
"""
from datetime import datetime, timezone


async def record_stock_movement(
    db,
    *,
    sku: str,
    item_type: str,
    movement_type: str,
    quantity: float,
    warehouse_id: str | None = None,
    warehouse_name: str | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
    staff_email: str | None = None,
    note: str = "",
    direction: str = "out",
):
    """
    Record a stock movement in the ledger.
    
    Args:
        db: MongoDB database instance
        sku: Stock keeping unit identifier
        item_type: 'product' or 'raw_material'
        movement_type: reserved | issued | received | transfer | adjustment | returned | delivery_note_issue | goods_received
        quantity: Amount of movement
        warehouse_id: Optional warehouse ID
        warehouse_name: Optional warehouse name
        reference_type: Type of source document (order, invoice, delivery_note, goods_receipt, transfer, etc.)
        reference_id: ID of source document
        staff_email: Staff who performed the action
        note: Additional notes
        direction: 'in' or 'out'
    """
    quantity = float(quantity or 0)

    movement_doc = {
        "sku": sku,
        "item_type": item_type,
        "movement_type": movement_type,
        "direction": direction,
        "quantity": quantity,
        "warehouse_id": warehouse_id,
        "warehouse_name": warehouse_name,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "staff_email": staff_email,
        "note": note,
        "created_at": datetime.now(timezone.utc),
    }

    await db.stock_movements.insert_one(movement_doc)
    return movement_doc
