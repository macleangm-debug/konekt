"""
Supplier Routes
Manages supplier master data
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/suppliers", tags=["Suppliers"])

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
async def list_suppliers(limit: int = 300):
    docs = await db.suppliers.find({}).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{supplier_id}")
async def get_supplier(supplier_id: str):
    doc = await db.suppliers.find_one({"_id": ObjectId(supplier_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return serialize_doc(doc)


@router.post("")
async def create_supplier(payload: dict):
    doc = {
        "name": payload.get("name"),
        "contact_person": payload.get("contact_person"),
        "email": payload.get("email"),
        "phone": payload.get("phone"),
        "address": payload.get("address"),
        "city": payload.get("city"),
        "country": payload.get("country", "Tanzania"),
        "tax_number": payload.get("tax_number"),
        "payment_terms": payload.get("payment_terms"),
        "lead_time_days": payload.get("lead_time_days"),
        "bank_details": payload.get("bank_details"),
        "notes": payload.get("notes", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.suppliers.insert_one(doc)
    created = await db.suppliers.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{supplier_id}")
async def update_supplier(supplier_id: str, payload: dict):
    update_data = {
        "name": payload.get("name"),
        "contact_person": payload.get("contact_person"),
        "email": payload.get("email"),
        "phone": payload.get("phone"),
        "address": payload.get("address"),
        "city": payload.get("city"),
        "country": payload.get("country"),
        "tax_number": payload.get("tax_number"),
        "payment_terms": payload.get("payment_terms"),
        "lead_time_days": payload.get("lead_time_days"),
        "bank_details": payload.get("bank_details"),
        "notes": payload.get("notes"),
        "is_active": payload.get("is_active", True),
        "updated_at": datetime.now(timezone.utc),
    }
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.suppliers.update_one(
        {"_id": ObjectId(supplier_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    updated = await db.suppliers.find_one({"_id": ObjectId(supplier_id)})
    return serialize_doc(updated)


@router.delete("/{supplier_id}")
async def delete_supplier(supplier_id: str):
    result = await db.suppliers.delete_one({"_id": ObjectId(supplier_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted successfully"}
