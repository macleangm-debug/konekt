"""
Delivery Note Routes — Enhanced with Dual-Mode Closure Engine
Handles dispatch, delivery documentation, and official completion sign-off.
Closure modes: signed | confirmed_without_signature
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request
import os
import secrets
from motor.motor_asyncio import AsyncIOMotorClient

from inventory_balance_service import issue_reserved_inventory, issue_unreserved_inventory
from inventory_movement_service import record_stock_movement

router = APIRouter(prefix="/api/admin/delivery-notes", tags=["Delivery Notes"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

VALID_STATUSES = ["issued", "in_transit", "pending_confirmation", "completed_signed", "completed_confirmed", "cancelled"]


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
    source_type = payload.get("source_type")
    source_id = payload.get("source_id")

    source_doc = None
    if source_type in ["order", "invoice"] and source_id:
        collection = db.orders if source_type == "order" else db.invoices
        try:
            source_doc = await collection.find_one({"_id": ObjectId(source_id)})
        except Exception:
            pass
        if not source_doc:
            raise HTTPException(status_code=404, detail=f"Source {source_type} not found")

    line_items = payload.get("line_items") or []
    if not line_items and source_doc:
        line_items = source_doc.get("line_items", [])

    delivered_by = payload.get("delivered_by")
    delivered_to = payload.get("delivered_to")
    delivery_address = payload.get("delivery_address", "")
    remarks = payload.get("remarks", "")
    vehicle_info = payload.get("vehicle_info", "")

    note_number = f"DN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    # Generate confirmation token for public access
    confirmation_token = secrets.token_urlsafe(32)

    note_doc = {
        "note_number": note_number,
        "source_type": source_type or "direct",
        "source_id": source_id,
        "customer_email": source_doc.get("customer_email") if source_doc else payload.get("customer_email"),
        "customer_name": source_doc.get("customer_name") if source_doc else payload.get("customer_name"),
        "customer_company": source_doc.get("customer_company") if source_doc else payload.get("customer_company"),
        "customer_phone": source_doc.get("customer_phone") if source_doc else payload.get("customer_phone"),
        "line_items": line_items,
        "delivered_by": delivered_by,
        "delivered_to": delivered_to,
        "delivery_address": delivery_address,
        "vehicle_info": vehicle_info,
        "remarks": remarks,
        "status": "issued",
        "confirmation_token": confirmation_token,
        "closure_locked": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.delivery_notes.insert_one(note_doc)

    errors = []
    for item in line_items:
        sku = item.get("sku")
        qty = float(item.get("quantity", 0) or 0)
        if not sku or qty <= 0:
            continue
        issued = await issue_reserved_inventory(db, sku=sku, quantity=qty)
        if not issued["ok"]:
            issued = await issue_unreserved_inventory(db, sku=sku, quantity=qty)
            if not issued["ok"]:
                errors.append(f"Failed to issue {sku}: {issued['reason']}")
                continue
        await record_stock_movement(
            db, sku=sku, item_type=item.get("item_type", "product"),
            movement_type="delivery_note_issue", quantity=qty,
            warehouse_id=item.get("warehouse_id"), warehouse_name=item.get("warehouse_name"),
            reference_type="delivery_note", reference_id=str(result.inserted_id),
            staff_email=delivered_by, note=f"Issued through delivery note {note_number}",
            direction="out",
        )

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
    """Update status. For simple transitions (issued→in_transit, cancellation). Use /close for completion."""
    status = payload.get("status")

    # Map legacy "delivered" to new closure flow
    if status == "delivered":
        return await close_delivery_note(note_id, payload)

    if status not in ["issued", "in_transit", "pending_confirmation", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status. Use /close endpoint for completion.")

    doc = await db.delivery_notes.find_one({"_id": ObjectId(note_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Delivery note not found")

    if doc.get("closure_locked"):
        raise HTTPException(status_code=400, detail="This delivery note is locked after completion and cannot be modified.")

    update_fields = {"status": status, "updated_at": datetime.now(timezone.utc)}
    await db.delivery_notes.update_one({"_id": ObjectId(note_id)}, {"$set": update_fields})

    updated = await db.delivery_notes.find_one({"_id": ObjectId(note_id)})
    return serialize_doc(updated)


@router.post("/{note_id}/close")
async def close_delivery_note(note_id: str, payload: dict):
    """
    Official closure endpoint. Supports two modes:
    - signed: receiver signs directly (signature required)
    - confirmed_without_signature: staff confirms on behalf of client
    """
    doc = await db.delivery_notes.find_one({"_id": ObjectId(note_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Delivery note not found")

    if doc.get("closure_locked"):
        raise HTTPException(status_code=400, detail="This delivery note is already closed and locked.")

    closure_method = payload.get("closure_method", "signed")
    if closure_method not in ("signed", "confirmed_without_signature"):
        raise HTTPException(status_code=400, detail="Invalid closure_method. Must be 'signed' or 'confirmed_without_signature'.")

    receiver_name = (payload.get("receiver_name") or "").strip()
    if not receiver_name:
        raise HTTPException(status_code=400, detail="Receiver name is required.")

    now = datetime.now(timezone.utc)

    update_fields = {
        "status": "completed_signed" if closure_method == "signed" else "completed_confirmed",
        "closure_method": closure_method,
        "receiver_name": receiver_name,
        "receiver_designation": (payload.get("receiver_designation") or "").strip(),
        "completed_at": now,
        "received_at": now,
        "closure_locked": True,
        "updated_at": now,
    }

    if closure_method == "signed":
        sig = payload.get("receiver_signature")
        if not sig:
            raise HTTPException(status_code=400, detail="Signature is required for signed closure.")
        update_fields["receiver_signature"] = sig
    else:
        completion_note = (payload.get("completion_note") or "").strip()
        if not completion_note:
            raise HTTPException(status_code=400, detail="Completion note is required for confirmed closure.")
        update_fields["completion_note"] = completion_note
        update_fields["authorization_source"] = payload.get("authorization_source", "in_person")

    # Staff who performed the closure
    if payload.get("confirmed_by_user_id"):
        update_fields["confirmed_by_user_id"] = payload["confirmed_by_user_id"]
    if payload.get("confirmed_by_user_name"):
        update_fields["confirmed_by_user_name"] = payload["confirmed_by_user_name"]

    await db.delivery_notes.update_one({"_id": ObjectId(note_id)}, {"$set": update_fields})

    # Update source order fulfillment status
    if doc.get("source_type") == "order" and doc.get("source_id"):
        try:
            await db.orders.update_one(
                {"_id": ObjectId(doc["source_id"])},
                {"$set": {"fulfillment_status": "delivered", "updated_at": now}}
            )
        except Exception:
            pass

    updated = await db.delivery_notes.find_one({"_id": ObjectId(note_id)})
    return serialize_doc(updated)
