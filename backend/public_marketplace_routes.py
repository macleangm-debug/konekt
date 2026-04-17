"""
Public Marketplace Routes
Customer-facing catalog with related items and recommendations
"""
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional, List
from services.product_promotion_enrichment import enrich_product_with_promotion, enrich_products_batch

router = APIRouter(prefix="/api/public-marketplace", tags=["Public Marketplace"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_public_doc(doc):
    """Serialize document and hide internal fields from public view"""
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    # Hide internal pricing and partner info from public
    doc.pop("partner_id", None)
    doc.pop("partner_name", None)
    doc.pop("base_partner_price", None)
    doc.pop("admin_notes", None)
    doc.pop("rejection_reason", None)
    return doc


@router.get("/listing/{slug}")
async def get_public_listing(slug: str):
    """Get a public listing by slug, with fallback to products collection by ID."""
    listing = await db.marketplace_listings.find_one({
        "slug": slug,
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
    })

    # Fallback: try products collection by ID (browse page uses product IDs)
    if not listing:
        product = None
        try:
            product = await db.products.find_one({"_id": ObjectId(slug)})
        except Exception:
            pass
        if not product:
            product = await db.products.find_one({"id": slug})
        if not product:
            product = await db.products.find_one({"slug": slug})
        if product:
            product["id"] = str(product["_id"])
            del product["_id"]
            # Strip vendor internals for public view
            product.pop("vendor_id", None)
            product.pop("vendor_name", None)
            product.pop("vendor_product_code", None)
            product.pop("source_submission_id", None)
            product.pop("partner_id", None)
            product.pop("partner_name", None)
            product.pop("base_partner_price", None)
            product.pop("admin_notes", None)
            category = product.get("category_name") or product.get("category") or product.get("group_name", "")
            # Get related products from same category
            related_q = {"category_name": category} if category else {}
            related_products = []
            async for rp in db.products.find({**related_q, "id": {"$ne": product.get("id")}}).sort("created_at", -1).limit(8):
                related_products.append(serialize_public_doc(rp))
            # Enrich with active promotions
            product = await enrich_product_with_promotion(product, db=db)
            related_products = await enrich_products_batch(related_products, db=db)
            # Enrich with related_services from category config
            cat_config = await db.catalog_categories.find_one({"name": category})
            if cat_config and cat_config.get("related_services"):
                product["related_services"] = cat_config["related_services"]
            return {
                "listing": product,
                "related": related_products,
                "suggestions": [],
                "similar_type": [],
            }
        raise HTTPException(status_code=404, detail="Listing not found")

    category = listing.get("category")
    country_code = listing.get("country_code")
    listing_id = listing["_id"]
    listing_type = listing.get("listing_type")

    # Get related items (same category + country)
    related_cursor = db.marketplace_listings.find({
        "_id": {"$ne": listing_id},
        "category": category,
        "country_code": country_code,
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
    }).sort("created_at", -1).limit(8)
    related = await related_cursor.to_list(length=8)

    # Get "You might also like" (same country, different category)
    suggestions_cursor = db.marketplace_listings.find({
        "_id": {"$ne": listing_id},
        "category": {"$ne": category},
        "country_code": country_code,
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
    }).sort("created_at", -1).limit(8)
    suggestions = await suggestions_cursor.to_list(length=8)

    # Get similar type items
    similar_type_cursor = db.marketplace_listings.find({
        "_id": {"$ne": listing_id},
        "listing_type": listing_type,
        "country_code": country_code,
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
    }).sort("created_at", -1).limit(4)
    similar_type = await similar_type_cursor.to_list(length=4)

    # Enrich listing + related with promotions
    main_listing = serialize_public_doc(listing)
    main_listing = await enrich_product_with_promotion(main_listing, db=db)
    enriched_related = await enrich_products_batch([serialize_public_doc(x) for x in related], db=db)
    enriched_suggestions = await enrich_products_batch([serialize_public_doc(x) for x in suggestions], db=db)

    # Enrich with related_services from category config
    cat_config = await db.catalog_categories.find_one({"name": category})
    if cat_config and cat_config.get("related_services"):
        main_listing["related_services"] = cat_config["related_services"]

    return {
        "listing": main_listing,
        "related_items": enriched_related,
        "you_might_also_like": enriched_suggestions,
        "similar_type": [serialize_public_doc(x) for x in similar_type],
    }


@router.get("/listing/by-id/{listing_id}")
async def get_public_listing_by_id(listing_id: str):
    """Get a public listing by ID"""
    listing = await db.marketplace_listings.find_one({
        "_id": ObjectId(listing_id),
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
    })

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    return serialize_public_doc(listing)


@router.get("/country/{country_code}")
async def get_public_country_listings(
    country_code: str,
    category: Optional[str] = None,
    listing_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Get published listings for a country"""
    query = {
        "country_code": country_code.upper(),
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
    }
    if category:
        query["category"] = category
    if listing_type:
        query["listing_type"] = listing_type

    total = await db.marketplace_listings.count_documents(query)
    docs = await db.marketplace_listings.find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
    enriched = await enrich_products_batch([serialize_public_doc(doc) for doc in docs], db=db)

    return {
        "total": total,
        "items": enriched,
        "limit": limit,
        "offset": offset,
    }


@router.get("/categories/{country_code}")
async def get_country_categories(country_code: str):
    """Get available categories for a country"""
    pipeline = [
        {"$match": {
            "country_code": country_code.upper(),
            "approval_status": {"$in": ["approved", "published"]},
            "is_active": True
        }},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]

    categories = []
    async for row in db.marketplace_listings.aggregate(pipeline):
        if row["_id"]:
            categories.append({
                "name": row["_id"],
                "count": row["count"]
            })

    return categories


@router.get("/featured/{country_code}")
async def get_featured_listings(country_code: str, limit: int = 12):
    """Get featured listings for a country"""
    docs = await db.marketplace_listings.find({
        "country_code": country_code.upper(),
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
        "is_featured": True,
    }).sort("published_at", -1).limit(limit).to_list(length=limit)

    return [serialize_public_doc(doc) for doc in docs]


@router.get("/search")
async def search_listings(
    q: str,
    country_code: Optional[str] = None,
    category: Optional[str] = None,
    listing_type: Optional[str] = None,
    limit: int = 50,
):
    """Search public listings"""
    query = {
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"short_description": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    }

    if country_code:
        query["country_code"] = country_code.upper()
    if category:
        query["category"] = category
    if listing_type:
        query["listing_type"] = listing_type

    docs = await db.marketplace_listings.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)
    return [serialize_public_doc(doc) for doc in docs]


@router.get("/new-arrivals/{country_code}")
async def get_new_arrivals(country_code: str, limit: int = 12):
    """Get recently published listings"""
    docs = await db.marketplace_listings.find({
        "country_code": country_code.upper(),
        "approval_status": {"$in": ["approved", "published"]},
        "is_active": True,
    }).sort("published_at", -1).limit(limit).to_list(length=limit)

    return [serialize_public_doc(doc) for doc in docs]
