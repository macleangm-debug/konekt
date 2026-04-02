"""
Dormant Client Alert Routes
- Admin: see all dormant clients, summary, per-owner breakdown, actions
- Staff/Sales: see only own dormant clients
"""
import os
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from services.dormant_client_service import (
    get_all_dormant_clients,
    get_dormant_summary,
    mark_client_reactivated,
)

router = APIRouter(tags=["Dormant Client Alerts"])
security = HTTPBearer()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]
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


# ===== ADMIN ENDPOINTS =====

@router.get("/api/admin/dormant-clients/summary")
async def admin_dormant_summary(user: dict = Depends(get_auth_user)):
    """Admin: get dormant client summary counts with per-owner breakdown."""
    if user.get("role") not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin access required")
    return await get_dormant_summary(db)


@router.get("/api/admin/dormant-clients/alerts")
async def admin_dormant_alerts(
    status: str = Query(None, description="Filter: at_risk, inactive, lost"),
    owner: str = Query(None, description="Filter by owner_sales_id"),
    user: dict = Depends(get_auth_user),
):
    """Admin: get full list of dormant clients with filtering."""
    if user.get("role") not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin access required")
    clients = await get_all_dormant_clients(
        db, owner_sales_id=owner, status_filter=status
    )
    return {"alerts": clients, "total": len(clients)}


@router.post("/api/admin/dormant-clients/{client_id}/reactivate")
async def admin_reactivate_client(
    client_id: str,
    user: dict = Depends(get_auth_user),
):
    """Admin: mark a dormant client as reactivated."""
    if user.get("role") not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin access required")

    # Determine client type
    company = await db.companies.find_one({"id": client_id}, {"_id": 0, "id": 1})
    client_type = "company" if company else "individual"

    return await mark_client_reactivated(
        db, client_id, client_type,
        reactivated_by=user.get("full_name") or user.get("email") or user["id"]
    )


# ===== STAFF/SALES ENDPOINTS =====

@router.get("/api/staff/dormant-clients/mine")
async def staff_my_dormant_clients(
    status: str = Query(None),
    user: dict = Depends(get_auth_user),
):
    """Sales: get only own dormant clients."""
    if user.get("role") not in ("admin", "staff", "sales"):
        raise HTTPException(status_code=403, detail="Sales access required")
    clients = await get_all_dormant_clients(
        db, owner_sales_id=user["id"], status_filter=status
    )
    return {"alerts": clients, "total": len(clients)}


@router.get("/api/staff/dormant-clients/summary")
async def staff_my_dormant_summary(user: dict = Depends(get_auth_user)):
    """Sales: get own dormant client summary."""
    if user.get("role") not in ("admin", "staff", "sales"):
        raise HTTPException(status_code=403, detail="Sales access required")
    return await get_dormant_summary(db, owner_sales_id=user["id"])


@router.post("/api/staff/dormant-clients/{client_id}/reactivate")
async def staff_reactivate_client(
    client_id: str,
    user: dict = Depends(get_auth_user),
):
    """Sales: mark own dormant client as reactivated."""
    if user.get("role") not in ("admin", "staff", "sales"):
        raise HTTPException(status_code=403, detail="Sales access required")

    # Verify ownership
    company = await db.companies.find_one(
        {"id": client_id, "owner_sales_id": user["id"]}, {"_id": 0, "id": 1}
    )
    individual = await db.individual_clients.find_one(
        {"id": client_id, "owner_sales_id": user["id"]}, {"_id": 0, "id": 1}
    )
    if not company and not individual:
        raise HTTPException(status_code=403, detail="Not your client or client not found")

    client_type = "company" if company else "individual"
    return await mark_client_reactivated(
        db, client_id, client_type,
        reactivated_by=user.get("full_name") or user.get("email") or user["id"]
    )
