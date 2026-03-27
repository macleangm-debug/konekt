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
    """Get partner dashboard summary"""
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

    # Vendor order counts (source of truth: vendor_orders collection)
    fulfillment_count = await db.vendor_orders.count_documents({
        "vendor_id": partner_id,
        "status": {"$in": ["assigned", "accepted", "work_scheduled", "in_progress", "ready_to_fulfill", "processing"]},
    })

    completed_jobs = await db.vendor_orders.count_documents({
        "vendor_id": partner_id,
        "status": {"$in": ["completed", "fulfilled", "ready"]},
    })

    # Settlement estimate from vendor_orders
    pipeline = [
        {"$match": {"vendor_id": partner_id}},
        {"$unwind": {"path": "$items", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": None,
            "total_amount": {"$sum": {"$ifNull": [
                {"$multiply": [
                    {"$ifNull": ["$items.vendor_price", {"$ifNull": ["$items.base_price", {"$ifNull": ["$items.unit_price", 0]}]}]},
                    {"$ifNull": ["$items.quantity", 1]}
                ]},
                0
            ]}}
        }}
    ]
    settlement_cursor = db.vendor_orders.aggregate(pipeline)
    settlement_total = 0
    async for row in settlement_cursor:
        settlement_total = row.get("total_amount", 0)

    return {
        "partner": serialize_doc(partner) if partner else None,
        "summary": {
            "catalog_count": catalog_count,
            "active_allocations": active_allocations,
            "pending_fulfillment": fulfillment_count,
            "completed_jobs": completed_jobs,
            "settlement_total_estimate": settlement_total,
        }
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
