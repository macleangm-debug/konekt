"""
Customer Quote Actions Routes
Customer-side quote viewing, approval, and conversion to invoice
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

from notification_events import notify_invoice_ready

router = APIRouter(prefix="/api/customer/quotes", tags=["Customer Quote Actions"])
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
async def list_my_quotes(user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    docs = await db.quotes_v2.find({"customer_email": user_email}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{quote_id}")
async def get_my_quote(quote_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    doc = await db.quotes_v2.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
    if not doc:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return serialize_doc(doc)


@router.post("/{quote_id}/approve")
async def approve_my_quote(quote_id: str, payload: dict, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    quote = await db.quotes_v2.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.get("status") in {"converted", "rejected", "expired"}:
        raise HTTPException(status_code=400, detail="Quote cannot be approved")
    
    now = datetime.utcnow()
    await db.quotes_v2.update_one(
        {"_id": ObjectId(quote_id)},
        {
            "$set": {
                "status": "approved",
                "customer_approved_at": now,
                "updated_at": now,
            }
        },
    )
    
    convert_to_invoice = bool(payload.get("convert_to_invoice", True))
    created_invoice = None
    
    if convert_to_invoice:
        invoice_doc = {
            "quote_id": quote_id,
            "quote_number": quote.get("quote_number"),
            "invoice_number": f"INV-{now.strftime('%Y%m%d')}-{str(ObjectId())[-6:].upper()}",
            "customer_name": quote.get("customer_name"),
            "customer_email": quote.get("customer_email"),
            "customer_company": quote.get("customer_company"),
            "customer_phone": quote.get("customer_phone"),
            "customer_address_line_1": quote.get("customer_address_line_1"),
            "customer_address_line_2": quote.get("customer_address_line_2"),
            "customer_city": quote.get("customer_city"),
            "customer_country": quote.get("customer_country"),
            "payment_term_label": quote.get("payment_term_label") or "Due on Receipt",
            "currency": quote.get("currency", "TZS"),
            "line_items": quote.get("line_items", []),
            "subtotal": quote.get("subtotal", 0),
            "tax": quote.get("tax", 0),
            "discount": quote.get("discount", 0),
            "total": quote.get("total", 0),
            "paid_amount": 0,
            "balance_due": quote.get("total", 0),
            "status": "sent",
            "source": "quote_customer_approval",
            "created_at": now,
            "updated_at": now,
        }
        
        result = await db.invoices_v2.insert_one(invoice_doc)
        created_invoice = await db.invoices_v2.find_one({"_id": result.inserted_id})
        
        await db.quotes_v2.update_one(
            {"_id": ObjectId(quote_id)},
            {
                "$set": {
                    "status": "converted",
                    "invoice_id": str(result.inserted_id),
                    "updated_at": now,
                }
            },
        )
    
    updated_quote = await db.quotes_v2.find_one({"_id": ObjectId(quote_id)})
    
    response = {
        "quote": serialize_doc(updated_quote),
        "message": "Quote approved successfully",
    }
    
    if created_invoice:
        # Send invoice ready notification
        notify_invoice_ready(created_invoice)
        response["invoice"] = serialize_doc(created_invoice)
    
    return response
