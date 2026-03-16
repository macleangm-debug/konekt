"""
Marketplace Listing Routes
Unified listing model for both internal and partner products/services
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional

router = APIRouter(prefix="/api/admin/marketplace-listings", tags=["Marketplace Listings"])

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
async def list_marketplace_listings(
    approval_status: Optional[str] = None,
    listing_type: Optional[str] = None,
    country_code: Optional[str] = None,
    category: Optional[str] = None,
):
    """List all marketplace listings with optional filters"""
    query = {}
    if approval_status:
        query["approval_status"] = approval_status
    if listing_type:
        query["listing_type"] = listing_type
    if country_code:
        query["country_code"] = country_code.upper()
    if category:
        query["category"] = category

    docs = await db.marketplace_listings.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{listing_id}")
async def get_marketplace_listing(listing_id: str):
    """Get a specific listing"""
    doc = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Listing not found")
    return serialize_doc(doc)


@router.post("")
async def create_marketplace_listing(payload: dict):
    """Admin creates a marketplace listing (internal or partner)"""
    doc = {
        "source_mode": payload.get("source_mode", "internal"),  # internal | partner | hybrid
        "partner_id": payload.get("partner_id"),
        "listing_type": payload.get("listing_type", "product"),  # product | service
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

        "country_code": payload.get("country_code"),
        "regions": payload.get("regions", []),

        "currency": payload.get("currency", "TZS"),
        "customer_price": float(payload.get("customer_price", 0) or 0),
        "base_partner_price": float(payload.get("base_partner_price", 0) or 0),

        "partner_available_qty": float(payload.get("partner_available_qty", 0) or 0),
        "partner_status": payload.get("partner_status", "in_stock"),
        "lead_time_days": int(payload.get("lead_time_days", 2) or 2),

        "images": payload.get("images", []),
        "hero_image": payload.get("hero_image"),
        "documents": payload.get("documents", []),

        "product_details": payload.get("product_details", {}),
        "service_details": payload.get("service_details", {}),

        "approval_status": payload.get("approval_status", "draft"),
        "is_active": bool(payload.get("is_active", False)),
        "is_featured": bool(payload.get("is_featured", False)),

        "admin_notes": payload.get("admin_notes", ""),
        "rejection_reason": payload.get("rejection_reason", ""),

        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.marketplace_listings.insert_one(doc)
    created = await db.marketplace_listings.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{listing_id}")
async def update_marketplace_listing(listing_id: str, payload: dict):
    """Admin updates a marketplace listing"""
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    allowed = {
        "slug", "name", "short_description", "description", "category", "subcategory", 
        "brand", "tags", "country_code", "regions", "currency", "customer_price", 
        "base_partner_price", "partner_available_qty", "partner_status", "lead_time_days", 
        "images", "hero_image", "documents", "product_details", "service_details", 
        "approval_status", "is_active", "is_featured", "admin_notes", "rejection_reason",
        "product_family", "service_family"
    }

    update_doc = {k: v for k, v in payload.items() if k in allowed}
    update_doc["updated_at"] = datetime.now(timezone.utc)

    # Track status changes
    if "approval_status" in update_doc and update_doc["approval_status"] != listing.get("approval_status"):
        update_doc["status_changed_at"] = datetime.now(timezone.utc)
        if update_doc["approval_status"] == "published":
            update_doc["published_at"] = datetime.now(timezone.utc)
            update_doc["is_active"] = True

    await db.marketplace_listings.update_one({"_id": ObjectId(listing_id)}, {"$set": update_doc})
    updated = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    return serialize_doc(updated)


@router.post("/{listing_id}/approve")
async def approve_listing(listing_id: str, payload: dict = None):
    """Quick approve and optionally publish a listing"""
    payload = payload or {}
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    publish = payload.get("publish", False)
    customer_price = payload.get("customer_price")

    update_doc = {
        "approval_status": "published" if publish else "approved",
        "is_active": publish,
        "updated_at": datetime.now(timezone.utc),
        "approved_at": datetime.now(timezone.utc),
    }

    if publish:
        update_doc["published_at"] = datetime.now(timezone.utc)

    if customer_price is not None:
        update_doc["customer_price"] = float(customer_price)

    await db.marketplace_listings.update_one({"_id": ObjectId(listing_id)}, {"$set": update_doc})
    updated = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    return serialize_doc(updated)


@router.post("/{listing_id}/reject")
async def reject_listing(listing_id: str, payload: dict):
    """Reject a listing with reason"""
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    update_doc = {
        "approval_status": "rejected",
        "rejection_reason": payload.get("reason", ""),
        "is_active": False,
        "updated_at": datetime.now(timezone.utc),
        "rejected_at": datetime.now(timezone.utc),
    }

    await db.marketplace_listings.update_one({"_id": ObjectId(listing_id)}, {"$set": update_doc})
    updated = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    return serialize_doc(updated)


@router.post("/{listing_id}/pause")
async def pause_listing(listing_id: str):
    """Pause a published listing"""
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$set": {
            "approval_status": "paused",
            "is_active": False,
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    updated = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    return serialize_doc(updated)


@router.delete("/{listing_id}")
async def delete_marketplace_listing(listing_id: str):
    """Soft delete a listing"""
    result = await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$set": {"is_active": False, "approval_status": "deleted", "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"message": "Listing deleted"}


@router.get("/stats/summary")
async def get_listing_stats():
    """Get listing statistics"""
    pipeline = [
        {"$group": {"_id": "$approval_status", "count": {"$sum": 1}}}
    ]
    status_counts = {}
    async for row in db.marketplace_listings.aggregate(pipeline):
        status_counts[row["_id"]] = row["count"]

    type_pipeline = [
        {"$group": {"_id": "$listing_type", "count": {"$sum": 1}}}
    ]
    type_counts = {}
    async for row in db.marketplace_listings.aggregate(type_pipeline):
        type_counts[row["_id"]] = row["count"]

    total = await db.marketplace_listings.count_documents({})
    published = await db.marketplace_listings.count_documents({"approval_status": "published", "is_active": True})
    pending = await db.marketplace_listings.count_documents({"approval_status": {"$in": ["submitted", "under_review"]}})

    return {
        "total": total,
        "published": published,
        "pending_review": pending,
        "by_status": status_counts,
        "by_type": type_counts,
    }
