"""
Partner Portal Dashboard Routes
Dashboard, catalog, fulfillment jobs, and settlements for partners
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional

from partner_access_service import get_partner_user_from_header

router = APIRouter(prefix="/api/partner-portal", tags=["Partner Portal"])

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
        if isinstance(value, ObjectId):
            doc[key] = str(value)
    return doc


@router.get("/dashboard")
async def partner_dashboard(authorization: Optional[str] = Header(None)):
    """Get partner dashboard summary with vendor fulfillment pipeline, actions, and charts."""
    from datetime import timedelta

    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    partner = await db.partners.find_one({"_id": ObjectId(partner_id)})

    # Catalog counts
    catalog_count = await db.partner_catalog_items.count_documents({
        "partner_id": partner_id,
        "is_active": True
    })

    active_allocations = await db.partner_catalog_items.count_documents({
        "partner_id": partner_id,
        "partner_available_qty": {"$gt": 0},
        "is_active": True,
    })

    # ═══ ALL VENDOR ORDERS ═══
    all_vendor_orders = await db.vendor_orders.find(
        {"vendor_id": partner_id},
        {"_id": 0, "id": 1, "status": 1, "created_at": 1, "updated_at": 1,
         "items": 1, "vendor_order_no": 1, "order_id": 1,
         "vendor_promised_date": 1, "priority": 1, "vendor_total": 1,
         "total_amount": 1, "total": 1, "release_status": 1}
    ).sort("created_at", -1).to_list(500)

    # Filter out unreleased
    all_vendor_orders = [o for o in all_vendor_orders if o.get("release_status") != "unreleased"]

    # ═══ FULFILLMENT PIPELINE (counts per status) ═══
    status_counts = {}
    for o in all_vendor_orders:
        st = o.get("status", "assigned")
        status_counts[st] = status_counts.get(st, 0) + 1

    def _item_total(order):
        total = 0
        for item in order.get("items", []):
            bp = float(item.get("vendor_price") or item.get("base_price") or item.get("unit_price") or 0)
            qty = float(item.get("quantity") or 1)
            total += bp * qty
        if not total:
            total = float(order.get("vendor_total") or order.get("total_amount") or order.get("total") or 0)
        return round(total, 2)

    vendor_pipeline = {
        "assigned": status_counts.get("assigned", 0) + status_counts.get("accepted", 0),
        "awaiting_ack": status_counts.get("pending", 0) + status_counts.get("pending_acknowledgment", 0),
        "in_production": status_counts.get("in_progress", 0) + status_counts.get("processing", 0) + status_counts.get("work_scheduled", 0),
        "ready_to_dispatch": status_counts.get("ready_for_pickup", 0) + status_counts.get("ready_to_fulfill", 0) + status_counts.get("ready", 0),
        "delayed": status_counts.get("delayed", 0) + status_counts.get("overdue", 0),
        "delivered": status_counts.get("delivered", 0) + status_counts.get("in_transit", 0) + status_counts.get("picked_up", 0),
        "completed": status_counts.get("completed", 0) + status_counts.get("fulfilled", 0),
    }

    # ═══ KPIs ═══
    total_jobs = len(all_vendor_orders)
    active_statuses = {"assigned", "accepted", "pending", "pending_acknowledgment", "in_progress", "processing", "work_scheduled", "ready_for_pickup", "ready_to_fulfill", "ready"}
    active_jobs = len([o for o in all_vendor_orders if o.get("status") in active_statuses])
    completed_jobs = vendor_pipeline["completed"]
    delayed_count = vendor_pipeline["delayed"]

    settlement_total = sum(_item_total(o) for o in all_vendor_orders)
    pending_settlement = sum(_item_total(o) for o in all_vendor_orders if o.get("status") not in ("completed", "fulfilled"))
    paid_settlement = sum(_item_total(o) for o in all_vendor_orders if o.get("status") in ("completed", "fulfilled"))

    # ═══ WORK REQUIRING ACTION ═══
    now = datetime.now(timezone.utc)
    action_items = []

    # New assignments awaiting acknowledgment
    new_assigned = [o for o in all_vendor_orders if o.get("status") in ("assigned", "pending", "pending_acknowledgment", "accepted")]
    for o in new_assigned[:5]:
        item_names = ", ".join([i.get("name", "Item") for i in (o.get("items") or [])[:2]]) or "Order"
        action_items.append({
            "type": "new_assignment",
            "urgency": "high",
            "title": f"New: {o.get('vendor_order_no', o.get('id', '')[:8])}",
            "description": f"{item_names} — TZS {_item_total(o):,.0f}",
            "order_id": o.get("id"),
        })

    # Delayed / overdue items
    delayed_items = [o for o in all_vendor_orders if o.get("status") in ("delayed", "overdue")]
    for o in delayed_items[:5]:
        item_names = ", ".join([i.get("name", "Item") for i in (o.get("items") or [])[:2]]) or "Order"
        action_items.append({
            "type": "delayed",
            "urgency": "hot",
            "title": f"Delayed: {o.get('vendor_order_no', o.get('id', '')[:8])}",
            "description": f"{item_names} — needs status update",
            "order_id": o.get("id"),
        })

    # Overdue by promised date
    for o in all_vendor_orders:
        if o.get("status") in ("completed", "fulfilled", "delivered", "delayed", "overdue"):
            continue
        promised = o.get("vendor_promised_date")
        if promised:
            try:
                pdt = datetime.fromisoformat(str(promised).replace("Z", "+00:00")) if isinstance(promised, str) else promised
                if pdt < now:
                    item_names = ", ".join([i.get("name", "Item") for i in (o.get("items") or [])[:2]]) or "Order"
                    action_items.append({
                        "type": "overdue_eta",
                        "urgency": "hot",
                        "title": f"Past ETA: {o.get('vendor_order_no', o.get('id', '')[:8])}",
                        "description": f"{item_names} — promised date passed",
                        "order_id": o.get("id"),
                    })
            except Exception:
                pass

    # In-production items needing status update (no update in 3+ days)
    stale_threshold = now - timedelta(days=3)
    for o in all_vendor_orders:
        if o.get("status") not in ("in_progress", "processing", "work_scheduled"):
            continue
        updated = o.get("updated_at") or o.get("created_at")
        if updated:
            try:
                udt = datetime.fromisoformat(str(updated).replace("Z", "+00:00")) if isinstance(updated, str) else updated
                if udt < stale_threshold:
                    item_names = ", ".join([i.get("name", "Item") for i in (o.get("items") or [])[:2]]) or "Order"
                    action_items.append({
                        "type": "stale_production",
                        "urgency": "medium",
                        "title": f"Update needed: {o.get('vendor_order_no', o.get('id', '')[:8])}",
                        "description": f"{item_names} — no update in 3+ days",
                        "order_id": o.get("id"),
                    })
            except Exception:
                pass

    # Sort by urgency
    urgency_order = {"hot": 0, "high": 1, "medium": 2, "low": 3}
    action_items.sort(key=lambda a: urgency_order.get(a.get("urgency", "low"), 4))

    # ═══ RECENT ASSIGNMENTS (vendor-safe) ═══
    recent_assignments = []
    for o in all_vendor_orders[:10]:
        vendor_safe_items = []
        for item in o.get("items", []):
            vendor_safe_items.append({
                "name": item.get("name", ""),
                "quantity": item.get("quantity", 1),
                "vendor_price": float(item.get("vendor_price") or item.get("base_price") or item.get("unit_price") or 0),
            })
        recent_assignments.append({
            "id": o.get("id"),
            "vendor_order_no": o.get("vendor_order_no", o.get("id", "")[:12]),
            "status": o.get("status", "assigned"),
            "priority": o.get("priority", "normal"),
            "base_price": _item_total(o),
            "items": vendor_safe_items,
            "created_at": str(o.get("created_at", "")),
        })

    # ═══ TREND CHARTS (6 months) ═══
    charts = _build_vendor_trends(all_vendor_orders, now)

    return {
        "partner": serialize_doc(partner) if partner else None,
        "summary": {
            "catalog_count": catalog_count,
            "active_allocations": active_allocations,
            "pending_fulfillment": active_jobs,
            "completed_jobs": completed_jobs,
            "settlement_total_estimate": settlement_total,
        },
        "vendor_kpis": {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "completed_jobs": completed_jobs,
            "delayed": delayed_count,
            "settlement_total": round(settlement_total, 2),
            "pending_settlement": round(pending_settlement, 2),
            "paid_settlement": round(paid_settlement, 2),
        },
        "vendor_pipeline": vendor_pipeline,
        "work_requiring_action": action_items[:15],
        "recent_assignments": recent_assignments,
        "charts": charts,
    }


def _parse_vendor_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _build_vendor_trends(all_orders, now):
    """Build 6-month fulfillment volume and delivery performance trends."""
    from datetime import timedelta
    months = []
    for i in range(5, -1, -1):
        d = now - timedelta(days=30 * i)
        months.append({"year": d.year, "month": d.month, "label": d.strftime("%b")})

    fulfillment_trend = []
    delivery_performance = []

    for m in months:
        y, mo, label = m["year"], m["month"], m["label"]

        month_orders = []
        for o in all_orders:
            dt = _parse_vendor_dt(o.get("created_at"))
            if dt and dt.year == y and dt.month == mo:
                month_orders.append(o)

        total_in_month = len(month_orders)
        completed_in_month = len([o for o in month_orders if o.get("status") in ("completed", "fulfilled", "delivered")])
        delayed_in_month = len([o for o in month_orders if o.get("status") in ("delayed", "overdue")])

        fulfillment_trend.append({"month": label, "assigned": total_in_month, "completed": completed_in_month})
        on_time = completed_in_month
        delivery_performance.append({"month": label, "on_time": on_time, "delayed": delayed_in_month})

    return {
        "fulfillment_trend": fulfillment_trend,
        "delivery_performance": delivery_performance,
    }


@router.get("/catalog")
async def my_catalog(authorization: Optional[str] = Header(None)):
    """Get partner's catalog items"""
    user = await get_partner_user_from_header(authorization)
    
    docs = await db.partner_catalog_items.find({
        "partner_id": user["partner_id"]
    }).sort("created_at", -1).to_list(length=500)
    
    return [serialize_doc(doc) for doc in docs]


