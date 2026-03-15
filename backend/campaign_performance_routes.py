"""
Campaign Performance Routes
Provides metrics for admin dashboard - clicks, redemptions, revenue, commissions
"""
from datetime import datetime
from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/campaign-performance", tags=["Campaign Performance"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/summary")
async def campaign_performance_summary():
    """Get campaign performance metrics for admin dashboard"""
    now = datetime.utcnow()
    campaigns = await db.affiliate_campaigns.find({}).sort("created_at", -1).to_list(length=100)
    
    rows = []
    total_clicks = 0
    total_redemptions = 0
    total_revenue = 0.0
    total_commissions = 0.0

    for campaign in campaigns:
        campaign_id = str(campaign["_id"])
        marketing = campaign.get("marketing", {}) or {}
        promo_code = marketing.get("promo_code")

        # Count clicks for this campaign's promo code
        clicks = 0
        if promo_code:
            clicks = await db.affiliate_clicks.count_documents({"promo_code": promo_code})

        # Count redemptions from orders and invoices
        order_docs = await db.orders.find({"campaign_id": campaign_id}).to_list(length=500)
        invoice_docs = await db.invoices_v2.find({"campaign_id": campaign_id}).to_list(length=500)
        
        # Get commissions related to these documents
        commission_docs = []
        if invoice_docs:
            invoice_ids = [str(doc["_id"]) for doc in invoice_docs]
            commission_docs = await db.affiliate_commissions.find({
                "source_document_id": {"$in": invoice_ids}
            }).to_list(length=500)

        redemption_count = len(order_docs) + len(invoice_docs)
        revenue = (
            sum(float(doc.get("total", 0) or 0) for doc in order_docs) + 
            sum(float(doc.get("total", 0) or 0) for doc in invoice_docs)
        )
        commissions = sum(float(doc.get("commission_amount", 0) or 0) for doc in commission_docs)

        # Determine if campaign is currently active
        start_date = campaign.get("start_date")
        end_date = campaign.get("end_date")
        active = (
            bool(campaign.get("is_active")) and 
            start_date is not None and 
            end_date is not None and 
            start_date <= now <= end_date
        )

        rows.append({
            "id": campaign_id,
            "name": campaign.get("name"),
            "headline": campaign.get("headline"),
            "channel": campaign.get("channel"),
            "promo_code": promo_code,
            "is_active": active,
            "clicks": clicks,
            "redemptions": redemption_count,
            "revenue": revenue,
            "commissions": commissions,
            "conversion_rate": round((redemption_count / clicks * 100), 2) if clicks > 0 else 0,
        })

        total_clicks += clicks
        total_redemptions += redemption_count
        total_revenue += revenue
        total_commissions += commissions

    return {
        "campaigns": rows,
        "totals": {
            "clicks": total_clicks,
            "redemptions": total_redemptions,
            "revenue": total_revenue,
            "commissions": total_commissions,
            "conversion_rate": round((total_redemptions / total_clicks * 100), 2) if total_clicks > 0 else 0,
        },
    }
