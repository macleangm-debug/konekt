"""
Service Form Template Routes - Admin management of dynamic service forms
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/service-form-templates", tags=["Service Form Templates"])

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
    return doc


@router.get("")
async def list_all_form_templates():
    docs = await db.service_form_templates.find({}).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{service_key}")
async def get_service_form_template(service_key: str):
    doc = await db.service_form_templates.find_one({"service_key": service_key})
    if not doc:
        return {
            "service_key": service_key,
            "sections": [],
            "fields": [],
        }
    return serialize_doc(doc)


@router.post("")
async def create_or_update_service_form_template(payload: dict):
    service_key = payload.get("service_key")

    service = await db.service_types.find_one({"key": service_key})
    if not service:
        raise HTTPException(status_code=404, detail="Service type not found")

    existing = await db.service_form_templates.find_one({"service_key": service_key})

    doc = {
        "service_key": service_key,
        "sections": payload.get("sections", []),
        "fields": payload.get("fields", []),
        "updated_at": datetime.now(timezone.utc),
    }

    if existing:
        await db.service_form_templates.update_one(
            {"_id": existing["_id"]},
            {"$set": doc},
        )
        updated = await db.service_form_templates.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)

    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.service_form_templates.insert_one(doc)
    created = await db.service_form_templates.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/{service_key}")
async def delete_form_template(service_key: str):
    result = await db.service_form_templates.delete_one({"service_key": service_key})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Form template not found")
    return {"deleted": True}
