"""
Business Pricing Request Admin Routes
Admin management of incoming business pricing requests
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import jwt
import os

router = APIRouter(prefix="/api/admin/business-pricing-requests", tags=["Business Pricing Admin"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


class UpdateRequestStatus(BaseModel):
    status: str  # pending, contacted, qualified, converted, declined
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "super_admin", "staff", "sales", "supervisor"]:
            raise HTTPException(status_code=403, detail="Admin/Staff access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def list_business_pricing_requests(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_admin_user)
):
    """List all business pricing requests with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    requests = await db.business_pricing_requests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests


@router.get("/{request_id}")
async def get_business_pricing_request(
    request_id: str,
    user: dict = Depends(get_admin_user)
):
    """Get a specific business pricing request"""
    req = await db.business_pricing_requests.find_one(
        {"id": request_id},
        {"_id": 0}
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get client profile if exists
    client_profile = await db.client_profiles.find_one(
        {"user_id": req.get("customer_id")},
        {"_id": 0}
    )
    
    return {
        "request": req,
        "client_profile": client_profile,
    }


@router.put("/{request_id}/status")
async def update_request_status(
    request_id: str,
    data: UpdateRequestStatus,
    user: dict = Depends(get_admin_user)
):
    """Update status, notes, or assignment of a request"""
    now = datetime.now(timezone.utc)
    
    req = await db.business_pricing_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_data = {
        "status": data.status,
        "updated_at": now.isoformat(),
        "updated_by": user.get("id"),
    }
    
    if data.assigned_to:
        update_data["assigned_to"] = data.assigned_to
    
    if data.notes:
        # Append to notes history
        notes_history = req.get("notes", [])
        notes_history.append({
            "note": data.notes,
            "added_by": user.get("id"),
            "added_by_name": user.get("full_name"),
            "added_at": now.isoformat(),
        })
        update_data["notes"] = notes_history
    
    await db.business_pricing_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    return {"ok": True, "message": "Request updated"}


@router.post("/{request_id}/convert-to-lead")
async def convert_to_lead(
    request_id: str,
    user: dict = Depends(get_admin_user)
):
    """Convert a business pricing request to a qualified lead"""
    now = datetime.now(timezone.utc)
    
    req = await db.business_pricing_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check if lead already exists
    existing_lead = await db.leads.find_one({"business_pricing_request_id": request_id})
    if existing_lead:
        return {"ok": True, "lead_id": existing_lead.get("id"), "message": "Lead already exists"}
    
    # Create qualified lead
    import uuid
    lead_doc = {
        "id": str(uuid.uuid4()),
        "name": req.get("customer_name", req.get("company_name")),
        "email": req.get("customer_email"),
        "company": req.get("company_name"),
        "source": "business_pricing_request",
        "status": "qualified",
        "stage": "qualified",
        "lead_type": "commercial",
        "estimated_value": 0,
        "tags": ["business_pricing", "commercial_lead", "qualified"],
        "notes": f"Converted from business pricing request. Industry: {req.get('industry', 'N/A')}. Volume: {req.get('estimated_monthly_volume', 'N/A')}",
        "business_pricing_request_id": request_id,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": user.get("id"),
    }
    
    await db.leads.insert_one(lead_doc)
    
    # Update request status
    await db.business_pricing_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "converted", "converted_lead_id": lead_doc["id"], "updated_at": now.isoformat()}}
    )
    
    return {"ok": True, "lead_id": lead_doc["id"], "message": "Converted to qualified lead"}


@router.get("/stats/summary")
async def get_request_stats(user: dict = Depends(get_admin_user)):
    """Get summary statistics for business pricing requests"""
    total = await db.business_pricing_requests.count_documents({})
    pending = await db.business_pricing_requests.count_documents({"status": "pending"})
    contacted = await db.business_pricing_requests.count_documents({"status": "contacted"})
    qualified = await db.business_pricing_requests.count_documents({"status": "qualified"})
    converted = await db.business_pricing_requests.count_documents({"status": "converted"})
    declined = await db.business_pricing_requests.count_documents({"status": "declined"})
    
    return {
        "total": total,
        "pending": pending,
        "contacted": contacted,
        "qualified": qualified,
        "converted": converted,
        "declined": declined,
    }
