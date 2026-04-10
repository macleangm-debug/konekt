"""
Pipeline Intelligence Routes
Exposes conversion metrics, stale deals, and rep performance.
No new CRM — extends existing endpoints.
"""
import os
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from services.pipeline_intelligence_service import (
    detect_stale_deals,
    get_conversion_metrics,
    get_rep_conversion_stats,
)

router = APIRouter(prefix="/api/admin/pipeline", tags=["Pipeline Intelligence"])

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "konekt_db")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/conversion-metrics")
async def conversion_metrics():
    """Stage-by-stage conversion funnel with win rate and avg close time."""
    return await get_conversion_metrics(db)


@router.get("/stale-deals")
async def stale_deals():
    """Deals inactive beyond their stage threshold."""
    deals = await detect_stale_deals(db)
    return {"stale_deals": deals, "count": len(deals)}


@router.get("/rep-performance")
async def rep_performance():
    """Per-rep conversion stats (win rate, not just activity)."""
    stats = await get_rep_conversion_stats(db)
    return {"reps": stats}
