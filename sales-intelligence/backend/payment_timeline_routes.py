from fastapi import APIRouter, Request, HTTPException
from bson import ObjectId

router = APIRouter(prefix="/api/payment-timeline", tags=["Payment Timeline"])

def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.get("/invoice/{invoice_id}")
async def get_invoice_payment_timeline(invoice_id: str, request: Request):
    db = request.app.mongodb
    docs = await db.payment_timeline.find({"invoice_id": invoice_id}).sort("created_at", 1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]
