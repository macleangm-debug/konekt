from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import hashlib

router = APIRouter(prefix="/api/affiliates", tags=["Affiliate Public"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]


def sanitize_code_seed(value: str):
    value = re.sub(r"[^A-Za-z0-9]+", "", (value or "").upper())
    return value[:8] or "AFFIL"


async def generate_unique_affiliate_code(seed: str):
    base = sanitize_code_seed(seed)
    candidate = base
    counter = 1

    while await db.affiliates.find_one({"affiliate_code": candidate}):
        suffix = str(counter)
        candidate = f"{base[:max(1, 8 - len(suffix))]}{suffix}"
        counter += 1

    return candidate


@router.get("/code/{affiliate_code}")
async def get_affiliate_by_code(affiliate_code: str):
    """Public endpoint to get affiliate info by code"""
    affiliate = await db.affiliates.find_one(
        {"affiliate_code": affiliate_code.upper(), "is_active": True}
    )
    if not affiliate:
        # Also try lowercase
        affiliate = await db.affiliates.find_one(
            {"affiliate_code": affiliate_code, "is_active": True}
        )
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate code not found")

    return {
        "affiliate_code": affiliate.get("affiliate_code"),
        "name": affiliate.get("name"),
        "message": "Use this promo code or link to access special Konekt offers.",
    }


@router.post("/public/register")
async def register_affiliate(payload: dict, request: Request):
    """Public endpoint to register as an affiliate"""
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    existing_user = await db.users.find_one({"email": email})
    existing_affiliate = await db.affiliates.find_one({"email": email})

    if existing_user or existing_affiliate:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    full_name = (payload.get("full_name") or "").strip()
    phone = (payload.get("phone") or "").strip()
    country = (payload.get("country") or "Tanzania").strip()
    password = (payload.get("password") or "").strip()

    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    affiliate_code = await generate_unique_affiliate_code(full_name or email.split("@")[0])

    # Hash password
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    # Get base URL for referral link
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt.app")

    user_doc = {
        "email": email,
        "name": full_name,
        "full_name": full_name,
        "phone": phone,
        "role": "affiliate",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "password_hash": password_hash,
    }

    affiliate_doc = {
        "affiliate_code": affiliate_code,
        "name": full_name,
        "email": email,
        "phone": phone,
        "country": country,
        "status": "active",
        "is_active": True,
        "commission_rate": 8,
        "promo_discount": 0,
        "promo_code": affiliate_code,
        "referral_link": f"{base_url}/?ref={affiliate_code}",
        "currency": "TZS",
        "total_sales": 0,
        "total_commission": 0,
        "pending_commission": 0,
        "paid_commission": 0,
        "payout_profile": {
            "method": "bank",
            "bank_name": "",
            "account_name": "",
            "account_number": "",
            "mobile_money_number": "",
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    await db.users.insert_one(user_doc)
    await db.affiliates.insert_one(affiliate_doc)

    return {
        "ok": True,
        "affiliate_code": affiliate_code,
        "message": "Affiliate account created successfully.",
    }
