"""
Partner Performance Routes - Track partner reliability and queue load
"""
import os
from fastapi import APIRouter
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/partner-performance", tags=["Partner Performance"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/summary")
async def partner_performance_summary():
    """Get performance summary for all partners"""
    partners = await db.partners.find({}).to_list(length=500)
    rows = []

    for partner in partners:
        partner_id = str(partner["_id"])

        # Count assignments by status
        assigned = await db.partner_assignments.count_documents({"partner_id": partner_id})
        completed = await db.partner_assignments.count_documents({
            "partner_id": partner_id,
            "current_progress_code": "completed",
        })
        delayed = await db.partner_assignments.count_documents({
            "partner_id": partner_id,
            "current_progress_code": "delayed",
        })
        issues = await db.partner_assignments.count_documents({
            "partner_id": partner_id,
            "current_progress_code": "issue_reported",
        })
        
        # Active queue
        active_queue = await db.partner_assignments.count_documents({
            "partner_id": partner_id,
            "current_progress_code": {
                "$in": [
                    "assigned",
                    "accepted",
                    "production_started",
                    "ready_for_dispatch",
                    "site_visit_scheduled",
                    "on_site",
                    "installation_started",
                    "in_progress",
                ]
            },
        })

        # Calculate completion rate
        completion_rate = round((completed / assigned) * 100, 2) if assigned else 0
        
        # Get service capabilities count
        capabilities = await db.partner_capabilities.count_documents({"partner_id": partner_id})

        rows.append({
            "partner_id": partner_id,
            "partner_name": partner.get("name"),
            "status": partner.get("status", "active"),
            "country_code": partner.get("country_code"),
            "assigned": assigned,
            "completed": completed,
            "delayed": delayed,
            "issues": issues,
            "active_queue": active_queue,
            "completion_rate": completion_rate,
            "capabilities_count": capabilities,
        })

    # Sort by completion rate (desc), then by delays (asc)
    rows.sort(key=lambda x: (-x["completion_rate"], x["delayed"]))
    return rows


@router.get("/queue-load")
async def partner_queue_load():
    """Get current queue load for each partner"""
    partners = await db.partners.find({"status": "active"}).to_list(length=500)
    rows = []

    for partner in partners:
        partner_id = str(partner["_id"])
        
        # Count by progress status
        queue_counts = {}
        statuses = ["assigned", "accepted", "production_started", "ready_for_dispatch", "in_progress"]
        for status in statuses:
            count = await db.partner_assignments.count_documents({
                "partner_id": partner_id,
                "current_progress_code": status,
            })
            queue_counts[status] = count
        
        total_queue = sum(queue_counts.values())
        
        # Get partner capacity
        capabilities = await db.partner_capabilities.find({"partner_id": partner_id}).to_list(length=100)
        total_capacity = sum(c.get("capacity_per_week", 0) for c in capabilities)
        
        rows.append({
            "partner_id": partner_id,
            "partner_name": partner.get("name"),
            "total_queue": total_queue,
            "total_capacity_per_week": total_capacity,
            "utilization_percent": round((total_queue / total_capacity) * 100, 2) if total_capacity else 0,
            "queue_breakdown": queue_counts,
        })

    rows.sort(key=lambda x: -x["utilization_percent"])
    return rows


@router.get("/by-service")
async def partner_performance_by_service(service_key: str = None):
    """Get partner performance grouped by service"""
    match = {}
    if service_key:
        match["service_key"] = service_key
    
    pipeline = [
        {"$match": match} if match else {"$match": {}},
        {
            "$group": {
                "_id": {"partner_id": "$partner_id", "service_key": "$service_key"},
                "assigned": {"$sum": 1},
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$current_progress_code", "completed"]}, 1, 0]}
                },
                "delayed": {
                    "$sum": {"$cond": [{"$eq": ["$current_progress_code", "delayed"]}, 1, 0]}
                },
            }
        },
        {"$sort": {"assigned": -1}},
    ]

    rows = []
    async for row in db.partner_assignments.aggregate(pipeline):
        partner = await db.partners.find_one({"_id": ObjectId(row["_id"]["partner_id"])})
        partner_name = partner.get("name") if partner else "Unknown"
        
        assigned = row.get("assigned", 0)
        completed = row.get("completed", 0)
        
        rows.append({
            "partner_id": row["_id"]["partner_id"],
            "partner_name": partner_name,
            "service_key": row["_id"]["service_key"],
            "assigned": assigned,
            "completed": completed,
            "delayed": row.get("delayed", 0),
            "completion_rate": round((completed / assigned) * 100, 2) if assigned else 0,
        })

    return rows


@router.get("/{partner_id}")
async def get_partner_performance_detail(partner_id: str):
    """Get detailed performance for a specific partner"""
    partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
    if not partner:
        return {"error": "Partner not found"}

    # Overall stats
    assigned = await db.partner_assignments.count_documents({"partner_id": partner_id})
    completed = await db.partner_assignments.count_documents({
        "partner_id": partner_id,
        "current_progress_code": "completed",
    })
    delayed = await db.partner_assignments.count_documents({
        "partner_id": partner_id,
        "current_progress_code": "delayed",
    })
    issues = await db.partner_assignments.count_documents({
        "partner_id": partner_id,
        "current_progress_code": "issue_reported",
    })

    # Service breakdown
    service_pipeline = [
        {"$match": {"partner_id": partner_id}},
        {
            "$group": {
                "_id": "$service_key",
                "count": {"$sum": 1},
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$current_progress_code", "completed"]}, 1, 0]}
                },
            }
        },
        {"$sort": {"count": -1}},
    ]

    service_breakdown = []
    async for row in db.partner_assignments.aggregate(service_pipeline):
        service_breakdown.append({
            "service_key": row["_id"],
            "total": row["count"],
            "completed": row["completed"],
        })

    # Capabilities
    capabilities = await db.partner_capabilities.find({"partner_id": partner_id}).to_list(length=100)

    return {
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "status": partner.get("status"),
        "overall_stats": {
            "assigned": assigned,
            "completed": completed,
            "delayed": delayed,
            "issues": issues,
            "completion_rate": round((completed / assigned) * 100, 2) if assigned else 0,
        },
        "service_breakdown": service_breakdown,
        "capabilities": [{
            "service_key": c.get("service_key"),
            "regions": c.get("regions", []),
            "capacity_per_week": c.get("capacity_per_week", 0),
        } for c in capabilities],
    }
