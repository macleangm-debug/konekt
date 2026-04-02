"""
Vendor Performance Routes
- Admin: sees all vendor scores + full breakdowns
- Vendor/Partner: sees only own score/breakdown (no tip field stripped for role safety)
- Customer: NO ACCESS (vendor performance is internal-only)
"""
import os
import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from services.vendor_performance_service import compute_vendor_performance
from partner_access_service import get_partner_user_from_header

router = APIRouter(tags=["Vendor Performance"])

security = HTTPBearer()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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


# ===== ADMIN ENDPOINTS =====

@router.get("/api/admin/vendor-performance/team")
async def get_vendor_team_performance(user: dict = Depends(get_admin_user)):
    """Admin: get performance summary for all vendors/partners."""
    require_admin(user)

    # Get all partners from partner_users collection
    partners = await db.partner_users.find(
        {},
        {"_id": 0, "partner_id": 1, "name": 1, "full_name": 1, "email": 1, "status": 1, "company": 1}
    ).to_list(500)

    # Deduplicate by partner_id
    seen = set()
    unique_partners = []
    for p in partners:
        pid = p.get("partner_id")
        if pid and pid not in seen:
            seen.add(pid)
            unique_partners.append(p)

    results = []
    for p in unique_partners:
        pid = p.get("partner_id", "")
        display_name = p.get("full_name") or p.get("name") or ""
        perf = await compute_vendor_performance(db, pid, display_name)
        results.append({
            "vendor_id": pid,
            "name": display_name,
            "email": p.get("email", ""),
            "company": p.get("company", ""),
            "status": p.get("status", "active"),
            "performance_score": perf["performance_score"],
            "performance_zone": perf["performance_zone"],
            "sample_size": perf["sample_size"],
        })

    results.sort(key=lambda x: x["performance_score"], reverse=True)
    return {"team": results}


@router.get("/api/admin/vendor-performance/team/{vendor_id}")
async def get_vendor_detail_performance(vendor_id: str, user: dict = Depends(get_admin_user)):
    """Admin: get full breakdown for a specific vendor."""
    require_admin(user)

    partner = await db.partner_users.find_one(
        {"partner_id": vendor_id},
        {"_id": 0, "partner_id": 1, "name": 1, "full_name": 1, "email": 1, "company": 1}
    )
    if not partner:
        raise HTTPException(status_code=404, detail="Vendor not found")

    display_name = partner.get("full_name") or partner.get("name") or ""
    perf = await compute_vendor_performance(db, vendor_id, display_name)
    return perf


# ===== VENDOR SELF-VIEW (Partner Portal) =====

@router.get("/api/vendor/my-performance")
async def get_my_vendor_performance(authorization: Optional[str] = Header(None)):
    """Vendor: see own performance score, breakdown, and tips. No rater identity."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user.get("partner_id", "")

    perf = await compute_vendor_performance(db, partner_id, user.get("full_name") or user.get("name", ""))

    # Role-safe: strip tip field from breakdown (vendor sees score but not admin coaching tips)
    safe_breakdown = [
        {
            "label": b["label"],
            "raw_score": b["raw_score"],
            "weight": b["weight"],
            "weighted": b["weighted"],
        }
        for b in perf["breakdown"]
    ]

    return {
        "performance_score": perf["performance_score"],
        "performance_zone": perf["performance_zone"],
        "sample_size": perf["sample_size"],
        "breakdown": safe_breakdown,
        "tips": perf["tips"],
        "computed_at": perf["computed_at"],
        "last_updated": perf["last_updated"],
    }
