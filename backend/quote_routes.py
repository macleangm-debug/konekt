"""
Konekt Quotes Routes - Create, manage, convert quotes
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

from quote_models import QuoteCreate, ConvertQuoteToOrderRequest

router = APIRouter(prefix="/api/admin/quotes-v2", tags=["Quotes V2"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.post("")
async def create_quote(payload: QuoteCreate):
    """Create a new quote"""
    now = datetime.now(timezone.utc)
    quote_number = f"QTN-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    doc = payload.model_dump()
    doc["quote_number"] = quote_number
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    
    # Convert valid_until to string if present
    if doc.get("valid_until"):
        doc["valid_until"] = doc["valid_until"].isoformat() if hasattr(doc["valid_until"], "isoformat") else str(doc["valid_until"])

    result = await db.quotes.insert_one(doc)
    created = await db.quotes.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("")
async def list_quotes(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all quotes"""
    query = {}
    if status:
        query["status"] = status
    if customer_email:
        query["customer_email"] = customer_email
    
    docs = await db.quotes.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{quote_id}")
async def get_quote(quote_id: str):
    """Get a specific quote"""
    try:
        doc = await db.quotes.find_one({"_id": ObjectId(quote_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Quote not found")
        return serialize_doc(doc)
    except Exception:
        raise HTTPException(status_code=404, detail="Quote not found")


@router.patch("/{quote_id}/status")
async def update_quote_status(quote_id: str, status: str = Query(...)):
    """Update quote status"""
    valid_statuses = ["draft", "sent", "approved", "rejected", "expired", "converted"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc)
    result = await db.quotes.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": {"status": status, "updated_at": now.isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    updated = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    return serialize_doc(updated)


@router.post("/convert-to-order")
async def convert_quote_to_order(payload: ConvertQuoteToOrderRequest):
    """Convert an approved quote to an order"""
    try:
        quote = await db.quotes.find_one({"_id": ObjectId(payload.quote_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if quote.get("status") == "converted":
        raise HTTPException(status_code=400, detail="Quote already converted")

    now = datetime.now(timezone.utc)
    order_number = f"ORD-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    order_doc = {
        "order_number": order_number,
        "order_type": "quote_converted",
        "quote_id": str(quote["_id"]),
        "quote_number": quote.get("quote_number"),
        "customer_name": quote.get("customer_name"),
        "customer_email": quote.get("customer_email"),
        "customer_company": quote.get("customer_company"),
        "customer_phone": quote.get("customer_phone"),
        "currency": quote.get("currency", "TZS"),
        "line_items": quote.get("line_items", []),
        "subtotal": quote.get("subtotal", 0),
        "tax": quote.get("tax", 0),
        "discount": quote.get("discount", 0),
        "total": quote.get("total", 0),
        "notes": quote.get("notes"),
        "current_status": "pending",
        "status_history": [
            {
                "status": "pending",
                "note": f"Created from quote {quote.get('quote_number')}",
                "timestamp": now.isoformat(),
            }
        ],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    result = await db.orders.insert_one(order_doc)

    # Update quote status
    await db.quotes.update_one(
        {"_id": quote["_id"]},
        {"$set": {
            "status": "converted", 
            "converted_order_id": str(result.inserted_id),
            "converted_order_number": order_number,
            "updated_at": now.isoformat()
        }}
    )

    created_order = await db.orders.find_one({"_id": result.inserted_id})
    return serialize_doc(created_order)


@router.post("/{quote_id}/convert-to-invoice")
async def convert_quote_to_invoice_direct(quote_id: str):
    """Convert a quote directly to an invoice"""
    try:
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    now = datetime.now(timezone.utc)
    invoice_number = f"INV-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    invoice_doc = {
        "invoice_number": invoice_number,
        "customer_name": quote.get("customer_name"),
        "customer_email": quote.get("customer_email"),
        "customer_company": quote.get("customer_company"),
        "customer_phone": quote.get("customer_phone"),
        "quote_id": str(quote["_id"]),
        "quote_number": quote.get("quote_number"),
        "currency": quote.get("currency", "TZS"),
        "line_items": quote.get("line_items", []),
        "subtotal": quote.get("subtotal", 0),
        "tax": quote.get("tax", 0),
        "discount": quote.get("discount", 0),
        "total": quote.get("total", 0),
        "notes": quote.get("notes"),
        "terms": quote.get("terms"),
        "status": "draft",
        "payments": [],
        "amount_paid": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    result = await db.invoices.insert_one(invoice_doc)

    # Update quote status
    await db.quotes.update_one(
        {"_id": quote["_id"]},
        {"$set": {
            "status": "converted",
            "converted_invoice_number": invoice_number,
            "updated_at": now.isoformat()
        }}
    )

    created_invoice = await db.invoices.find_one({"_id": result.inserted_id})
    return serialize_doc(created_invoice)
