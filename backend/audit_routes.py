"""
Audit Routes
View and filter audit logs for system accountability
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/audit", tags=["Audit Log"])
security = HTTPBearer(auto_error=False)

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


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


@router.get("")
async def list_audit_logs(
    actor_email: str = None,
    entity_type: str = None,
    action: str = None,
    limit: int = 500,
    user: dict = Depends(get_admin_user)
):
    """List audit logs with optional filters"""
    query = {}
    if actor_email:
        query["actor_email"] = actor_email
    if entity_type:
        query["entity_type"] = entity_type
    if action:
        query["action"] = {"$regex": action, "$options": "i"}

    docs = await db.audit_logs.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_audit_logs(
    entity_type: str, 
    entity_id: str, 
    user: dict = Depends(get_admin_user)
):
    """Get audit logs for a specific entity"""
    docs = await db.audit_logs.find(
        {"entity_type": entity_type, "entity_id": entity_id}
    ).sort("created_at", -1).to_list(length=300)

    return [serialize_doc(doc) for doc in docs]


@router.get("/actions")
async def list_audit_actions(user: dict = Depends(get_admin_user)):
    """Get distinct action types for filtering"""
    actions = await db.audit_logs.distinct("action")
    return sorted(actions)


@router.get("/entity-types")
async def list_entity_types(user: dict = Depends(get_admin_user)):
    """Get distinct entity types for filtering"""
    types = await db.audit_logs.distinct("entity_type")
    return sorted(types)
