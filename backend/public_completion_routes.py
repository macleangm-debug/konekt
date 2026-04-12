"""
Public Completion Routes — Public-facing order confirmation system.
Supports: token-based access, phone lookup, order number lookup.
Reuses the canonical delivery note closure engine.
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/public/completion", tags=["Public Completion"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def _safe_doc(doc):
    """Return a public-safe version of a delivery note / order."""
    if not doc:
        return None
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    # Remove internal fields
    for key in ["confirmation_token", "confirmed_by_user_id"]:
        d.pop(key, None)
    for key, value in d.items():
        if isinstance(value, datetime):
            d[key] = value.isoformat()
    return d


def _public_order_summary(doc):
    """Minimal public view of an order."""
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "order_number": doc.get("order_number", ""),
        "customer_name": doc.get("customer_name", ""),
        "customer_company": doc.get("customer_company", ""),
        "status": doc.get("status", ""),
        "fulfillment_status": doc.get("fulfillment_status", ""),
        "total": doc.get("total", doc.get("total_amount", 0)),
        "currency": doc.get("currency", "TZS"),
        "items_summary": _items_summary(doc.get("items") or doc.get("line_items") or []),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        "delivery_address": doc.get("delivery_address", ""),
    }


def _items_summary(items):
    """Short text summary of line items."""
    if not items:
        return "No items"
    names = [i.get("product_name") or i.get("description") or i.get("name", "Item") for i in items[:3]]
    text = ", ".join(names)
    if len(items) > 3:
        text += f" +{len(items) - 3} more"
    return text


def _public_dn_summary(doc):
    """Minimal public view of a delivery note."""
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "note_number": doc.get("note_number", ""),
        "status": doc.get("status", ""),
        "customer_name": doc.get("customer_name", ""),
        "customer_company": doc.get("customer_company", ""),
        "delivered_to": doc.get("delivered_to", ""),
        "delivery_address": doc.get("delivery_address", ""),
        "items_summary": _items_summary(doc.get("line_items", [])),
        "closure_locked": doc.get("closure_locked", False),
        "closure_method": doc.get("closure_method"),
        "receiver_name": doc.get("receiver_name"),
        "completed_at": doc["completed_at"].isoformat() if isinstance(doc.get("completed_at"), datetime) else str(doc.get("completed_at", "")),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        "source_type": doc.get("source_type"),
        "source_id": doc.get("source_id"),
    }


# ─── Token-based access ───
@router.get("/token/{token}")
async def resolve_token(token: str):
    """Resolve a confirmation token to a delivery note."""
    dn = await db.delivery_notes.find_one({"confirmation_token": token})
    if not dn:
        raise HTTPException(status_code=404, detail="Invalid or expired confirmation link.")
    return _public_dn_summary(dn)


# ─── Phone lookup ───
@router.get("/phone/{phone}")
async def lookup_by_phone(phone: str):
    """Find pending delivery notes by customer phone number. Returns only closable notes."""
    phone_clean = phone.strip().replace(" ", "")
    query = {
        "customer_phone": {"$regex": phone_clean[-9:]},  # Match last 9 digits
        "status": {"$in": ["issued", "in_transit", "pending_confirmation"]},
        "closure_locked": {"$ne": True},
    }
    docs = await db.delivery_notes.find(query).sort("created_at", -1).to_list(length=20)

    # Also look up orders
    order_query = {
        "customer_phone": {"$regex": phone_clean[-9:]},
        "status": {"$nin": ["cancelled", "completed", "delivered"]},
    }
    orders = await db.orders.find(order_query).sort("created_at", -1).to_list(length=20)

    return {
        "delivery_notes": [_public_dn_summary(d) for d in docs],
        "orders": [_public_order_summary(o) for o in orders],
    }


# ─── Order number lookup ───
@router.get("/order/{order_number}")
async def lookup_by_order_number(order_number: str):
    """Find a delivery note by source order number."""
    order = await db.orders.find_one({"order_number": order_number})
    if not order:
        # Try by ID
        try:
            order = await db.orders.find_one({"_id": ObjectId(order_number)})
        except Exception:
            pass
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Find linked delivery notes
    order_id = str(order["_id"])
    dns = await db.delivery_notes.find({"source_id": order_id}).sort("created_at", -1).to_list(length=10)

    return {
        "order": _public_order_summary(order),
        "delivery_notes": [_public_dn_summary(d) for d in dns],
    }


# ─── Public close ───
@router.post("/close/{dn_id}")
async def public_close_delivery(dn_id: str, payload: dict):
    """
    Close a delivery note from the public interface.
    Reuses the same closure logic as the admin endpoint.
    Accepts: closure_method, receiver_name, receiver_designation,
             receiver_signature, completion_note, authorization_source
    """
    try:
        dn = await db.delivery_notes.find_one({"_id": ObjectId(dn_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Delivery note not found.")

    if not dn:
        raise HTTPException(status_code=404, detail="Delivery note not found.")

    if dn.get("closure_locked"):
        raise HTTPException(status_code=400, detail="This delivery is already closed and locked.")

    closure_method = payload.get("closure_method", "signed")
    if closure_method not in ("signed", "confirmed_without_signature"):
        raise HTTPException(status_code=400, detail="Invalid closure method.")

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
        "closed_via": "public",
    }

    if closure_method == "signed":
        sig = payload.get("receiver_signature")
        if not sig:
            raise HTTPException(status_code=400, detail="Signature is required for signed closure.")
        update_fields["receiver_signature"] = sig
    else:
        completion_note = (payload.get("completion_note") or "").strip()
        if not completion_note:
            raise HTTPException(status_code=400, detail="Completion note is required.")
        update_fields["completion_note"] = completion_note
        update_fields["authorization_source"] = payload.get("authorization_source", "in_person")

    await db.delivery_notes.update_one({"_id": ObjectId(dn_id)}, {"$set": update_fields})

    # Update source order
    if dn.get("source_type") == "order" and dn.get("source_id"):
        try:
            await db.orders.update_one(
                {"_id": ObjectId(dn["source_id"])},
                {"$set": {"fulfillment_status": "delivered", "status": "completed", "updated_at": now}}
            )
        except Exception:
            pass

    updated = await db.delivery_notes.find_one({"_id": ObjectId(dn_id)})
    return _public_dn_summary(updated)
