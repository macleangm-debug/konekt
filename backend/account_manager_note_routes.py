"""
Account Manager Note Routes - Internal notes for key accounts
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/account-manager-notes", tags=["Account Manager Notes"])

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


@router.get("/{customer_id}")
async def get_account_manager_notes(customer_id: str, note_type: str = None, limit: int = 100):
    """Get notes for a specific customer"""
    query = {"customer_id": customer_id}
    if note_type:
        query["note_type"] = note_type
    docs = await db.account_manager_notes.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_account_manager_note(payload: dict):
    """Create a new note for a customer"""
    customer_id = payload.get("customer_id")
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    doc = {
        "customer_id": customer_id,
        "customer_email": customer.get("email"),
        "customer_name": customer.get("full_name") or customer.get("name"),
        "account_manager_email": payload.get("account_manager_email"),
        "account_manager_name": payload.get("account_manager_name"),
        "note_type": payload.get("note_type", "general"),  # general | escalation | pricing | sla | preference
        "title": payload.get("title", ""),
        "note": payload.get("note", ""),
        "is_pinned": bool(payload.get("is_pinned", False)),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.account_manager_notes.insert_one(doc)
    created = await db.account_manager_notes.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{note_id}")
async def update_account_manager_note(note_id: str, payload: dict):
    """Update a note"""
    existing = await db.account_manager_notes.find_one({"_id": ObjectId(note_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")

    updates = {
        "note_type": payload.get("note_type", existing.get("note_type")),
        "title": payload.get("title", existing.get("title")),
        "note": payload.get("note", existing.get("note")),
        "is_pinned": bool(payload.get("is_pinned", existing.get("is_pinned", False))),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.account_manager_notes.update_one({"_id": ObjectId(note_id)}, {"$set": updates})
    updated = await db.account_manager_notes.find_one({"_id": ObjectId(note_id)})
    return serialize_doc(updated)


@router.delete("/{note_id}")
async def delete_account_manager_note(note_id: str):
    """Delete a note"""
    result = await db.account_manager_notes.delete_one({"_id": ObjectId(note_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"deleted": True}
