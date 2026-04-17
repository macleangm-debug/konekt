from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import uuid
import os
import jwt
from attribution_capture_service import (
    extract_attribution_from_payload,
    hydrate_affiliate_from_code,
    build_attribution_block,
)

router = APIRouter(prefix="/api/customer/checkout-quote", tags=["Customer Checkout Quote"])

class QuoteItem(BaseModel):
    name: str
    sku: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0
    subtotal: float = 0

class DeliveryAddress(BaseModel):
    street: str
    city: str
    region: str
    postal_code: Optional[str] = None
    country: str = "Tanzania"
    landmark: Optional[str] = None
    contact_phone: str

class CheckoutQuoteCreate(BaseModel):
    items: List[QuoteItem]
    subtotal: float
    vat_percent: float = 18
    vat_amount: float = 0
    total: float
    delivery_address: DeliveryAddress
    delivery_notes: Optional[str] = None
    source: str = "in_account_checkout"
    affiliate_code: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_discount: Optional[float] = None

async def get_current_user(request: Request):
    """Extract user from token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_quote_number() -> str:
    """Generate a unique quote number"""
    return f"QT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

@router.post("")
async def create_checkout_quote(data: CheckoutQuoteCreate, request: Request):
    """Create a quote from checkout (not invoice) - VAT is applied after subtotal"""
    user = await get_current_user(request)
    db = request.app.mongodb
    
    quote_id = str(uuid.uuid4())
    quote_number = generate_quote_number()
    
    # Build quote document
    # Extract and hydrate affiliate attribution
    attribution = extract_attribution_from_payload(data.model_dump())
    attribution = await hydrate_affiliate_from_code(db, attribution)
    attribution_block = build_attribution_block(attribution)

    quote_doc = {
        "id": quote_id,
        "quote_number": quote_number,
        "customer_id": user["id"],
        "customer_email": user["email"],
        "customer_name": user.get("full_name", ""),
        "customer_phone": user.get("phone", ""),
        "customer_company": user.get("company", ""),
        "items": [item.model_dump() for item in data.items],
        "subtotal": data.subtotal,
        "vat_percent": data.vat_percent,
        "vat_amount": data.vat_amount,
        "discount": 0,
        "total": data.total,
        "delivery_address": data.delivery_address.model_dump(),
        "delivery_notes": data.delivery_notes,
        "status": "pending",  # pending -> approved -> paid (converts to invoice)
        "source": data.source,
        "valid_until": (datetime.now(timezone.utc) + __import__("datetime").timedelta(days=30)).isoformat(),
        **attribution_block,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Store in quotes_v2 collection (per PRD collection unification)
    await db.quotes_v2.insert_one(quote_doc)
    
    # Also store a backup in quotes for legacy compatibility
    await db.quotes.insert_one({**quote_doc})

    # Check if customer has credit terms — if so, they can proceed without immediate payment
    credit_terms_enabled = user.get("credit_terms_enabled", False)
    credit_limit = float(user.get("credit_limit", 0) or 0)
    payment_term_label = user.get("payment_term_label", "Prepaid")
    payment_required_now = True

    if credit_terms_enabled and credit_limit > 0:
        # Calculate outstanding balance
        outstanding = await db.invoices.aggregate([
            {"$match": {"customer_id": user["id"], "status": {"$in": ["unpaid", "pending", "sent"]}}},
            {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}}},
        ]).to_list(1)
        outstanding_amount = outstanding[0]["total"] if outstanding else 0
        available_credit = credit_limit - outstanding_amount
        if available_credit >= data.total:
            payment_required_now = False

    return {
        "id": quote_id,
        "quote_number": quote_number,
        "total": data.total,
        "status": "pending",
        "payment_required_now": payment_required_now,
        "credit_terms_enabled": credit_terms_enabled,
        "payment_term_label": payment_term_label,
        "message": "Quote created successfully." + (" Payment on credit terms." if not payment_required_now else " You can review and proceed to payment."),
    }
