"""
Staff Performance Routes - Track staff oversight and performance
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/staff-performance", tags=["Staff Performance"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/summary")
async def staff_performance_summary():
    """Get performance summary for account managers and key account staff"""
    rows = []

    # Get unique account managers from partner assignments
    pipeline = [
        {"$match": {"key_account_email": {"$ne": None, "$exists": True}}},
        {
            "$group": {
                "_id": "$key_account_email",
                "assignments": {"$sum": 1},
            }
        }
    ]

    async for row in db.partner_assignments.aggregate(pipeline):
        email = row["_id"]
        if not email:
            continue

        # Count delayed and issues under their watch
        delayed = await db.partner_assignments.count_documents({
            "key_account_email": email,
            "current_progress_code": "delayed",
        })
        issues = await db.partner_assignments.count_documents({
            "key_account_email": email,
            "current_progress_code": "issue_reported",
        })
        completed = await db.partner_assignments.count_documents({
            "key_account_email": email,
            "current_progress_code": "completed",
        })

        assignments = row.get("assignments", 0)
        
        rows.append({
            "staff_email": email,
            "role": "account_manager",
            "assignments_managed": assignments,
            "completed": completed,
            "delayed": delayed,
            "issues": issues,
            "completion_rate": round((completed / assignments) * 100, 2) if assignments else 0,
        })

    # Also include account managers from contract clients
    contract_managers = await db.contract_clients.distinct("account_manager_email")
    for email in contract_managers:
        if not email or any(r["staff_email"] == email for r in rows):
            continue
        
        # Count clients managed
        clients_managed = await db.contract_clients.count_documents({
            "account_manager_email": email,
            "is_active": True,
        })
        
        rows.append({
            "staff_email": email,
            "role": "account_manager",
            "clients_managed": clients_managed,
            "assignments_managed": 0,
            "completed": 0,
            "delayed": 0,
            "issues": 0,
            "completion_rate": 0,
        })

    # Sort by assignments managed
    rows.sort(key=lambda x: -x.get("assignments_managed", 0))
    return rows


@router.get("/by-manager/{email}")
async def get_staff_detail(email: str):
    """Get detailed stats for a specific staff member"""
    # Assignments
    assignments = await db.partner_assignments.find({
        "key_account_email": email
    }).to_list(length=500)
    
    total = len(assignments)
    completed = sum(1 for a in assignments if a.get("current_progress_code") == "completed")
    delayed = sum(1 for a in assignments if a.get("current_progress_code") == "delayed")
    issues = sum(1 for a in assignments if a.get("current_progress_code") == "issue_reported")
    active = sum(1 for a in assignments if a.get("current_progress_code") not in ["completed", "cancelled"])

    # Contract clients
    clients = await db.contract_clients.find({
        "account_manager_email": email
    }).to_list(length=100)

    # Notes added
    notes_count = await db.account_manager_notes.count_documents({
        "account_manager_email": email
    })

    return {
        "staff_email": email,
        "assignments": {
            "total": total,
            "completed": completed,
            "delayed": delayed,
            "issues": issues,
            "active": active,
            "completion_rate": round((completed / total) * 100, 2) if total else 0,
        },
        "clients_managed": len(clients),
        "client_list": [{
            "customer_id": c.get("customer_id"),
            "company_name": c.get("company_name"),
            "tier": c.get("tier"),
        } for c in clients],
        "notes_created": notes_count,
    }


@router.get("/workload")
async def staff_workload_distribution():
    """Get workload distribution across staff"""
    pipeline = [
        {"$match": {
            "key_account_email": {"$ne": None, "$exists": True},
            "current_progress_code": {"$nin": ["completed", "cancelled"]},
        }},
        {
            "$group": {
                "_id": "$key_account_email",
                "active_assignments": {"$sum": 1},
            }
        },
        {"$sort": {"active_assignments": -1}},
    ]

    rows = []
    async for row in db.partner_assignments.aggregate(pipeline):
        if not row["_id"]:
            continue
        rows.append({
            "staff_email": row["_id"],
            "active_assignments": row.get("active_assignments", 0),
        })

    # Calculate average and flag overloaded
    if rows:
        avg_load = sum(r["active_assignments"] for r in rows) / len(rows)
        for row in rows:
            row["above_average"] = row["active_assignments"] > avg_load * 1.5
            row["average_load"] = round(avg_load, 2)

    return rows
