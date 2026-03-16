"""
Contract Client Routes - Manage contract customers, tiers, and terms
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/contract-clients", tags=["Contract Clients"])

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
async def list_contract_clients(status: str = None, tier: str = None):
    """List all contract clients"""
    query = {}
    if status:
        query["is_active"] = status == "active"
    if tier:
        query["tier"] = tier
    docs = await db.contract_clients.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{contract_client_id}")
async def get_contract_client(contract_client_id: str):
    """Get a specific contract client"""
    doc = await db.contract_clients.find_one({"_id": ObjectId(contract_client_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Contract client not found")
    return serialize_doc(doc)


@router.post("")
async def create_contract_client(payload: dict):
    """Create a new contract client"""
    customer_id = payload.get("customer_id")
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    doc = {
        "customer_id": customer_id,
        "customer_email": customer.get("email"),
        "customer_name": customer.get("full_name") or customer.get("name"),
        "company_name": payload.get("company_name") or customer.get("company_name"),
        "client_type": "contract",
        "tier": payload.get("tier", "standard"),  # standard | premium | strategic
        "account_manager_email": payload.get("account_manager_email"),
        "account_manager_name": payload.get("account_manager_name"),
        "payment_terms_days": int(payload.get("payment_terms_days", 30) or 30),
        "credit_limit": float(payload.get("credit_limit", 0) or 0),
        "current_credit_used": 0,
        "contract_start_date": payload.get("contract_start_date"),
        "contract_end_date": payload.get("contract_end_date"),
        "currency": payload.get("currency", "TZS"),
        "country_code": payload.get("country_code", "TZ"),
        "is_active": bool(payload.get("is_active", True)),
        "notes": payload.get("notes", ""),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    # Mark customer as contract client
    await db.customers.update_one(
        {"_id": ObjectId(customer_id)},
        {"$set": {
            "is_contract_client": True,
            "client_tier": doc["tier"],
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    result = await db.contract_clients.insert_one(doc)
    created = await db.contract_clients.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{contract_client_id}")
async def update_contract_client(contract_client_id: str, payload: dict):
    """Update a contract client"""
    existing = await db.contract_clients.find_one({"_id": ObjectId(contract_client_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Contract client not found")

    update_doc = {
        "company_name": payload.get("company_name", existing.get("company_name")),
        "tier": payload.get("tier", existing.get("tier", "standard")),
        "account_manager_email": payload.get("account_manager_email", existing.get("account_manager_email")),
        "account_manager_name": payload.get("account_manager_name", existing.get("account_manager_name")),
        "payment_terms_days": int(payload.get("payment_terms_days", existing.get("payment_terms_days", 30)) or 30),
        "credit_limit": float(payload.get("credit_limit", existing.get("credit_limit", 0)) or 0),
        "contract_start_date": payload.get("contract_start_date", existing.get("contract_start_date")),
        "contract_end_date": payload.get("contract_end_date", existing.get("contract_end_date")),
        "currency": payload.get("currency", existing.get("currency", "TZS")),
        "is_active": bool(payload.get("is_active", existing.get("is_active", True))),
        "notes": payload.get("notes", existing.get("notes", "")),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.contract_clients.update_one({"_id": ObjectId(contract_client_id)}, {"$set": update_doc})
    
    # Update customer tier
    await db.customers.update_one(
        {"_id": ObjectId(existing.get("customer_id"))},
        {"$set": {"client_tier": update_doc["tier"], "updated_at": datetime.now(timezone.utc)}}
    )
    
    updated = await db.contract_clients.find_one({"_id": ObjectId(contract_client_id)})
    return serialize_doc(updated)


@router.delete("/{contract_client_id}")
async def delete_contract_client(contract_client_id: str):
    """Delete a contract client"""
    existing = await db.contract_clients.find_one({"_id": ObjectId(contract_client_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Contract client not found")
    
    # Remove contract flag from customer
    await db.customers.update_one(
        {"_id": ObjectId(existing.get("customer_id"))},
        {"$set": {"is_contract_client": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    result = await db.contract_clients.delete_one({"_id": ObjectId(contract_client_id)})
    return {"deleted": result.deleted_count > 0}


@router.get("/by-customer/{customer_id}")
async def get_contract_client_by_customer(customer_id: str):
    """Get contract client record for a specific customer"""
    doc = await db.contract_clients.find_one({"customer_id": customer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Contract client not found")
    return serialize_doc(doc)
