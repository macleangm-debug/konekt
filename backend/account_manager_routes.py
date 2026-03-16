"""
Account Manager Routes - Assign and manage account managers for key clients
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/account-managers", tags=["Account Managers"])

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


@router.post("/assign-customer")
async def assign_customer_account_manager(payload: dict):
    """Assign an account manager to a customer"""
    customer_id = payload.get("customer_id")
    account_manager_email = payload.get("account_manager_email")
    account_manager_name = payload.get("account_manager_name", "")

    if not customer_id or not account_manager_email:
        raise HTTPException(status_code=400, detail="customer_id and account_manager_email required")

    # Check if customer exists
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.customers.update_one(
        {"_id": ObjectId(customer_id)},
        {
            "$set": {
                "assigned_account_manager_email": account_manager_email,
                "assigned_account_manager_name": account_manager_name,
                "is_key_account": payload.get("is_key_account", True),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    # Log the assignment
    await db.account_manager_logs.insert_one({
        "customer_id": customer_id,
        "customer_name": customer.get("name") or customer.get("company_name"),
        "account_manager_email": account_manager_email,
        "account_manager_name": account_manager_name,
        "action": "assigned",
        "created_at": datetime.now(timezone.utc),
    })

    return {"ok": True}


@router.post("/unassign-customer")
async def unassign_customer_account_manager(payload: dict):
    """Remove account manager from a customer"""
    customer_id = payload.get("customer_id")

    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id required")

    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.customers.update_one(
        {"_id": ObjectId(customer_id)},
        {
            "$set": {
                "assigned_account_manager_email": None,
                "assigned_account_manager_name": None,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"ok": True}


@router.get("/my-accounts")
async def get_my_assigned_accounts(account_manager_email: str):
    """Get all accounts assigned to an account manager"""
    docs = await db.customers.find({
        "assigned_account_manager_email": account_manager_email
    }).sort("company_name", 1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/key-accounts")
async def get_all_key_accounts():
    """Get all key accounts with their assigned managers"""
    docs = await db.customers.find({
        "is_key_account": True
    }).sort("company_name", 1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.post("/add-note")
async def add_account_note(payload: dict):
    """Add a note to a customer account"""
    customer_id = payload.get("customer_id")
    note = payload.get("note")
    added_by = payload.get("added_by_email")

    if not customer_id or not note:
        raise HTTPException(status_code=400, detail="customer_id and note required")

    note_doc = {
        "customer_id": customer_id,
        "note": note,
        "added_by_email": added_by,
        "created_at": datetime.now(timezone.utc),
    }

    await db.account_manager_notes.insert_one(note_doc)
    return {"ok": True}


@router.get("/notes/{customer_id}")
async def get_account_notes(customer_id: str, limit: int = 50):
    """Get notes for a customer account"""
    docs = await db.account_manager_notes.find({
        "customer_id": customer_id
    }).sort("created_at", -1).limit(limit).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]
