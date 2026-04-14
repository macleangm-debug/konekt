"""
Sales Promo Code Routes
Personal promo codes for sales staff — same rules as affiliate codes.
Unified creative generator access for sales dashboard.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
import re

router = APIRouter(prefix="/api/sales-promo", tags=["Sales Promo Code"])
security = HTTPBearer(auto_error=False)

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")


async def _get_sales_user(credentials: HTTPAuthorizationCredentials, db):
    """Get sales user from JWT token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/my-code")
async def get_my_promo_code(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current sales user's promo code."""
    db = request.app.mongodb
    user = await _get_sales_user(credentials, db)
    return {
        "promo_code": user.get("sales_promo_code", ""),
        "promo_code_created_at": user.get("sales_promo_code_created_at"),
        "has_code": bool(user.get("sales_promo_code")),
    }


@router.post("/create-code")
async def create_promo_code(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create or update sales promo code. Validates uniqueness across system."""
    db = request.app.mongodb
    user = await _get_sales_user(credentials, db)
    body = await request.json()

    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    settings = settings_row.get("value", {}) if settings_row else {}
    sales_settings = settings.get("sales", {})
    if not sales_settings.get("sales_promo_codes_enabled", True):
        raise HTTPException(status_code=403, detail="Sales promo codes are not enabled")

    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Promo code is required")
    if len(code) < 3 or len(code) > 20:
        raise HTTPException(status_code=400, detail="Promo code must be 3-20 characters")
    if not re.match(r"^[A-Z0-9_]+$", code):
        raise HTTPException(status_code=400, detail="Only letters, numbers, and underscores allowed")

    existing_aff = await db.affiliates.find_one(
        {"affiliate_code": code}, {"_id": 0}
    )
    if existing_aff:
        raise HTTPException(status_code=409, detail="This code is already taken by an affiliate")

    existing_sales = await db.users.find_one(
        {"sales_promo_code": code, "id": {"$ne": user["id"]}}, {"_id": 0}
    )
    if existing_sales:
        raise HTTPException(status_code=409, detail="This code is already taken by another sales member")

    existing_promo = await db.promotions.find_one({"code": code}, {"_id": 0})
    if existing_promo:
        raise HTTPException(status_code=409, detail="This code conflicts with an existing promotion")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "sales_promo_code": code,
            "sales_promo_code_created_at": now,
        }}
    )

    return {"ok": True, "code": code}


@router.get("/validate-code/{code}")
async def validate_sales_code(code: str, request: Request):
    """Check if a promo code is available (public)."""
    db = request.app.mongodb
    code = code.strip().upper()
    if len(code) < 3 or len(code) > 20 or not re.match(r"^[A-Z0-9_]+$", code):
        return {"available": False, "reason": "Invalid format"}

    existing_aff = await db.affiliates.find_one({"affiliate_code": code}, {"_id": 0})
    if existing_aff:
        return {"available": False, "reason": "Already taken"}

    existing_sales = await db.users.find_one({"sales_promo_code": code}, {"_id": 0})
    if existing_sales:
        return {"available": False, "reason": "Already taken"}

    existing_promo = await db.promotions.find_one({"code": code}, {"_id": 0})
    if existing_promo:
        return {"available": False, "reason": "Conflicts with existing promotion"}

    return {"available": True}


@router.get("/campaigns")
async def get_sales_campaigns(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get shareable campaigns for sales user with auto-injected promo code."""
    db = request.app.mongodb
    user = await _get_sales_user(credentials, db)

    promo_code = user.get("sales_promo_code", "")
    if not promo_code:
        return {"campaigns": [], "promo_code": "", "has_code": False, "total": 0}

    from services.creative_generator_service import generate_campaign_content, get_shareable_products
    products = await get_shareable_products(db)
    campaigns = await generate_campaign_content(db, products, "sales", promo_code)

    return {"campaigns": campaigns, "promo_code": promo_code, "has_code": True, "total": len(campaigns)}
