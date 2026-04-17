"""
Konekt Quotes Routes - Create, manage, convert quotes
With attribution persistence and canonical collection mode
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

from quote_models import QuoteCreate, ConvertQuoteToOrderRequest
from payment_terms_utils import resolve_payment_terms
from attribution_capture_service import (
    extract_attribution_from_payload,
    hydrate_affiliate_from_code,
    build_attribution_block,
    inherit_attribution_from_document
)
from services.product_promotion_enrichment import resolve_checkout_item_price
from notification_events import notify_quote_ready, notify_invoice_ready
from notification_trigger_service import (
    notify_customer_quote_ready,
    notify_sales_quote_approved,
)
from collection_mode_service import get_quote_collection, get_invoice_collection

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
    """Create a new quote with auto-applied customer payment terms and attribution"""
    now = datetime.now(timezone.utc)
    quote_number = f"QTN-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    # Extract and hydrate attribution
    attribution = extract_attribution_from_payload(payload.model_dump())
    attribution = await hydrate_affiliate_from_code(db, attribution)

    # Look up customer by email to auto-apply payment terms
    customer = await db.customers.find_one({"email": payload.customer_email})
    resolved_terms = resolve_payment_terms(customer)

    doc = payload.model_dump()
    doc["quote_number"] = quote_number
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()

    # Enrich items with active promotions (same resolver for ALL flows)
    enriched_items = []
    total_promo_discount = 0
    for item in (doc.get("items") or []):
        promo_info = await resolve_checkout_item_price({
            "product_id": item.get("product_id", ""),
            "unit_price": float(item.get("unit_price") or item.get("price") or 0),
            "category_name": item.get("category_name", ""),
            "category": item.get("category", ""),
        }, db=db)
        if promo_info["promo_applied"]:
            item["original_price"] = promo_info["original_price"]
            item["unit_price"] = promo_info["unit_price"]
            item["promo_applied"] = True
            item["promo_id"] = promo_info["promo_id"]
            item["promo_label"] = promo_info["promo_label"]
            item["promo_discount_per_unit"] = promo_info["promo_discount"]
            qty = int(item.get("quantity", 1))
            item["subtotal"] = promo_info["unit_price"] * qty
            total_promo_discount += promo_info["promo_discount"] * qty
        enriched_items.append(item)
    doc["items"] = enriched_items
    doc["promo_discount_total"] = total_promo_discount
    
    # Add attribution block
    doc.update(build_attribution_block(attribution))
    
    # Auto-apply customer payment terms if not explicitly provided
    if not payload.payment_term_type or payload.payment_term_type == "due_on_receipt":
        doc["payment_term_type"] = resolved_terms["payment_term_type"]
        doc["payment_term_days"] = resolved_terms["payment_term_days"]
        doc["payment_term_label"] = resolved_terms["payment_term_label"]
        doc["payment_term_notes"] = resolved_terms["payment_term_notes"]
    
    # If terms are not provided, use payment term notes or default
    if not doc.get("terms"):
        settings = await db.company_settings.find_one({})
        doc["terms"] = resolved_terms["payment_term_notes"] or (settings.get("quote_terms") if settings else None)
    
    # Convert valid_until to string if present
    if doc.get("valid_until"):
        doc["valid_until"] = doc["valid_until"].isoformat() if hasattr(doc["valid_until"], "isoformat") else str(doc["valid_until"])

    # Use canonical quote collection
    quotes_collection = await get_quote_collection(db)
    result = await quotes_collection.insert_one(doc)
    created = await quotes_collection.find_one({"_id": result.inserted_id})
    
    # Send quote ready notification
    notify_quote_ready(created)
    
    return serialize_doc(created)


@router.get("")
async def list_quotes(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """List all quotes from canonical collection with legacy fallback"""
    query = {}
    if status:
        query["status"] = status
    if customer_email:
        query["customer_email"] = customer_email
    
    # Get canonical collection
    quotes_collection = await get_quote_collection(db)
    docs = await quotes_collection.find(query).sort("created_at", -1).to_list(length=limit)
    
    # Also get from fallback collection
    fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
    legacy_docs = await fallback.find(query).sort("created_at", -1).to_list(length=limit)
    
    # Combine and dedupe by quote_number
    seen = set()
    combined = []
    for doc in docs + legacy_docs:
        qn = doc.get("quote_number")
        if qn and qn not in seen:
            seen.add(qn)
            combined.append(serialize_doc(doc))
    
    return combined[:limit]


@router.get("/{quote_id}")
async def get_quote(quote_id: str):
    """Get a specific quote from canonical collection with fallback"""
    try:
        quotes_collection = await get_quote_collection(db)
        doc = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
        if not doc:
            fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
            doc = await fallback.find_one({"_id": ObjectId(quote_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Quote not found")
        return serialize_doc(doc)
    except Exception:
        raise HTTPException(status_code=404, detail="Quote not found")


@router.put("/{quote_id}")
async def update_quote(quote_id: str, payload: dict):
    """Update quote details: line items, customer info, pricing, notes"""
    now = datetime.now(timezone.utc)
    quotes_collection = await get_quote_collection(db)

    quote = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
    target_collection = quotes_collection
    if not quote:
        fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
        quote = await fallback.find_one({"_id": ObjectId(quote_id)})
        if quote:
            target_collection = fallback
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if quote.get("status") == "converted":
        raise HTTPException(status_code=400, detail="Cannot edit a converted quote")

    allowed_fields = {
        "customer_name", "customer_email", "customer_company", "customer_phone",
        "line_items", "subtotal", "tax", "discount", "total",
        "notes", "currency", "payment_terms", "valid_until",
    }
    update_data = {k: v for k, v in payload.items() if k in allowed_fields}
    update_data["updated_at"] = now.isoformat()

    await target_collection.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": update_data}
    )
    # Sync to the other collection
    other_collection = db.quotes if target_collection.name == "quotes_v2" else db.quotes_v2
    await other_collection.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": update_data}
    )

    updated = await target_collection.find_one({"_id": ObjectId(quote_id)})
    return serialize_doc(updated)


@router.patch("/{quote_id}/status")
async def update_quote_status(quote_id: str, status: str = Query(...), triggered_by_user_id: str = Query(default=None), triggered_by_role: str = Query(default="admin")):
    """Update quote status with workflow-linked notifications.
    
    When status = 'approved': auto-generates Invoice + Order (pending_payment).
    This is the CANONICAL commercial flow: Quote → Invoice + Order.
    """
    valid_statuses = ["draft", "waiting_for_pricing", "ready_to_send", "sent", "approved", "rejected", "expired", "converted"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc)
    quotes_collection = await get_quote_collection(db)
    
    # Get the quote first for notification data
    quote = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
    fallback_used = False
    if not quote:
        fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
        quote = await fallback.find_one({"_id": ObjectId(quote_id)})
        fallback_used = True
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Update the quote
    target_collection = fallback if fallback_used else quotes_collection
    update_fields = {"status": status, "updated_at": now.isoformat()}

    # ─── COMMERCIAL FLOW: Quote Approved → Auto-Generate Invoice + Order ───
    generated_docs = {}
    if status == "approved":
        try:
            gen = await _auto_generate_invoice_and_order(db, quote, now)
            generated_docs = gen
            update_fields["converted_invoice_number"] = gen.get("invoice_number")
            update_fields["converted_order_number"] = gen.get("order_number")
            update_fields["converted_invoice_id"] = gen.get("invoice_id")
            update_fields["converted_order_id"] = gen.get("order_id")
        except Exception as e:
            import logging
            logging.getLogger("quote_routes").error(f"Auto-generate failed for quote {quote_id}: {e}")

    await target_collection.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": update_fields}
    )
    
    updated = await target_collection.find_one({"_id": ObjectId(quote_id)})
    
    # Send workflow-linked notifications based on status change
    if status == "sent":
        await notify_customer_quote_ready(
            db,
            customer_user_id=quote.get("customer_user_id") or quote.get("customer_id"),
            quote_id=quote_id,
            quote_number=quote.get("quote_number", "Quote"),
            triggered_by_user_id=triggered_by_user_id,
            triggered_by_role=triggered_by_role,
        )
    elif status == "approved":
        await notify_sales_quote_approved(
            db,
            sales_user_id=quote.get("assigned_sales_id") or quote.get("assigned_to"),
            quote_id=quote_id,
            quote_number=quote.get("quote_number", "Quote"),
            customer_name=quote.get("customer_name"),
            triggered_by_user_id=triggered_by_user_id,
            triggered_by_role=triggered_by_role,
        )
    
    result = serialize_doc(updated)
    if generated_docs:
        result["generated_invoice"] = generated_docs.get("invoice_number")
        result["generated_order"] = generated_docs.get("order_number")
    return result


async def _auto_generate_invoice_and_order(db, quote: dict, now):
    """
    When a quote is approved, auto-generate:
      1. Invoice (payment document) — status: draft
      2. Order (fulfillment document) — status: pending_payment
    
    STRICT RULES:
      - Order must NOT trigger fulfillment, commissions, revenue, or stock until payment approved
      - Invoice is the payment tracking document
      - Order is the fulfillment tracking document
    """
    from attribution_capture_service import inherit_attribution_from_document

    quote_id_str = str(quote["_id"])
    quote_number = quote.get("quote_number", "")

    invoice_number = f"INV-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
    order_number = f"ORD-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    attribution = inherit_attribution_from_document(quote)

    # Build invoice
    invoice_doc = {
        "invoice_number": invoice_number,
        "source_type": "quote_accepted",
        "quote_id": quote_id_str,
        "quote_number": quote_number,
        "customer_name": quote.get("customer_name"),
        "customer_email": quote.get("customer_email"),
        "customer_company": quote.get("customer_company"),
        "customer_phone": quote.get("customer_phone"),
        "currency": quote.get("currency", "TZS"),
        "line_items": quote.get("line_items") or quote.get("items", []),
        "subtotal": float(quote.get("subtotal", 0) or 0),
        "tax": float(quote.get("tax", 0) or 0),
        "discount": float(quote.get("discount", 0) or 0),
        "total": float(quote.get("total", 0) or 0),
        "notes": quote.get("notes"),
        "terms": quote.get("terms"),
        "status": "draft",
        "payments": [],
        "amount_paid": 0,
        "balance_due": float(quote.get("total", 0) or 0),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        **attribution,
    }

    invoices_collection = await get_invoice_collection(db)
    inv_result = await invoices_collection.insert_one(invoice_doc)

    # Build order — STRICTLY pending_payment
    order_doc = {
        "order_number": order_number,
        "order_type": "quote_converted",
        "source_type": "quote_accepted",
        "quote_id": quote_id_str,
        "quote_number": quote_number,
        "invoice_id": str(inv_result.inserted_id),
        "invoice_number": invoice_number,
        "customer_name": quote.get("customer_name"),
        "customer_email": quote.get("customer_email"),
        "customer_company": quote.get("customer_company"),
        "customer_phone": quote.get("customer_phone"),
        "currency": quote.get("currency", "TZS"),
        "line_items": quote.get("line_items") or quote.get("items", []),
        "subtotal": float(quote.get("subtotal", 0) or 0),
        "tax": float(quote.get("tax", 0) or 0),
        "discount": float(quote.get("discount", 0) or 0),
        "total": float(quote.get("total", 0) or 0),
        "notes": quote.get("notes"),
        "current_status": "pending_payment",
        "payment_confirmed": False,
        "fulfillment_locked": True,
        "commission_triggered": False,
        "revenue_recognized": False,
        "status_history": [
            {
                "status": "pending_payment",
                "note": f"Created from approved quote {quote_number}. Awaiting payment.",
                "timestamp": now.isoformat(),
            }
        ],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        **attribution,
    }

    ord_result = await db.orders.insert_one(order_doc)

    # Link invoice back to order
    await invoices_collection.update_one(
        {"_id": inv_result.inserted_id},
        {"$set": {"order_id": str(ord_result.inserted_id), "order_number": order_number}}
    )

    notify_invoice_ready(invoice_doc)

    # Auto-route order items to vendors
    try:
        from services.vendor_order_routing import auto_route_order_to_vendors
        routing_result = await auto_route_order_to_vendors(str(ord_result.inserted_id), trigger="order_created")
    except Exception as e:
        routing_result = {"error": str(e)}

    return {
        "invoice_id": str(inv_result.inserted_id),
        "invoice_number": invoice_number,
        "order_id": str(ord_result.inserted_id),
        "order_number": order_number,
        "vendor_routing": routing_result,
    }


@router.post("/convert-to-order")
async def convert_quote_to_order(payload: ConvertQuoteToOrderRequest):
    """Convert an approved quote to an order"""
    quotes_collection = await get_quote_collection(db)
    try:
        quote = await quotes_collection.find_one({"_id": ObjectId(payload.quote_id)})
        if not quote:
            fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
            quote = await fallback.find_one({"_id": ObjectId(payload.quote_id)})
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

    # Update quote status in both collections for backwards compatibility
    quotes_collection = await get_quote_collection(db)
    await quotes_collection.update_one(
        {"_id": quote["_id"]},
        {"$set": {
            "status": "converted", 
            "converted_order_id": str(result.inserted_id),
            "converted_order_number": order_number,
            "updated_at": now.isoformat()
        }}
    )
    # Also update fallback collection
    fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
    await fallback.update_one(
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
    """Convert a quote directly to an invoice, preserving attribution"""
    quotes_collection = await get_quote_collection(db)
    try:
        quote = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
        if not quote:
            fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
            quote = await fallback.find_one({"_id": ObjectId(quote_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    now = datetime.now(timezone.utc)
    invoice_number = f"INV-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    # Inherit attribution from quote
    attribution = inherit_attribution_from_document(quote)

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
        "subtotal": float(quote.get("subtotal", 0) or 0),
        "tax": float(quote.get("tax", 0) or 0),
        "discount": float(quote.get("discount", 0) or 0),
        "total": float(quote.get("total", 0) or 0),
        "notes": quote.get("notes"),
        "terms": quote.get("terms"),
        "status": "draft",
        "payments": [],
        "amount_paid": 0,
        "balance_due": float(quote.get("total", 0) or 0),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        # Attribution inherited from quote
        **attribution,
    }

    # Use canonical invoice collection
    invoices_collection = await get_invoice_collection(db)
    result = await invoices_collection.insert_one(invoice_doc)

    # Update quote status in both collections for backwards compatibility
    await quotes_collection.update_one(
        {"_id": quote["_id"]},
        {"$set": {
            "status": "converted",
            "converted_invoice_number": invoice_number,
            "updated_at": now.isoformat()
        }}
    )
    fallback_quotes = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
    await fallback_quotes.update_one(
        {"_id": quote["_id"]},
        {"$set": {
            "status": "converted",
            "converted_invoice_number": invoice_number,
            "updated_at": now.isoformat()
        }}
    )

    created_invoice = await invoices_collection.find_one({"_id": result.inserted_id})
    
    # Send invoice ready notification
    notify_invoice_ready(created_invoice)
    
    return serialize_doc(created_invoice)
