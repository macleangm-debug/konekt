"""
Walk-in / POS Sale Route — Fast order entry for in-shop customers.
Reuses canonical order, payment, document, and closure logic.
Walk-in = assisted sale (sales_channel=walk_in, sales_contribution_type=assisted).
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/walk-in-sale", tags=["Walk-in Sale"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.post("")
async def create_walk_in_sale(payload: dict, request: Request):
    """
    Create a walk-in sale: order + payment + invoice + auto-complete in one step.
    No quote stage. No delivery note. Closure = confirmed_in_person.
    """
    now = datetime.now(timezone.utc)

    # Validate items
    items = payload.get("items") or []
    if not items:
        raise HTTPException(status_code=400, detail="At least one item is required.")

    # Business client validation
    client_type = payload.get("client_type", "individual")
    if client_type == "business":
        missing = []
        if not payload.get("business_name"):
            missing.append("Business Name")
        if not payload.get("vrn"):
            missing.append("VRN")
        if not payload.get("brn"):
            missing.append("BRN")
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Business clients require: {', '.join(missing)}"
            )

    # Calculate totals
    subtotal = 0
    line_items = []
    for item in items:
        qty = float(item.get("quantity", 1))
        price = float(item.get("unit_price", 0))
        total = qty * price
        subtotal += total
        line_items.append({
            "description": item.get("description") or item.get("name", "Item"),
            "name": item.get("name", ""),
            "sku": item.get("sku", ""),
            "quantity": qty,
            "unit_price": price,
            "total": total,
        })

    discount = float(payload.get("discount", 0))
    tax = float(payload.get("tax", 0))
    total = subtotal - discount + tax

    order_number = f"WLK-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
    invoice_number = f"INV-WLK-{now.strftime('%Y%m%d%H%M%S')}"

    # 1. Create order
    order_doc = {
        "order_number": order_number,
        "customer_name": payload.get("customer_name", "Walk-in Customer"),
        "customer_phone": payload.get("customer_phone", ""),
        "customer_email": payload.get("customer_email", ""),
        "customer_company": payload.get("business_name", ""),
        "client_type": client_type,
        "vrn": payload.get("vrn", ""),
        "brn": payload.get("brn", ""),
        "line_items": line_items,
        "subtotal": subtotal,
        "discount": discount,
        "tax": tax,
        "total": total,
        "total_amount": total,
        "currency": payload.get("currency", "TZS"),
        "status": "completed",
        "payment_status": "paid",
        "fulfillment_status": "completed",
        "sales_channel": "walk_in",
        "sales_contribution_type": "assisted",
        "closure_method": "confirmed_in_person",
        "closure_locked": True,
        "receiver_name": payload.get("customer_name", "Walk-in Customer"),
        "completed_at": now,
        "notes": payload.get("notes", "Walk-in purchase"),
        "is_walk_in": True,
        "created_by": payload.get("created_by", ""),
        "created_at": now,
        "updated_at": now,
    }

    order_result = await db.orders.insert_one(order_doc)
    order_id = str(order_result.inserted_id)

    # 2. Create invoice
    invoice_doc = {
        "id": str(uuid4()),
        "invoice_number": invoice_number,
        "order_id": order_id,
        "order_number": order_number,
        "customer_name": order_doc["customer_name"],
        "customer_phone": order_doc["customer_phone"],
        "customer_email": order_doc["customer_email"],
        "customer_company": order_doc["customer_company"],
        "customer_type": client_type,
        "customer_tin": payload.get("vrn", ""),
        "customer_brn": payload.get("brn", ""),
        "line_items": line_items,
        "subtotal": subtotal,
        "discount": discount,
        "tax": tax,
        "total": total,
        "currency": order_doc["currency"],
        "status": "paid",
        "paid_amount": total,
        "due_date": now.isoformat(),
        "payment_method": payload.get("payment_method", "cash"),
        "notes": "Walk-in purchase",
        "created_at": now,
        "updated_at": now,
    }
    await db.invoices.insert_one(invoice_doc)

    # 3. Record payment
    payment_doc = {
        "invoice_id": invoice_doc["id"],
        "order_id": order_id,
        "amount": total,
        "payment_method": payload.get("payment_method", "cash"),
        "payment_date": now.isoformat(),
        "reference": payload.get("payment_reference", ""),
        "notes": "Walk-in sale payment",
        "created_at": now,
    }
    await db.payment_proofs.insert_one(payment_doc)

    return {
        "status": "success",
        "order_id": order_id,
        "order_number": order_number,
        "invoice_number": invoice_number,
        "total": total,
        "currency": order_doc["currency"],
        "message": "Walk-in sale completed successfully",
    }
