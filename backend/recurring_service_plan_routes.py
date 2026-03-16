"""
Recurring Service Plan Routes - Manage recurring cleaning, maintenance, etc.
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/recurring-service-plans", tags=["Recurring Service Plans"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("")
async def list_recurring_service_plans(customer_email: str = None, customer_id: str = None, status: str = None):
    """List recurring service plans"""
    query = {}
    if customer_email:
        query["customer_email"] = customer_email
    if customer_id:
        query["customer_id"] = customer_id
    if status:
        query["status"] = status
    docs = await db.recurring_service_plans.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{plan_id}")
async def get_recurring_service_plan(plan_id: str):
    """Get a specific recurring service plan"""
    doc = await db.recurring_service_plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Recurring service plan not found")
    return serialize_doc(doc)


@router.post("")
async def create_recurring_service_plan(payload: dict):
    """Create a new recurring service plan"""
    service_key = payload.get("service_key")
    service = await db.service_types.find_one({"key": service_key})
    
    # Use service name from DB if available, else from payload
    service_name = service.get("name") if service else payload.get("service_name", service_key)

    doc = {
        "customer_id": payload.get("customer_id"),
        "customer_email": payload.get("customer_email"),
        "customer_name": payload.get("customer_name"),
        "customer_phone": payload.get("customer_phone"),
        "company_name": payload.get("company_name"),
        "service_key": service_key,
        "service_name": service_name,
        "service_group_key": payload.get("service_group_key"),
        "plan_type": payload.get("plan_type", "service"),  # service | maintenance | cleaning
        "frequency": payload.get("frequency", "monthly"),  # weekly | biweekly | monthly | quarterly
        "preferred_day": payload.get("preferred_day"),  # monday, tuesday, etc. or day of month (1-28)
        "preferred_time_window": payload.get("preferred_time_window"),  # morning | afternoon | evening
        "country_code": payload.get("country_code"),
        "region": payload.get("region"),
        "address": payload.get("address"),
        "form_data": payload.get("form_data", {}),
        "special_instructions": payload.get("special_instructions", ""),
        "start_date": payload.get("start_date"),
        "end_date": payload.get("end_date"),
        "next_scheduled_date": payload.get("next_scheduled_date"),
        "last_executed_date": None,
        "execution_count": 0,
        "status": payload.get("status", "active"),  # active | paused | cancelled
        "assigned_account_manager_email": payload.get("assigned_account_manager_email"),
        "assigned_partner_id": payload.get("assigned_partner_id"),
        "pricing_mode": payload.get("pricing_mode", "per_visit"),  # per_visit | monthly_flat
        "price_per_visit": float(payload.get("price_per_visit", 0) or 0),
        "monthly_flat_rate": float(payload.get("monthly_flat_rate", 0) or 0),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.recurring_service_plans.insert_one(doc)
    created = await db.recurring_service_plans.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{plan_id}")
async def update_recurring_service_plan(plan_id: str, payload: dict):
    """Update a recurring service plan"""
    existing = await db.recurring_service_plans.find_one({"_id": ObjectId(plan_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Recurring service plan not found")
    
    updates = {
        "frequency": payload.get("frequency", existing.get("frequency")),
        "preferred_day": payload.get("preferred_day", existing.get("preferred_day")),
        "preferred_time_window": payload.get("preferred_time_window", existing.get("preferred_time_window")),
        "address": payload.get("address", existing.get("address")),
        "form_data": payload.get("form_data", existing.get("form_data", {})),
        "special_instructions": payload.get("special_instructions", existing.get("special_instructions", "")),
        "next_scheduled_date": payload.get("next_scheduled_date", existing.get("next_scheduled_date")),
        "status": payload.get("status", existing.get("status")),
        "assigned_account_manager_email": payload.get("assigned_account_manager_email", existing.get("assigned_account_manager_email")),
        "assigned_partner_id": payload.get("assigned_partner_id", existing.get("assigned_partner_id")),
        "price_per_visit": float(payload.get("price_per_visit", existing.get("price_per_visit", 0)) or 0),
        "monthly_flat_rate": float(payload.get("monthly_flat_rate", existing.get("monthly_flat_rate", 0)) or 0),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.recurring_service_plans.update_one({"_id": ObjectId(plan_id)}, {"$set": updates})
    updated = await db.recurring_service_plans.find_one({"_id": ObjectId(plan_id)})
    return serialize_doc(updated)


@router.post("/{plan_id}/pause")
async def pause_recurring_service_plan(plan_id: str):
    """Pause a recurring service plan"""
    await db.recurring_service_plans.update_one(
        {"_id": ObjectId(plan_id)},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True, "status": "paused"}


@router.post("/{plan_id}/resume")
async def resume_recurring_service_plan(plan_id: str):
    """Resume a paused recurring service plan"""
    await db.recurring_service_plans.update_one(
        {"_id": ObjectId(plan_id)},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True, "status": "active"}


@router.post("/{plan_id}/cancel")
async def cancel_recurring_service_plan(plan_id: str):
    """Cancel a recurring service plan"""
    await db.recurring_service_plans.update_one(
        {"_id": ObjectId(plan_id)},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True, "status": "cancelled"}


@router.delete("/{plan_id}")
async def delete_recurring_service_plan(plan_id: str):
    """Delete a recurring service plan"""
    result = await db.recurring_service_plans.delete_one({"_id": ObjectId(plan_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring service plan not found")
    return {"deleted": True}
