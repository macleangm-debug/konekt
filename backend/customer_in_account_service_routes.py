from datetime import datetime, timezone
from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid

router = APIRouter(prefix="/api/customer/in-account-service-requests", tags=["Customer In-Account Service Requests"])

class InAccountServiceRequest(BaseModel):
    service_key: str
    service_name: str
    answers: Dict[str, Any]
    notes: Optional[str] = None

async def get_current_user(request: Request):
    """Extract user from token - simplified version"""
    import jwt
    from fastapi.security import HTTPBearer
    
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        import os
        JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("")
async def create_in_account_service_request(data: InAccountServiceRequest, request: Request):
    """Submit a service request from the customer account shell"""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        "customer_id": user["id"],
        "customer_email": user["email"],
        "customer_name": user.get("full_name", ""),
        "customer_phone": user.get("phone", ""),
        "customer_company": user.get("company", ""),
        "service_key": data.service_key,
        "service_name": data.service_name,
        "answers": data.answers,
        "notes": data.notes,
        "status": "pending",
        "source": "in_account_shell",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.in_account_service_requests.insert_one(request_doc)
    
    return {
        "id": request_id,
        "message": "Service request submitted successfully",
        "status": "pending"
    }

@router.get("")
async def list_my_in_account_service_requests(request: Request):
    """List all service requests for current customer"""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    requests = await db.in_account_service_requests.find(
        {"customer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests

@router.get("/{request_id}")
async def get_in_account_service_request(request_id: str, request: Request):
    """Get a single service request"""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    req = await db.in_account_service_requests.find_one(
        {"id": request_id, "customer_id": user["id"]},
        {"_id": 0}
    )
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return req
