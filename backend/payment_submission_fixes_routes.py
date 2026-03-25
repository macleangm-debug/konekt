from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/payment-submission-fixes", tags=["Payment Submission Fixes"])

def _now():
    return datetime.now(timezone.utc).isoformat()

@router.post("/affiliate-promo-benefit")
async def save_affiliate_promo_benefit(payload: dict, request: Request):
    db = request.app.mongodb
    affiliate_id = payload.get("affiliate_id")
    if not affiliate_id:
        raise HTTPException(status_code=400, detail="affiliate_id required")
    benefit = {
        "headline": payload.get("headline", ""),
        "description": payload.get("description", ""),
        "cta_label": payload.get("cta_label", "Use this link"),
        "updated_at": _now(),
    }
    await db.affiliates.update_one({"id": affiliate_id}, {"$set": {"promo_benefit": benefit}}, upsert=False)
    return {"ok": True, "promo_benefit": benefit}

@router.get("/affiliate-promo-benefit")
async def get_affiliate_promo_benefit(request: Request, affiliate_id: str):
    db = request.app.mongodb
    row = await db.affiliates.find_one({"id": affiliate_id}) or {}
    return row.get("promo_benefit", {"headline": "", "description": "", "cta_label": "Use this link"})

@router.post("/submit-payment")
async def submit_payment(payload: dict, request: Request):
    db = request.app.mongodb
    payment_id = payload.get("payment_id")
    customer_id = payload.get("customer_id")
    if not payment_id or not customer_id:
        raise HTTPException(status_code=400, detail="payment_id and customer_id required")
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.get("submission_status") == "submitted":
        return {"ok": True, "already_submitted": True}

    proof_id = str(uuid4())
    proof = {
        "id": proof_id,
        "payment_id": payment_id,
        "invoice_id": payment.get("invoice_id"),
        "customer_id": customer_id,
        "payer_name": payload.get("payer_name", ""),
        "amount_paid": float(payload.get("amount_paid", 0) or 0),
        "file_url": payload.get("file_url", ""),
        "status": "uploaded",
        "visible_roles": ["sales", "finance", "admin"],
        "approvable_roles": ["finance", "admin"],
        "created_at": _now(),
    }
    await db.payment_proofs.insert_one(proof)
    proof.pop("_id", None)
    await db.payments.update_one({"id": payment_id}, {"$set": {
        "submission_status": "submitted",
        "payment_proof_id": proof_id,
        "submitted_at": _now(),
        "status": "proof_uploaded",
        "review_status": "under_review",
    }})
    await db.invoices.update_one({"id": payment.get("invoice_id")}, {"$set": {
        "status": "payment_under_review",
        "payment_status": "payment_under_review",
    }})
    quote_id = payment.get("quote_id")
    if quote_id:
        await db.quotes.update_one({"id": quote_id}, {"$set": {
            "status": "payment_submitted",
            "payment_status": "under_review",
        }})
    return {"ok": True, "payment_proof": proof}

@router.post("/approve-payment-and-distribute")
async def approve_payment_and_distribute(payload: dict, request: Request):
    db = request.app.mongodb
    payment_id = payload.get("payment_id")
    approver_role = payload.get("approver_role")
    if approver_role not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only admin and finance can approve")
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    invoice = await db.invoices.find_one({"id": payment.get("invoice_id")})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    await db.payments.update_one({"id": payment_id}, {"$set": {
        "status": "approved",
        "review_status": "approved",
        "approved_at": _now(),
        "approved_by_role": approver_role,
    }})
    await db.invoices.update_one({"id": invoice["id"]}, {"$set": {
        "status": "paid",
        "payment_status": "paid",
    }})

    quote_id = invoice.get("quote_id")
    if quote_id:
        await db.quotes.update_one({"id": quote_id}, {"$set": {
            "status": "converted_to_invoice",
            "payment_status": "approved",
            "moved_out_of_quotes": True,
        }})

    order_doc = None
    existing_order = await db.orders.find_one({"invoice_id": invoice["id"]})
    if not existing_order:
        order_id = str(uuid4())
        ts = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        order_doc = {
            "id": order_id,
            "order_number": f"KON-ORD-{ts}",
            "invoice_id": invoice.get("id"),
            "quote_id": invoice.get("quote_id"),
            "customer_id": invoice.get("customer_id"),
            "type": invoice.get("type", "product"),
            "status": "processing",
            "payment_status": "paid",
            "items": invoice.get("items", []),
            "subtotal_amount": invoice.get("subtotal_amount", 0),
            "vat_amount": invoice.get("vat_amount", 0),
            "total_amount": invoice.get("total_amount", 0),
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.orders.insert_one(order_doc)
        order_doc.pop("_id", None)

        assigned_sales_id = payload.get("assigned_sales_id") or "auto-sales"
        assigned_sales_name = payload.get("assigned_sales_name") or "Assigned Sales"
        await db.sales_assignments.insert_one({
            "id": str(uuid4()),
            "customer_id": invoice.get("customer_id"),
            "invoice_id": invoice.get("id"),
            "order_id": order_id,
            "sales_owner_id": assigned_sales_id,
            "sales_owner_name": assigned_sales_name,
            "status": "active_followup",
            "created_at": _now(),
        })

        vendor_ids = set()
        for item in invoice.get("items", []):
            if item.get("vendor_id"):
                vendor_ids.add(item["vendor_id"])
        for vendor_id in vendor_ids:
            vendor_items = [x for x in invoice.get("items", []) if x.get("vendor_id") == vendor_id]
            await db.vendor_orders.insert_one({
                "id": str(uuid4()),
                "vendor_id": vendor_id,
                "order_id": order_id,
                "customer_id": invoice.get("customer_id"),
                "status": "ready_to_fulfill",
                "items": vendor_items,
                "created_at": _now(),
            })

    return {"ok": True, "order": order_doc}
