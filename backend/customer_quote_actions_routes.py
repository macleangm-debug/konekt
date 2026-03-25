"""
Customer Quote Actions Routes
Customer-side quote viewing, approval, and conversion to invoice
With canonical collection mode + new Quote Engine bridge
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
import jwt
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient

from notification_events import notify_invoice_ready
from collection_mode_service import get_quote_collection, get_invoice_collection

router = APIRouter(prefix="/api/customer/quotes", tags=["Customer Quote Actions"])
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
    if "_id" in doc:
        if "id" not in doc:
            doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


@router.get("")
async def list_my_quotes(user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")

    # Gather from canonical collection (quotes_v2)
    quotes_collection = await get_quote_collection(db)
    legacy_docs = await quotes_collection.find({"customer_email": user_email}).sort("created_at", -1).to_list(500)

    # Also gather from the new quote-engine collection (db.quotes)
    engine_query = {"$or": [{"customer_email": user_email}]}
    if user_id:
        engine_query["$or"].append({"customer_id": user_id})
    engine_docs = await db.quotes.find(engine_query).sort("created_at", -1).to_list(500)

    # Merge, deduplicate by id
    seen = set()
    merged = []
    for doc in engine_docs + legacy_docs:
        doc_id = str(doc.get("id") or doc.get("_id"))
        if doc_id not in seen:
            seen.add(doc_id)
            merged.append(serialize_doc(doc))
    return merged


@router.get("/{quote_id}")
async def get_my_quote(quote_id: str, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")

    # Try new engine collection first (by id field)
    doc = await db.quotes.find_one({"id": quote_id})
    if doc and (doc.get("customer_email") == user_email or doc.get("customer_id") == user_id):
        result = serialize_doc(doc)
        splits = []
        if doc.get("invoice_id"):
            splits = [serialize_doc(s) for s in await db.invoice_splits.find({"invoice_id": doc["invoice_id"]}).to_list(10)]
        result["splits"] = splits
        return result

    # Fallback to canonical collection
    quotes_collection = await get_quote_collection(db)
    try:
        doc = await quotes_collection.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
    except Exception:
        doc = None
    if not doc:
        doc = await quotes_collection.find_one({"id": quote_id, "customer_email": user_email})
    if not doc:
        fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
        try:
            doc = await fallback.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
        except Exception:
            doc = await fallback.find_one({"id": quote_id, "customer_email": user_email})

    if not doc:
        raise HTTPException(status_code=404, detail="Quote not found")

    return serialize_doc(doc)


@router.post("/{quote_id}/approve")
async def approve_my_quote(quote_id: str, payload: dict, user: dict = Depends(get_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    # ── Check new quote-engine collection first ──
    engine_quote = await db.quotes.find_one({"id": quote_id})
    if engine_quote and (engine_quote.get("customer_email") == user_email or engine_quote.get("customer_id") == user_id):
        if engine_quote.get("status") in ("converted", "rejected"):
            raise HTTPException(status_code=400, detail="Quote cannot be approved")

        total = round(float(engine_quote.get("total_amount", 0)), 2)
        payment_type = engine_quote.get("payment_type", "full")
        deposit_pct = float(engine_quote.get("deposit_percent", 0))

        # Create invoice
        invoice_id = str(uuid4())
        invoice_doc = {
            "id": invoice_id,
            "invoice_number": f"KON-INV-{now_utc.strftime('%Y%m%d%H%M%S')}",
            "customer_id": engine_quote.get("customer_id"),
            "customer_email": engine_quote.get("customer_email", ""),
            "customer_name": engine_quote.get("customer_name", ""),
            "user_id": engine_quote.get("customer_id"),
            "quote_id": quote_id,
            "linked_quote_id": quote_id,
            "status": "pending_payment",
            "payment_status": "pending",
            "type": engine_quote.get("type", "service"),
            "source_type": "Quote",
            "items": engine_quote.get("items", []),
            "subtotal_amount": round(float(engine_quote.get("subtotal_amount", total)), 2),
            "vat_amount": round(float(engine_quote.get("vat_amount", 0)), 2),
            "total_amount": total,
            "total": total,
            "amount_due": total,
            "payment_type": payment_type,
            "deposit_percent": deposit_pct,
            "notes": engine_quote.get("notes", ""),
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.invoices.insert_one(invoice_doc)
        invoice_doc.pop("_id", None)

        # Installment splits
        splits = []
        if payment_type == "installment" and deposit_pct > 0:
            deposit_amount = round(total * deposit_pct / 100, 2)
            balance_amount = round(total - deposit_amount, 2)
            dep = {"id": str(uuid4()), "invoice_id": invoice_id, "type": "deposit", "amount": deposit_amount, "status": "pending", "created_at": now_iso}
            bal = {"id": str(uuid4()), "invoice_id": invoice_id, "type": "balance", "amount": balance_amount, "status": "pending", "created_at": now_iso}
            await db.invoice_splits.insert_one(dep)
            await db.invoice_splits.insert_one(bal)
            dep.pop("_id", None)
            bal.pop("_id", None)
            splits = [dep, bal]
            await db.invoices.update_one({"id": invoice_id}, {"$set": {
                "has_installments": True, "amount_due": deposit_amount,
                "deposit_amount": deposit_amount, "balance_amount": balance_amount,
            }})
            invoice_doc["has_installments"] = True
            invoice_doc["deposit_amount"] = deposit_amount
            invoice_doc["balance_amount"] = balance_amount

        # Update quote
        await db.quotes.update_one({"id": quote_id}, {"$set": {
            "status": "converted", "invoice_id": invoice_id, "approved_at": now_iso,
            "accepted_by_role": "customer", "updated_at": now_iso,
        }})

        # Notifications
        if engine_quote.get("customer_id"):
            await db.notifications.insert_one({
                "id": str(uuid4()), "recipient_user_id": engine_quote["customer_id"],
                "title": "Invoice Created", "message": f"Invoice for Quote {engine_quote.get('quote_number', '')} is ready for payment.",
                "target_url": "/dashboard/invoices", "priority": "high", "is_read": False, "created_at": now_iso,
            })
        if engine_quote.get("assigned_sales_id"):
            await db.notifications.insert_one({
                "id": str(uuid4()), "recipient_user_id": engine_quote["assigned_sales_id"],
                "title": "Quote Accepted", "message": f"Quote {engine_quote.get('quote_number', '')} was accepted by customer.",
                "target_url": "/admin/crm", "priority": "medium", "is_read": False, "created_at": now_iso,
            })

        return {"quote": serialize_doc(await db.quotes.find_one({"id": quote_id})),
                "invoice": invoice_doc, "splits": splits, "message": "Quote approved successfully"}

    # ── Legacy collection path ──
    quotes_collection = await get_quote_collection(db)
    quote = None
    try:
        quote = await quotes_collection.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
    except Exception:
        pass
    if not quote:
        fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
        try:
            quote = await fallback.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
        except Exception:
            pass
        if quote:
            quotes_collection = fallback
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if quote.get("status") in {"converted", "rejected", "expired"}:
        raise HTTPException(status_code=400, detail="Quote cannot be approved")

    now = now_utc
    await quotes_collection.update_one({"_id": ObjectId(quote_id)}, {"$set": {"status": "approved", "customer_approved_at": now, "updated_at": now}})

    convert_to_invoice = bool(payload.get("convert_to_invoice", True))
    created_invoice = None
    if convert_to_invoice:
        invoice_doc = {
            "quote_id": quote_id,
            "quote_number": quote.get("quote_number"),
            "invoice_number": f"INV-{now.strftime('%Y%m%d')}-{str(ObjectId())[-6:].upper()}",
            "customer_name": quote.get("customer_name"),
            "customer_email": quote.get("customer_email"),
            "customer_company": quote.get("customer_company"),
            "customer_phone": quote.get("customer_phone"),
            "customer_address_line_1": quote.get("customer_address_line_1"),
            "customer_address_line_2": quote.get("customer_address_line_2"),
            "customer_city": quote.get("customer_city"),
            "customer_country": quote.get("customer_country"),
            "payment_term_label": quote.get("payment_term_label") or "Due on Receipt",
            "currency": quote.get("currency", "TZS"),
            "line_items": quote.get("line_items", []),
            "subtotal": quote.get("subtotal", 0),
            "tax": quote.get("tax", 0),
            "discount": quote.get("discount", 0),
            "total": quote.get("total", 0),
            "paid_amount": 0,
            "balance_due": quote.get("total", 0),
            "status": "sent",
            "source": "quote_customer_approval",
            "created_at": now,
            "updated_at": now,
        }
        invoices_collection = await get_invoice_collection(db)
        result = await invoices_collection.insert_one(invoice_doc)
        created_invoice = await invoices_collection.find_one({"_id": result.inserted_id})
        await quotes_collection.update_one({"_id": ObjectId(quote_id)}, {"$set": {"status": "converted", "invoice_id": str(result.inserted_id), "updated_at": now}})

    updated_quote = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
    response = {"quote": serialize_doc(updated_quote), "message": "Quote approved successfully"}
    if created_invoice:
        notify_invoice_ready(created_invoice)
        response["invoice"] = serialize_doc(created_invoice)
    return response


@router.post("/{quote_id}/reject")
async def reject_my_quote(quote_id: str, payload: dict, user: dict = Depends(get_user)):
    """Customer rejects a quote"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = user.get("email")
    user_id = user.get("id")
    reason = payload.get("reason", "")
    now_iso = datetime.now(timezone.utc).isoformat()

    # Check new engine collection
    engine_quote = await db.quotes.find_one({"id": quote_id})
    if engine_quote and (engine_quote.get("customer_email") == user_email or engine_quote.get("customer_id") == user_id):
        if engine_quote.get("status") in ("converted", "rejected"):
            raise HTTPException(status_code=400, detail="Quote already finalized")
        await db.quotes.update_one({"id": quote_id}, {"$set": {
            "status": "rejected", "rejection_reason": reason, "rejected_at": now_iso, "updated_at": now_iso,
        }})
        if engine_quote.get("assigned_sales_id"):
            await db.notifications.insert_one({
                "id": str(uuid4()), "recipient_user_id": engine_quote["assigned_sales_id"],
                "title": "Quote Rejected", "message": f"Quote {engine_quote.get('quote_number', '')} was rejected. Reason: {reason or 'No reason'}",
                "target_url": "/admin/crm", "priority": "high", "is_read": False, "created_at": now_iso,
            })
        return {"ok": True, "message": "Quote rejected"}

    # Legacy collection
    quotes_collection = await get_quote_collection(db)
    doc = None
    try:
        doc = await quotes_collection.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
    except Exception:
        doc = await quotes_collection.find_one({"id": quote_id, "customer_email": user_email})
    if not doc:
        fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
        try:
            doc = await fallback.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
            if doc:
                quotes_collection = fallback
        except Exception:
            doc = await fallback.find_one({"id": quote_id, "customer_email": user_email})
            if doc:
                quotes_collection = fallback
    if not doc:
        raise HTTPException(status_code=404, detail="Quote not found")

    update_query = {"id": doc["id"]} if doc.get("id") else {"_id": doc["_id"]}
    await quotes_collection.update_one(update_query, {"$set": {"status": "rejected", "rejection_reason": reason, "updated_at": datetime.now(timezone.utc)}})
    return {"ok": True, "message": "Quote rejected"}


