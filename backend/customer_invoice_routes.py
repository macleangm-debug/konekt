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

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    # Normalize datetime fields to ISO strings for consistent sorting
    from datetime import datetime
    for key in ['created_at', 'updated_at', 'paid_at', 'rejected_at']:
        if key in doc and isinstance(doc[key], datetime):
            doc[key] = doc[key].isoformat()
    return doc


def normalize_invoice(doc):
    doc = serialize_doc(doc)
    status = doc.get('status') or 'pending_payment'
    payment_status = doc.get('payment_status') or 'pending'
    status_map = {
        'pending': 'pending_payment',
        'awaiting_payment_proof': 'pending_payment',
        'proof_uploaded': 'payment_under_review',
        'payment_proof_uploaded': 'payment_under_review',
        'under_review': 'payment_under_review',
        'proof_rejected': 'payment_rejected',
    }
    doc['status'] = status_map.get(status, status)
    doc['payment_status'] = status_map.get(payment_status, payment_status)
    doc['total'] = doc.get('total') or doc.get('total_amount') or 0
    doc['total_amount'] = doc.get('total_amount') or doc.get('total') or 0
    return doc


async def attach_rejection_reason(invoice_doc):
    proof = await db.payment_proofs.find_one({'invoice_id': invoice_doc.get('id'), 'status': 'rejected'}, sort=[('rejected_at', -1)])
    if proof and proof.get('rejection_reason'):
        invoice_doc['rejection_reason'] = proof.get('rejection_reason')
        invoice_doc['payment_status'] = 'payment_rejected'
        if invoice_doc.get('status') == 'pending_payment':
            invoice_doc['status'] = 'payment_rejected'
    return invoice_doc


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=['HS256'])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        return user
    except Exception:
        return None


@router.get('')
async def list_my_invoices(user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail='Unauthorized')
    user_email = user.get('email')
    user_id = user.get('id')
    selectors = [{ 'customer_email': user_email }, { 'customer_id': user_id }, { 'user_id': user_id }]
    docs = []
    seen = set()
    for collection_name in ['invoices', 'invoices_v2']:
        collection = getattr(db, collection_name)
        async for raw in collection.find({'$or': selectors}).sort('created_at', -1):
            doc = normalize_invoice(raw)
            key = doc.get('id') or doc.get('invoice_number')
            if key in seen:
                continue
            seen.add(key)
            docs.append(await attach_rejection_reason(doc))
    docs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return docs[:500]


@router.get('/{invoice_id}')
async def get_my_invoice(invoice_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail='Unauthorized')
    user_email = user.get('email')
    user_id = user.get('id')
    selectors = [{ 'customer_email': user_email }, { 'customer_id': user_id }, { 'user_id': user_id }]
    doc = None
    for collection_name in ['invoices', 'invoices_v2']:
        collection = getattr(db, collection_name)
        try:
            doc = await collection.find_one({'_id': ObjectId(invoice_id), '$or': selectors})
        except Exception:
            doc = await collection.find_one({'id': invoice_id, '$or': selectors})
        if doc:
            break
    if not doc:
        raise HTTPException(status_code=404, detail='Invoice not found')
    result = await attach_rejection_reason(normalize_invoice(doc))
    # Attach installment splits if present
    splits = []
    inv_id = result.get('id')
    if inv_id:
        async for s in db.invoice_splits.find({'invoice_id': inv_id}):
            s = dict(s)
            s.pop('_id', None)
            splits.append(s)
    result['splits'] = splits
    return result


@router.get('/{invoice_id}/splits')
async def get_invoice_splits(invoice_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail='Unauthorized')
    splits = []
    async for s in db.invoice_splits.find({'invoice_id': invoice_id}):
        s = dict(s)
        s.pop('_id', None)
        splits.append(s)
    return splits
