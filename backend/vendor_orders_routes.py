"""
Vendor Orders Routes
Source of truth: vendor_orders collection ONLY.
No fulfillment_jobs, no generic orders fallback.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header, Query
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional
import os

from partner_access_service import get_partner_user_from_header

router = APIRouter(prefix="/api/vendor", tags=["Vendor Orders"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'konekt')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def _clean(doc):
    """Serialize a MongoDB document, converting ObjectId and datetime fields."""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        if "id" not in doc or not doc["id"]:
            doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in list(doc.items()):
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("/orders")
async def list_vendor_orders(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """
    List vendor orders for the logged-in vendor/partner.
    Reads ONLY from vendor_orders collection.
    Vendor sees ONLY released work (no pending-payment / unreleased orders).
    Vendor sees ONLY their VAT-inclusive base cost, never Konekt public price or margin.
    """
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    query = {"vendor_id": partner_id}
    if status:
        query["status"] = status

    # Vendor visibility: exclude unreleased work
    # Vendor should NOT see: pending_payment, under_review, awaiting_payment
    excluded_statuses = {"pending_payment", "pending_payment_confirmation", "under_review", "awaiting_payment", "draft", "quote_pending"}
    if not status:
        query["status"] = {"$nin": list(excluded_statuses)}

    raw = await db.vendor_orders.find(query).sort("created_at", -1).to_list(length=500)
    rows = []

    for doc in raw:
        row = _clean(doc)

        # Additional release check: if vendor_order has release_status field
        if row.get("release_status") == "unreleased":
            continue

        order_id = row.get("order_id")

        # Group Deal vendor orders are aggregated — no client details, no parent order lookup
        is_group_deal = bool(row.get("is_group_deal") or row.get("source") == "group_deal")
        if is_group_deal:
            gd_order_no = row.get("vendor_order_no") or f"GD-{row.get('campaign_code','')}"
            gd_price = float(row.get("base_price") or row.get("base_cost") or row.get("vendor_total") or 0)
            rows.append({
                "id": row.get("id"),
                "vendor_order_no": gd_order_no,
                "order_id": row.get("order_id") or "",
                "created_at": row.get("created_at", ""),
                "date": str(row.get("created_at", ""))[:10],
                "source_type": "group_deal",
                "is_group_deal": True,
                "campaign_code": row.get("campaign_code", ""),
                "vbo_number": row.get("vbo_number", ""),
                "fulfillment_state": row.get("status", "assigned"),
                "status": row.get("status", "assigned"),
                "priority": row.get("priority", "normal"),
                "base_price": gd_price,
                "total_quantity": row.get("total_quantity") or row.get("items", [{}])[0].get("quantity", 0),
                "buyer_count": row.get("buyer_count", 0),
                "vendor_payment_status": row.get("vendor_payment_status", "pending"),
                "vendor_payment_reference": row.get("vendor_payment_reference", ""),
                "vendor_paid_at": row.get("vendor_paid_at", ""),
                "items": [{
                    "name": item.get("name", ""),
                    "description": item.get("description", ""),
                    "quantity": item.get("quantity", 1),
                    "vendor_price": item.get("vendor_price") or item.get("unit_price") or 0,
                } for item in row.get("items", [])],
                "customer_name": "",
                "customer_phone": "",
                "delivery_address": "",
                "sales_contact": {},
                "timeline": [{"label": "Group deal order assigned", "date": str(row.get("created_at", ""))[:10]}],
            })
            continue

        # Enrich from parent order — but NEVER expose the end customer to the vendor.
        # Konekt is the single client from the vendor's perspective. We only need parent order
        # metadata like order_number for timeline / vendor's own reference.
        parent_order = None
        if order_id:
            parent_order = await db.orders.find_one(
                {"$or": [{"id": order_id}, {"order_number": order_id}]},
                {"_id": 0, "order_number": 1, "delivery": 1, "assigned_sales_id": 1, "type": 1, "created_at": 1}
            )

        # Delivery address: only the physical destination (city/area) — NO end-customer name/phone.
        # Konekt acts as the logistics orchestrator. For non-group-deal product orders, the vendor
        # just needs to know where to deliver.
        delivery = (parent_order or {}).get("delivery") or {}
        delivery_address = delivery.get("city", "") or delivery.get("area", "")
        # Never fall back to end-customer phone; fall back to blank so vendor can't see it.

        # Konekt Operations is the vendor's point of contact. We do NOT expose the assigned
        # salesperson — vendors communicate with Konekt Ops, not individual sales reps.
        # (Left here as placeholder — frontend will render "Konekt Operations" when empty.)
        sales_name = ""
        sales_phone = ""
        sales_email = ""

        # Build timeline from order_events
        timeline = []
        if order_id:
            events = await db.order_events.find(
                {"order_id": order_id}
            ).sort("created_at", 1).to_list(length=50)
            for evt in events:
                evt_clean = _clean(evt)
                timeline.append({
                    "label": (evt_clean.get("event") or "").replace("_", " ").title(),
                    "date": (evt_clean.get("created_at") or "")[:10],
                })

        # Add the vendor_order creation as first timeline entry if empty
        if not timeline:
            created = row.get("created_at", "")
            timeline.append({
                "label": "Order Assigned",
                "date": str(created)[:10] if created else "-",
            })

        # Determine source_type
        source_type = (parent_order or {}).get("type", "product")

        # Vendor order number
        vendor_order_no = row.get("vendor_order_no") or row.get("id", "")[:12]

        # Priority
        priority = row.get("priority", "normal")

        # Base price (vendor sees their cost, not customer price)
        base_price = 0
        for item in row.get("items", []):
            bp = item.get("vendor_price") or item.get("base_price") or item.get("unit_price") or item.get("price") or 0
            base_price += float(bp) * float(item.get("quantity", 1))
        if not base_price:
            base_price = row.get("vendor_total") or row.get("total_amount") or row.get("total") or 0

        # Strip item-level Konekt pricing — vendor sees only their cost
        vendor_safe_items = []
        for item in row.get("items", []):
            vendor_safe_items.append({
                "name": item.get("name", ""),
                "description": item.get("description", ""),
                "quantity": item.get("quantity", 1),
                "vendor_price": item.get("vendor_price") or item.get("base_price") or item.get("unit_price") or item.get("price") or 0,
                "specifications": item.get("specifications", ""),
                "sku": item.get("sku", ""),
            })

        rows.append({
            "id": row.get("id"),
            "vendor_order_no": vendor_order_no,
            "order_id": order_id,
            "created_at": row.get("created_at", ""),
            "date": str(row.get("created_at", ""))[:10],
            "source_type": source_type,
            "fulfillment_state": row.get("status", "processing"),
            "status": row.get("status", "processing"),
            "priority": priority,
            "base_price": base_price,
            # Konekt is the single client — never expose end-customer identity
            "client_name": "Konekt Operations",
            "client_contact": "",  # Vendor should use their existing Konekt contact channel
            "delivery_address": delivery_address,
            "sales_name": sales_name,
            "sales_phone": sales_phone,
            "sales_email": sales_email,
            "items": vendor_safe_items,
            "timeline": timeline,
        })

    return rows


@router.get("/orders/{vendor_order_id}")
async def get_vendor_order_detail(
    vendor_order_id: str,
    authorization: Optional[str] = Header(None),
):
    """Get a single vendor order detail."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    doc = await db.vendor_orders.find_one({
        "$or": [{"id": vendor_order_id}, {"_id": ObjectId(vendor_order_id) if len(vendor_order_id) == 24 else "never"}],
        "vendor_id": partner_id,
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Vendor order not found")

    return _clean(doc)


