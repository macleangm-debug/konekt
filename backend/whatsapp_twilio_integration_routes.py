import os
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Twilio Integration"])

def _twilio_available():
    """Check if Twilio credentials are configured"""
    return all([
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN"),
        os.getenv("TWILIO_WHATSAPP_FROM"),
    ])

def _get_twilio_client():
    """Initialize Twilio client if credentials available"""
    if not _twilio_available():
        return None
    try:
        from twilio.rest import Client
        return Client(
            os.getenv("TWILIO_ACCOUNT_SID"),
            os.getenv("TWILIO_AUTH_TOKEN")
        )
    except ImportError:
        return None

@router.post("/send-live")
async def send_live_whatsapp(payload: Dict[str, Any], request: Request):
    """Send a WhatsApp message via Twilio"""
    db = request.app.mongodb
    to_number = payload.get("to")
    message = payload.get("message")
    
    if not to_number or not message:
        raise HTTPException(status_code=400, detail="Missing 'to' or 'message'")
    
    # Normalize phone number format for WhatsApp
    if not to_number.startswith("whatsapp:"):
        to_number = f"whatsapp:{to_number}"
    
    if not _twilio_available():
        await db.whatsapp_logs.insert_one({
            "to": to_number, 
            "message": message, 
            "status": "failed_missing_credentials",
            "provider": "twilio", 
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"ok": False, "status": "missing_credentials", "message": "Twilio credentials not configured"}
    
    client = _get_twilio_client()
    if not client:
        await db.whatsapp_logs.insert_one({
            "to": to_number, 
            "message": message, 
            "status": "failed_twilio_not_installed",
            "provider": "twilio", 
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"ok": False, "status": "twilio_not_installed", "message": "Twilio SDK not installed"}
    
    try:
        twilio_message = client.messages.create(
            from_=f"whatsapp:{os.getenv('TWILIO_WHATSAPP_FROM')}",
            body=message,
            to=to_number
        )
        
        await db.whatsapp_logs.insert_one({
            "to": to_number, 
            "message": message, 
            "status": "sent",
            "provider": "twilio", 
            "provider_message_id": twilio_message.sid,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"ok": True, "status": "sent", "provider_message_id": twilio_message.sid}
    except Exception as e:
        await db.whatsapp_logs.insert_one({
            "to": to_number, 
            "message": message, 
            "status": "failed",
            "error": str(e),
            "provider": "twilio", 
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"ok": False, "status": "failed", "error": str(e)}

@router.post("/event/payment-approved-live")
async def payment_approved_live(payload: Dict[str, Any], request: Request):
    """Trigger WhatsApp notification for payment approval"""
    db = request.app.mongodb
    customer_name = payload.get("customer_name", "Customer")
    to_number = payload.get("to")
    invoice_number = payload.get("invoice_number", "")
    
    if not to_number:
        raise HTTPException(status_code=400, detail="Missing 'to' phone number")
    
    message = f"Hello {customer_name}, your payment for invoice {invoice_number} has been approved. Your order is now being processed. Thank you for choosing Konekt!"
    
    await db.whatsapp_logs.insert_one({
        "event": "payment_approved", 
        "to": to_number, 
        "message": message,
        "invoice_number": invoice_number,
        "customer_name": customer_name,
        "status": "queued", 
        "provider": "twilio", 
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # If Twilio is configured, attempt to send immediately
    if _twilio_available():
        client = _get_twilio_client()
        if client:
            try:
                to_wa = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
                twilio_message = client.messages.create(
                    from_=f"whatsapp:{os.getenv('TWILIO_WHATSAPP_FROM')}",
                    body=message,
                    to=to_wa
                )
                await db.whatsapp_logs.update_one(
                    {"to": to_number, "event": "payment_approved", "status": "queued"},
                    {"$set": {"status": "sent", "provider_message_id": twilio_message.sid}}
                )
                return {"ok": True, "status": "sent", "message": message, "provider_message_id": twilio_message.sid}
            except Exception as e:
                await db.whatsapp_logs.update_one(
                    {"to": to_number, "event": "payment_approved", "status": "queued"},
                    {"$set": {"status": "failed", "error": str(e)}}
                )
    
    return {"ok": True, "queued": True, "message": message}

@router.post("/event/quote-ready-live")
async def quote_ready_live(payload: Dict[str, Any], request: Request):
    """Trigger WhatsApp notification when quote is ready"""
    db = request.app.mongodb
    customer_name = payload.get("customer_name", "Customer")
    to_number = payload.get("to")
    quote_number = payload.get("quote_number", "")
    total = payload.get("total", "")
    
    if not to_number:
        raise HTTPException(status_code=400, detail="Missing 'to' phone number")
    
    message = f"Hello {customer_name}, your quote #{quote_number} is ready! Total: TZS {total}. Login to your Konekt dashboard to review and approve."
    
    await db.whatsapp_logs.insert_one({
        "event": "quote_ready", 
        "to": to_number, 
        "message": message,
        "quote_number": quote_number,
        "customer_name": customer_name,
        "status": "queued", 
        "provider": "twilio", 
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"ok": True, "queued": True, "message": message}

@router.post("/event/order-shipped-live")
async def order_shipped_live(payload: Dict[str, Any], request: Request):
    """Trigger WhatsApp notification when order is shipped"""
    db = request.app.mongodb
    customer_name = payload.get("customer_name", "Customer")
    to_number = payload.get("to")
    order_number = payload.get("order_number", "")
    tracking_info = payload.get("tracking_info", "")
    
    if not to_number:
        raise HTTPException(status_code=400, detail="Missing 'to' phone number")
    
    message = f"Hello {customer_name}, great news! Your order #{order_number} has been shipped."
    if tracking_info:
        message += f" Tracking: {tracking_info}"
    message += " Thank you for choosing Konekt!"
    
    await db.whatsapp_logs.insert_one({
        "event": "order_shipped", 
        "to": to_number, 
        "message": message,
        "order_number": order_number,
        "customer_name": customer_name,
        "status": "queued", 
        "provider": "twilio", 
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"ok": True, "queued": True, "message": message}

@router.get("/logs")
async def get_whatsapp_logs(request: Request, limit: int = 50):
    """Get recent WhatsApp message logs (for admin)"""
    db = request.app.mongodb
    logs = await db.whatsapp_logs.find({}).sort("created_at", -1).to_list(length=limit)
    result = []
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        result.append(log)
    return result

@router.get("/status")
async def whatsapp_integration_status():
    """Check WhatsApp/Twilio integration status"""
    return {
        "twilio_configured": _twilio_available(),
        "account_sid_set": bool(os.getenv("TWILIO_ACCOUNT_SID")),
        "auth_token_set": bool(os.getenv("TWILIO_AUTH_TOKEN")),
        "whatsapp_from_set": bool(os.getenv("TWILIO_WHATSAPP_FROM")),
    }
