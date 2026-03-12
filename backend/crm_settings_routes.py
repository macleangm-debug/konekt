from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
import os

router = APIRouter(prefix="/api/admin/crm-settings", tags=["CRM Settings"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')

DEFAULT_INDUSTRIES = [
    "Banking", "Insurance", "Education", "Healthcare", "Telecom", "NGO",
    "Government", "Construction", "Retail", "Hospitality", "Manufacturing",
    "Logistics", "Media", "Technology", "FMCG", "Agriculture", "Mining", "Other"
]

DEFAULT_SOURCES = [
    "Website", "Walk-in", "Referral", "Affiliate", "Instagram", "Facebook",
    "LinkedIn", "WhatsApp", "Call", "Email", "Existing Client", "Event",
    "Trade Show", "Sales Outreach", "Partner", "Other"
]


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
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def get_crm_settings(user: dict = Depends(get_admin_user)):
    """Get CRM settings including industries and sources"""
    doc = await db.crm_settings.find_one({})
    if not doc:
        now = datetime.utcnow()
        default_doc = {
            "industries": DEFAULT_INDUSTRIES,
            "sources": DEFAULT_SOURCES,
            "lead_statuses": ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
            "created_at": now,
            "updated_at": now,
        }
        result = await db.crm_settings.insert_one(default_doc)
        doc = await db.crm_settings.find_one({"_id": result.inserted_id})
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.put("")
async def update_crm_settings(payload: dict, user: dict = Depends(get_admin_user)):
    """Update CRM settings"""
    now = datetime.utcnow()
    
    update_data = {
        "updated_at": now
    }
    
    if "industries" in payload:
        update_data["industries"] = payload["industries"]
    if "sources" in payload:
        update_data["sources"] = payload["sources"]
    if "lead_statuses" in payload:
        update_data["lead_statuses"] = payload["lead_statuses"]
    
    existing = await db.crm_settings.find_one({})
    if existing:
        await db.crm_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data},
        )
        updated = await db.crm_settings.find_one({"_id": existing["_id"]})
    else:
        update_data["industries"] = payload.get("industries", DEFAULT_INDUSTRIES)
        update_data["sources"] = payload.get("sources", DEFAULT_SOURCES)
        update_data["created_at"] = now
        result = await db.crm_settings.insert_one(update_data)
        updated = await db.crm_settings.find_one({"_id": result.inserted_id})

    updated["id"] = str(updated["_id"])
    del updated["_id"]
    return updated


@router.get("/staff")
async def get_staff_list(user: dict = Depends(get_admin_user)):
    """Get list of staff members for assignment dropdowns"""
    staff = await db.users.find(
        {"role": {"$in": ["admin", "sales", "marketing", "production"]}, "is_active": True},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1, "role": 1}
    ).to_list(length=100)
    return staff
