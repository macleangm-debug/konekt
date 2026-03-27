"""
Invoice Payment Routes
Handle invoice payment context and proof submission.
Supports both authenticated and public token access.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from bson import ObjectId

router = APIRouter(prefix="/api/invoice-payments", tags=["Invoice Payments"])


def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("/invoice/{invoice_id}")
async def get_invoice_payment_context(invoice_id: str, request: Request):
    """Get payment context for an invoice including bank details"""
    db = request.app.mongodb
    
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        invoice = None
    
    # Fallback: try again with ObjectId
    if not invoice:
        try:
            invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
        except Exception:
            pass
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    territory = invoice.get("territory_code", "TZ")
    payment_settings = await db.payment_settings.find_one({"country_code": territory}) or {}

    return {
        "invoice_id": invoice_id,
        "invoice_number": invoice.get("invoice_number"),
        "customer_user_id": invoice.get("customer_user_id"),
        "customer_email": invoice.get("customer_email"),
        "customer_name": invoice.get("customer_name"),
        "amount_due": invoice.get("amount_due") or invoice.get("total") or 0,
        "currency": invoice.get("currency", payment_settings.get("currency", "TZS")),
        "territory_code": territory,
        "status": invoice.get("status"),
        "bank_details": {
            "bank_name": payment_settings.get("bank_name", "CRDB BANK"),
            "account_name": payment_settings.get("account_name", "KONEKT LIMITED"),
            "account_number": payment_settings.get("account_number", "015C8841347002"),
            "branch": payment_settings.get("branch", ""),
            "swift": payment_settings.get("swift", "CORUTZTZ"),
            "payment_instructions": payment_settings.get(
                "payment_instructions",
                "Please use your invoice reference automatically linked to this payment page. Upload payment proof after transfer."
            ),
        },
        "payment_methods": {
            "bank_transfer": {"enabled": True, "label": "Bank Transfer"},
            "mobile_money": {"enabled": False, "label": "Mobile Money - Coming Soon"},
            "card": {"enabled": False, "label": "Card Payment - Coming Soon"},
            "kwikpay": {"enabled": False, "label": "KwikPay - Coming Soon"},
        },
    }


@router.post("/invoice/{invoice_id}/proof")
async def submit_invoice_payment_proof(invoice_id: str, payload: dict, request: Request):
    """Submit payment proof for an invoice"""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)

    # Try both collections
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    doc = {
        "invoice_id": invoice_id,
        "invoice_number": invoice.get("invoice_number"),
        "customer_user_id": invoice.get("customer_user_id"),
        "customer_email": invoice.get("customer_email"),
        "customer_name": invoice.get("customer_name"),
        "payer_name": payload.get("payer_name") or invoice.get("customer_name") or "",
        "amount_due": invoice.get("amount_due") or invoice.get("total") or 0,
        "amount_paid": float(payload.get("amount_paid", 0) or 0),
        "currency": payload.get("currency", invoice.get("currency", "TZS")),
        "payment_date": payload.get("payment_date"),
        "transaction_reference": payload.get("transaction_reference", ""),
        "proof_file_url": payload.get("proof_file_url", ""),
        "note": payload.get("note", ""),
        "payment_method": "bank_transfer",
        "status": "pending_verification",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.payment_proofs.insert_one(doc)

    # Update invoice payment status and store payer_name
    payer_name = payload.get("payer_name") or invoice.get("customer_name") or ""
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {
            "payment_status": "pending_verification",
            "proof_submitted_at": now.isoformat(),
            "payer_name": payer_name,
            "updated_at": now,
        }},
    )

    return {"ok": True, "payment_proof_id": str(result.inserted_id)}


@router.get("/token/{token}")
async def get_invoice_by_public_token(token: str, request: Request):
    """Get invoice payment context using public payment token"""
    db = request.app.mongodb
    
    invoice = await db.invoices.find_one({"public_payment_token": token})
    if not invoice:
        invoice = await db.invoices.find_one({"public_payment_token": token})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice payment link not found")
    
    return await get_invoice_payment_context(str(invoice["_id"]), request)
