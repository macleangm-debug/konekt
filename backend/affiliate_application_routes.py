from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from bson import ObjectId
import jwt
import os
import uuid

router = APIRouter(prefix="/api/affiliate-applications", tags=["Affiliate Applications"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


class AffiliateApplicationCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    social_links: List[str] = []
    audience_size: Optional[str] = None
    industries: List[str] = []
    region: Optional[str] = None
    country: str = "Tanzania"
    why_partner: Optional[str] = None
    how_promote: Optional[str] = None
    portfolio_link: Optional[str] = None
    notes: Optional[str] = None


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
        if role not in ["admin", "sales", "marketing"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("")
async def submit_application(payload: AffiliateApplicationCreate):
    """Submit a new affiliate application (public)"""
    # Check if email already applied
    existing = await db.affiliate_applications.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="An application with this email already exists")
    
    now = datetime.utcnow()
    doc = payload.model_dump()
    doc["status"] = "pending_review"
    doc["status_history"] = [{
        "status": "pending_review",
        "note": "Application submitted",
        "timestamp": now.isoformat()
    }]
    doc["created_at"] = now
    doc["updated_at"] = now
    
    result = await db.affiliate_applications.insert_one(doc)
    created = await db.affiliate_applications.find_one({"_id": result.inserted_id})
    
    return serialize_doc(created)


@router.get("")
async def list_applications(
    user: dict = Depends(get_admin_user),
    status: str = None
):
    """List all affiliate applications (admin)"""
    query = {}
    if status:
        query["status"] = status
    
    docs = await db.affiliate_applications.find(query).sort("created_at", -1).to_list(length=200)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{application_id}")
async def get_application(application_id: str, user: dict = Depends(get_admin_user)):
    """Get a single application (admin)"""
    doc = await db.affiliate_applications.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return serialize_doc(doc)


@router.post("/{application_id}/approve")
async def approve_application(
    application_id: str,
    commission_rate: float = 10.0,
    tier: str = "silver",
    user: dict = Depends(get_admin_user)
):
    """Approve an application and create affiliate partner"""
    application = await db.affiliate_applications.find_one({"_id": ObjectId(application_id)})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if application.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Application already approved")
    
    # Check if affiliate already exists
    existing_affiliate = await db.affiliates.find_one({"email": application["email"]})
    if existing_affiliate:
        raise HTTPException(status_code=400, detail="Affiliate with this email already exists")
    
    now = datetime.utcnow()
    
    # Generate unique promo code
    code_base = application.get("company_name") or application["full_name"]
    promo_code = f"{code_base[:6].upper().replace(' ', '')}{str(uuid.uuid4())[:4].upper()}"
    
    # Create affiliate record
    affiliate_doc = {
        "id": str(uuid.uuid4()),
        "full_name": application["full_name"],
        "email": application["email"],
        "phone": application.get("phone"),
        "company_name": application.get("company_name"),
        "website": application.get("website"),
        "social_links": application.get("social_links", []),
        "industries": application.get("industries", []),
        "region": application.get("region"),
        "country": application.get("country", "Tanzania"),
        "promo_code": promo_code,
        "commission_rate": commission_rate,
        "tier": tier,
        "status": "active",
        "total_sales": 0,
        "total_commission": 0,
        "pending_commission": 0,
        "paid_commission": 0,
        "application_id": application_id,
        "created_at": now,
        "updated_at": now
    }
    
    await db.affiliates.insert_one(affiliate_doc)
    
    # Update application status
    await db.affiliate_applications.update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "status": "approved",
                "approved_by": user.get("email"),
                "approved_at": now,
                "affiliate_id": affiliate_doc["id"],
                "updated_at": now
            },
            "$push": {
                "status_history": {
                    "status": "approved",
                    "note": f"Approved by {user.get('email')}. Commission rate: {commission_rate}%, Tier: {tier}",
                    "timestamp": now.isoformat()
                }
            }
        }
    )
    
    return {
        "message": "Application approved",
        "affiliate_id": affiliate_doc["id"],
        "promo_code": promo_code,
        "commission_rate": commission_rate,
        "tier": tier
    }


@router.post("/{application_id}/reject")
async def reject_application(
    application_id: str,
    reason: str = "Does not meet requirements",
    user: dict = Depends(get_admin_user)
):
    """Reject an application"""
    application = await db.affiliate_applications.find_one({"_id": ObjectId(application_id)})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if application.get("status") in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail=f"Application already {application.get('status')}")
    
    now = datetime.utcnow()
    
    await db.affiliate_applications.update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "status": "rejected",
                "rejected_by": user.get("email"),
                "rejected_at": now,
                "rejection_reason": reason,
                "updated_at": now
            },
            "$push": {
                "status_history": {
                    "status": "rejected",
                    "note": f"Rejected by {user.get('email')}: {reason}",
                    "timestamp": now.isoformat()
                }
            }
        }
    )
    
    return {"message": "Application rejected", "reason": reason}


@router.get("/check/{email}")
async def check_application_status(email: str):
    """Check application status by email (public)"""
    application = await db.affiliate_applications.find_one({"email": email})
    if not application:
        return {"exists": False, "status": None}
    
    return {
        "exists": True,
        "status": application.get("status"),
        "submitted_at": application.get("created_at"),
        "affiliate_id": application.get("affiliate_id") if application.get("status") == "approved" else None
    }
