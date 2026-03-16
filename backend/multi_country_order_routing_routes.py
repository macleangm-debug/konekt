"""
Multi-Country Order Routing Routes
Allocates orders to partners based on geography and routing rules
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

from partner_routing_service import route_partner_item, route_order_items
from fulfillment_allocation_service import create_hidden_fulfillment_job, get_fulfillment_jobs_for_order

router = APIRouter(prefix="/api/admin/multi-country-routing", tags=["Multi Country Routing"])

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


@router.post("/test-routing")
async def test_routing(payload: dict):
    """
    Test routing for a SKU without creating any allocations.
    Useful for checking partner availability and pricing.
    """
    sku = payload.get("sku")
    country_code = payload.get("country_code", "TZ")
    region = payload.get("region")
    category = payload.get("category")
    quantity = int(payload.get("quantity", 1) or 1)

    if not sku:
        raise HTTPException(status_code=400, detail="sku is required")

    result = await route_partner_item(
        sku=sku,
        country_code=country_code,
        region=region,
        category=category,
        quantity=quantity,
    )

    if not result:
        return {
            "status": "no_partner",
            "message": f"No partner found for {sku} in {country_code}/{region}",
            "sku": sku,
            "country_code": country_code,
            "region": region,
        }

    return {
        "status": "available",
        "routing": result,
    }


@router.post("/allocate-order/{order_id}")
async def allocate_order(order_id: str):
    """
    Allocate an order to partners based on routing rules.
    Creates hidden fulfillment jobs for partner items.
    """
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    country_code = order.get("customer_country_code") or "TZ"
    region = order.get("customer_region") or ""
    line_items = order.get("line_items", []) or []

    if not line_items:
        raise HTTPException(status_code=400, detail="Order has no line items")

    allocations = []
    total_partner_items = 0
    total_internal_items = 0

    for item in line_items:
        source_mode = item.get("source_mode", "hybrid")

        # Skip items marked as internal only
        if source_mode == "internal":
            total_internal_items += 1
            allocations.append({
                "sku": item.get("sku"),
                "status": "internal",
                "message": "Item sourced from internal stock",
            })
            continue

        # Route to partner
        routing_result = await route_partner_item(
            sku=item.get("sku"),
            country_code=country_code,
            region=region,
            category=item.get("category"),
            quantity=int(item.get("quantity", 1) or 1),
        )

        if not routing_result:
            allocations.append({
                "sku": item.get("sku"),
                "status": "no_partner",
                "message": f"No partner found - will use internal stock or manual allocation",
            })
            continue

        # Create hidden fulfillment job
        job = await create_hidden_fulfillment_job(
            parent_order_id=str(order["_id"]),
            line_item=item,
            routing_result=routing_result,
        )

        total_partner_items += 1
        allocations.append({
            "sku": item.get("sku"),
            "status": "allocated",
            "fulfillment_job_id": job.get("id"),
            "partner_id": routing_result.get("partner_id"),
            "partner_name": routing_result.get("partner_name"),
            "lead_time_days": routing_result.get("lead_time_days"),
        })

    # Update order with split status
    update_data = {
        "is_split_order": total_partner_items > 0,
        "has_partner_items": total_partner_items > 0,
        "has_internal_items": total_internal_items > 0,
        "allocation_status": "allocated",
        "updated_at": datetime.now(timezone.utc),
    }
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": update_data})

    return {
        "order_id": order_id,
        "country_code": country_code,
        "region": region,
        "total_items": len(line_items),
        "partner_items": total_partner_items,
        "internal_items": total_internal_items,
        "allocations": allocations,
    }


@router.get("/fulfillment-jobs/{order_id}")
async def get_order_fulfillment_jobs(order_id: str):
    """Get all fulfillment jobs for an order (admin only)."""
    jobs = await get_fulfillment_jobs_for_order(order_id)
    return jobs


@router.get("/partner-queue/{partner_id}")
async def get_partner_fulfillment_queue(partner_id: str, status: str = None):
    """Get fulfillment queue for a partner (partner-safe data only)."""
    from fulfillment_allocation_service import get_fulfillment_jobs_for_partner
    jobs = await get_fulfillment_jobs_for_partner(partner_id, status)
    return jobs


@router.patch("/fulfillment-jobs/{job_id}/status")
async def update_job_status(job_id: str, payload: dict):
    """Update fulfillment job status."""
    status = payload.get("status")
    notes = payload.get("notes")

    valid_statuses = ["allocated", "confirmed", "in_progress", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    from fulfillment_allocation_service import update_fulfillment_job_status
    job = await update_fulfillment_job_status(job_id, status, notes)

    if not job:
        raise HTTPException(status_code=404, detail="Fulfillment job not found")

    return serialize_doc(job)
