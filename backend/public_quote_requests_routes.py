"""Public Quote Requests — lets marketplace visitors submit quote requests
without an account. Used by ServiceCardsSection, CantFindWhatYouNeedBanner,
and RequestProductCTA.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/api/public", tags=["Public Quote Requests"])


class CustomItem(BaseModel):
    name: str
    quantity: int = 1
    unit_of_measurement: Optional[str] = None
    description: Optional[str] = ""


class QuoteRequestCustomer(BaseModel):
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    phone: str
    email: Optional[str] = ""
    company: Optional[str] = ""


class QuoteRequestPayload(BaseModel):
    items: List[dict] = Field(default_factory=list)
    custom_items: List[CustomItem] = Field(default_factory=list)
    category: Optional[str] = ""
    customer_note: Optional[str] = ""
    customer: QuoteRequestCustomer
    source: Optional[str] = "public"


@router.post("/quote-requests")
async def create_public_quote_request(payload: QuoteRequestPayload):
    if not payload.custom_items and not payload.items:
        raise HTTPException(status_code=400, detail="Request must include at least one item or service")
    if not payload.customer.phone:
        raise HTTPException(status_code=400, detail="Customer phone is required")

    record = {
        "id": str(uuid.uuid4()),
        "type": "quote_request",
        "source": payload.source or "public",
        "status": "new",
        "category": payload.category or "",
        "customer_note": payload.customer_note or "",
        "items": payload.items,
        "custom_items": [ci.model_dump() for ci in payload.custom_items],
        "customer": payload.customer.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "channel": "marketplace_public",
    }
    await db.public_quote_requests.insert_one(record)

    # Also mirror into the unified "leads" pipeline so the CRM picks it up
    lead = {
        "id": str(uuid.uuid4()),
        "source": payload.source or "public_quote",
        "status": "new",
        "first_name": payload.customer.first_name or "",
        "last_name": payload.customer.last_name or "",
        "phone": payload.customer.phone,
        "email": payload.customer.email or "",
        "company": payload.customer.company or "",
        "notes": payload.customer_note or "",
        "interest_category": payload.category or "",
        "interest_items": [ci.name for ci in payload.custom_items] + [i.get("name", "") for i in payload.items],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "quote_request_id": record["id"],
    }
    try:
        await db.leads.insert_one(lead)
    except Exception:
        # Lead mirroring is best-effort; don't fail the user submission on this.
        pass

    return {
        "success": True,
        "id": record["id"],
        "message": "Quote request received",
    }


@router.get("/quote-requests/{request_id}")
async def get_public_quote_request(request_id: str):
    req = await db.public_quote_requests.find_one({"id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Quote request not found")
    return req
