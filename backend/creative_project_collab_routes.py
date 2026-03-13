"""
Creative Project Collaboration Routes
Handles comments, revisions, and file deliverables for creative projects
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/creative-project-collab", tags=["Creative Project Collaboration"])
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


@router.get("/{project_id}/comments")
async def list_project_comments(project_id: str, user: dict = Depends(get_user)):
    """List all comments for a creative project"""
    docs = await db.creative_project_comments.find(
        {"project_id": project_id}
    ).sort("created_at", 1).to_list(length=500)
    
    return [serialize_doc(doc) for doc in docs]


@router.post("/{project_id}/comments")
async def add_project_comment(project_id: str, payload: dict, user: dict = Depends(get_user)):
    """Add a comment to a creative project"""
    now = datetime.utcnow()
    
    project = await db.creative_service_orders.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    user_email = user.get("email") if user else None
    role = user.get("role", "customer") if user else "customer"
    
    doc = {
        "project_id": project_id,
        "author_email": user_email,
        "author_role": role,
        "message": payload.get("message", ""),
        "created_at": now,
    }
    
    result = await db.creative_project_comments.insert_one(doc)
    created = await db.creative_project_comments.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/{project_id}/revisions")
async def list_project_revisions(project_id: str, user: dict = Depends(get_user)):
    """List all revision requests for a creative project"""
    docs = await db.creative_project_revisions.find(
        {"project_id": project_id}
    ).sort("created_at", -1).to_list(length=200)
    
    return [serialize_doc(doc) for doc in docs]


@router.post("/{project_id}/revisions")
async def request_project_revision(project_id: str, payload: dict, user: dict = Depends(get_user)):
    """Request a revision for a creative project"""
    now = datetime.utcnow()
    
    project = await db.creative_service_orders.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    user_email = user.get("email") if user else None
    
    doc = {
        "project_id": project_id,
        "requested_by": user_email,
        "message": payload.get("message", ""),
        "status": "open",
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.creative_project_revisions.insert_one(doc)
    
    # Update project status
    await db.creative_service_orders.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {"status": "revision_requested", "updated_at": now},
            "$push": {
                "status_history": {
                    "status": "revision_requested",
                    "note": payload.get("message", ""),
                    "timestamp": now,
                }
            },
        },
    )
    
    created = await db.creative_project_revisions.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.post("/{project_id}/deliverables")
async def add_project_deliverable(project_id: str, payload: dict, user: dict = Depends(get_user)):
    """Add a deliverable file to a creative project"""
    now = datetime.utcnow()
    
    project = await db.creative_service_orders.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    user_email = user.get("email") if user else None
    
    doc = {
        "project_id": project_id,
        "title": payload.get("title"),
        "file_url": payload.get("file_url"),
        "file_type": payload.get("file_type"),
        "uploaded_by": user_email,
        "created_at": now,
    }
    
    result = await db.creative_project_deliverables.insert_one(doc)
    
    # Update project status
    await db.creative_service_orders.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {"status": "draft_delivered", "updated_at": now},
            "$push": {
                "status_history": {
                    "status": "draft_delivered",
                    "note": payload.get("title", "Deliverable uploaded"),
                    "timestamp": now,
                }
            },
        },
    )
    
    created = await db.creative_project_deliverables.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/{project_id}/deliverables")
async def list_project_deliverables(project_id: str, user: dict = Depends(get_user)):
    """List all deliverables for a creative project"""
    docs = await db.creative_project_deliverables.find(
        {"project_id": project_id}
    ).sort("created_at", -1).to_list(length=200)
    
    return [serialize_doc(doc) for doc in docs]
