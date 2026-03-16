"""
Public Country Catalog Routes
Public endpoints for country-aware catalog browsing
"""
from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/public-country", tags=["Public Country Catalog"])

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
    # Hide internal pricing info from public view
    doc.pop("base_partner_price", None)
    doc.pop("partner_id", None)
    return doc


@router.get("/availability/{country_code}")
async def get_country_availability(country_code: str):
    """Get country availability status for routing decisions"""
    config = await db.country_launch_configs.find_one({"country_code": country_code.upper()})
    
    if not config:
        country = await db.countries.find_one({"code": country_code.upper()})
        return {
            "country_code": country_code.upper(),
            "country_name": (country or {}).get("name", country_code.upper()),
            "currency": (country or {}).get("currency"),
            "status": "not_available",
            "waitlist_enabled": True,
            "partner_recruitment_enabled": True,
            "headline": "",
            "message": "",
        }

    return {
        "country_code": config.get("country_code"),
        "country_name": config.get("country_name"),
        "currency": config.get("currency"),
        "status": config.get("status"),
        "waitlist_enabled": config.get("waitlist_enabled", True),
        "partner_recruitment_enabled": config.get("partner_recruitment_enabled", False),
        "headline": config.get("headline", ""),
        "message": config.get("message", ""),
    }


@router.get("/catalog/{country_code}")
async def get_public_country_catalog(country_code: str, category: str = None, limit: int = 100):
    """Get published products for a country"""
    query = {
        "country_code": country_code.upper(),
        "is_active": True,
        "partner_status": {"$ne": "out_of_stock"},
    }
    
    if category:
        query["category"] = category

    # Get from partner_catalog_items that are approved
    docs = await db.partner_catalog_items.find(query).sort("created_at", -1).to_list(length=limit)
    
    results = []
    for doc in docs:
        item = serialize_doc(doc)
        # Calculate display price using country pricing rules
        country_pricing = await db.country_pricing_rules.find_one({
            "country_code": country_code.upper(),
            "category": doc.get("category")
        })
        
        base_price = doc.get("base_partner_price", 0)
        if country_pricing:
            if country_pricing.get("markup_type") == "percentage":
                markup = base_price * (country_pricing.get("markup_value", 0) / 100)
            else:
                markup = country_pricing.get("markup_value", 0)
            tax_rate = country_pricing.get("tax_rate", 0) / 100
            customer_price = (base_price + markup) * (1 + tax_rate)
        else:
            # Default 20% markup
            customer_price = base_price * 1.2
        
        item["customer_price"] = round(customer_price, 2)
        item["currency"] = (country_pricing or {}).get("currency", "TZS")
        results.append(item)

    return results


@router.get("/categories/{country_code}")
async def get_country_categories(country_code: str):
    """Get available categories for a country"""
    pipeline = [
        {"$match": {
            "country_code": country_code.upper(),
            "is_active": True
        }},
        {"$group": {"_id": "$category"}},
        {"$sort": {"_id": 1}}
    ]
    
    categories = []
    async for row in db.partner_catalog_items.aggregate(pipeline):
        if row["_id"]:
            categories.append(row["_id"])
    
    return categories
