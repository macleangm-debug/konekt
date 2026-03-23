from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Automation"])

class WhatsAppMessage(BaseModel):
    to: str
    message: str
    provider: Optional[str] = "stub"

class OrderUpdatePayload(BaseModel):
    to: str
    order_id: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None

class QuoteReadyPayload(BaseModel):
    to: str
    quote_id: Optional[str] = None
    quote_number: Optional[str] = None
    message: Optional[str] = None

# ==================== CORE SEND ====================

@router.post("/send")
async def send_whatsapp_message(payload: WhatsAppMessage, request: Request):
    """
    Send a WhatsApp message. 
    Currently logs to DB - replace with real provider (Twilio, MessageBird, etc.)
    
    Example payload:
    {
      "to": "+2557XXXXXXX",
      "message": "Your quote is ready."
    }
    """
    db = request.app.mongodb
    
    log = {
        "to": payload.to,
        "message": payload.message,
        "status": "queued",
        "provider": payload.provider,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # TODO: Replace with actual WhatsApp API integration
    # Example with Twilio:
    # from twilio.rest import Client
    # client = Client(account_sid, auth_token)
    # message = client.messages.create(
    #     from_='whatsapp:+14155238886',
    #     body=payload.message,
    #     to=f'whatsapp:{payload.to}'
    # )
    # log["provider_message_id"] = message.sid
    # log["status"] = "sent"
    
    await db.whatsapp_logs.insert_one(log)
    
    return {"ok": True, "status": "queued", "message": "WhatsApp message queued (stub mode)"}

# ==================== EVENT TRIGGERS ====================

@router.post("/event/order-update")
async def whatsapp_order_update(payload: OrderUpdatePayload, request: Request):
    """Trigger WhatsApp notification for order status update"""
    db = request.app.mongodb
    
    status_messages = {
        "confirmed": "Your order has been confirmed! We're preparing it now.",
        "processing": "Your order is being processed. We'll update you when it ships.",
        "shipped": "Great news! Your order has been shipped and is on its way.",
        "delivered": "Your order has been delivered! Thank you for choosing Konekt.",
        "in_progress": "Your service request is in progress. Our team is working on it.",
    }
    
    message = payload.message or status_messages.get(
        payload.status, 
        f"Your order update: {payload.status or 'In Progress'}"
    )
    
    log = {
        "event": "order_update",
        "to": payload.to,
        "order_id": payload.order_id,
        "status": payload.status,
        "message": message,
        "delivery_status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.whatsapp_logs.insert_one(log)
    
    return {"ok": True, "message": message}

@router.post("/event/quote-ready")
async def whatsapp_quote_ready(payload: QuoteReadyPayload, request: Request):
    """Trigger WhatsApp notification when quote is ready"""
    db = request.app.mongodb
    
    message = payload.message or f"Hi! Your quote {payload.quote_number or ''} is ready. Please log in to review it at https://konekt.co.tz/login"
    
    log = {
        "event": "quote_ready",
        "to": payload.to,
        "quote_id": payload.quote_id,
        "quote_number": payload.quote_number,
        "message": message,
        "delivery_status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.whatsapp_logs.insert_one(log)
    
    return {"ok": True, "message": message}

@router.post("/event/payment-received")
async def whatsapp_payment_received(request: Request):
    """Trigger WhatsApp notification when payment is received"""
    body = await request.json()
    db = request.app.mongodb
    
    message = body.get("message") or "Payment received! Thank you. Your order will be processed shortly."
    
    log = {
        "event": "payment_received",
        "to": body.get("to"),
        "invoice_id": body.get("invoice_id"),
        "amount": body.get("amount"),
        "message": message,
        "delivery_status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.whatsapp_logs.insert_one(log)
    
    return {"ok": True, "message": message}

@router.post("/event/affiliate-sale")
async def whatsapp_affiliate_sale(request: Request):
    """Notify affiliate of successful referral sale"""
    body = await request.json()
    db = request.app.mongodb
    
    commission = body.get("commission", 0)
    message = body.get("message") or f"🎉 Great news! You earned TZS {commission:,} commission from a referral sale!"
    
    log = {
        "event": "affiliate_sale",
        "to": body.get("to"),
        "affiliate_id": body.get("affiliate_id"),
        "commission": commission,
        "message": message,
        "delivery_status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.whatsapp_logs.insert_one(log)
    
    return {"ok": True, "message": message}

# ==================== LOGS ====================

@router.get("/logs")
async def get_whatsapp_logs(request: Request, limit: int = 50):
    """Get WhatsApp message logs (admin only)"""
    db = request.app.mongodb
    
    logs = await db.whatsapp_logs.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return logs

@router.get("/logs/stats")
async def get_whatsapp_stats(request: Request):
    """Get WhatsApp notification stats"""
    db = request.app.mongodb
    
    total = await db.whatsapp_logs.count_documents({})
    queued = await db.whatsapp_logs.count_documents({"delivery_status": "queued"})
    sent = await db.whatsapp_logs.count_documents({"delivery_status": "sent"})
    failed = await db.whatsapp_logs.count_documents({"delivery_status": "failed"})
    
    return {
        "total": total,
        "queued": queued,
        "sent": sent,
        "failed": failed
    }
