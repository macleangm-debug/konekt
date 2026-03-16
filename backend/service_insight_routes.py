"""
Service Insight Routes - Service demand and conversion analytics
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/service-insights", tags=["Service Insights"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/demand")
async def service_demand_summary(limit: int = 20):
    """Get service demand summary"""
    pipeline = [
        {
            "$group": {
                "_id": "$service_key",
                "service_name": {"$first": "$service_name"},
                "total_requests": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                "pending": {"$sum": {"$cond": [{"$in": ["$status", ["new", "pending", "in_progress"]]}, 1, 0]}},
            }
        },
        {"$sort": {"total_requests": -1}},
        {"$limit": limit},
    ]

    rows = []
    async for row in db.service_requests.aggregate(pipeline):
        rows.append({
            "service_key": row["_id"],
            "service_name": row.get("service_name", row["_id"]),
            "total_requests": row.get("total_requests", 0),
            "completed": row.get("completed", 0),
            "pending": row.get("pending", 0),
        })

    return rows


@router.get("/conversion")
async def service_conversion_insights(limit: int = 30):
    """Get service conversion funnel analytics"""
    pipeline = [
        {
            "$group": {
                "_id": "$service_key",
                "service_name": {"$first": "$service_name"},
                "requests": {"$sum": 1},
                "quoted": {
                    "$sum": {"$cond": [{"$in": ["$status", ["quoted", "approved", "in_progress", "completed"]]}, 1, 0]}
                },
                "approved": {
                    "$sum": {"$cond": [{"$in": ["$status", ["approved", "in_progress", "completed"]]}, 1, 0]}
                },
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                },
            }
        },
        {"$sort": {"requests": -1}},
        {"$limit": limit},
    ]

    rows = []
    async for row in db.service_requests.aggregate(pipeline):
        requests = row.get("requests", 0)
        quoted = row.get("quoted", 0)
        approved = row.get("approved", 0)
        completed = row.get("completed", 0)
        
        rows.append({
            "service_key": row["_id"],
            "service_name": row.get("service_name", row["_id"]),
            "requests": requests,
            "quoted": quoted,
            "approved": approved,
            "completed": completed,
            "quote_rate": round((quoted / requests) * 100, 2) if requests else 0,
            "approval_rate": round((approved / quoted) * 100, 2) if quoted else 0,
            "completion_rate": round((completed / requests) * 100, 2) if requests else 0,
        })

    return rows


@router.get("/delays")
async def services_with_delays(limit: int = 20):
    """Get services with most delays"""
    pipeline = [
        {
            "$match": {
                "status": {"$in": ["delayed", "issue_reported"]},
            }
        },
        {
            "$group": {
                "_id": "$service_key",
                "service_name": {"$first": "$service_name"},
                "delayed_count": {"$sum": 1},
            }
        },
        {"$sort": {"delayed_count": -1}},
        {"$limit": limit},
    ]

    rows = []
    async for row in db.service_requests.aggregate(pipeline):
        rows.append({
            "service_key": row["_id"],
            "service_name": row.get("service_name", row["_id"]),
            "delayed_count": row.get("delayed_count", 0),
        })

    return rows


@router.get("/partner-coverage")
async def services_needing_partners():
    """Identify services that need more partner coverage"""
    # Get all active service types
    service_types = await db.service_types.find({"is_active": True}).to_list(length=200)
    
    rows = []
    for service in service_types:
        service_key = service.get("key")
        
        # Count partners capable of this service
        partner_count = await db.partner_capabilities.count_documents({
            "service_key": service_key,
            "status": "active",
        })
        
        # Count active assignments
        active_assignments = await db.partner_assignments.count_documents({
            "service_key": service_key,
            "current_progress_code": {"$nin": ["completed", "cancelled"]},
        })
        
        # Total capacity
        capabilities = await db.partner_capabilities.find({
            "service_key": service_key,
            "status": "active",
        }).to_list(length=100)
        total_capacity = sum(c.get("capacity_per_week", 0) for c in capabilities)
        
        rows.append({
            "service_key": service_key,
            "service_name": service.get("name"),
            "partner_count": partner_count,
            "total_capacity_per_week": total_capacity,
            "active_assignments": active_assignments,
            "needs_more_partners": partner_count < 2 or (total_capacity > 0 and active_assignments / total_capacity > 0.8),
        })
    
    # Sort by those needing partners first
    rows.sort(key=lambda x: (-int(x["needs_more_partners"]), -x["active_assignments"]))
    return rows


@router.get("/in-house-opportunity")
async def in_house_opportunity_score():
    """Calculate which services are best candidates for in-house operations"""
    pipeline = [
        {
            "$group": {
                "_id": "$service_key",
                "service_name": {"$first": "$service_name"},
                "total_requests": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                "delayed": {"$sum": {"$cond": [{"$eq": ["$status", "delayed"]}, 1, 0]}},
            }
        },
        {"$match": {"total_requests": {"$gte": 5}}},  # Only services with enough data
        {"$sort": {"total_requests": -1}},
    ]

    rows = []
    async for row in db.service_requests.aggregate(pipeline):
        requests = row.get("total_requests", 0)
        completed = row.get("completed", 0)
        delayed = row.get("delayed", 0)
        
        # Calculate opportunity score (higher is better for in-house)
        # Factors: high demand, low completion rate, high delays
        demand_score = min(requests / 10, 10)  # Max 10 points for demand
        completion_penalty = (1 - (completed / requests)) * 5 if requests else 0  # Up to 5 points
        delay_penalty = (delayed / requests) * 5 if requests else 0  # Up to 5 points
        
        opportunity_score = round(demand_score + completion_penalty + delay_penalty, 2)
        
        rows.append({
            "service_key": row["_id"],
            "service_name": row.get("service_name", row["_id"]),
            "total_requests": requests,
            "completed": completed,
            "delayed": delayed,
            "completion_rate": round((completed / requests) * 100, 2) if requests else 0,
            "delay_rate": round((delayed / requests) * 100, 2) if requests else 0,
            "opportunity_score": opportunity_score,
        })

    rows.sort(key=lambda x: -x["opportunity_score"])
    return rows
