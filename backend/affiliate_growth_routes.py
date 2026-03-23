from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import jwt

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate"])

async def get_affiliate_user(request: Request):
    """Extract affiliate user from token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.affiliates.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user:
            # Try to find regular user with affiliate role
            user = await db.users.find_one({"id": payload["user_id"], "role": "affiliate"}, {"_id": 0})
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/stats")
async def get_affiliate_stats(request: Request):
    """Get affiliate stats"""
    user = await get_affiliate_user(request)
    if not user:
        return {
            "total_earnings": 0,
            "pending_earnings": 0,
            "total_clicks": 0,
            "total_conversions": 0
        }
    
    db = request.app.mongodb
    
    # Get referrals for this affiliate
    affiliate_id = user.get("id") or user.get("user_id")
    referrals = await db.referrals.find(
        {"affiliate_id": affiliate_id},
        {"_id": 0}
    ).to_list(1000)
    
    total_earnings = sum(r.get("commission", 0) for r in referrals if r.get("status") == "paid")
    pending_earnings = sum(r.get("commission", 0) for r in referrals if r.get("status") == "pending")
    total_conversions = len([r for r in referrals if r.get("status") in ["paid", "completed"]])
    
    # Get click count from affiliate tracking
    clicks = await db.affiliate_clicks.count_documents({"affiliate_id": affiliate_id})
    
    return {
        "total_earnings": total_earnings,
        "pending_earnings": pending_earnings,
        "total_clicks": clicks,
        "total_conversions": total_conversions
    }

@router.get("/profile")
async def get_affiliate_profile(request: Request):
    """Get affiliate profile with referral code"""
    user = await get_affiliate_user(request)
    if not user:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")
    
    return {
        "id": user.get("id") or user.get("user_id"),
        "affiliate_code": user.get("affiliate_code", user.get("id", "")[:8].upper()),
        "name": user.get("name") or user.get("full_name", ""),
        "email": user.get("email", ""),
        "commission_rate": user.get("commission_rate", 10),
        "status": user.get("status", "active"),
    }

@router.get("/referrals")
async def get_affiliate_referrals(request: Request):
    """Get affiliate's referral history"""
    user = await get_affiliate_user(request)
    if not user:
        return []
    
    db = request.app.mongodb
    affiliate_id = user.get("id") or user.get("user_id")
    
    referrals = await db.referrals.find(
        {"affiliate_id": affiliate_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return referrals

@router.post("/track-click")
async def track_affiliate_click(request: Request):
    """Track affiliate link click"""
    body = await request.json()
    affiliate_code = body.get("code")
    
    if not affiliate_code:
        raise HTTPException(status_code=400, detail="Affiliate code required")
    
    db = request.app.mongodb
    
    # Find affiliate by code
    affiliate = await db.affiliates.find_one(
        {"affiliate_code": affiliate_code.upper()},
        {"_id": 0}
    )
    
    if not affiliate:
        # Try finding by user with that code
        affiliate = await db.users.find_one(
            {"affiliate_code": affiliate_code.upper()},
            {"_id": 0}
        )
    
    if not affiliate:
        raise HTTPException(status_code=404, detail="Invalid affiliate code")
    
    # Record click
    click = {
        "id": str(uuid.uuid4()),
        "affiliate_id": affiliate.get("id") or affiliate.get("user_id"),
        "affiliate_code": affiliate_code.upper(),
        "ip": request.client.host,
        "user_agent": request.headers.get("user-agent", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.affiliate_clicks.insert_one(click)
    
    return {"message": "Click tracked", "affiliate_id": click["affiliate_id"]}
