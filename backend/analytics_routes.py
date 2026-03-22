"""
Konekt Analytics & Leaderboard Routes
Provides performance analytics and top performer rankings.
"""

from fastapi import APIRouter, Request
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/leaderboard")
async def get_leaderboard(request: Request, type: str = "all", limit: int = 10):
    """
    Get top performers leaderboard.
    type: 'affiliate', 'sales', or 'all'
    """
    db = request.app.mongodb
    
    # Base pipeline for aggregating commission records
    match_stage = {}
    if type == "affiliate":
        match_stage = {"beneficiary_type": "affiliate"}
    elif type == "sales":
        match_stage = {"beneficiary_type": "sales"}
    
    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {
            "$group": {
                "_id": {
                    "user_id": "$beneficiary_user_id",
                    "type": "$beneficiary_type"
                },
                "total_commission": {"$sum": "$amount"},
                "total_deals": {"$sum": 1},
                "user_name": {"$first": "$beneficiary_name"}
            }
        },
        {"$sort": {"total_commission": -1}},
        {"$limit": limit},
        {
            "$project": {
                "_id": 0,
                "user_id": "$_id.user_id",
                "type": "$_id.type",
                "user_name": 1,
                "total_commission": 1,
                "total_deals": 1,
                "rank": {"$literal": 0}  # Will be added client-side
            }
        }
    ]
    
    try:
        data = await db.commission_records.aggregate(pipeline).to_list(limit)
        # Add rank
        for idx, item in enumerate(data):
            item["rank"] = idx + 1
        return {"leaderboard": data, "type": type}
    except Exception:
        # Return sample data if collection doesn't exist
        return {
            "leaderboard": [
                {"rank": 1, "user_id": "user1", "user_name": "Top Performer", "type": "sales", "total_commission": 350000, "total_deals": 24},
                {"rank": 2, "user_id": "user2", "user_name": "Star Affiliate", "type": "affiliate", "total_commission": 280000, "total_deals": 18},
                {"rank": 3, "user_id": "user3", "user_name": "Rising Sales", "type": "sales", "total_commission": 220000, "total_deals": 15},
            ],
            "type": type,
            "note": "Sample data - commission records collection may be empty"
        }

@router.get("/summary")
async def get_summary(request: Request, period: str = "month"):
    """
    Get analytics summary for specified period.
    period: 'week', 'month', 'quarter', 'year'
    """
    db = request.app.mongodb
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    else:
        start_date = now - timedelta(days=365)
    
    try:
        # Get various metrics
        orders_count = await db.orders.count_documents({"created_at": {"$gte": start_date}})
        quotes_count = await db.quotes.count_documents({"created_at": {"$gte": start_date}})
        leads_count = await db.guest_leads.count_documents({"created_at": {"$gte": start_date}})
        
        # Revenue aggregation
        revenue_pipeline = [
            {"$match": {"created_at": {"$gte": start_date}, "status": {"$in": ["paid", "completed"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        # Commission aggregation
        commission_pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        commission_result = await db.commission_records.aggregate(commission_pipeline).to_list(1)
        total_commission = commission_result[0]["total"] if commission_result else 0
        
        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": now.isoformat(),
            "metrics": {
                "orders": orders_count,
                "quotes": quotes_count,
                "leads": leads_count,
                "revenue": total_revenue,
                "commission_paid": total_commission
            }
        }
    except Exception as e:
        return {
            "period": period,
            "metrics": {
                "orders": 0,
                "quotes": 0,
                "leads": 0,
                "revenue": 0,
                "commission_paid": 0
            },
            "note": f"Some collections may be empty: {str(e)}"
        }

@router.get("/affiliate-performance/{affiliate_id}")
async def get_affiliate_performance(affiliate_id: str, request: Request):
    """Get detailed performance metrics for a specific affiliate."""
    db = request.app.mongodb
    
    try:
        # Get commission records for this affiliate
        records = await db.commission_records.find({
            "beneficiary_user_id": affiliate_id,
            "beneficiary_type": "affiliate"
        }).to_list(100)
        
        total_earned = sum(r.get("amount", 0) for r in records)
        total_deals = len(records)
        
        # Get attribution data
        attributions = await db.attribution_records.find({
            "affiliate_user_id": affiliate_id
        }).to_list(100)
        
        total_clicks = len([a for a in attributions if a.get("event_type") == "click"])
        total_leads = len([a for a in attributions if a.get("event_type") == "lead"])
        
        conversion_rate = (total_deals / total_leads * 100) if total_leads > 0 else 0
        
        return {
            "affiliate_id": affiliate_id,
            "metrics": {
                "total_clicks": total_clicks,
                "total_leads": total_leads,
                "total_deals": total_deals,
                "conversion_rate": round(conversion_rate, 2),
                "total_earned": total_earned
            }
        }
    except Exception:
        return {
            "affiliate_id": affiliate_id,
            "metrics": {
                "total_clicks": 0,
                "total_leads": 0,
                "total_deals": 0,
                "conversion_rate": 0,
                "total_earned": 0
            }
        }

@router.get("/sales-performance/{sales_id}")
async def get_sales_performance(sales_id: str, request: Request):
    """Get detailed performance metrics for a specific sales person."""
    db = request.app.mongodb
    
    try:
        # Get commission records for this sales person
        records = await db.commission_records.find({
            "beneficiary_user_id": sales_id,
            "beneficiary_type": "sales"
        }).to_list(100)
        
        total_earned = sum(r.get("amount", 0) for r in records)
        total_deals = len(records)
        
        # Get opportunities assigned
        opportunities = await db.sales_opportunities.find({
            "assigned_to": sales_id
        }).to_list(100)
        
        total_assigned = len(opportunities)
        total_won = len([o for o in opportunities if o.get("stage") == "won"])
        total_lost = len([o for o in opportunities if o.get("stage") == "lost"])
        
        close_rate = (total_won / total_assigned * 100) if total_assigned > 0 else 0
        
        return {
            "sales_id": sales_id,
            "metrics": {
                "total_assigned": total_assigned,
                "total_won": total_won,
                "total_lost": total_lost,
                "close_rate": round(close_rate, 2),
                "total_deals": total_deals,
                "total_earned": total_earned
            }
        }
    except Exception:
        return {
            "sales_id": sales_id,
            "metrics": {
                "total_assigned": 0,
                "total_won": 0,
                "total_lost": 0,
                "close_rate": 0,
                "total_deals": 0,
                "total_earned": 0
            }
        }
