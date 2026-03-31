"""
Vendor Capability Routes
Admin endpoints for assigning vendor expertise by taxonomy.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from uuid import uuid4

router = APIRouter(prefix="/api/admin/vendor-capabilities", tags=["vendor-capabilities"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "konekt")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class VendorCapabilityIn(BaseModel):
    vendor_id: str
    capability_type: str = "both"
    group_ids: List[str] = []
    category_ids: List[str] = []
    subcategory_ids: List[str] = []


@router.get("/assignment/vendors")
async def list_vendors_for_assignment():
    """List all vendor/partner users for capability assignment"""
    vendors = []
    cursor = db.users.find(
        {"role": {"$in": ["vendor", "partner"]}},
        {"_id": 0, "password_hash": 0}
    )
    async for doc in cursor:
        vendors.append({
            "id": doc.get("id", ""),
            "full_name": doc.get("full_name", ""),
            "company": doc.get("company_name", doc.get("company", "")),
            "email": doc.get("email", ""),
        })
    return vendors


@router.get("/assignment/{vendor_id}")
async def get_vendor_capabilities(vendor_id: str):
    doc = await db.vendor_capabilities.find_one({"vendor_id": vendor_id}, {"_id": 0})
    return doc or {}


@router.post("/assignment")
async def set_vendor_capabilities(payload: VendorCapabilityIn):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "vendor_id": payload.vendor_id,
        "capability_type": payload.capability_type,
        "group_ids": payload.group_ids,
        "category_ids": payload.category_ids,
        "subcategory_ids": payload.subcategory_ids,
        "updated_at": now,
    }
    existing = await db.vendor_capabilities.find_one({"vendor_id": payload.vendor_id})
    if existing:
        await db.vendor_capabilities.update_one(
            {"vendor_id": payload.vendor_id}, {"$set": doc}
        )
    else:
        doc["id"] = str(uuid4())
        doc["created_at"] = now
        await db.vendor_capabilities.insert_one(doc)

    result = await db.vendor_capabilities.find_one(
        {"vendor_id": payload.vendor_id}, {"_id": 0}
    )
    return result
