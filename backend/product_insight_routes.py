"""
Product Insight Routes - Analytics for fast-moving products and services
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/product-insights", tags=["Product Insights"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/fast-moving")
async def fast_moving_products(limit: int = 50):
    """Get the most ordered products by quantity"""
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.sku",
            "name": {"$first": "$items.name"},
            "total_qty": {"$sum": "$items.quantity"},
            "total_orders": {"$sum": 1},
            "revenue": {"$sum": {"$multiply": ["$items.quantity", "$items.unit_price"]}},
        }},
        {"$sort": {"total_qty": -1}},
        {"$limit": limit},
    ]

    results = []
    async for row in db.orders.aggregate(pipeline):
        results.append({
            "sku": row["_id"],
            "name": row.get("name", ""),
            "total_qty": row.get("total_qty", 0),
            "total_orders": row.get("total_orders", 0),
            "revenue": row.get("revenue", 0),
        })

    return results


@router.get("/high-margin")
async def high_margin_products(limit: int = 50):
    """Get products with highest profit margin"""
    # Get products with both partner cost and customer price
    pipeline = [
        {"$match": {"base_partner_price": {"$exists": True, "$gt": 0}}},
        {"$addFields": {
            "margin": {
                "$subtract": [
                    {"$ifNull": ["$customer_price", 0]},
                    {"$ifNull": ["$base_partner_price", 0]}
                ]
            },
            "margin_percent": {
                "$cond": {
                    "if": {"$gt": ["$base_partner_price", 0]},
                    "then": {
                        "$multiply": [
                            {"$divide": [
                                {"$subtract": ["$customer_price", "$base_partner_price"]},
                                "$base_partner_price"
                            ]},
                            100
                        ]
                    },
                    "else": 0
                }
            }
        }},
        {"$sort": {"margin_percent": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "id": {"$toString": "$_id"},
            "sku": 1,
            "name": 1,
            "base_partner_price": 1,
            "customer_price": 1,
            "margin": 1,
            "margin_percent": {"$round": ["$margin_percent", 2]},
        }}
    ]

    results = []
    async for row in db.marketplace_listings.aggregate(pipeline):
        results.append(row)

    return results


@router.get("/service-demand")
async def service_demand(limit: int = 20):
    """Get most requested services"""
    pipeline = [
        {"$group": {
            "_id": "$service_key",
            "service_name": {"$first": "$service_name"},
            "total_requests": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "pending": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
        }},
        {"$sort": {"total_requests": -1}},
        {"$limit": limit},
    ]

    results = []
    async for row in db.service_requests.aggregate(pipeline):
        results.append({
            "service_key": row["_id"],
            "service_name": row.get("service_name", ""),
            "total_requests": row.get("total_requests", 0),
            "completed": row.get("completed", 0),
            "pending": row.get("pending", 0),
        })

    return results


@router.get("/partner-performance")
async def partner_performance_summary(limit: int = 20):
    """Get partner performance rankings"""
    docs = await db.partner_performance.find({}).sort("completion_rate", -1).to_list(length=limit)
    
    results = []
    for doc in docs:
        results.append({
            "partner_id": doc.get("partner_id"),
            "total_assignments": doc.get("total_assignments_90d", 0),
            "completed": doc.get("completed_assignments_90d", 0),
            "completion_rate": doc.get("completion_rate", 0),
            "avg_delay_days": doc.get("avg_delay_days", 0),
        })

    return results


@router.get("/regional-demand")
async def regional_demand():
    """Get demand by country and region"""
    pipeline = [
        {"$group": {
            "_id": {
                "country": "$country_code",
                "region": "$region",
            },
            "total_orders": {"$sum": 1},
            "total_revenue": {"$sum": "$total"},
        }},
        {"$sort": {"total_revenue": -1}},
        {"$limit": 50},
    ]

    results = []
    async for row in db.orders.aggregate(pipeline):
        results.append({
            "country_code": row["_id"].get("country"),
            "region": row["_id"].get("region"),
            "total_orders": row.get("total_orders", 0),
            "total_revenue": row.get("total_revenue", 0),
        })

    return results
