"""
Business Pricing Request Routes
Allows customers to request commercial/business pricing
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import jwt
import uuid

from notification_service import create_business_pricing_notification

router = APIRouter(prefix="/api/customer/business-pricing-request", tags=["Business Pricing"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


class BusinessPricingRequest(BaseModel):
    company_name: str
    industry: Optional[str] = None
    estimated_monthly_volume: Optional[str] = None
    product_categories: Optional[List[str]] = []
    service_categories: Optional[List[str]] = []
    additional_notes: Optional[str] = None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("")
async def submit_business_pricing_request(
    data: BusinessPricingRequest,
    user: dict = Depends(get_current_user)
):
    """Submit a business pricing request"""
    now = datetime.now(timezone.utc)
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": user.get("id"),
        "customer_email": user.get("email"),
        "customer_name": user.get("full_name"),
        "company_name": data.company_name,
        "industry": data.industry,
        "estimated_monthly_volume": data.estimated_monthly_volume,
        "product_categories": data.product_categories or [],
        "service_categories": data.service_categories or [],
        "additional_notes": data.additional_notes,
        "status": "pending",  # pending, contacted, qualified, converted, declined
        "assigned_to": None,
        "notes": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    
    await db.business_pricing_requests.insert_one(request_doc)
    
    # Create a lead for sales team
    lead_doc = {
        "id": str(uuid.uuid4()),
        "name": user.get("full_name", data.company_name),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "company": data.company_name,
        "source": "business_pricing_request",
        "status": "new",
        "estimated_value": 0,  # Will be updated by sales
        "notes": f"Business pricing request. Industry: {data.industry or 'N/A'}. Volume: {data.estimated_monthly_volume or 'N/A'}",
        "tags": ["business_pricing", "commercial_lead"],
        "lead_type": "commercial",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "business_pricing_request_id": request_doc["id"],
    }
    
    await db.leads.insert_one(lead_doc)
    
    # Create notifications for admin and sales
    await create_business_pricing_notification(
        db,
        company_name=data.company_name,
        customer_name=user.get("full_name", ""),
        customer_email=user.get("email", ""),
        assigned_sales_id=None,  # Will be assigned later
    )
    
    return {
        "ok": True,
        "message": "Business pricing request submitted successfully",
        "request_id": request_doc["id"],
    }


@router.get("")
async def get_my_business_pricing_requests(user: dict = Depends(get_current_user)):
    """Get customer's own business pricing requests"""
    requests = await db.business_pricing_requests.find(
        {"customer_id": user.get("id")},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    
    return requests
