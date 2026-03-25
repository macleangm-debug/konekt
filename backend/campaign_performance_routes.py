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
    campaigns = await db.affiliate_campaigns.find({}).sort("created_at", -1).to_list(length=200)
    
    results = []
    total_clicks = 0
    total_redemptions = 0
    total_revenue = 0.0
    total_discounts = 0.0
    total_commissions = 0.0

    for campaign in campaigns:
        cid = str(campaign["_id"])
        marketing = campaign.get("marketing", {}) or {}
        promo_code = marketing.get("promo_code")

        # Count clicks for this campaign
        clicks = await db.affiliate_clicks.count_documents({"campaign_id": cid})
        if not clicks and promo_code:
            clicks = await db.affiliate_clicks.count_documents({"promo_code": promo_code})

        # Count redemptions from campaign_usages
        redemptions = await db.campaign_usages.count_documents({"campaign_id": cid})

        # Get discount totals from campaign_usages
        discount_cursor = db.campaign_usages.aggregate([
            {"$match": {"campaign_id": cid}},
            {"$group": {"_id": None, "total": {"$sum": "$discount_amount"}}}
        ])
        discount_total = 0
        async for row in discount_cursor:
            discount_total = row.get("total", 0)

        # Get commission totals
        commissions_cursor = db.affiliate_commissions.aggregate([
            {"$match": {"campaign_id": cid}},
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ])
        commissions = 0
        async for row in commissions_cursor:
            commissions = row.get("total", 0)

        # Get order revenue
        order_revenue_cursor = db.orders.aggregate([
            {"$match": {"campaign_id": cid}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ])
        revenue = 0
        async for row in order_revenue_cursor:
            revenue = row.get("total", 0)
        
        # Also check invoices for campaign revenue
        invoice_revenue_cursor = db.invoices.aggregate([
            {"$match": {"campaign_id": cid}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ])
        async for row in invoice_revenue_cursor:
            revenue += row.get("total", 0)

        # Calculate conversion rate
        conversion_rate = (redemptions / clicks * 100) if clicks > 0 else 0

        # Determine if campaign is currently active
        now = datetime.utcnow()
        start_date = campaign.get("start_date")
        end_date = campaign.get("end_date")
        is_active = (
            bool(campaign.get("is_active")) and
            start_date is not None and
            end_date is not None and
            start_date <= now <= end_date
        )

        results.append({
            "campaign_id": cid,
            "name": campaign.get("name"),
            "headline": campaign.get("headline"),
            "channel": campaign.get("channel"),
            "promo_code": promo_code,
            "is_active": is_active,
            "clicks": clicks,
            "redemptions": redemptions,
            "revenue": revenue,
            "discounts": discount_total,
            "commissions": commissions,
            "conversion_rate": round(conversion_rate, 2),
        })

        total_clicks += clicks
        total_redemptions += redemptions
        total_revenue += revenue
        total_discounts += discount_total
        total_commissions += commissions

    return {
        "campaigns": results,
        "totals": {
            "clicks": total_clicks,
            "redemptions": total_redemptions,
            "revenue": total_revenue,
            "discounts": total_discounts,
            "commissions": total_commissions,
            "conversion_rate": round((total_redemptions / total_clicks * 100), 2) if total_clicks > 0 else 0,
        },
    }
