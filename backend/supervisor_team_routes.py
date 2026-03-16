"""
Supervisor Team Routes
Team overview for supervisors and super admins
"""
from datetime import datetime, timezone
import os
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/supervisor-team", tags=["Supervisor Team"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/overview")
async def supervisor_team_overview(role: str = "admin", team: str = None):
    """
    Get team overview data for supervisors and super admins.
    Super admins see all teams, supervisors see only their team.
    """
    # In production, role and team would come from auth token
    
    is_super = role in ["super_admin", "admin"]
    
    # Build query based on role
    team_query = {} if is_super else {"team": team} if team else {}

    lead_count = await db.crm_leads.count_documents(team_query if not is_super else {})
    task_count = await db.tasks.count_documents({**team_query, "status": {"$ne": "done"}} if not is_super else {"status": {"$ne": "done"}})
    order_count = await db.orders.count_documents({})
    request_count = await db.service_requests.count_documents({"status": {"$nin": ["completed", "cancelled"]}})
    
    # Get quote and invoice stats
    quote_count = await db.quotes_v2.count_documents({})
    invoice_count = await db.invoices_v2.count_documents({})
    unpaid_invoices = await db.invoices_v2.count_documents({"status": {"$nin": ["paid", "cancelled"]}})
    
    # Get revenue stats
    paid_invoices = await db.invoices_v2.find({"status": "paid"}).to_list(length=1000)
    total_revenue = sum(float(inv.get("total", 0) or 0) for inv in paid_invoices)
    
    # Get staff count
    staff_count = await db.users.count_documents({"role": {"$in": ["sales", "production", "finance", "marketing", "support", "supervisor"]}})

    return {
        "role": role,
        "team": team,
        "is_super_admin": is_super,
        "summary": {
            "lead_count": lead_count,
            "open_task_count": task_count,
            "order_count": order_count,
            "service_request_count": request_count,
            "quote_count": quote_count,
            "invoice_count": invoice_count,
            "unpaid_invoices": unpaid_invoices,
            "total_revenue": total_revenue,
            "staff_count": staff_count,
        },
    }


@router.get("/staff-list")
async def get_staff_list(role: str = "admin"):
    """Get list of all staff members for team management."""
    if role not in ["super_admin", "admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    staff = await db.users.find(
        {"role": {"$in": ["admin", "sales", "production", "finance", "marketing", "support", "supervisor", "super_admin"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(length=200)
    
    return {"staff": staff}


@router.get("/performance")
async def get_staff_performance():
    """Get staff performance metrics."""
    # Aggregate performance by staff member
    pipeline = [
        {"$group": {
            "_id": "$assigned_to",
            "lead_count": {"$sum": 1},
            "won_count": {"$sum": {"$cond": [{"$eq": ["$stage", "won"]}, 1, 0]}},
            "total_value": {"$sum": {"$ifNull": ["$expected_value", 0]}},
        }},
        {"$match": {"_id": {"$ne": None}}},
    ]
    
    lead_stats = await db.crm_leads.aggregate(pipeline).to_list(length=100)
    
    # Get task completion stats
    task_pipeline = [
        {"$group": {
            "_id": "$assigned_to",
            "total_tasks": {"$sum": 1},
            "completed_tasks": {"$sum": {"$cond": [{"$eq": ["$status", "done"]}, 1, 0]}},
        }},
        {"$match": {"_id": {"$ne": None}}},
    ]
    
    task_stats = await db.tasks.aggregate(task_pipeline).to_list(length=100)
    
    # Combine stats
    staff_map = {}
    for stat in lead_stats:
        email = stat["_id"]
        staff_map[email] = {
            "email": email,
            "lead_count": stat.get("lead_count", 0),
            "won_count": stat.get("won_count", 0),
            "total_value": stat.get("total_value", 0),
            "conversion_rate": round((stat.get("won_count", 0) / stat.get("lead_count", 1)) * 100, 1),
            "total_tasks": 0,
            "completed_tasks": 0,
        }
    
    for stat in task_stats:
        email = stat["_id"]
        if email not in staff_map:
            staff_map[email] = {
                "email": email,
                "lead_count": 0,
                "won_count": 0,
                "total_value": 0,
                "conversion_rate": 0,
            }
        staff_map[email]["total_tasks"] = stat.get("total_tasks", 0)
        staff_map[email]["completed_tasks"] = stat.get("completed_tasks", 0)
    
    # Get user names
    for email in staff_map:
        user = await db.users.find_one({"email": email}, {"_id": 0, "full_name": 1, "role": 1})
        if user:
            staff_map[email]["full_name"] = user.get("full_name", email)
            staff_map[email]["role"] = user.get("role", "staff")
    
    performance = list(staff_map.values())
    performance.sort(key=lambda x: (x.get("won_count", 0), x.get("lead_count", 0)), reverse=True)
    
    return {"performance": performance}
