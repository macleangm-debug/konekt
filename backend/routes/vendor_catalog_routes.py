"""
Vendor Catalog Routes
Vendor-facing endpoints for product submissions.
"""
from fastapi import APIRouter, HTTPException, Request
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
from services.vendor_product_submission_service import (
    create_submission,
    list_submissions,
)

router = APIRouter(prefix="/api/vendor/catalog", tags=["vendor-catalog"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


class VendorSubmissionIn(BaseModel):
    product_name: str
    description: Optional[str] = ""
    base_cost: float = 0
    currency_code: str = "TZS"
    visibility_mode: str = "request_quote"
    group_id: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    image_url: Optional[str] = ""
    min_quantity: int = 1


@router.post("/submissions")
async def submit_product(payload: VendorSubmissionIn, request: Request):
    """Vendor submits a product for admin review."""
    # Extract vendor_id from JWT
    vendor_id = "unknown"
    try:
        user = getattr(request.state, "user", None)
        if user:
            vendor_id = user.get("id", user.get("user_id", "unknown"))
    except Exception:
        pass

    sub = await create_submission(db, payload.dict(), vendor_id=vendor_id)
    return {"ok": True, "submission": sub}


@router.get("/submissions")
async def get_my_submissions(request: Request):
    """Vendor lists their own submissions."""
    vendor_id = None
    try:
        user = getattr(request.state, "user", None)
        if user:
            vendor_id = user.get("id", user.get("user_id"))
    except Exception:
        pass

    subs = await list_submissions(db, vendor_id=vendor_id)
    return subs


@router.get("/taxonomy")
async def get_taxonomy_for_vendor():
    """Vendor gets the taxonomy to map their product."""
    from services.catalog_taxonomy_service import get_taxonomy_tree
    return await get_taxonomy_tree(db)