@router.patch("/{quote_id}/status")
async def update_quote_status(quote_id: str, payload: dict, user: dict = Depends(get_user)):
    """Update quote status (e.g., mark as paid)"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    new_status = payload.get("status")
    
    if new_status not in ["pending", "approved", "paid", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    quotes_collection = await get_quote_collection(db)
    
    # Find quote by _id or id field
    try:
        doc = await quotes_collection.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
    except:
        doc = await quotes_collection.find_one({"id": quote_id, "customer_email": user_email})
    
    if not doc:
        # Try fallback collection
        fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
        try:
            doc = await fallback.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
            if doc:
                quotes_collection = fallback
        except:
            doc = await fallback.find_one({"id": quote_id, "customer_email": user_email})
            if doc:
                quotes_collection = fallback
    
    if not doc:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    now = datetime.utcnow()
    
    # Update by whichever field was used
    if doc.get("id"):
        await quotes_collection.update_one(
            {"id": doc["id"]},
            {"$set": {"status": new_status, "updated_at": now}}
        )
    else:
        await quotes_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": new_status, "updated_at": now}}
        )
    
    return {"message": f"Quote status updated to {new_status}", "status": new_status}


@router.post("/{quote_id}/convert-to-invoice")
async def convert_quote_to_invoice(quote_id: str, user: dict = Depends(get_user)):
    """Convert a pending quote to an invoice"""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_email = user.get("email")
    quotes_collection = await get_quote_collection(db)
    
    # Find quote
    try:
        doc = await quotes_collection.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
    except:
        doc = await quotes_collection.find_one({"id": quote_id, "customer_email": user_email})
    
    if not doc:
        fallback = db.quotes if quotes_collection.name == "quotes_v2" else db.quotes_v2
        try:
            doc = await fallback.find_one({"_id": ObjectId(quote_id), "customer_email": user_email})
            if doc:
                quotes_collection = fallback
        except:
            doc = await fallback.find_one({"id": quote_id, "customer_email": user_email})
            if doc:
                quotes_collection = fallback
    
    if not doc:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    now = datetime.utcnow()
    
    # Create invoice from quote
    invoice_doc = {
        "quote_id": quote_id,
        "quote_number": doc.get("quote_number"),
        "invoice_number": f"INV-{now.strftime('%Y%m%d')}-{str(ObjectId())[-6:].upper()}",
        "customer_id": doc.get("customer_id"),
        "customer_name": doc.get("customer_name"),
        "customer_email": doc.get("customer_email"),
        "customer_company": doc.get("customer_company"),
        "customer_phone": doc.get("customer_phone"),
        "items": doc.get("items", doc.get("line_items", [])),
        "subtotal": doc.get("subtotal", 0),
        "vat_percent": doc.get("vat_percent", 0),
        "vat_amount": doc.get("vat_amount", 0),
        "discount": doc.get("discount", 0),
        "total": doc.get("total", 0),
        "delivery_address": doc.get("delivery_address"),
        "delivery_notes": doc.get("delivery_notes"),
        "status": "pending_payment",
        "source": "quote_conversion",
        "created_at": now,
        "updated_at": now,
    }
    
    invoices_collection = await get_invoice_collection(db)
    result = await invoices_collection.insert_one(invoice_doc)
    
    # Update quote status
    update_query = {"id": doc["id"]} if doc.get("id") else {"_id": doc["_id"]}
    await quotes_collection.update_one(
        update_query,
        {"$set": {"status": "converted", "invoice_id": str(result.inserted_id), "updated_at": now}}
    )
    
    return {
        "message": "Quote converted to invoice",
        "invoice_id": str(result.inserted_id),
        "invoice_number": invoice_doc["invoice_number"]
    }
