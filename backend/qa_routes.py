"""
QA Routes
QA helper endpoints for launch readiness
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/qa", tags=["QA"])
security = HTTPBearer(auto_error=False)

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


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
        if role not in ["admin", "super_admin", "sales", "marketing", "production", "finance"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/health-check")
async def qa_health_check(user: dict = Depends(get_admin_user)):
    """Get QA health check and launch readiness status"""
    counts = {
        "users": await db.users.count_documents({}),
        "products": await db.products.count_documents({}),
        "inventory_variants": await db.inventory_variants.count_documents({}),
        "orders": await db.orders.count_documents({}),
        "quotes": await db.quotes_v2.count_documents({}),
        "invoices": await db.invoices.count_documents({}),
        "payments": await db.central_payments.count_documents({}),
        "creative_services": await db.creative_services.count_documents({}),
        "creative_projects": await db.creative_service_orders.count_documents({}),
        "hero_banners": await db.hero_banners.count_documents({}),
        "client_banners": await db.client_banners.count_documents({}),
        "affiliates": await db.affiliates.count_documents({}),
        "referral_settings": await db.referral_settings.count_documents({}),
        "warehouses": await db.warehouses.count_documents({}),
        "raw_materials": await db.raw_materials.count_documents({}),
    }
    
    checks = {
        "has_products": counts["products"] > 0,
        "has_variants": counts["inventory_variants"] > 0,
        "has_creative_services": counts["creative_services"] > 0,
        "has_referral_settings": counts["referral_settings"] > 0,
        "has_banners": counts["hero_banners"] > 0 or counts["client_banners"] > 0,
        "has_warehouses": counts["warehouses"] > 0,
    }
    
    ready_score = sum(1 for value in checks.values() if value)
    max_score = len(checks)
    
    return {
        "counts": counts,
        "checks": checks,
        "ready_score": ready_score,
        "max_score": max_score,
        "status": "ready" if ready_score == max_score else "needs_attention",
    }
