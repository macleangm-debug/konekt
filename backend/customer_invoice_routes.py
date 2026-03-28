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
from payment_status_wording_service import get_customer_payment_status_label

router = APIRouter(prefix="/api/customer/invoices", tags=["Customer Invoices"])
security = HTTPBearer(auto_error=False)

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        if "id" not in doc or not doc["id"]:
            doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def _enrich_invoice(doc):
    """Add customer-facing payment_status_label, customer_name, and payer_name."""
    if not doc:
        return doc
    ps = doc.get("payment_status") or doc.get("status") or "pending_payment"
    has_proof = bool(doc.get("proof_url") or doc.get("payment_proof_url") or doc.get("proof_submitted_at"))
    doc["payment_status_label"] = get_customer_payment_status_label(ps, has_proof)

    # Enrich customer_name from user record if missing
    if not doc.get("customer_name"):
        cid = doc.get("customer_id") or doc.get("user_id")
        if cid:
            cust = await db.users.find_one({"id": cid}, {"_id": 0, "full_name": 1, "email": 1})
            if cust:
                doc["customer_name"] = cust.get("full_name") or cust.get("email") or ""
        if not doc.get("customer_name"):
            cemail = doc.get("customer_email")
            if cemail:
                cust = await db.users.find_one({"email": cemail}, {"_id": 0, "full_name": 1})
                if cust:
                    doc["customer_name"] = cust.get("full_name") or cemail

    # Payer name resolution chain
    payer = doc.get("payer_name") or ""
    if not payer:
        proof = await db.payment_proofs.find_one(
            {"invoice_id": doc.get("id")},
            {"_id": 0, "payer_name": 1, "customer_name": 1},
            sort=[("created_at", -1)]
        )
        if proof:
            payer = proof.get("payer_name") or proof.get("customer_name") or ""
    if not payer:
        submission = await db.payment_proof_submissions.find_one(
            {"invoice_id": doc.get("id")},
            {"_id": 0, "payer_name": 1, "customer_name": 1},
            sort=[("created_at", -1)]
        )
        if submission:
            payer = submission.get("payer_name") or submission.get("customer_name") or ""
    if not payer:
        billing = doc.get("billing") or {}
        payer = billing.get("invoice_client_name") or ""
    if not payer:
        payer = doc.get("customer_name") or doc.get("customer_email") or "-"
    doc["payer_name"] = payer
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
    user_id = user.get("id")
    queries = [
        {"customer_email": user_email},
        {"customer_id": user_id},
        {"user_id": user_id},
        {"customer.email": user_email},
    ]

    rows = await db.invoices.find({"$or": queries}).sort("created_at", -1).to_list(length=500)
    result = []
    for doc in rows:
        enriched = await _enrich_invoice(serialize_doc(doc))
        result.append(enriched)
    return result


@router.get("/{invoice_id}")
async def get_my_invoice(invoice_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")
    base_query = {"$or": [
        {"customer_email": user_email},
        {"customer_id": user_id},
        {"user_id": user_id},
        {"customer.email": user_email},
    ]}

    doc = None
    try:
        doc = await db.invoices.find_one({"_id": ObjectId(invoice_id), **base_query})
    except Exception:
        doc = await db.invoices.find_one({"id": invoice_id, **base_query})
    if not doc:
        doc = await db.invoices.find_one({"invoice_number": invoice_id, **base_query})
    if doc:
        enriched = await _enrich_invoice(serialize_doc(doc))
        return enriched

    raise HTTPException(status_code=404, detail="Invoice not found")
