"""
Delivery Note Routes
Handles dispatch and delivery documentation
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request
import os
from motor.motor_asyncio import AsyncIOMotorClient

from inventory_balance_service import issue_reserved_inventory, issue_unreserved_inventory
from inventory_movement_service import record_stock_movement

router = APIRouter(prefix="/api/admin/delivery-notes", tags=["Delivery Notes"])

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
    # Convert datetime objects to ISO strings
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("")
async def list_delivery_notes(status: str = None, limit: int = 300):
    query = {}
    if status:
        query["status"] = status
    docs = await db.delivery_notes.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{note_id}")
async def get_delivery_note(note_id: str):
    doc = await db.delivery_notes.find_one({"_id": ObjectId(note_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Delivery note not found")
    return serialize_doc(doc)


@router.post("")
async def create_delivery_note(payload: dict):
    source_type = payload.get("source_type")  # order | invoice | direct
    source_id = payload.get("source_id")
    
    source_doc = None
    if source_type in ["order", "invoice"] and source_id:
        collection = db.orders if source_type == "order" else db.invoices_v2
        try:
            source_doc = await collection.find_one({"_id": ObjectId(source_id)})
        except:
            pass
        if not source_doc:
            raise HTTPException(status_code=404, detail=f"Source {source_type} not found")

    # Get line items from payload or source document
    line_items = payload.get("line_items") or []
    if not line_items and source_doc:
        line_items = source_doc.get("line_items", [])

    delivered_by = payload.get("delivered_by")
    delivered_to = payload.get("delivered_to")
    delivery_address = payload.get("delivery_address", "")
    remarks = payload.get("remarks", "")
    vehicle_info = payload.get("vehicle_info", "")

    note_number = f"DN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    note_doc = {
        "note_number": note_number,
        "source_type": source_type or "direct",
        "source_id": source_id,
        "customer_email": source_doc.get("customer_email") if source_doc else payload.get("customer_email"),
        "customer_name": source_doc.get("customer_name") if source_doc else payload.get("customer_name"),
        "customer_company": source_doc.get("customer_company") if source_doc else payload.get("customer_company"),
        "line_items": line_items,
        "delivered_by": delivered_by,
        "delivered_to": delivered_to,
        "delivery_address": delivery_address,
        "vehicle_info": vehicle_info,
        "remarks": remarks,
        "status": "issued",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.delivery_notes.insert_one(note_doc)

    # Process stock movements for each line item
    errors = []
    for item in line_items:
        sku = item.get("sku")
        qty = float(item.get("quantity", 0) or 0)
        if not sku or qty <= 0:
            continue

        # Try to issue from reserved first, then unreserved
        issued = await issue_reserved_inventory(db, sku=sku, quantity=qty)
        if not issued["ok"]:
            # Try unreserved
            issued = await issue_unreserved_inventory(db, sku=sku, quantity=qty)
            if not issued["ok"]:
                errors.append(f"Failed to issue {sku}: {issued['reason']}")
                continue

        await record_stock_movement(
            db,
            sku=sku,
            item_type=item.get("item_type", "product"),
            movement_type="delivery_note_issue",
            quantity=qty,
            warehouse_id=item.get("warehouse_id"),
            warehouse_name=item.get("warehouse_name"),
            reference_type="delivery_note",
            reference_id=str(result.inserted_id),
            staff_email=delivered_by,
            note=f"Issued through delivery note {note_number}",
            direction="out",
        )

    # Update source document status if applicable
    if source_doc and source_type == "order":
        await db.orders.update_one(
            {"_id": ObjectId(source_id)},
            {"$set": {"fulfillment_status": "dispatched", "updated_at": datetime.now(timezone.utc)}}
        )

    created = await db.delivery_notes.find_one({"_id": result.inserted_id})
    response = serialize_doc(created)
    if errors:
        response["warnings"] = errors
    return response


@router.patch("/{note_id}/status")
async def update_delivery_note_status(note_id: str, payload: dict):
    status = payload.get("status")
    if status not in ["issued", "in_transit", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db.delivery_notes.update_one(
        {"_id": ObjectId(note_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Delivery note not found")

    updated = await db.delivery_notes.find_one({"_id": ObjectId(note_id)})
    return serialize_doc(updated)
