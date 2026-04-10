"""
Vendor Catalog Routes
Vendor-facing endpoints for product submissions.
"""
from fastapi import APIRouter, HTTPException, Request, Header
from typing import Optional
import os, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from services.vendor_product_submission_service import (
    create_submission,
    list_submissions,
)

router = APIRouter(prefix="/api/vendor/catalog", tags=["vendor-catalog"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def _extract_user_id(authorization: str = None):
    """Extract user_id from JWT token."""
    if not authorization:
        return "unknown"
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id", payload.get("sub", "unknown"))
    except Exception:
        return "unknown"


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
async def submit_product(
    payload: VendorSubmissionIn,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Vendor submits a product for admin review."""
    vendor_id = _extract_user_id(authorization)

    # Also try to get vendor/partner name
    vendor_name = ""
    if vendor_id != "unknown":
        user = await db.users.find_one({"id": vendor_id}, {"_id": 0, "name": 1})
        if user:
            vendor_name = user.get("name", "")

    data = payload.dict()
    data["vendor_name"] = vendor_name

    sub = await create_submission(db, data, vendor_id=vendor_id)
    return {"ok": True, "submission": sub}


@router.get("/submissions")
async def get_my_submissions(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Vendor lists their own submissions."""
    vendor_id = _extract_user_id(authorization)
    subs = await list_submissions(db, vendor_id=vendor_id)
    return subs


@router.get("/taxonomy")
async def get_taxonomy_for_vendor():
    """Vendor gets the taxonomy to map their product."""
    from services.catalog_taxonomy_service import get_taxonomy_tree
    return await get_taxonomy_tree(db)
