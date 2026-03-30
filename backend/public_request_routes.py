"""
Public Requests Routes
Handles all public-facing form submissions (contact, quote request, business pricing).
All submissions flow into the unified Requests module.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import os

from services.public_request_intake_service import create_public_request

router = APIRouter(prefix="/api/public-requests", tags=["Public Requests"])
_security = HTTPBearer(auto_error=False)


async def _optional_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(_security)):
    if not credentials:
        return None
    JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


@router.post("")
async def submit_public_request(payload: dict, request: Request, user: dict = Depends(_optional_user)):
    """Generic public request submission. request_type must be in payload."""
    db = request.app.mongodb
    try:
        return await create_public_request(db=db, payload=payload, user=user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/contact")
async def submit_contact_request(payload: dict, request: Request, user: dict = Depends(_optional_user)):
    """Contact form submission — persists as contact_general request."""
    db = request.app.mongodb
    normalized = {
        "request_type": "contact_general",
        "title": payload.get("subject") or "General Contact Request",
        "name": payload.get("name"),
        "email": payload.get("email"),
        "guest_email": payload.get("email"),
        "guest_name": payload.get("name"),
        "phone_prefix": payload.get("phone_prefix") or "+255",
        "phone": payload.get("phone"),
        "company": payload.get("company"),
        "message": payload.get("message"),
        "source_page": "/contact",
        "details": {
            "subject": payload.get("subject"),
            "company_name": payload.get("company"),
        },
    }
    try:
        return await create_public_request(db=db, payload=normalized, user=user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
