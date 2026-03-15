"""
Creative Service Routes V2
Enhanced creative service order flow with address support
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt

from creative_service_models import CreativeServiceOrderCreate

router = APIRouter(prefix="/api/creative-services-v2", tags=["Creative Services V2"])
security = HTTPBearer(auto_error=False)

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


@router.get("/{slug}")
async def get_creative_service(slug: str):
    """Get a creative service by slug"""
    service = await db.creative_services.find_one({"slug": slug, "is_active": True})
    if not service:
        raise HTTPException(status_code=404, detail="Creative service not found")
    return serialize_doc(service)


@router.post("/orders")
async def create_creative_service_order(payload: CreativeServiceOrderCreate, user: dict = Depends(get_user)):
    """Create a new creative service order with full customer details"""
    
    service = await db.creative_services.find_one({"slug": payload.service_slug, "is_active": True})
    if not service:
        raise HTTPException(status_code=404, detail="Creative service not found")

    addons_catalog = service.get("addons", []) or []
    selected_addons = []
    add_on_total = 0.0

    for add_on_id in payload.selected_addons:
        # Try matching by id or code
        add_on = next((a for a in addons_catalog if a.get("id") == add_on_id or a.get("code") == add_on_id), None)
        if add_on:
            selected_addons.append(add_on)
            add_on_total += float(add_on.get("price", 0) or 0)

    base_price = float(service.get("base_price", 0) or 0)
    total_price = base_price + add_on_total
    now = datetime.utcnow()

    # Generate project number
    count = await db.creative_service_orders.count_documents({})
    project_number = f"CSP-{str(count + 1).zfill(5)}"

    doc = {
        "project_number": project_number,
        "service_slug": payload.service_slug,
        "service_title": service.get("title"),
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "customer_phone": payload.customer_phone,
        "phone_prefix": payload.phone_prefix,
        "country": payload.country,
        "city": payload.city,
        "address_line_1": payload.address_line_1,
        "address_line_2": payload.address_line_2,
        "company_name": payload.company_name,
        "brief_answers": payload.brief_answers,
        "selected_addons": selected_addons,
        "uploaded_files": payload.uploaded_files,
        "notes": payload.notes,
        "payment_choice": payload.payment_choice,
        "save_address": payload.save_address,
        "base_price": base_price,
        "add_on_total": add_on_total,
        "total_price": total_price,
        "currency": service.get("currency", "TZS"),
        "status": "submitted",
        "created_at": now,
        "updated_at": now,
    }

    # Link to user if authenticated
    if user:
        doc["user_id"] = user.get("id")

    result = await db.creative_service_orders.insert_one(doc)
    created = await db.creative_service_orders.find_one({"_id": result.inserted_id})

    # Save address if requested
    if payload.save_address and payload.address_line_1:
        existing_default = await db.customer_addresses.find_one({
            "customer_email": payload.customer_email,
            "is_default": True,
        })

        address_doc = {
            "customer_email": payload.customer_email,
            "user_id": user.get("id") if user else None,
            "full_name": payload.customer_name,
            "company_name": payload.company_name,
            "country": payload.country,
            "city": payload.city,
            "address_line_1": payload.address_line_1,
            "address_line_2": payload.address_line_2,
            "phone_prefix": payload.phone_prefix,
            "phone_number": payload.customer_phone,
            "is_default": False if existing_default else True,
            "type": "shipping",
            "created_at": now,
            "updated_at": now,
        }
        await db.customer_addresses.insert_one(address_doc)

    return serialize_doc(created)


@router.get("/orders/my")
async def get_my_creative_orders(user: dict = Depends(get_user)):
    """Get creative service orders for the current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    user_id = user.get("id")
    
    # Find by user_id or email
    orders = await db.creative_service_orders.find({
        "$or": [
            {"user_id": user_id},
            {"customer_email": user_email}
        ]
    }).sort("created_at", -1).to_list(length=100)
    
    return [serialize_doc(o) for o in orders]
