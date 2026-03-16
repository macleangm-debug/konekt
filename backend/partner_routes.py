"""
Partner Routes
Partner master data management with geography coverage
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/partners", tags=["Partners"])

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


@router.get("")
async def list_partners(country_code: str = None, status: str = None, limit: int = 300):
    """List all partners with optional filters."""
    query = {}
    if country_code:
        query["country_code"] = country_code.upper()
    if status:
        query["status"] = status
    docs = await db.partners.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{partner_id}")
async def get_partner(partner_id: str):
    """Get partner details."""
    doc = await db.partners.find_one({"_id": ObjectId(partner_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Partner not found")
    return serialize_doc(doc)


@router.post("")
async def create_partner(payload: dict):
    """Create a new partner."""
    doc = {
        "name": payload.get("name"),
        "partner_type": payload.get("partner_type", "distributor"),  # distributor | service_partner | manufacturer | print_partner
        "contact_person": payload.get("contact_person"),
        "email": payload.get("email"),
        "phone": payload.get("phone"),
        "country_code": payload.get("country_code", "TZ").upper(),
        "regions": payload.get("regions", []),
        "categories": payload.get("categories", []),
        "coverage_mode": payload.get("coverage_mode", "regional"),  # national | regional
        "fulfillment_type": payload.get("fulfillment_type", "partner_fulfilled"),  # partner_fulfilled | konekt_pickup | mixed
        "status": payload.get("status", "active"),  # active | inactive | pending_approval
        "lead_time_days": int(payload.get("lead_time_days", 2) or 2),
        "settlement_terms": payload.get("settlement_terms", "weekly"),  # weekly | monthly | per_order
        "commission_rate": float(payload.get("commission_rate", 0) or 0),  # Konekt's commission %
        "bank_details": payload.get("bank_details"),
        "address": payload.get("address"),
        "notes": payload.get("notes", ""),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.partners.insert_one(doc)
    created = await db.partners.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{partner_id}")
async def update_partner(partner_id: str, payload: dict):
    """Update partner details."""
    existing = await db.partners.find_one({"_id": ObjectId(partner_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Partner not found")

    update_data = {
        "name": payload.get("name", existing.get("name")),
        "partner_type": payload.get("partner_type", existing.get("partner_type")),
        "contact_person": payload.get("contact_person", existing.get("contact_person")),
        "email": payload.get("email", existing.get("email")),
        "phone": payload.get("phone", existing.get("phone")),
        "country_code": payload.get("country_code", existing.get("country_code")),
        "regions": payload.get("regions", existing.get("regions")),
        "categories": payload.get("categories", existing.get("categories")),
        "coverage_mode": payload.get("coverage_mode", existing.get("coverage_mode")),
        "fulfillment_type": payload.get("fulfillment_type", existing.get("fulfillment_type")),
        "status": payload.get("status", existing.get("status")),
        "lead_time_days": int(payload.get("lead_time_days", existing.get("lead_time_days", 2)) or 2),
        "settlement_terms": payload.get("settlement_terms", existing.get("settlement_terms")),
        "commission_rate": float(payload.get("commission_rate", existing.get("commission_rate", 0)) or 0),
        "bank_details": payload.get("bank_details", existing.get("bank_details")),
        "address": payload.get("address", existing.get("address")),
        "notes": payload.get("notes", existing.get("notes")),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.partners.update_one({"_id": ObjectId(partner_id)}, {"$set": update_data})
    updated = await db.partners.find_one({"_id": ObjectId(partner_id)})
    return serialize_doc(updated)


@router.delete("/{partner_id}")
async def delete_partner(partner_id: str):
    """Delete a partner (soft delete by setting status to inactive)."""
    result = await db.partners.update_one(
        {"_id": ObjectId(partner_id)},
        {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"message": "Partner deactivated successfully"}
