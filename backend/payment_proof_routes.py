"""
Payment Proof Submission Routes
Handle customer payment proof uploads and admin approval workflow.
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/payment-proofs", tags=["Payment Proofs"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


# ==================== CUSTOMER SUBMISSION ====================

@router.post("/submit")
async def submit_payment_proof(payload: dict):
    """Submit a payment proof for review."""
    now = datetime.now(timezone.utc).isoformat()

    invoice_id = payload.get("invoice_id")
    order_id = payload.get("order_id")
    
    if not invoice_id and not order_id:
        raise HTTPException(status_code=400, detail="invoice_id or order_id is required")

    doc = {
        "invoice_id": invoice_id,
        "order_id": order_id,
        "customer_email": payload.get("customer_email"),
        "customer_name": payload.get("customer_name"),
        "amount_paid": float(payload.get("amount_paid", 0) or 0),
        "currency": payload.get("currency", "TZS"),
        "payment_date": payload.get("payment_date"),
        "bank_reference": payload.get("bank_reference", ""),
        "payment_method": payload.get("payment_method", "bank_transfer"),  # bank_transfer | mobile_money
        "proof_file_url": payload.get("proof_file_url", ""),
        "proof_file_name": payload.get("proof_file_name", ""),
        "notes": payload.get("notes", ""),
        "status": "pending",  # pending | approved | rejected
        "created_at": now,
        "updated_at": now,
    }

    result = await db.payment_proof_submissions.insert_one(doc)
    created = await db.payment_proof_submissions.find_one({"_id": result.inserted_id})
    return {"message": "Payment proof submitted successfully", "submission": serialize_doc(created)}


@router.get("/my-submissions")
async def list_my_payment_proofs(customer_email: str):
    """List payment proofs submitted by a customer."""
    docs = await db.payment_proof_submissions.find({
        "customer_email": customer_email
    }).sort("created_at", -1).to_list(length=100)
    return [serialize_doc(doc) for doc in docs]


# ==================== ADMIN ROUTES ====================

@router.get("/admin")
async def list_all_payment_proofs(status: str = None):
    """List all payment proof submissions for admin review."""
    query = {}
    if status:
        query["status"] = status
    
    docs = await db.payment_proof_submissions.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/admin/summary")
async def payment_proof_summary():
    """Get payment proof submission summary."""
    pending = await db.payment_proof_submissions.count_documents({"status": "pending"})
    approved = await db.payment_proof_submissions.count_documents({"status": "approved"})
    rejected = await db.payment_proof_submissions.count_documents({"status": "rejected"})

    # Total pending amount
    total_pending = 0
    async for row in db.payment_proof_submissions.aggregate([
        {"$match": {"status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}},
    ]):
        total_pending = row.get("total", 0)

    return {
        "pending_count": pending,
        "approved_count": approved,
        "rejected_count": rejected,
        "total_pending_amount": total_pending,
    }


@router.get("/admin/{proof_id}")
async def get_payment_proof(proof_id: str):
    """Get a specific payment proof submission."""
    doc = await db.payment_proof_submissions.find_one({"_id": ObjectId(proof_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Payment proof not found")
    return serialize_doc(doc)


@router.post("/admin/{proof_id}/approve")
async def approve_payment_proof(proof_id: str, payload: dict):
    """Approve a payment proof and allocate to invoice."""
    now = datetime.now(timezone.utc).isoformat()

    proof = await db.payment_proof_submissions.find_one({"_id": ObjectId(proof_id)})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")

    # Update proof status
    await db.payment_proof_submissions.update_one(
        {"_id": ObjectId(proof_id)},
        {"$set": {
            "status": "approved",
            "approved_at": now,
            "approved_by": payload.get("approved_by", ""),
            "approval_notes": payload.get("notes", ""),
            "updated_at": now,
        }}
    )

    # Update invoice if linked
    invoice_id = proof.get("invoice_id")
    if invoice_id:
        # Try to find invoice by ObjectId or by invoice_number string
        invoice = None
        try:
            if len(invoice_id) == 24:  # Valid ObjectId length
                invoice = await db.invoices_v2.find_one({"_id": ObjectId(invoice_id)})
        except Exception:
            pass
        
        # If not found by ObjectId, try by invoice_number
        if not invoice:
            invoice = await db.invoices_v2.find_one({"invoice_number": invoice_id})
        
        if invoice:
            amount_paid = float(proof.get("amount_paid", 0) or 0)
            current_paid = float(invoice.get("amount_paid", 0) or 0)
            total = float(invoice.get("total", 0) or 0)
            new_paid = current_paid + amount_paid

            new_status = invoice.get("status")
            if new_paid >= total:
                new_status = "paid"
            elif new_paid > 0:
                new_status = "part_paid"

            await db.invoices_v2.update_one(
                {"_id": ObjectId(invoice_id)},
                {"$set": {
                    "amount_paid": new_paid,
                    "status": new_status,
                    "updated_at": now,
                }}
            )

    updated = await db.payment_proof_submissions.find_one({"_id": ObjectId(proof_id)})
    return {"message": "Payment proof approved", "submission": serialize_doc(updated)}


@router.post("/admin/{proof_id}/reject")
async def reject_payment_proof(proof_id: str, payload: dict):
    """Reject a payment proof."""
    now = datetime.now(timezone.utc).isoformat()

    proof = await db.payment_proof_submissions.find_one({"_id": ObjectId(proof_id)})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")

    await db.payment_proof_submissions.update_one(
        {"_id": ObjectId(proof_id)},
        {"$set": {
            "status": "rejected",
            "rejected_at": now,
            "rejected_by": payload.get("rejected_by", ""),
            "rejection_reason": payload.get("reason", ""),
            "updated_at": now,
        }}
    )

    updated = await db.payment_proof_submissions.find_one({"_id": ObjectId(proof_id)})
    return {"message": "Payment proof rejected", "submission": serialize_doc(updated)}
