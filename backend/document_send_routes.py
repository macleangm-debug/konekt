"""
Konekt Document Send Routes (Email stubs)
- Send quote by email
- Send invoice by email
These are stubs ready to connect to Resend or another email service.
"""
from fastapi import APIRouter, HTTPException
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/send", tags=["Document Sending"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.post("/quote/{quote_id}")
async def send_quote_document(quote_id: str):
    """Send quote document via email (stub)"""
    try:
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # TODO: Plug in your email service here (Resend, SendGrid, etc.)
    return {
        "message": "Quote send action triggered (email stub)",
        "quote_number": quote.get("quote_number"),
        "recipient": quote.get("customer_email"),
        "status": "pending_email_integration",
    }


@router.post("/invoice/{invoice_id}")
async def send_invoice_document(invoice_id: str):
    """Send invoice document via email (stub)"""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # TODO: Plug in your email service here (Resend, SendGrid, etc.)
    return {
        "message": "Invoice send action triggered (email stub)",
        "invoice_number": invoice.get("invoice_number"),
        "recipient": invoice.get("customer_email"),
        "status": "pending_email_integration",
    }


@router.post("/order/{order_id}/confirmation")
async def send_order_confirmation(order_id: str):
    """Send order confirmation via email (stub)"""
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "message": "Order confirmation send action triggered (email stub)",
        "order_number": order.get("order_number"),
        "recipient": order.get("customer_email") or order.get("email"),
        "status": "pending_email_integration",
    }
