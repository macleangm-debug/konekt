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


@router.get("/top-revenue")
async def top_revenue_products(limit: int = 50):
    """Get top revenue generating products"""
    pipeline = [
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.sku",
                "name": {"$first": "$items.name"},
                "revenue": {"$sum": {"$multiply": [
                    {"$ifNull": ["$items.quantity", 1]},
                    {"$ifNull": ["$items.unit_price", 0]}
                ]}},
                "orders": {"$sum": 1},
                "quantity": {"$sum": {"$ifNull": ["$items.quantity", 1]}},
            }
        },
        {"$sort": {"revenue": -1}},
        {"$limit": limit},
    ]

    results = []
    async for row in db.orders.aggregate(pipeline):
        results.append({
            "sku": row["_id"],
            "name": row.get("name", ""),
            "revenue": row.get("revenue", 0),
            "orders": row.get("orders", 0),
            "quantity": row.get("quantity", 0),
        })

    return results


@router.get("/repeat-orders")
async def top_repeat_order_products(limit: int = 30):
    """Get products with highest repeat order rates"""
    # Products ordered by multiple different customers
    pipeline = [
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": {"sku": "$items.sku", "customer_id": "$customer_id"},
            }
        },
        {
            "$group": {
                "_id": "$_id.sku",
                "unique_customers": {"$sum": 1},
            }
        },
        {"$sort": {"unique_customers": -1}},
        {"$limit": limit},
    ]

    results = []
    async for row in db.orders.aggregate(pipeline):
        sku = row["_id"]
        # Get product name
        order = await db.orders.find_one({"items.sku": sku})
        name = ""
        if order:
            for item in order.get("items", []):
                if item.get("sku") == sku:
                    name = item.get("name", "")
                    break
        
        results.append({
            "sku": sku,
            "name": name,
            "unique_customers": row.get("unique_customers", 0),
        })

    return results


@router.get("/in-house-opportunity")
async def product_in_house_opportunity(limit: int = 30):
    """Calculate products best suited for in-house production"""
    pipeline = [
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.sku",
                "name": {"$first": "$items.name"},
                "total_orders": {"$sum": 1},
                "total_quantity": {"$sum": {"$ifNull": ["$items.quantity", 1]}},
                "revenue": {"$sum": {"$multiply": [
                    {"$ifNull": ["$items.quantity", 1]},
                    {"$ifNull": ["$items.unit_price", 0]}
                ]}},
            }
        },
        {"$match": {"total_orders": {"$gte": 3}}},  # Only products with enough data
        {"$sort": {"total_orders": -1}},
        {"$limit": limit},
    ]

    results = []
    async for row in db.orders.aggregate(pipeline):
        orders = row.get("total_orders", 0)
        quantity = row.get("total_quantity", 0)
        revenue = row.get("revenue", 0)
        
        # Calculate opportunity score based on volume and frequency
        volume_score = min(quantity / 100, 5)  # Up to 5 points for volume
        frequency_score = min(orders / 10, 5)  # Up to 5 points for frequency
        opportunity_score = round(volume_score + frequency_score, 2)
        
        results.append({
            "sku": row["_id"],
            "name": row.get("name", ""),
            "total_orders": orders,
            "total_quantity": quantity,
            "revenue": revenue,
            "opportunity_score": opportunity_score,
        })

    results.sort(key=lambda x: -x["opportunity_score"])
    return results
