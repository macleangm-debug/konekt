"""
Staff Alerts Routes
Automated underperformance detection and alerts.
"""
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/staff-alerts", tags=["Staff Alerts"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("")
async def get_staff_alerts():
    """
    Generate performance alerts for staff members.
    - Too many delayed tasks
    - Inactive for 24+ hours
    - High issue rate
    """
    alerts = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    staff = await db.users.find({
        "role": {"$in": ["sales", "operations"]},
        "is_active": True,
    }).to_list(length=300)

    for s in staff:
        staff_id = str(s["_id"])
        staff_name = s.get("name", "Unknown")

        # Check for delayed tasks
        delayed = await db.staff_task_metrics.count_documents({
            "staff_id": staff_id,
            "status": "delayed",
        })
        if delayed >= 3:
            alerts.append({
                "staff_id": staff_id,
                "name": staff_name,
                "role": s.get("role"),
                "type": "delays",
                "severity": "high" if delayed >= 5 else "medium",
                "message": f"{staff_name} has {delayed} delayed tasks.",
                "count": delayed,
            })

        # Check for issues
        issues = await db.staff_task_metrics.count_documents({
            "staff_id": staff_id,
            "status": "issue_reported",
        })
        if issues >= 2:
            alerts.append({
                "staff_id": staff_id,
                "name": staff_name,
                "role": s.get("role"),
                "type": "issues",
                "severity": "high" if issues >= 4 else "medium",
                "message": f"{staff_name} has {issues} tasks with reported issues.",
                "count": issues,
            })

        # Check for inactivity
        latest = await db.staff_task_metrics.find_one(
            {"staff_id": staff_id},
            sort=[("updated_at", -1)],
        )
        if latest and latest.get("updated_at"):
            last_update = latest["updated_at"]
            if isinstance(last_update, str):
                last_update = datetime.fromisoformat(last_update.replace("Z", "+00:00"))
            
            if last_update < cutoff:
                alerts.append({
                    "staff_id": staff_id,
                    "name": staff_name,
                    "role": s.get("role"),
                    "type": "inactive",
                    "severity": "low",
                    "message": f"{staff_name} has no recent activity in 24+ hours.",
                    "last_activity": latest.get("updated_at"),
                })

    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 3))

    return alerts


@router.get("/summary")
async def get_alerts_summary():
    """
    Get summary counts of alerts by type.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    
    staff = await db.users.find({
        "role": {"$in": ["sales", "operations"]},
        "is_active": True,
    }).to_list(length=300)

    delays_count = 0
    issues_count = 0
    inactive_count = 0

    for s in staff:
        staff_id = str(s["_id"])

        delayed = await db.staff_task_metrics.count_documents({
            "staff_id": staff_id,
            "status": "delayed",
        })
        if delayed >= 3:
            delays_count += 1

        issues = await db.staff_task_metrics.count_documents({
            "staff_id": staff_id,
            "status": "issue_reported",
        })
        if issues >= 2:
            issues_count += 1

        latest = await db.staff_task_metrics.find_one(
            {"staff_id": staff_id},
            sort=[("updated_at", -1)],
        )
        if latest and latest.get("updated_at"):
            last_update = latest["updated_at"]
            if isinstance(last_update, str):
                last_update = datetime.fromisoformat(last_update.replace("Z", "+00:00"))
            if last_update < cutoff:
                inactive_count += 1

    return {
        "staff_with_delays": delays_count,
        "staff_with_issues": issues_count,
        "staff_inactive": inactive_count,
        "total_alerts": delays_count + issues_count + inactive_count,
    }
