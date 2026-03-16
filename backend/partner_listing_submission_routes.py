"""
Partner Listing Submission Routes
Partners submit listings for admin review and approval
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional

from partner_access_service import get_partner_user_from_header

router = APIRouter(prefix="/api/partner-listings", tags=["Partner Listings"])

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
        if isinstance(value, ObjectId):
            doc[key] = str(value)
    return doc


@router.get("")
async def my_partner_listings(
    approval_status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Get partner's own listings"""
    user = await get_partner_user_from_header(authorization)

    query = {"partner_id": user["partner_id"]}
    if approval_status:
        query["approval_status"] = approval_status

    docs = await db.marketplace_listings.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{listing_id}")
async def get_partner_listing(listing_id: str, authorization: Optional[str] = Header(None)):
    """Get a specific listing owned by the partner"""
    user = await get_partner_user_from_header(authorization)

    doc = await db.marketplace_listings.find_one({
        "_id": ObjectId(listing_id),
        "partner_id": user["partner_id"]
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Listing not found")
    return serialize_doc(doc)


@router.post("")
async def create_partner_listing(payload: dict, authorization: Optional[str] = Header(None)):
    """Partner creates a new listing (submitted for review)"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    # Get partner info
    partner = await db.partners.find_one({"_id": ObjectId(partner_id)})

    doc = {
        "source_mode": "partner",
        "partner_id": partner_id,
        "partner_name": partner.get("name") if partner else None,
        "listing_type": payload.get("listing_type", "product"),
        "product_family": payload.get("product_family"),
        "service_family": payload.get("service_family"),

        "sku": payload.get("sku"),
        "slug": payload.get("slug"),
        "name": payload.get("name"),
        "short_description": payload.get("short_description", ""),
        "description": payload.get("description", ""),
        "category": payload.get("category"),
        "subcategory": payload.get("subcategory"),
        "brand": payload.get("brand"),
        "tags": payload.get("tags", []),

        "country_code": payload.get("country_code") or (partner.get("country_code") if partner else None),
        "regions": payload.get("regions") or (partner.get("regions", []) if partner else []),

        "currency": payload.get("currency", "TZS"),
        "base_partner_price": float(payload.get("base_partner_price", 0) or 0),
        "customer_price": 0,  # Admin sets final price

        "partner_available_qty": float(payload.get("partner_available_qty", 0) or 0),
        "partner_status": payload.get("partner_status", "in_stock"),
        "lead_time_days": int(payload.get("lead_time_days", 2) or 2),

        "images": payload.get("images", []),
        "hero_image": payload.get("hero_image") or (payload.get("images", []) or [None])[0],
        "documents": payload.get("documents", []),

        "product_details": payload.get("product_details", {}),
        "service_details": payload.get("service_details", {}),

        "approval_status": "submitted",
        "is_active": False,

        "submitted_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    # Validate required fields
    if not doc["sku"] or not doc["name"]:
        raise HTTPException(status_code=400, detail="SKU and name are required")

    # Check for duplicate SKU
    existing = await db.marketplace_listings.find_one({"sku": doc["sku"]})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    result = await db.marketplace_listings.insert_one(doc)
    created = await db.marketplace_listings.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{listing_id}")
async def update_partner_listing(listing_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    """Partner updates their listing (only allowed for draft/submitted/rejected)"""
    user = await get_partner_user_from_header(authorization)

    listing = await db.marketplace_listings.find_one({
        "_id": ObjectId(listing_id),
        "partner_id": user["partner_id"]
    })
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Only allow editing if not yet approved/published
    if listing.get("approval_status") in ["approved", "published"]:
        raise HTTPException(status_code=400, detail="Cannot edit approved/published listings. Contact admin.")

    allowed = {
        "slug", "name", "short_description", "description", "category", "subcategory",
        "brand", "tags", "regions", "base_partner_price", "partner_available_qty",
        "partner_status", "lead_time_days", "images", "hero_image", "documents",
        "product_details", "service_details", "product_family", "service_family"
    }

    update_doc = {k: v for k, v in payload.items() if k in allowed}
    update_doc["updated_at"] = datetime.now(timezone.utc)

    await db.marketplace_listings.update_one({"_id": ObjectId(listing_id)}, {"$set": update_doc})
    updated = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    return serialize_doc(updated)


@router.post("/{listing_id}/submit")
async def submit_listing_for_review(listing_id: str, authorization: Optional[str] = Header(None)):
    """Submit a draft listing for review"""
    user = await get_partner_user_from_header(authorization)

    listing = await db.marketplace_listings.find_one({
        "_id": ObjectId(listing_id),
        "partner_id": user["partner_id"]
    })
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.get("approval_status") not in ["draft", "rejected"]:
        raise HTTPException(status_code=400, detail="Only draft or rejected listings can be submitted")

    await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$set": {
            "approval_status": "submitted",
            "submitted_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    updated = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    return serialize_doc(updated)


@router.delete("/{listing_id}")
async def delete_partner_listing(listing_id: str, authorization: Optional[str] = Header(None)):
    """Partner deletes their unpublished listing"""
    user = await get_partner_user_from_header(authorization)

    listing = await db.marketplace_listings.find_one({
        "_id": ObjectId(listing_id),
        "partner_id": user["partner_id"]
    })
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.get("approval_status") == "published":
        raise HTTPException(status_code=400, detail="Cannot delete published listings. Contact admin.")

    await db.marketplace_listings.delete_one({"_id": ObjectId(listing_id)})
    return {"message": "Listing deleted"}


@router.get("/stats/my-summary")
async def get_my_listing_stats(authorization: Optional[str] = Header(None)):
    """Get partner's listing statistics"""
    user = await get_partner_user_from_header(authorization)

    pipeline = [
        {"$match": {"partner_id": user["partner_id"]}},
        {"$group": {"_id": "$approval_status", "count": {"$sum": 1}}}
    ]
    status_counts = {}
    async for row in db.marketplace_listings.aggregate(pipeline):
        status_counts[row["_id"] or "unknown"] = row["count"]

    total = await db.marketplace_listings.count_documents({"partner_id": user["partner_id"]})
    published = await db.marketplace_listings.count_documents({
        "partner_id": user["partner_id"],
        "approval_status": "published",
        "is_active": True
    })

    return {
        "total": total,
        "published": published,
        "by_status": status_counts,
    }
