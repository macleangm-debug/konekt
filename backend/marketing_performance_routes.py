"""
Marketing Performance Routes
Source tracking and lead-to-win performance
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/marketing-performance", tags=["Marketing Performance"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/sources")
async def marketing_source_summary():
    """Get marketing performance by source"""
    leads_cursor = db.crm_leads.aggregate([
        {"$group": {"_id": "$source", "leads": {"$sum": 1}}}
    ])

    by_source = {}
    async for row in leads_cursor:
        by_source[row["_id"] or "unknown"] = {
            "leads": row["leads"],
            "quotes": 0,
            "won": 0,
        }

    won_cursor = db.crm_leads.aggregate([
        {"$match": {"stage": "won"}},
        {"$group": {"_id": "$source", "won": {"$sum": 1}}}
    ])
    async for row in won_cursor:
        key = row["_id"] or "unknown"
        by_source.setdefault(key, {"leads": 0, "quotes": 0, "won": 0})
        by_source[key]["won"] = row["won"]

    quote_cursor = db.crm_leads.aggregate([
        {"$match": {"stage": "quote_sent"}},
        {"$group": {"_id": "$source", "quotes": {"$sum": 1}}}
    ])
    async for row in quote_cursor:
        key = row["_id"] or "unknown"
        by_source.setdefault(key, {"leads": 0, "quotes": 0, "won": 0})
        by_source[key]["quotes"] = row["quotes"]

    return by_source
