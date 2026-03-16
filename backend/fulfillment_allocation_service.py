"""
Fulfillment Allocation Service
Creates hidden fulfillment jobs for partner orders
"""
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def create_hidden_fulfillment_job(
    parent_order_id: str,
    line_item: dict,
    routing_result: dict,
    customer_info: dict = None,
):
    """
    Create a hidden fulfillment job for a partner.
    The customer info is stripped to protect Konekt's customer relationship.
    Partner only receives minimal fulfillment details.
    """
    # Partner-safe customer info (NO personal details)
    partner_safe_delivery = {
        "country": routing_result.get("country_code"),
        "region": routing_result.get("region"),
        # City and address will be added only when needed for actual delivery
        "delivery_instructions": line_item.get("delivery_instructions", ""),
    }

    doc = {
        # Order reference
        "parent_order_id": parent_order_id,
        "konekt_order_ref": f"KNK-{parent_order_id[-8:].upper()}",  # Konekt reference only

        # Partner info
        "partner_id": routing_result.get("partner_id"),
        "partner_name": routing_result.get("partner_name"),
        "catalog_item_id": routing_result.get("catalog_item_id"),

        # Item info
        "sku": line_item.get("sku"),
        "item_name": routing_result.get("item_name") or line_item.get("name") or line_item.get("description"),
        "quantity": float(line_item.get("quantity", 0) or 0),
        "unit": routing_result.get("unit", "piece"),

        # Geography (NO customer personal details)
        "country_code": routing_result.get("country_code"),
        "region": routing_result.get("region"),
        "partner_safe_delivery": partner_safe_delivery,

        # Pricing (internal tracking only)
        "base_partner_price": routing_result.get("base_partner_price"),
        "customer_price": routing_result.get("customer_price"),
        "markup_amount": routing_result.get("markup_amount"),
        "line_total_partner": routing_result.get("base_partner_price", 0) * float(line_item.get("quantity", 0) or 0),
        "line_total_customer": routing_result.get("customer_price", 0) * float(line_item.get("quantity", 0) or 0),

        # SLA
        "lead_time_days": routing_result.get("lead_time_days"),
        "expected_fulfillment_date": None,  # To be calculated

        # Status tracking
        "status": "allocated",  # allocated | confirmed | in_progress | shipped | delivered | cancelled
        "partner_notes": "",
        "internal_notes": "",

        # Settlement tracking
        "settlement_status": "pending",  # pending | calculated | paid
        "settlement_amount": 0,

        # Audit
        "customer_visible": False,  # Partner data should never be exposed to customer
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.fulfillment_jobs.insert_one(doc)
    created = await db.fulfillment_jobs.find_one({"_id": result.inserted_id})

    # Return serialized (without exposing internal _id directly to partners)
    created["id"] = str(created["_id"])
    del created["_id"]

    return created


async def get_fulfillment_jobs_for_order(order_id: str):
    """Get all fulfillment jobs for an order (admin only)."""
    jobs = await db.fulfillment_jobs.find({"parent_order_id": order_id}).to_list(length=100)
    for job in jobs:
        job["id"] = str(job["_id"])
        del job["_id"]
    return jobs


async def get_fulfillment_jobs_for_partner(partner_id: str, status: str = None):
    """Get fulfillment jobs assigned to a partner."""
    query = {"partner_id": partner_id}
    if status:
        query["status"] = status
    jobs = await db.fulfillment_jobs.find(query).sort("created_at", -1).to_list(length=500)

    # Strip sensitive info before returning to partner
    partner_safe_jobs = []
    for job in jobs:
        partner_safe_jobs.append({
            "id": str(job["_id"]),
            "konekt_order_ref": job.get("konekt_order_ref"),
            "sku": job.get("sku"),
            "item_name": job.get("item_name"),
            "quantity": job.get("quantity"),
            "unit": job.get("unit"),
            "country_code": job.get("country_code"),
            "region": job.get("region"),
            "lead_time_days": job.get("lead_time_days"),
            "status": job.get("status"),
            "created_at": job.get("created_at"),
            # NO customer details, NO margin info
        })

    return partner_safe_jobs


async def update_fulfillment_job_status(job_id: str, status: str, notes: str = None):
    """Update fulfillment job status."""
    from bson import ObjectId

    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc),
    }
    if notes:
        update_data["partner_notes"] = notes

    await db.fulfillment_jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": update_data}
    )

    return await db.fulfillment_jobs.find_one({"_id": ObjectId(job_id)})