@router.post("/catalog")
async def create_catalog_item(payload: dict, authorization: Optional[str] = Header(None)):
    """Partner creates a catalog item"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    doc = {
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "source_type": payload.get("source_type", "product"),
        "sku": payload.get("sku"),
        "name": payload.get("name"),
        "description": payload.get("description", ""),
        "category": payload.get("category"),
        "base_partner_price": float(payload.get("base_partner_price", 0) or 0),
        "country_code": payload.get("country_code") or partner.get("country_code"),
        "regions": payload.get("regions") or partner.get("regions", []),
        "partner_available_qty": float(payload.get("partner_available_qty", 0) or 0),
        "partner_status": payload.get("partner_status", "in_stock"),
        "lead_time_days": int(payload.get("lead_time_days") or partner.get("lead_time_days", 2)),
        "min_order_qty": int(payload.get("min_order_qty", 1) or 1),
        "unit": payload.get("unit", "piece"),
        "is_active": True,
        "is_approved": False,  # Requires admin approval
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    if not doc["sku"] or not doc["name"]:
        raise HTTPException(status_code=400, detail="SKU and name are required")

    result = await db.partner_catalog_items.insert_one(doc)
    created = await db.partner_catalog_items.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/catalog/{item_id}")
async def update_catalog_item(item_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    """Partner updates their catalog item"""
    user = await get_partner_user_from_header(authorization)

    item = await db.partner_catalog_items.find_one({
        "_id": ObjectId(item_id),
        "partner_id": user["partner_id"]
    })
    if not item:
        raise HTTPException(status_code=404, detail="Catalog item not found")

    allowed_fields = {
        "name", "description", "category", "base_partner_price", "regions",
        "partner_available_qty", "partner_status", "lead_time_days", "min_order_qty", "unit"
    }

    update_doc = {k: v for k, v in payload.items() if k in allowed_fields}
    update_doc["updated_at"] = datetime.now(timezone.utc)

    if "base_partner_price" in update_doc:
        update_doc["base_partner_price"] = float(update_doc["base_partner_price"] or 0)
    if "partner_available_qty" in update_doc:
        update_doc["partner_available_qty"] = float(update_doc["partner_available_qty"] or 0)
    if "lead_time_days" in update_doc:
        update_doc["lead_time_days"] = int(update_doc["lead_time_days"] or 2)

    await db.partner_catalog_items.update_one({"_id": ObjectId(item_id)}, {"$set": update_doc})
    updated = await db.partner_catalog_items.find_one({"_id": ObjectId(item_id)})
    return serialize_doc(updated)


@router.delete("/catalog/{item_id}")
async def delete_catalog_item(item_id: str, authorization: Optional[str] = Header(None)):
    """Partner deactivates their catalog item"""
    user = await get_partner_user_from_header(authorization)

    item = await db.partner_catalog_items.find_one({
        "_id": ObjectId(item_id),
        "partner_id": user["partner_id"]
    })
    if not item:
        raise HTTPException(status_code=404, detail="Catalog item not found")

    await db.partner_catalog_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Catalog item deactivated"}


@router.get("/fulfillment-jobs")
async def partner_fulfillment_jobs_deprecated(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """DEPRECATED: Redirects to vendor_orders. Use /api/vendor/orders instead."""
    from fastapi.responses import RedirectResponse
    params = f"?status={status}" if status else ""
    return RedirectResponse(url=f"/api/vendor/orders{params}", status_code=307)


@router.post("/fulfillment-jobs/{job_id}/status")
async def update_fulfillment_status_deprecated(
    job_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None)
):
    """DEPRECATED: Use /api/vendor/orders/{id}/status instead."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/api/vendor/orders/{job_id}/status", status_code=307)


