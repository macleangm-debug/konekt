from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
import os

router = APIRouter(prefix="/api/affiliate-portal", tags=["Affiliate Portal"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def get_affiliate_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify affiliate user from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        
        # Check if this is an affiliate token
        if payload.get("type") == "affiliate":
            affiliate = await db.affiliates.find_one({"id": payload["affiliate_id"]})
            if not affiliate:
                raise HTTPException(status_code=401, detail="Affiliate not found")
            if affiliate.get("status") != "active":
                raise HTTPException(status_code=403, detail="Affiliate account is not active")
            return serialize_doc(affiliate)
        
        # Or check if user is linked to an affiliate
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Find affiliate by email
        affiliate = await db.affiliates.find_one({"email": user.get("email")})
        if not affiliate:
            raise HTTPException(status_code=403, detail="Not an affiliate partner")
        if affiliate.get("status") != "active":
            raise HTTPException(status_code=403, detail="Affiliate account is not active")
        
        return serialize_doc(affiliate)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/login")
async def affiliate_login(email: str, password: str):
    """Login for affiliates - returns JWT token"""
    # First try to find user with this email
    user = await db.users.find_one({"email": email})
    
    if user:
        # Verify password (assuming bcrypt)
        import bcrypt
        if not bcrypt.checkpw(password.encode('utf-8'), user.get("password_hash", "").encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        raise HTTPException(status_code=401, detail="User not found. Please register first.")
    
    # Check if user is an affiliate
    affiliate = await db.affiliates.find_one({"email": email})
    if not affiliate:
        raise HTTPException(status_code=403, detail="You are not registered as an affiliate partner")
    
    if affiliate.get("status") != "active":
        raise HTTPException(status_code=403, detail="Your affiliate account is not active")
    
    # Generate JWT token with affiliate info
    token = jwt.encode({
        "user_id": user.get("id"),
        "email": email,
        "affiliate_id": affiliate.get("id"),
        "type": "affiliate",
        "exp": datetime.utcnow().timestamp() + 86400 * 7  # 7 days
    }, JWT_SECRET, algorithm="HS256")
    
    return {
        "token": token,
        "affiliate_id": affiliate.get("id"),
        "name": affiliate.get("full_name"),
        "promo_code": affiliate.get("promo_code"),
        "tier": affiliate.get("tier")
    }


@router.get("/me")
async def get_my_profile(affiliate: dict = Depends(get_affiliate_user)):
    """Get current affiliate profile"""
    return affiliate


@router.get("/dashboard")
async def get_dashboard(affiliate: dict = Depends(get_affiliate_user)):
    """Get affiliate dashboard data"""
    affiliate_id = affiliate.get("id")
    
    # Get commissions
    commissions = await db.affiliate_commissions.find({"affiliate_id": affiliate_id}).to_list(length=500)
    
    total_commission = sum(float(c.get("commission_amount", 0)) for c in commissions)
    pending_commission = sum(float(c.get("commission_amount", 0)) for c in commissions if c.get("status") == "pending")
    paid_commission = sum(float(c.get("commission_amount", 0)) for c in commissions if c.get("status") == "paid")
    
    # Get recent conversions
    recent_conversions = await db.affiliate_commissions.find(
        {"affiliate_id": affiliate_id}
    ).sort("created_at", -1).limit(10).to_list(length=10)
    
    # Get payout requests
    payout_requests = await db.affiliate_payout_requests.find(
        {"affiliate_id": affiliate_id}
    ).sort("created_at", -1).limit(5).to_list(length=5)
    
    return {
        "profile": {
            "full_name": affiliate.get("full_name"),
            "email": affiliate.get("email"),
            "promo_code": affiliate.get("promo_code"),
            "tier": affiliate.get("tier"),
            "commission_rate": affiliate.get("commission_rate"),
        },
        "stats": {
            "total_sales": float(affiliate.get("total_sales", 0)),
            "total_commission": round(total_commission, 2),
            "pending_commission": round(pending_commission, 2),
            "paid_commission": round(paid_commission, 2),
            "conversion_count": len(commissions),
        },
        "tracking_link": f"https://konekt.co.tz/a/{affiliate.get('promo_code')}",
        "recent_conversions": [serialize_doc(c) for c in recent_conversions],
        "payout_requests": [serialize_doc(p) for p in payout_requests],
    }


@router.get("/commissions")
async def get_commissions(
    affiliate: dict = Depends(get_affiliate_user),
    status: str = None,
    limit: int = 50
):
    """Get commission history"""
    query = {"affiliate_id": affiliate.get("id")}
    if status:
        query["status"] = status
    
    commissions = await db.affiliate_commissions.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)
    return [serialize_doc(c) for c in commissions]


@router.post("/payout-request")
async def request_payout(
    amount: float,
    payment_method: str = "bank_transfer",
    payment_details: str = None,
    affiliate: dict = Depends(get_affiliate_user)
):
    """Request a commission payout"""
    # Calculate available balance
    commissions = await db.affiliate_commissions.find({
        "affiliate_id": affiliate.get("id"),
        "status": "pending"
    }).to_list(length=500)
    
    available_balance = sum(float(c.get("commission_amount", 0)) for c in commissions)
    
    if amount > available_balance:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Available: {available_balance}"
        )
    
    if amount < 50000:  # Minimum payout threshold
        raise HTTPException(
            status_code=400,
            detail="Minimum payout amount is TZS 50,000"
        )
    
    now = datetime.utcnow()
    payout_doc = {
        "affiliate_id": affiliate.get("id"),
        "affiliate_name": affiliate.get("full_name"),
        "affiliate_email": affiliate.get("email"),
        "amount": amount,
        "currency": "TZS",
        "payment_method": payment_method,
        "payment_details": payment_details,
        "status": "pending",
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.affiliate_payout_requests.insert_one(payout_doc)
    created = await db.affiliate_payout_requests.find_one({"_id": result.inserted_id})
    
    return serialize_doc(created)


@router.get("/resources")
async def get_marketing_resources(affiliate: dict = Depends(get_affiliate_user)):
    """Get marketing resources and assets"""
    promo_code = affiliate.get("promo_code")
    
    return {
        "tracking_link": f"https://konekt.co.tz/a/{promo_code}",
        "promo_code": promo_code,
        "banner_images": [
            {"name": "Banner 728x90", "url": f"https://konekt.co.tz/assets/affiliate/banner-728x90.png?code={promo_code}"},
            {"name": "Square 300x300", "url": f"https://konekt.co.tz/assets/affiliate/square-300x300.png?code={promo_code}"},
            {"name": "Vertical 300x600", "url": f"https://konekt.co.tz/assets/affiliate/vertical-300x600.png?code={promo_code}"},
        ],
        "social_copy": [
            {
                "platform": "Instagram/Facebook",
                "text": f"Get professional business branding and merchandise from Konekt! Use my code {promo_code} for exclusive benefits. Shop now: konekt.co.tz/a/{promo_code}"
            },
            {
                "platform": "LinkedIn",
                "text": f"Looking to brand your business? Konekt offers professional merchandise, office equipment, and design services. Check them out: konekt.co.tz/a/{promo_code}"
            },
            {
                "platform": "WhatsApp",
                "text": f"Hi! I recommend Konekt for all your business branding needs - logos, merchandise, office equipment and more. Use code {promo_code}: konekt.co.tz/a/{promo_code}"
            }
        ],
        "commission_structure": {
            "rate": affiliate.get("commission_rate", 10),
            "tier": affiliate.get("tier", "silver"),
            "min_payout": 50000,
            "payout_frequency": "Weekly",
            "payment_methods": ["Bank Transfer", "Mobile Money"]
        }
    }
