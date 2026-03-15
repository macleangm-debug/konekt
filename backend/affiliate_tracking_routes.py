"""
Affiliate Click Tracking Routes
Track affiliate link clicks and set attribution cookie
"""
from datetime import datetime
import os
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/affiliate-track", tags=["Affiliate Tracking"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/{code}")
async def track_affiliate_click(code: str, request: Request):
    affiliate = await db.affiliates.find_one({"promo_code": code, "status": "active"})
    if not affiliate:
        return RedirectResponse(url="/")

    settings = await db.affiliate_settings.find_one({}) or {}
    cookie_days = int(settings.get("cookie_window_days", 30) or 30)

    await db.affiliate_clicks.insert_one(
        {
            "promo_code": code,
            "affiliate_email": affiliate.get("email"),
            "affiliate_name": affiliate.get("name"),
            "ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "created_at": datetime.utcnow(),
        }
    )

    response = RedirectResponse(url=f"/?affiliate={code}")
    response.set_cookie(
        key="affiliate_code",
        value=code,
        max_age=cookie_days * 24 * 60 * 60,
        httponly=False,
        samesite="lax",
    )
    return response
