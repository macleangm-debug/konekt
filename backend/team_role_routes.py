"""
Team Role Routes
Manage staff roles and permissions
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/team-roles", tags=["Team Roles"])
security = HTTPBearer(auto_error=False)

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


STAFF_ROLES = [
    {"value": "super_admin", "label": "Super Admin"},
    {"value": "sales", "label": "Sales"},
    {"value": "finance", "label": "Finance"},
    {"value": "production", "label": "Production"},
    {"value": "marketing", "label": "Marketing"},
    {"value": "support", "label": "Support"},
]

VALID_ROLES = {role["value"] for role in STAFF_ROLES}


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/roles")
async def list_staff_roles(user: dict = Depends(get_admin_user)):
    """List all available staff roles"""
    return STAFF_ROLES


@router.post("/{user_id}/assign")
async def assign_staff_role(user_id: str, payload: dict, user: dict = Depends(get_admin_user)):
    """Assign a role to a staff member"""
    role = payload.get("role")
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    now = datetime.utcnow()
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role, "updated_at": now}},
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"assigned": True, "role": role}


@router.get("/users")
async def list_staff_users(user: dict = Depends(get_admin_user)):
    """List all staff users with their roles"""
    staff_roles = list(VALID_ROLES) + ["admin"]
    docs = await db.users.find(
        {"role": {"$in": staff_roles}},
        {"_id": 1, "email": 1, "name": 1, "role": 1, "created_at": 1}
    ).sort("name", 1).to_list(length=200)
    
    result = []
    for doc in docs:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        result.append(doc)
    
    return result
