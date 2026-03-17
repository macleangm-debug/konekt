"""
QA Seed Routes
Seed data for launch QA testing
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
import os
import uuid

router = APIRouter(prefix="/api/admin/qa-seed", tags=["QA Seed"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "super_admin"]:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/full-launch-seed")
async def full_launch_seed(user: dict = Depends(get_admin_user)):
    """Initialize full QA seed data for launch testing"""
    now = datetime.now(timezone.utc)
    
    # Seed numbering rules if not present
    numbering_rules = [
        {"entity_type": "sku", "entity_code": "SKU", "format_string": "[CompanyCode]-[EntityCode]-[AlphaNum]"},
        {"entity_type": "quote", "entity_code": "QT", "format_string": "[CompanyCode]-[EntityCode]-[YY]-[SEQ]"},
        {"entity_type": "invoice", "entity_code": "INV", "format_string": "[CompanyCode]-[EntityCode]-[YY]-[SEQ]"},
        {"entity_type": "order", "entity_code": "ORD", "format_string": "[CompanyCode]-[EntityCode]-[YY]-[SEQ]"},
        {"entity_type": "service_request", "entity_code": "SR", "format_string": "[CompanyCode]-[EntityCode]-[YY]-[SEQ]"},
    ]
    
    for rule in numbering_rules:
        existing = await db.numbering_rules.find_one({"entity_type": rule["entity_type"]})
        if not existing:
            await db.numbering_rules.insert_one({
                **rule,
                "allow_manual_input": False,
                "auto_generate": True,
                "alnum_length": 6,
                "is_active": True,
                "created_at": now.isoformat(),
            })
    
    # Seed points rules config if not present
    points_config = await db.points_rules_config.find_one({"type": "global"})
    if not points_config:
        await db.points_rules_config.insert_one({
            "type": "global",
            "points_enabled": True,
            "protected_margin_percent": 40,
            "points_cap_percent": 10,
            "points_value_per_unit": 1.0,
            "created_at": now.isoformat(),
        })
    
    return {
        "ok": True,
        "message": "Launch QA seed initiated. Use seeded catalog, services, and settings for testing.",
        "seeded_at": now.isoformat(),
    }


@router.get("/status")
async def qa_seed_status(user: dict = Depends(get_admin_user)):
    """Check QA seed status"""
    numbering_rules_count = await db.numbering_rules.count_documents({})
    points_config = await db.points_rules_config.find_one({"type": "global"})
    products_count = await db.products.count_documents({"is_active": True})
    services_count = await db.services.count_documents({"is_active": True})
    
    return {
        "numbering_rules_configured": numbering_rules_count > 0,
        "points_rules_configured": points_config is not None,
        "products_count": products_count,
        "services_count": services_count,
        "ready_for_qa": numbering_rules_count > 0 and points_config is not None,
    }
