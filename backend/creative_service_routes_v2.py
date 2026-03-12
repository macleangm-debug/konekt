from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
import os

from creative_service_models import CreativeServiceCreate, CreativeServiceUpdate, CreativeServiceOrderCreate

router = APIRouter(prefix="/api/creative-services-v2", tags=["Creative Services V2"])
security = HTTPBearer(auto_error=False)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


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
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def list_services():
    """List all active creative services"""
    docs = await db.creative_services.find({"is_active": True}).sort("title", 1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


@router.get("/all")
async def list_all_services(user: dict = Depends(get_admin_user)):
    """List all creative services including inactive (admin)"""
    docs = await db.creative_services.find({}).sort("title", 1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{slug}")
async def get_service(slug: str):
    """Get a creative service by slug"""
    doc = await db.creative_services.find_one({"slug": slug, "is_active": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Service not found")
    return serialize_doc(doc)


@router.post("/admin")
async def create_service(payload: CreativeServiceCreate, user: dict = Depends(get_admin_user)):
    """Create a new creative service (admin)"""
    now = datetime.utcnow()

    existing = await db.creative_services.find_one({"slug": payload.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Service slug already exists")

    doc = payload.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now

    result = await db.creative_services.insert_one(doc)
    created = await db.creative_services.find_one({"_id": result.inserted_id})

    return serialize_doc(created)


@router.put("/admin/{service_id}")
async def update_service(service_id: str, payload: CreativeServiceUpdate, user: dict = Depends(get_admin_user)):
    """Update a creative service (admin)"""
    existing = await db.creative_services.find_one({"_id": ObjectId(service_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.utcnow()

    await db.creative_services.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": update_data}
    )
    
    updated = await db.creative_services.find_one({"_id": ObjectId(service_id)})
    return serialize_doc(updated)


@router.delete("/admin/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(get_admin_user)):
    """Soft delete a creative service (admin)"""
    result = await db.creative_services.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service deleted"}


@router.post("/orders")
async def create_service_order(payload: CreativeServiceOrderCreate):
    """Create a new service order with brief"""
    service = await db.creative_services.find_one({"slug": payload.service_slug, "is_active": True})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    selected_addons = [
        addon for addon in service.get("addons", [])
        if addon.get("code") in payload.selected_addons and addon.get("is_active", True)
    ]

    addon_total = sum(float(item.get("price", 0) or 0) for item in selected_addons)
    total = float(service.get("base_price", 0) or 0) + addon_total

    now = datetime.utcnow()
    doc = payload.model_dump()
    doc["service_title"] = service.get("title")
    doc["service_category"] = service.get("category")
    doc["base_price"] = float(service.get("base_price", 0) or 0)
    doc["selected_addons_details"] = selected_addons
    doc["addon_total"] = addon_total
    doc["total_price"] = total
    doc["currency"] = service.get("currency", "TZS")
    doc["status"] = "brief_submitted"
    doc["status_history"] = [
        {
            "status": "brief_submitted",
            "note": "Creative brief submitted by customer",
            "timestamp": now.isoformat(),
        }
    ]
    doc["created_at"] = now
    doc["updated_at"] = now

    result = await db.creative_service_orders.insert_one(doc)
    created = await db.creative_service_orders.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/orders/admin")
async def list_service_orders(user: dict = Depends(get_admin_user), status: str = None):
    """List all service orders (admin)"""
    query = {}
    if status:
        query["status"] = status
    
    docs = await db.creative_service_orders.find(query).sort("created_at", -1).to_list(length=200)
    return [serialize_doc(doc) for doc in docs]


@router.patch("/orders/admin/{order_id}/status")
async def update_order_status(order_id: str, status: str, note: str = None, user: dict = Depends(get_admin_user)):
    """Update service order status (admin)"""
    now = datetime.utcnow()
    history_entry = {
        "status": status,
        "note": note or f"Status changed to {status}",
        "timestamp": now.isoformat(),
        "updated_by": user.get("email")
    }
    
    result = await db.creative_service_orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {"status": status, "updated_at": now},
            "$push": {"status_history": history_entry}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Status updated", "status": status}
