from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from uuid import uuid4

router = APIRouter(prefix="/api/customer-account", tags=["Customer Account"])
payment_router = APIRouter(prefix="/api/customer-payment", tags=["Customer Payment"])

DEFAULT_PROFILE = {
    "account_type": "personal",
    "contact_name": "",
    "phone": "",
    "email": "",
    "business_name": "",
    "tin": "",
    "vat_number": "",
    "delivery_recipient_name": "",
    "delivery_phone": "",
    "delivery_address_line": "",
    "delivery_city": "",
    "delivery_region": "",
    "invoice_client_name": "",
    "invoice_client_phone": "",
    "invoice_client_email": "",
    "invoice_client_tin": "",
}

@router.get("/profile")
async def get_profile(request: Request, customer_id: str):
    db = request.app.mongodb
    row = await db.customer_profiles.find_one({"customer_id": customer_id})
    if not row:
        return {**DEFAULT_PROFILE, "customer_id": customer_id}
    row["id"] = str(row.get("_id"))
    row.pop("_id", None)
    return {**DEFAULT_PROFILE, **row}

@router.put("/profile")
async def save_profile(payload: dict, request: Request):
    db = request.app.mongodb
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required")
    value = {**DEFAULT_PROFILE, **payload, "updated_at": datetime.now(timezone.utc)}
    await db.customer_profiles.update_one({"customer_id": customer_id}, {"$set": value}, upsert=True)
    return {"ok": True, "value": value}

@router.get("/prefill")
async def get_prefill(request: Request, customer_id: str):
    db = request.app.mongodb
    row = await db.customer_profiles.find_one({"customer_id": customer_id})
    if not row:
        return DEFAULT_PROFILE
    row.pop("_id", None)
    return {**DEFAULT_PROFILE, **row}

def _money(v):
    return round(float(v or 0), 2)

@payment_router.post("/checkout-fixed-price")
async def checkout_fixed_price(payload: dict, request: Request):
    db = request.app.mongodb
    customer_id = payload.get("customer_id")
    items = payload.get("items", [])
    billing = payload.get("billing", {})
    delivery = payload.get("delivery", {})
    if not customer_id or not items:
        raise HTTPException(status_code=400, detail="customer_id and items are required")

    subtotal = 0
    normalized_items = []
    for item in items:
      qty = max(1, int(item.get("quantity", 1) or 1))
      price = _money(item.get("price", 0))
      line_total = _money(qty * price)
      subtotal += line_total
      normalized_items.append({
        "product_id": item.get("id"),
        "name": item.get("name", "Product"),
        "quantity": qty,
        "unit_price": price,
        "line_total": line_total,
      })

    vat_percent = float(payload.get("vat_percent", 18) or 18)
    vat_amount = _money(subtotal * (vat_percent / 100.0))
    total_amount = _money(subtotal + vat_amount)

    order_id = str(uuid4())
    invoice_id = str(uuid4())
    payment_id = str(uuid4())

    order_doc = {
      "id": order_id,
      "order_number": f"KON-ORD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
      "customer_id": customer_id,
      "type": "product",
      "status": "paid",
      "payment_status": "paid",
      "items": normalized_items,
      "subtotal_amount": subtotal,
      "vat_amount": vat_amount,
      "total_amount": total_amount,
      "delivery": delivery,
      "billing": billing,
      "created_at": datetime.now(timezone.utc),
      "updated_at": datetime.now(timezone.utc),
    }
    invoice_doc = {
      "id": invoice_id,
      "invoice_number": f"KON-INV-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
      "customer_id": customer_id,
      "order_id": order_id,
      "status": "paid",
      "payment_status": "paid",
      "items": normalized_items,
      "subtotal_amount": subtotal,
      "vat_amount": vat_amount,
      "total_amount": total_amount,
      "billing": billing,
      "created_at": datetime.now(timezone.utc),
    }
    payment_doc = {
      "id": payment_id,
      "customer_id": customer_id,
      "order_id": order_id,
      "invoice_id": invoice_id,
      "amount": total_amount,
      "status": "paid",
      "method": payload.get("payment_method", "manual"),
      "created_at": datetime.now(timezone.utc),
    }

    await db.orders.insert_one(order_doc)
    await db.invoices_v2.insert_one(invoice_doc)
    await db.payments.insert_one(payment_doc)
    order_doc.pop("_id", None)
    invoice_doc.pop("_id", None)
    payment_doc.pop("_id", None)
    return {"ok": True, "order": order_doc, "invoice": invoice_doc, "payment": payment_doc}

@payment_router.post("/approve-quote-create-invoice")
async def approve_quote_create_invoice(payload: dict, request: Request):
    db = request.app.mongodb
    quote_id = payload.get("quote_id")
    if not quote_id:
      raise HTTPException(status_code=400, detail="quote_id is required")
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
      raise HTTPException(status_code=404, detail="Quote not found")

    invoice_id = str(uuid4())
    invoice_doc = {
      "id": invoice_id,
      "invoice_number": f"KON-INV-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
      "customer_id": quote.get("customer_id"),
      "quote_id": quote_id,
      "status": "pending_payment",
      "payment_status": "pending",
      "items": quote.get("items", []),
      "subtotal_amount": quote.get("subtotal_amount", quote.get("total_amount", 0)),
      "vat_amount": quote.get("vat_amount", 0),
      "total_amount": quote.get("total_amount", 0),
      "billing": quote.get("billing", {}),
      "created_at": datetime.now(timezone.utc),
    }
    await db.invoices_v2.insert_one(invoice_doc)
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "approved", "invoice_created": True, "invoice_id": invoice_id}})
    invoice_doc.pop("_id", None)
    return {"ok": True, "invoice": invoice_doc}
