"""
Sales Performance & Assignment Routes
Role-safe: sales see only own score, admin sees all team scores.
"""
import os
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from services.sales_performance_service import compute_sales_performance
from services.sales_capability_service import get_sales_capability, upsert_sales_capability
from services.sales_assignment_service import assign_sales_owner

router = APIRouter(prefix="/api/admin/sales-performance", tags=["Sales Performance"])

security = HTTPBearer()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: dict):
    if user.get("role") not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Admin access required")


# --- Team view (admin only) ---

@router.get("/team")
async def get_team_performance(user: dict = Depends(get_user)):
    """Admin: get performance summary for all sales users."""
    require_admin(user)
    sales_users = await db.users.find(
        {"role": "sales"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "status": 1}
    ).to_list(200)

    results = []
    for su in sales_users:
        perf = await compute_sales_performance(db, su["id"], su.get("name", ""))
        results.append({
            "user_id": su["id"],
            "name": su.get("name", ""),
            "email": su.get("email", ""),
            "status": su.get("status", "active"),
            "performance_score": perf["performance_score"],
            "performance_zone": perf["performance_zone"],
            "sample_size": perf["sample_size"],
        })

    results.sort(key=lambda x: x["performance_score"], reverse=True)
    return {"team": results}


@router.get("/team/{sales_user_id}")
async def get_sales_detail(sales_user_id: str, user: dict = Depends(get_user)):
    """Admin: get full breakdown for a specific sales user."""
    require_admin(user)
    su = await db.users.find_one({"id": sales_user_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not su:
        raise HTTPException(status_code=404, detail="Sales user not found")
    perf = await compute_sales_performance(db, sales_user_id, su.get("name", ""))
    cap = await get_sales_capability(db, sales_user_id)
    return {**perf, "capabilities": cap}


# --- Self view (sales user) ---

@router.get("/me")
async def get_my_performance(user: dict = Depends(get_user)):
    """Sales: see own performance score, breakdown, and tips. No rater identity."""
    perf = await compute_sales_performance(db, user["id"], user.get("name", ""))
    # Strip any identifying info from breakdown
    safe_breakdown = [
        {"label": b["label"], "raw_score": b["raw_score"], "weight": b["weight"], "weighted": b["weighted"]}
        for b in perf["breakdown"]
    ]
    return {
        "performance_score": perf["performance_score"],
        "performance_zone": perf["performance_zone"],
        "sample_size": perf["sample_size"],
        "breakdown": safe_breakdown,
        "tips": perf["tips"],
        "computed_at": perf["computed_at"],
    }


# --- Capabilities (admin) ---

@router.get("/capabilities/{sales_user_id}")
async def get_capabilities(sales_user_id: str, user: dict = Depends(get_user)):
    require_admin(user)
    return await get_sales_capability(db, sales_user_id)


@router.put("/capabilities/{sales_user_id}")
async def update_capabilities(sales_user_id: str, payload: dict, user: dict = Depends(get_user)):
    require_admin(user)
    return await upsert_sales_capability(db, sales_user_id, payload)


# --- Assignment (admin) ---

@router.post("/assign")
async def run_assignment(payload: dict, user: dict = Depends(get_user)):
    """Run assignment engine with ownership continuity gate."""
    require_admin(user)
    return await assign_sales_owner(
        db,
        email=payload.get("email"),
        company_name=payload.get("company_name"),
        lane=payload.get("lane"),
        category=payload.get("category"),
    )
