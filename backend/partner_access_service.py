"""
Partner Access Service
Helper functions for partner authentication and authorization
"""
import os
import jwt
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

SECRET_KEY = os.environ.get('PARTNER_JWT_SECRET', 'konekt-partner-secret-2024')
ALGORITHM = "HS256"

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def get_partner_user_from_token(token: str):
    """Decode token and return partner user"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    email = payload.get("sub")
    partner_id = payload.get("partner_id")

    if not email or not partner_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await db.partner_users.find_one({
        "email": email,
        "partner_id": partner_id,
        "status": "active",
    })

    if not user:
        raise HTTPException(status_code=401, detail="Partner user not found or inactive")

    return user


async def get_partner_user_from_header(authorization: str):
    """Extract token from header and return partner user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization.replace("Bearer ", "").strip()
    return await get_partner_user_from_token(token)


async def verify_partner_owns_resource(partner_id: str, resource_partner_id: str):
    """Verify that the partner owns the resource they're trying to access"""
    if partner_id != resource_partner_id:
        raise HTTPException(status_code=403, detail="Access denied - resource belongs to different partner")
    return True
