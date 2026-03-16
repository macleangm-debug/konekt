"""
Procurement Routes
Handles purchase orders and procurement workflow
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/procurement", tags=["Procurement"])

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


@router.get("/purchase-orders")
async def list_purchase_orders(status: str = None, supplier_id: str = None, limit: int = 300):
    query = {}
    if status:
        query["status"] = status
    if supplier_id:
        query["supplier_id"] = supplier_id
    docs = await db.purchase_orders.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/purchase-orders/{po_id}")
async def get_purchase_order(po_id: str):
    doc = await db.purchase_orders.find_one({"_id": ObjectId(po_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return serialize_doc(doc)


@router.post("/purchase-orders")
async def create_purchase_order(payload: dict):
    supplier_id = payload.get("supplier_id")
    supplier = None
    if supplier_id:
        try:
            supplier = await db.suppliers.find_one({"_id": ObjectId(supplier_id)})
        except:
            pass
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")

    items = payload.get("items", [])
    total_cost = sum(float(item.get("total_cost", 0) or 0) for item in items)
    total_qty = sum(float(item.get("quantity", 0) or 0) for item in items)

    po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    doc = {
        "po_number": po_number,
        "supplier_id": supplier_id,
        "supplier_name": supplier.get("name") if supplier else payload.get("supplier_name"),
        "supplier_email": supplier.get("email") if supplier else None,
        "items": items,
        "total_qty": total_qty,
        "total_cost": total_cost,
        "expected_delivery_date": payload.get("expected_delivery_date"),
        "warehouse_id": payload.get("warehouse_id"),
        "warehouse_name": payload.get("warehouse_name"),
        "delivery_address": payload.get("delivery_address"),
        "payment_terms": payload.get("payment_terms") or (supplier.get("payment_terms") if supplier else None),
        "notes": payload.get("notes", ""),
        "status": "draft",
        "receipts": [],
        "created_by": payload.get("created_by"),
        "approved_by": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.purchase_orders.insert_one(doc)
    created = await db.purchase_orders.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/purchase-orders/{po_id}")
async def update_purchase_order(po_id: str, payload: dict):
    # Get existing PO
    existing = await db.purchase_orders.find_one({"_id": ObjectId(po_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if existing.get("status") in ["received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot update a completed or cancelled PO")

    items = payload.get("items", existing.get("items", []))
    total_cost = sum(float(item.get("total_cost", 0) or 0) for item in items)
    total_qty = sum(float(item.get("quantity", 0) or 0) for item in items)

    update_data = {
        "items": items,
        "total_qty": total_qty,
        "total_cost": total_cost,
        "expected_delivery_date": payload.get("expected_delivery_date", existing.get("expected_delivery_date")),
        "warehouse_id": payload.get("warehouse_id", existing.get("warehouse_id")),
        "warehouse_name": payload.get("warehouse_name", existing.get("warehouse_name")),
        "delivery_address": payload.get("delivery_address", existing.get("delivery_address")),
        "payment_terms": payload.get("payment_terms", existing.get("payment_terms")),
        "notes": payload.get("notes", existing.get("notes")),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.purchase_orders.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": update_data}
    )

    updated = await db.purchase_orders.find_one({"_id": ObjectId(po_id)})
    return serialize_doc(updated)


@router.patch("/purchase-orders/{po_id}/status")
async def update_po_status(po_id: str, payload: dict):
    status = payload.get("status")
    if status not in ["draft", "ordered", "partially_received", "received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    update_data = {"status": status, "updated_at": datetime.now(timezone.utc)}
    
    if status == "ordered":
        update_data["ordered_at"] = datetime.now(timezone.utc)
    elif status == "cancelled":
        update_data["cancelled_at"] = datetime.now(timezone.utc)
        update_data["cancelled_by"] = payload.get("cancelled_by")
        update_data["cancellation_reason"] = payload.get("reason")

    result = await db.purchase_orders.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    updated = await db.purchase_orders.find_one({"_id": ObjectId(po_id)})
    return serialize_doc(updated)


@router.post("/purchase-orders/{po_id}/approve")
async def approve_purchase_order(po_id: str, payload: dict):
    approved_by = payload.get("approved_by")
    
    result = await db.purchase_orders.update_one(
        {"_id": ObjectId(po_id), "status": "draft"},
        {
            "$set": {
                "status": "ordered",
                "approved_by": approved_by,
                "approved_at": datetime.now(timezone.utc),
                "ordered_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="PO not found or not in draft status")

    updated = await db.purchase_orders.find_one({"_id": ObjectId(po_id)})
    return serialize_doc(updated)
