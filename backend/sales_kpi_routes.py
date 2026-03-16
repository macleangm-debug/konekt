"""
Sales KPI Routes
Sales performance metrics and conversion tracking
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/sales-kpis", tags=["Sales KPIs"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/summary")
async def sales_summary():
    """Get sales KPIs summary"""
    lead_count = await db.crm_leads.count_documents({})
    won_count = await db.crm_leads.count_documents({"stage": "won"})
    lost_count = await db.crm_leads.count_documents({"stage": "lost"})
    quote_count = await db.quotes_v2.count_documents({})

    invoice_cursor = db.invoices_v2.aggregate([
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ])
    total_revenue = 0
    async for row in invoice_cursor:
        total_revenue = row.get("total", 0)

    conversion_rate = (won_count / lead_count * 100) if lead_count else 0

    return {
        "lead_count": lead_count,
        "won_count": won_count,
        "lost_count": lost_count,
        "quote_count": quote_count,
        "total_revenue": total_revenue,
        "conversion_rate": round(conversion_rate, 2),
    }
