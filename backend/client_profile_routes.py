"""
Client Profile Routes
Structured client commercial profiling for sales visibility
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import jwt
import os

router = APIRouter(prefix="/api/client-profiles", tags=["Client Profiles"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


class ClientProfileInput(BaseModel):
    company_name: Optional[str] = ""
    buying_as: Optional[str] = "company"  # individual, company, institution
    order_frequency: Optional[str] = ""
    main_interest: Optional[str] = "both"  # products, services, both
    monthly_budget_range: Optional[str] = ""
    categories_of_interest: Optional[List[str]] = []
    preferred_contact_method: Optional[str] = "phone"  # phone, email, whatsapp
    urgent_need: Optional[str] = ""
    multi_location: Optional[bool] = False
    needs_contract_pricing: Optional[bool] = False
    needs_recurring_support: Optional[bool] = False


def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


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


@router.get("/me")
async def get_my_client_profile(user: dict = Depends(get_current_user)):
    """Get current user's client profile"""
    email = user.get("email", "")
    doc = await db.client_profiles.find_one({"email": email})
    if not doc:
        return None
    return serialize_doc(doc)


@router.post("/me")
async def create_or_update_my_client_profile(
    data: ClientProfileInput,
    user: dict = Depends(get_current_user)
):
    """Create or update current user's client profile"""
    now = datetime.now(timezone.utc)
    email = user.get("email", "").strip().lower()
    full_name = user.get("full_name", "")

    existing = await db.client_profiles.find_one({"email": email})

    doc = {
        "email": email,
        "full_name": full_name,
        "user_id": user.get("id"),
        "company_name": data.company_name,
        "buying_as": data.buying_as,
        "order_frequency": data.order_frequency,
        "main_interest": data.main_interest,
        "monthly_budget_range": data.monthly_budget_range,
        "categories_of_interest": data.categories_of_interest or [],
        "preferred_contact_method": data.preferred_contact_method,
        "urgent_need": data.urgent_need,
        "multi_location": data.multi_location,
        "needs_contract_pricing": data.needs_contract_pricing,
        "needs_recurring_support": data.needs_recurring_support,
        "updated_at": now.isoformat(),
    }

    if existing:
        await db.client_profiles.update_one({"_id": existing["_id"]}, {"$set": doc})
        updated = await db.client_profiles.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)

    doc["created_at"] = now.isoformat()
    result = await db.client_profiles.insert_one(doc)
    created = await db.client_profiles.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/admin/{user_id}")
async def get_client_profile_admin(
    user_id: str,
    admin_user: dict = Depends(get_current_user)
):
    """Admin view of a client profile"""
    if admin_user.get("role") not in ["admin", "super_admin", "staff", "sales"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    doc = await db.client_profiles.find_one({"user_id": user_id})
    if not doc:
        return None
    return serialize_doc(doc)
