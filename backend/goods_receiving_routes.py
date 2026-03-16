"""
Goods Receiving Routes
Handles receiving stock from suppliers and returns
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

from inventory_balance_service import receive_inventory
from inventory_movement_service import record_stock_movement

router = APIRouter(prefix="/api/admin/goods-receiving", tags=["Goods Receiving"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("")
async def list_goods_receipts(status: str = None, limit: int = 300):
    query = {}
    if status:
        query["status"] = status
    docs = await db.goods_receipts.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{receipt_id}")
async def get_goods_receipt(receipt_id: str):
    doc = await db.goods_receipts.find_one({"_id": ObjectId(receipt_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Goods receipt not found")
    return serialize_doc(doc)


@router.post("")
async def create_goods_receipt(payload: dict):
    supplier_id = payload.get("supplier_id")
    purchase_order_id = payload.get("purchase_order_id")
    warehouse_id = payload.get("warehouse_id")
    warehouse_name = payload.get("warehouse_name")
    received_by = payload.get("received_by")
    items = payload.get("items", [])
    note = payload.get("note", "")
    
    # Get supplier info if provided
    supplier = None
    if supplier_id:
        try:
            supplier = await db.suppliers.find_one({"_id": ObjectId(supplier_id)})
        except:
            pass

    receipt_number = f"GRN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    receipt_doc = {
        "receipt_number": receipt_number,
        "supplier_id": supplier_id,
        "supplier_name": supplier.get("name") if supplier else payload.get("supplier_name"),
        "purchase_order_id": purchase_order_id,
        "warehouse_id": warehouse_id,
        "warehouse_name": warehouse_name,
        "received_by": received_by,
        "items": items,
        "note": note,
        "status": "received",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.goods_receipts.insert_one(receipt_doc)

    # Process stock movements for each item
    errors = []
    for item in items:
        sku = item.get("sku")
        qty = float(item.get("quantity", 0) or 0)
        if not sku or qty <= 0:
            continue

        received = await receive_inventory(db, sku=sku, quantity=qty)
        if not received["ok"]:
            errors.append(f"Failed to receive {sku}: {received['reason']}")
            continue

        await record_stock_movement(
            db,
            sku=sku,
            item_type=item.get("item_type", "product"),
            movement_type="goods_received",
            quantity=qty,
            warehouse_id=warehouse_id,
            warehouse_name=warehouse_name,
            reference_type="goods_receipt",
            reference_id=str(result.inserted_id),
            staff_email=received_by,
            note=f"Received through GRN {receipt_number}",
            direction="in",
        )

    # Update purchase order status if linked
    if purchase_order_id:
        try:
            await db.purchase_orders.update_one(
                {"_id": ObjectId(purchase_order_id)},
                {
                    "$set": {
                        "status": "received",
                        "updated_at": datetime.now(timezone.utc),
                    },
                    "$push": {
                        "receipts": str(result.inserted_id)
                    }
                },
            )
        except:
            pass

    created = await db.goods_receipts.find_one({"_id": result.inserted_id})
    response = serialize_doc(created)
    if errors:
        response["warnings"] = errors
    return response


@router.patch("/{receipt_id}/status")
async def update_receipt_status(receipt_id: str, payload: dict):
    status = payload.get("status")
    if status not in ["received", "inspected", "accepted", "rejected", "partial"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db.goods_receipts.update_one(
        {"_id": ObjectId(receipt_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Goods receipt not found")

    updated = await db.goods_receipts.find_one({"_id": ObjectId(receipt_id)})
    return serialize_doc(updated)
