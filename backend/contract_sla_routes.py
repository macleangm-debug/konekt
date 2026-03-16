"""
Contract SLA Routes - SLA settings for contract clients
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/contract-slas", tags=["Contract SLAs"])

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
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("")
async def list_contract_slas(customer_id: str = None, service_key: str = None):
    """List contract SLA settings"""
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if service_key:
        query["service_key"] = service_key
    docs = await db.contract_slas.find(query).sort("created_at", -1).to_list(length=300)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{sla_id}")
async def get_contract_sla(sla_id: str):
    """Get a specific SLA setting"""
    doc = await db.contract_slas.find_one({"_id": ObjectId(sla_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="SLA setting not found")
    return serialize_doc(doc)


@router.post("")
async def create_contract_sla(payload: dict):
    """Create a new SLA setting"""
    doc = {
        "customer_id": payload.get("customer_id"),
        "service_key": payload.get("service_key"),  # Optional - if null, applies to all services
        "response_time_hours": float(payload.get("response_time_hours", 24) or 24),
        "quote_turnaround_hours": float(payload.get("quote_turnaround_hours", 48) or 48),
        "delivery_target_days": float(payload.get("delivery_target_days", 7) or 7),
        "priority_level": payload.get("priority_level", "standard"),  # standard | premium | strategic
        "escalation_email": payload.get("escalation_email"),
        "auto_escalate": bool(payload.get("auto_escalate", False)),
        "notes": payload.get("notes", ""),
        "is_active": bool(payload.get("is_active", True)),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.contract_slas.insert_one(doc)
    created = await db.contract_slas.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{sla_id}")
async def update_contract_sla(sla_id: str, payload: dict):
    """Update an SLA setting"""
    existing = await db.contract_slas.find_one({"_id": ObjectId(sla_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="SLA setting not found")

    updates = {
        "service_key": payload.get("service_key", existing.get("service_key")),
        "response_time_hours": float(payload.get("response_time_hours", existing.get("response_time_hours", 24)) or 24),
        "quote_turnaround_hours": float(payload.get("quote_turnaround_hours", existing.get("quote_turnaround_hours", 48)) or 48),
        "delivery_target_days": float(payload.get("delivery_target_days", existing.get("delivery_target_days", 7)) or 7),
        "priority_level": payload.get("priority_level", existing.get("priority_level")),
        "escalation_email": payload.get("escalation_email", existing.get("escalation_email")),
        "auto_escalate": bool(payload.get("auto_escalate", existing.get("auto_escalate", False))),
        "notes": payload.get("notes", existing.get("notes")),
        "is_active": bool(payload.get("is_active", existing.get("is_active", True))),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.contract_slas.update_one({"_id": ObjectId(sla_id)}, {"$set": updates})
    updated = await db.contract_slas.find_one({"_id": ObjectId(sla_id)})
    return serialize_doc(updated)


@router.delete("/{sla_id}")
async def delete_contract_sla(sla_id: str):
    """Delete an SLA setting"""
    result = await db.contract_slas.delete_one({"_id": ObjectId(sla_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SLA setting not found")
    return {"deleted": True}


@router.get("/for-customer/{customer_id}")
async def get_slas_for_customer(customer_id: str, service_key: str = None):
    """Get all active SLAs for a customer, optionally filtered by service"""
    query = {"customer_id": customer_id, "is_active": True}
    if service_key:
        query["$or"] = [{"service_key": service_key}, {"service_key": None}]
    docs = await db.contract_slas.find(query).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]