@router.get("/settlements")
async def partner_settlements(authorization: Optional[str] = Header(None)):
    """Get partner settlement summary from vendor_orders"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    docs = await db.vendor_orders.find({
        "vendor_id": partner_id
    }).sort("created_at", -1).to_list(length=500)

    rows = []
    total_due = 0
    total_paid = 0

    for doc in docs:
        doc = serialize_doc(doc)
        # Calculate amount from items
        amount = 0
        for item in doc.get("items", []):
            bp = float(item.get("vendor_price") or item.get("base_price") or item.get("unit_price") or 0)
            qty = float(item.get("quantity") or 1)
            amount += bp * qty

        settlement_status = doc.get("settlement_status", "pending")
        if settlement_status == "paid":
            total_paid += amount
        else:
            total_due += amount

        item_names = ", ".join([str(i.get("name") or i.get("title") or "Item") for i in (doc.get("items") or [])[:3]]) or "Order"

        rows.append({
            "id": doc.get("id"),
            "konekt_order_ref": doc.get("order_id", "")[:12],
            "item_name": item_names,
            "quantity": sum(int(i.get("quantity") or 1) for i in doc.get("items", [])),
            "status": doc.get("status"),
            "settlement_status": settlement_status,
            "settlement_amount": amount,
            "created_at": doc.get("created_at"),
        })

    return {
        "total_due": total_due,
        "total_paid": total_paid,
        "total_all_time": total_due + total_paid,
        "rows": rows,
    }


@router.get("/stock-table")
async def partner_stock_table(authorization: Optional[str] = Header(None)):
    """Simple stock table view for quick updates"""
    user = await get_partner_user_from_header(authorization)
    
    docs = await db.partner_catalog_items.find({
        "partner_id": user["partner_id"],
        "is_active": True
    }).sort("name", 1).to_list(length=500)
    
    return [{
        "id": str(doc["_id"]),
        "sku": doc.get("sku"),
        "name": doc.get("name"),
        "category": doc.get("category"),
        "base_partner_price": doc.get("base_partner_price"),
        "partner_available_qty": doc.get("partner_available_qty"),
        "partner_status": doc.get("partner_status"),
        "lead_time_days": doc.get("lead_time_days"),
    } for doc in docs]


@router.post("/stock-table/bulk-update")
async def bulk_update_stock(payload: dict, authorization: Optional[str] = Header(None)):
    """Bulk update stock quantities and status"""
    user = await get_partner_user_from_header(authorization)
    
    updates = payload.get("updates", [])
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    updated_count = 0
    errors = []

    for update in updates:
        item_id = update.get("id")
        if not item_id:
            continue

        try:
            item = await db.partner_catalog_items.find_one({
                "_id": ObjectId(item_id),
                "partner_id": user["partner_id"]
            })
            if not item:
                errors.append({"id": item_id, "error": "Not found"})
                continue

            update_doc = {"updated_at": datetime.now(timezone.utc)}
            
            if "partner_available_qty" in update:
                update_doc["partner_available_qty"] = float(update["partner_available_qty"] or 0)
            if "partner_status" in update:
                update_doc["partner_status"] = update["partner_status"]
            if "base_partner_price" in update:
                update_doc["base_partner_price"] = float(update["base_partner_price"] or 0)
            if "lead_time_days" in update:
                update_doc["lead_time_days"] = int(update["lead_time_days"] or 2)

            await db.partner_catalog_items.update_one(
                {"_id": ObjectId(item_id)},
                {"$set": update_doc}
            )
            updated_count += 1
        except Exception as e:
            errors.append({"id": item_id, "error": str(e)})

    return {
        "updated": updated_count,
        "errors": errors
    }
