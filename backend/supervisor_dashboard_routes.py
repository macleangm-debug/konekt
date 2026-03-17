"""
Supervisor Dashboard Routes
Team performance monitoring and workload visibility.
"""
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from staff_assignment_service import calculate_staff_score

router = APIRouter(prefix="/api/supervisor", tags=["Supervisor Dashboard"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/team-summary")
async def get_team_summary():
    """
    Get performance summary for all sales and operations staff.
    """
    staff = await db.users.find({
        "role": {"$in": ["sales", "operations"]},
        "is_active": True,
    }).to_list(length=300)

    rows = []
    for s in staff:
        role = s.get("role")
        staff_id = str(s["_id"])
        perf = await calculate_staff_score(db, staff_id, role)

        rows.append({
            "staff_id": staff_id,
            "name": s.get("name"),
            "email": s.get("email"),
            "role": role,
            "specializations": s.get("specializations", []),
            "score": perf["score"],
            "completed": perf["completed"],
            "active": perf["active"],
            "delayed": perf["delayed"],
            "issues": perf["issues"],
        })

    # Sort by score descending
    rows.sort(key=lambda x: x["score"], reverse=True)
    return rows


@router.get("/team-summary/{role}")
async def get_team_summary_by_role(role: str):
    """
    Get performance summary for a specific role (sales or operations).
    """
    staff = await db.users.find({
        "role": role,
        "is_active": True,
    }).to_list(length=300)

    rows = []
    for s in staff:
        staff_id = str(s["_id"])
        perf = await calculate_staff_score(db, staff_id, role)

        rows.append({
            "staff_id": staff_id,
            "name": s.get("name"),
            "email": s.get("email"),
            "role": role,
            "specializations": s.get("specializations", []),
            "score": perf["score"],
            "completed": perf["completed"],
            "active": perf["active"],
            "delayed": perf["delayed"],
            "issues": perf["issues"],
        })

    rows.sort(key=lambda x: x["score"], reverse=True)
    return rows


@router.get("/staff/{staff_id}/details")
async def get_staff_details(staff_id: str):
    """
    Get detailed performance breakdown for a specific staff member.
    """
    from bson import ObjectId
    
    staff = await db.users.find_one({"_id": ObjectId(staff_id)})
    if not staff:
        return {"error": "Staff not found"}

    role = staff.get("role")
    perf = await calculate_staff_score(db, staff_id, role)

    # Get recent tasks
    recent_tasks = await db.staff_task_metrics.find({
        "staff_id": staff_id,
    }).sort("updated_at", -1).to_list(length=20)

    tasks = []
    for t in recent_tasks:
        tasks.append({
            "entity_type": t.get("entity_type"),
            "entity_id": t.get("entity_id"),
            "status": t.get("status"),
            "assigned_at": t.get("assigned_at"),
            "updated_at": t.get("updated_at"),
        })

    return {
        "staff_id": staff_id,
        "name": staff.get("name"),
        "email": staff.get("email"),
        "role": role,
        "specializations": staff.get("specializations", []),
        "performance": perf,
        "recent_tasks": tasks,
    }


@router.get("/leaderboard")
async def get_leaderboard():
    """
    Get top performers across all staff.
    """
    staff = await db.users.find({
        "role": {"$in": ["sales", "operations"]},
        "is_active": True,
    }).to_list(length=300)

    rows = []
    for s in staff:
        role = s.get("role")
        staff_id = str(s["_id"])
        perf = await calculate_staff_score(db, staff_id, role)

        rows.append({
            "staff_id": staff_id,
            "name": s.get("name"),
            "role": role,
            "score": perf["score"],
            "completed": perf["completed"],
        })

    rows.sort(key=lambda x: x["score"], reverse=True)
    return rows[:10]  # Top 10
