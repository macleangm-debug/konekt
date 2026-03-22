from fastapi import APIRouter
from progress_engine_service import translate_status
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/ai-assistant-v2", tags=["AI Assistant Upgrade"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt_db')]

@router.post("/chat")
async def chat(payload: dict):
    message = (payload.get("message") or "").lower()
    context = payload.get("context") or {}

    if "how do i order" in message or "how to order" in message:
        return {
            "reply": "For products: browse marketplace, add items to cart, login when you continue to checkout, pay by bank transfer, upload payment proof, then track from your account. For services: open the service page, request a quote or service, submit your brief, approve the quote, pay, then track progress from your account."
        }

    if "payment proof" in message or "how do i pay" in message:
        return {
            "reply": "You can pay by bank transfer, then upload payment proof from the invoice payment page. The system links your proof to the invoice automatically."
        }

    if "order progress" in message or "track order" in message or "progress" in message:
        item_type = context.get("item_type", "product")
        internal_status = context.get("internal_status", "confirmed")
        translated = translate_status(item_type=item_type, internal_status=internal_status)
        if translated["next_step"]:
            return {"reply": f"Your {item_type} is currently '{translated['external_status']}'. The next step is '{translated['next_step']}'."}
        return {"reply": f"Your {item_type} is currently '{translated['external_status']}'."}

    if "service" in message:
        return {
            "reply": "You can browse services, open a dedicated service page, and request a quote or submit a structured request from your account."
        }

    return {
        "reply": "I can help you order products, request services, upload payment proof, or understand your product or service progress."
    }