@router.post("/orders/{vendor_order_id}/status")
async def update_vendor_order_status(
    vendor_order_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
):
    """
    Vendor updates vendor order status.
    Vendor controls: assigned → work_scheduled → in_progress → ready_for_pickup
    Sales controls logistics after ready_for_pickup (picked_up → in_transit → delivered → completed)
    """
    from services.product_delivery_status_workflow import VENDOR_INTERNAL_STATUSES
    from services.sales_delivery_override_service import can_vendor_update_status
    from services.status_transition_policy import can_transition, normalize_status

    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    doc = await db.vendor_orders.find_one({
        "$or": [{"id": vendor_order_id}, {"_id": ObjectId(vendor_order_id) if len(vendor_order_id) == 24 else "never"}],
        "vendor_id": partner_id,
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Vendor order not found")

    new_status = payload.get("status")
    new_status = normalize_status(new_status)

    # Use centralized transition policy
    current_status = doc.get("status", "assigned")
    allowed, reason = can_transition("vendor", current_status, new_status)
    if not allowed:
        raise HTTPException(status_code=400, detail=reason)

    now = datetime.now(timezone.utc).isoformat()
    update = {"status": new_status, "updated_at": now}

    if payload.get("note"):
        update["last_vendor_note"] = payload["note"]

    filter_q = {"id": doc.get("id")} if doc.get("id") else {"_id": doc["_id"]}
    await db.vendor_orders.update_one(filter_q, {"$set": update})

    # Also update parent order status
    order_id = doc.get("order_id")
    if order_id:
        await db.orders.update_one({"id": order_id}, {"$set": {"status": new_status, "current_status": new_status, "updated_at": now}})
        await db.order_events.insert_one({
            "id": str(ObjectId()),
            "order_id": order_id,
            "event": f"vendor_status_update_{new_status}",
            "actor": f"vendor:{partner_id}",
            "created_at": now,
        })

    # Create vendor notification
    await db.notifications.insert_one({
        "id": str(ObjectId()),
        "target_type": "vendor",
        "target_id": partner_id,
        "title": f"Order status updated to {new_status.replace('_', ' ').title()}",
        "message": f"Vendor order {doc.get('id', vendor_order_id)[:12]} status changed to {new_status}",
        "read": True,
        "created_at": now,
    })

    return {"ok": True, "status": new_status}


@router.post("/orders/{vendor_order_id}/note")
async def add_vendor_order_note(
    vendor_order_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
):
    """Vendor adds a progress note to an order."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    doc = await db.vendor_orders.find_one({
        "$or": [{"id": vendor_order_id}, {"_id": ObjectId(vendor_order_id) if len(vendor_order_id) == 24 else "never"}],
        "vendor_id": partner_id,
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Vendor order not found")

    note_text = payload.get("note", "").strip()
    if not note_text:
        raise HTTPException(status_code=400, detail="Note text required")

    now = datetime.now(timezone.utc).isoformat()
    note_entry = {"text": note_text, "by": f"vendor:{partner_id}", "at": now}

    filter_q = {"id": doc.get("id")} if doc.get("id") else {"_id": doc["_id"]}
    await db.vendor_orders.update_one(filter_q, {
        "$push": {"notes": note_entry},
        "$set": {"updated_at": now},
    })

    # Log event
    order_id = doc.get("order_id")
    if order_id:
        await db.order_events.insert_one({
            "id": str(ObjectId()),
            "order_id": order_id,
            "event": "vendor_progress_note",
            "actor": f"vendor:{partner_id}",
            "note": note_text,
            "created_at": now,
        })

    return {"ok": True, "note": note_entry}


@router.post("/orders/{vendor_order_id}/eta")
async def set_vendor_eta(
    vendor_order_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
):
    """Vendor sets a promised delivery/completion date for the order."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    doc = await db.vendor_orders.find_one({
        "$or": [{"id": vendor_order_id}, {"_id": ObjectId(vendor_order_id) if len(vendor_order_id) == 24 else "never"}],
        "vendor_id": partner_id,
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Vendor order not found")

    promised_date = payload.get("promised_date")
    if not promised_date:
        raise HTTPException(status_code=400, detail="Promised delivery date is required")

    now = datetime.now(timezone.utc).isoformat()
    filter_q = {"id": doc.get("id")} if doc.get("id") else {"_id": doc["_id"]}
    await db.vendor_orders.update_one(filter_q, {"$set": {
        "vendor_promised_date": promised_date,
        "eta_updated_at": now,
        "updated_at": now,
    }})

    # Also update parent order with vendor ETA
    order_id = doc.get("order_id")
    if order_id:
        await db.orders.update_one({"id": order_id}, {"$set": {
            "vendor_promised_date": promised_date,
            "updated_at": now,
        }})
        await db.order_events.insert_one({
            "id": str(ObjectId()),
            "order_id": order_id,
            "event": "vendor_eta_set",
            "actor": f"vendor:{partner_id}",
            "note": f"Vendor promised delivery: {promised_date}",
            "created_at": now,
        })

    return {"ok": True, "vendor_promised_date": promised_date}
