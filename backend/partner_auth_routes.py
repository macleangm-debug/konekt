"""
Partner Authentication Routes
Separate auth system for partner users
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Header
import os
import jwt
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

router = APIRouter(prefix="/api/partner-auth", tags=["Partner Auth"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

SECRET_KEY = os.environ.get('PARTNER_JWT_SECRET', 'konekt-partner-secret-2024')
ALGORITHM = "HS256"


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if "password_hash" in doc:
        del doc["password_hash"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_partner_token(partner_user: dict) -> str:
    payload = {
        "sub": partner_user["email"],
        "partner_id": partner_user["partner_id"],
        "partner_user_id": str(partner_user.get("_id") or partner_user.get("id")),
        "role": "partner_user",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/login")
async def partner_login(payload: dict):
    """Partner user login"""
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    user = await db.partner_users.find_one({"email": email, "status": "active"})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Get partner info
    partner = await db.partners.find_one({"_id": ObjectId(user["partner_id"])})
    
    token = create_partner_token(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_doc(user),
        "partner": serialize_doc(partner) if partner else None,
    }


@router.get("/me")
async def get_current_partner_user(authorization: str = Header(None)):
    """Get current partner user from token"""
    from partner_access_service import get_partner_user_from_token
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "").strip()
    user = await get_partner_user_from_token(token)
    
    partner = await db.partners.find_one({"_id": ObjectId(user["partner_id"])})
    
    return {
        "user": serialize_doc(user),
        "partner": serialize_doc(partner) if partner else None,
    }


# Admin route to create partner users
@router.post("/admin/create-user")
async def admin_create_partner_user(payload: dict):
    """Admin creates a partner user account"""
    partner_id = payload.get("partner_id")
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password")
    full_name = payload.get("full_name")
    role = payload.get("role", "admin")  # admin | staff

    if not partner_id or not email or not password:
        raise HTTPException(status_code=400, detail="partner_id, email, and password required")

    # Verify partner exists
    partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Check if email already exists
    existing = await db.partner_users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "partner_id": partner_id,
        "email": email,
        "password_hash": hash_password(password),
        "full_name": full_name or email.split("@")[0],
        "role": role,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.partner_users.insert_one(doc)
    created = await db.partner_users.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/admin/partner-users/{partner_id}")
async def list_partner_users(partner_id: str):
    """List all users for a partner"""
    docs = await db.partner_users.find({"partner_id": partner_id}).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]
