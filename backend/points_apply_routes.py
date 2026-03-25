from datetime import datetime
import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

from points_persistence_service import apply_points_discount_to_document

router = APIRouter(prefix="/api/customer/points-apply", tags=["Points Apply"])
security = HTTPBearer(auto_error=False)

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
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


@router.post("/invoice/{invoice_id}")
async def apply_points_to_invoice(invoice_id: str, payload: dict, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_email = user.get("email")

    requested_points = int(payload.get("requested_points", 0) or 0)

    invoice = await db.invoices.find_one(
        {"_id": ObjectId(invoice_id), "customer_email": user_email}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already paid")

    current_balance_due = float(invoice.get("balance_due", invoice.get("total", 0)) or 0)

    result = await apply_points_discount_to_document(
        db,
        customer_email=user_email,
        document_type="invoice",
        document_id=str(invoice["_id"]),
        requested_points=requested_points,
        subtotal=current_balance_due,
    )

    new_balance_due = max(0, current_balance_due - result["discount_value"])
    new_status = "paid" if new_balance_due <= 0 else (
        "partially_paid" if new_balance_due < float(invoice.get("total", 0) or 0) else invoice.get("status", "sent")
    )

    now = datetime.utcnow()
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {
            "$set": {
                "balance_due": new_balance_due,
                "paid_amount": float(invoice.get("paid_amount", 0) or 0) + result["discount_value"],
                "status": new_status,
                "updated_at": now,
            },
            "$push": {
                "payments": {
                    "type": "points_redemption",
                    "amount": result["discount_value"],
                    "points_used": result["applied_points"],
                    "created_at": now,
                }
            },
        },
    )

    updated = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return {
        "invoice": serialize_doc(updated),
        "applied_points": result["applied_points"],
        "discount_value": result["discount_value"],
        "remaining_points": result["remaining_points"],
    }
