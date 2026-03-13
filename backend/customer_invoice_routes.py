"""
Customer Invoice Routes
Customer-facing invoice viewing
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/customer/invoices", tags=["Customer Invoices"])
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


@router.get("")
async def list_my_invoices(user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    docs = await db.invoices_v2.find({"customer_email": user_email}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{invoice_id}")
async def get_my_invoice(invoice_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    doc = await db.invoices_v2.find_one({"_id": ObjectId(invoice_id), "customer_email": user_email})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return serialize_doc(doc)
