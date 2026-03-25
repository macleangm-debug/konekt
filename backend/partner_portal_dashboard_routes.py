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

    # Fulfillment job counts
    fulfillment_count = await db.fulfillment_jobs.count_documents({
        "partner_id": partner_id,
        "status": {"$in": ["allocated", "accepted", "in_progress"]},
    })

    completed_jobs = await db.fulfillment_jobs.count_documents({
        "partner_id": partner_id,
        "status": "fulfilled",
    })

    # Settlement estimate
    pipeline = [
        {"$match": {"partner_id": partner_id}},
        {"$group": {
            "_id": None,
            "total_amount": {"$sum": {"$multiply": ["$base_partner_price", "$quantity"]}}
        }}
    ]
    settlement_cursor = db.fulfillment_jobs.aggregate(pipeline)
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
async def partner_fulfillment_jobs(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Get partner's fulfillment jobs from BOTH fulfillment_jobs AND vendor_orders"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    # Query fulfillment_jobs
    fj_query = {"partner_id": partner_id}
    if status:
        fj_query["status"] = status
    fj_docs = await db.fulfillment_jobs.find(fj_query).sort("created_at", -1).to_list(length=300)

    # Also query vendor_orders by partner_id OR vendor_id matching partner_id
    vo_query = {"$or": [{"partner_id": partner_id}, {"vendor_id": partner_id}]}
    if status:
        vo_query["status"] = status
    vo_docs = await db.vendor_orders.find(vo_query).sort("created_at", -1).to_list(length=300)

    # Merge and deduplicate (prefer fulfillment_jobs if same order_id)
    seen_order_ids = set()
    sanitized = []
    pii_fields = ["customer_email", "customer_name", "customer_company",
                  "customer_phone", "delivery_address", "customer_id"]

    for doc in fj_docs:
        clean = serialize_doc(doc)
        for field in pii_fields:
            clean.pop(field, None)
        clean["source"] = "fulfillment_job"
        if clean.get("order_id"):
            seen_order_ids.add(clean["order_id"])
        sanitized.append(clean)

    for doc in vo_docs:
        clean = serialize_doc(doc)
        if clean.get("order_id") in seen_order_ids:
            continue
        for field in pii_fields:
            clean.pop(field, None)
        # Normalize vendor_order fields to match fulfillment_job shape
        if not clean.get("item_name") and clean.get("items"):
            clean["item_name"] = ", ".join(i.get("name", i.get("product_name", "Item")) for i in clean["items"][:3])
        if not clean.get("quantity") and clean.get("items"):
            clean["quantity"] = sum(i.get("quantity", 1) for i in clean["items"])
        clean["source"] = "vendor_order"
        sanitized.append(clean)

    sanitized.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return sanitized


@router.post("/fulfillment-jobs/{job_id}/status")
async def update_fulfillment_status(
    job_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None)
):
    """Partner updates fulfillment job or vendor order status"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    status = payload.get("status")
    allowed_statuses = {"allocated", "accepted", "in_progress", "fulfilled", "issue_reported", "ready_to_fulfill"}
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {allowed_statuses}")

    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc),
    }
    if payload.get("partner_note"):
        update_data["partner_note"] = payload["partner_note"]

    # Try fulfillment_jobs first
    try:
        job = await db.fulfillment_jobs.find_one({"_id": ObjectId(job_id), "partner_id": partner_id})
    except Exception:
        job = None
    if job:
        await db.fulfillment_jobs.update_one({"_id": ObjectId(job_id)}, {"$set": update_data})
        updated = await db.fulfillment_jobs.find_one({"_id": ObjectId(job_id)})
        clean = serialize_doc(updated)
        for field in ["customer_email", "customer_name", "customer_company",
                      "customer_phone", "delivery_address", "customer_id"]:
            clean.pop(field, None)
        return clean

    # Try vendor_orders by id field
    vo = await db.vendor_orders.find_one({"id": job_id, "$or": [{"partner_id": partner_id}, {"vendor_id": partner_id}]})
    if not vo:
        # Try by _id
        try:
            vo = await db.vendor_orders.find_one({"_id": ObjectId(job_id), "$or": [{"partner_id": partner_id}, {"vendor_id": partner_id}]})
        except Exception:
            pass
    if vo:
        update_key = {"_id": vo["_id"]}
        await db.vendor_orders.update_one(update_key, {"$set": update_data})
        updated = await db.vendor_orders.find_one(update_key)
        clean = serialize_doc(updated)
        for field in ["customer_email", "customer_name", "customer_company",
                      "customer_phone", "delivery_address", "customer_id"]:
            clean.pop(field, None)
        return clean

    raise HTTPException(status_code=404, detail="Order not found")


@router.get("/settlements")
async def partner_settlements(authorization: Optional[str] = Header(None)):
    """Get partner settlement summary"""
    user = await get_partner_user_from_header(authorization)

    docs = await db.fulfillment_jobs.find({
        "partner_id": user["partner_id"]
    }).sort("created_at", -1).to_list(length=500)

    rows = []
    total_due = 0
    total_paid = 0

    for doc in docs:
        amount = float(doc.get("base_partner_price", 0) or 0) * float(doc.get("quantity", 0) or 0)
        settlement_status = doc.get("settlement_status", "pending")
        
        if settlement_status == "paid":
            total_paid += amount
        else:
            total_due += amount

        rows.append({
            "id": str(doc["_id"]),
            "konekt_order_ref": doc.get("konekt_order_ref"),
            "sku": doc.get("sku"),
            "item_name": doc.get("item_name"),
            "quantity": doc.get("quantity"),
            "unit_price": doc.get("base_partner_price"),
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
