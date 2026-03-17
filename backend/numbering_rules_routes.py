"""
Numbering Rules Routes
Admin configuration for document numbering formats
"""
from datetime import datetime
from fastapi import APIRouter, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
import os

from numbering_rules_service import generate_entity_number

router = APIRouter(prefix="/api/admin/numbering-rules", tags=["Numbering Rules"])

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
        if role not in ["admin", "super_admin", "finance"]:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid token")


def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


@router.get("")
async def list_numbering_rules(user: dict = Depends(get_admin_user)):
    docs = await db.numbering_rules.find({}).sort("entity_type", 1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


@router.post("")
async def create_or_update_numbering_rule(payload: dict, user: dict = Depends(get_admin_user)):
    entity_type = payload.get("entity_type", "").strip()
    existing = await db.numbering_rules.find_one({"entity_type": entity_type})

    doc = {
        "entity_type": entity_type,  # sku | quote | invoice | order | service_request
        "entity_code": payload.get("entity_code", entity_type.upper()[:3]),
        "format_string": payload.get("format_string", "[CompanyCode]-[EntityCode]-[YY]-[SEQ]"),
        "allow_manual_input": bool(payload.get("allow_manual_input", False)),
        "auto_generate": bool(payload.get("auto_generate", True)),
        "alnum_length": int(payload.get("alnum_length", 6) or 6),
        "is_active": bool(payload.get("is_active", True)),
        "updated_at": datetime.utcnow(),
        "updated_by": user.get("id"),
    }

    if existing:
        await db.numbering_rules.update_one({"_id": existing["_id"]}, {"$set": doc})
        updated = await db.numbering_rules.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)

    doc["created_at"] = datetime.utcnow()
    result = await db.numbering_rules.insert_one(doc)
    created = await db.numbering_rules.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.post("/preview")
async def preview_numbering_rule(payload: dict, user: dict = Depends(get_admin_user)):
    value = await generate_entity_number(
        db,
        entity_type=payload.get("entity_type", "order"),
        company_code=payload.get("company_code", "KON"),
        country_code=payload.get("country_code", "TZ"),
        manual_value=payload.get("manual_value"),
    )
    return {"preview": value}
