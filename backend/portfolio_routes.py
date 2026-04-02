"""
Portfolio & Reactivation Routes
- Sales: own portfolio dashboard, own reactivation tasks
- Admin: all portfolios overview, any owner's portfolio, task management
"""
import os
import jwt
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from services.portfolio_reactivation_service import (
    compute_portfolio_for_owner,
    generate_reactivation_tasks,
    get_admin_portfolio_overview,
)

router = APIRouter(tags=["Portfolio & Reactivation"])
security = HTTPBearer()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def get_auth_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ===== SALES: MY PORTFOLIO =====

@router.get("/api/sales/portfolio")
async def get_my_portfolio(user: dict = Depends(get_auth_user)):
    """Sales: get own portfolio dashboard data."""
    if user.get("role") not in ("admin", "staff", "sales"):
        raise HTTPException(status_code=403, detail="Sales access required")
    return await compute_portfolio_for_owner(db, user["id"])


@router.get("/api/sales/portfolio/tasks")
async def get_my_reactivation_tasks(user: dict = Depends(get_auth_user)):
    """Sales: get own reactivation tasks."""
    if user.get("role") not in ("admin", "staff", "sales"):
        raise HTTPException(status_code=403, detail="Sales access required")
    tasks = await db.reactivation_tasks.find(
        {"owner_sales_id": user["id"]},
        {"_id": 0}
    ).sort("due_date", 1).to_list(200)
    return {"tasks": tasks}


@router.post("/api/sales/portfolio/generate-tasks")
async def generate_my_tasks(user: dict = Depends(get_auth_user)):
    """Sales: generate reactivation tasks for at-risk/inactive clients."""
    if user.get("role") not in ("admin", "staff", "sales"):
        raise HTTPException(status_code=403, detail="Sales access required")
    result = await generate_reactivation_tasks(db, user["id"])
    return result


@router.put("/api/sales/portfolio/tasks/{task_id}")
async def update_task(task_id: str, payload: dict, user: dict = Depends(get_auth_user)):
    """Sales: update reactivation task (outcome, notes, status)."""
    if user.get("role") not in ("admin", "staff", "sales"):
        raise HTTPException(status_code=403, detail="Sales access required")

    task = await db.reactivation_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Sales can only update own tasks
    if user.get("role") != "admin" and task.get("owner_sales_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not your task")

    now = datetime.now(timezone.utc).isoformat()
    update = {"updated_at": now}

    if "status" in payload:
        update["status"] = payload["status"]
    if "outcome" in payload:
        update["outcome"] = payload["outcome"]
    if "notes" in payload:
        update["notes"] = payload["notes"]
    if "due_date" in payload:
        update["due_date"] = payload["due_date"]

    await db.reactivation_tasks.update_one({"id": task_id}, {"$set": update})
    return {"ok": True}


# ===== ADMIN: PORTFOLIO OVERVIEW =====

@router.get("/api/admin/portfolio/overview")
async def admin_portfolio_overview(user: dict = Depends(get_auth_user)):
    """Admin: portfolio stats across all sales owners."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return await get_admin_portfolio_overview(db)


@router.get("/api/admin/portfolio/{sales_id}")
async def admin_get_owner_portfolio(sales_id: str, user: dict = Depends(get_auth_user)):
    """Admin: get specific owner's portfolio."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return await compute_portfolio_for_owner(db, sales_id)


@router.post("/api/admin/portfolio/{sales_id}/generate-tasks")
async def admin_generate_tasks(sales_id: str, user: dict = Depends(get_auth_user)):
    """Admin: generate reactivation tasks for a specific sales owner."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return await generate_reactivation_tasks(db, sales_id)
