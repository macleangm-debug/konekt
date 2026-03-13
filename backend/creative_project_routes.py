"""
Creative Service Project Routes
Handles customer and admin views of creative projects
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/creative-projects", tags=["Creative Projects"])
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


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get authenticated user"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


@router.get("/my")
async def get_my_creative_projects(user: dict = Depends(get_user)):
    """Get creative projects for the current customer"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_email = user.get("email")
    
    docs = await db.creative_service_orders.find(
        {"customer_email": user_email}
    ).sort("created_at", -1).to_list(length=300)
    
    return [serialize_doc(doc) for doc in docs]


@router.get("/admin")
async def list_all_creative_projects(user: dict = Depends(get_user)):
    """List all creative projects (admin view)"""
    if not user or user.get("role") not in ["admin", "super_admin", "sales", "marketing", "production"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    docs = await db.creative_service_orders.find({}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{project_id}")
async def get_creative_project(project_id: str, user: dict = Depends(get_user)):
    """Get a specific creative project"""
    project = await db.creative_service_orders.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return serialize_doc(project)


@router.post("/admin/{project_id}/status")
async def update_creative_project_status(project_id: str, payload: dict, user: dict = Depends(get_user)):
    """Update creative project status (admin only)"""
    if not user or user.get("role") not in ["admin", "super_admin", "sales", "marketing", "production"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    project = await db.creative_service_orders.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    new_status = payload.get("status", project.get("status"))
    note = payload.get("note", "")
    now = datetime.utcnow()
    
    await db.creative_service_orders.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {"status": new_status, "updated_at": now},
            "$push": {
                "status_history": {
                    "status": new_status,
                    "note": note,
                    "timestamp": now,
                }
            },
        },
    )
    
    updated = await db.creative_service_orders.find_one({"_id": ObjectId(project_id)})
    return serialize_doc(updated)
