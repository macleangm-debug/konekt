from datetime import datetime
import os
import jwt
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/service-forms", tags=["Service Forms"])
security = HTTPBearer(auto_error=False)

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user and verify they have admin/staff role"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/public")
async def list_public_service_forms(request: Request, category: str | None = None):
    query = {"is_active": True}
    if category:
        query["category"] = category

    docs = await db.service_forms.find(query).sort("position", 1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/public/{service_id}")
async def get_public_service_form(service_id: str, request: Request):
    doc = await db.service_forms.find_one({"_id": ObjectId(service_id), "is_active": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Service form not found")

    return serialize_doc(doc)


@router.get("/public/slug/{slug}")
async def get_public_service_form_by_slug(slug: str, request: Request):
    doc = await db.service_forms.find_one({"slug": slug, "is_active": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Service form not found")

    return serialize_doc(doc)


@router.get("/admin")
async def list_admin_service_forms(user: dict = Depends(get_admin_user)):
    docs = await db.service_forms.find({}).sort("position", 1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.post("/admin")
async def create_service_form(payload: dict, user: dict = Depends(get_admin_user)):

    doc = {
        "title": payload.get("title"),
        "slug": payload.get("slug"),
        "category": payload.get("category"),
        "description": payload.get("description"),
        "base_price": float(payload.get("base_price", 0) or 0),
        "currency": payload.get("currency", "TZS"),
        "requires_payment": bool(payload.get("requires_payment", False)),
        "requires_quote_review": bool(payload.get("requires_quote_review", True)),
        "form_schema": payload.get("form_schema", []),
        "add_ons": payload.get("add_ons", []),
        "position": int(payload.get("position", 0)),
        "is_active": bool(payload.get("is_active", True)),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.service_forms.insert_one(doc)
    created = await db.service_forms.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/admin/{service_id}")
async def update_service_form(service_id: str, payload: dict, user: dict = Depends(get_admin_user)):

    result = await db.service_forms.update_one(
        {"_id": ObjectId(service_id)},
        {
            "$set": {
                "title": payload.get("title"),
                "slug": payload.get("slug"),
                "category": payload.get("category"),
                "description": payload.get("description"),
                "base_price": float(payload.get("base_price", 0) or 0),
                "currency": payload.get("currency", "TZS"),
                "requires_payment": bool(payload.get("requires_payment", False)),
                "requires_quote_review": bool(payload.get("requires_quote_review", True)),
                "form_schema": payload.get("form_schema", []),
                "add_ons": payload.get("add_ons", []),
                "position": int(payload.get("position", 0)),
                "is_active": bool(payload.get("is_active", True)),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service form not found")

    updated = await db.service_forms.find_one({"_id": ObjectId(service_id)})
    return serialize_doc(updated)
