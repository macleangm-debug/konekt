"""
Affiliate Payout Admin Routes
Admin approval workflow for affiliate payouts
"""
from datetime import datetime
import os
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/affiliate-payouts", tags=["Affiliate Payout Admin"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("")
async def list_payout_requests(status: str | None = None):
    query = {}
    if status:
        query["status"] = status

    docs = await db.affiliate_payout_requests.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{payout_id}")
async def get_payout_request(payout_id: str):
    doc = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Payout request not found")
    return serialize_doc(doc)


@router.post("/{payout_id}/approve")
async def approve_payout_request(payout_id: str, payload: dict):
    payout = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout request not found")

    if payout.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Payout is not in pending status")

    await db.affiliate_payout_requests.update_one(
        {"_id": ObjectId(payout_id)},
        {
            "$set": {
                "status": "approved",
                "approved_at": datetime.utcnow(),
                "approval_note": payload.get("note", ""),
            }
        },
    )

    updated = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    return serialize_doc(updated)


@router.post("/{payout_id}/reject")
async def reject_payout_request(payout_id: str, payload: dict):
    payout = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout request not found")

    await db.affiliate_payout_requests.update_one(
        {"_id": ObjectId(payout_id)},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": datetime.utcnow(),
                "rejection_note": payload.get("note", ""),
            }
        },
    )

    updated = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    return serialize_doc(updated)


@router.post("/{payout_id}/mark-paid")
async def mark_payout_paid(payout_id: str, payload: dict):
    payout = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout request not found")

    if payout.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Payout must be approved before marking as paid")

    await db.affiliate_payout_requests.update_one(
        {"_id": ObjectId(payout_id)},
        {
            "$set": {
                "status": "paid",
                "paid_at": datetime.utcnow(),
                "payment_reference": payload.get("payment_reference"),
                "payment_method": payload.get("payment_method", "bank_transfer"),
                "payment_note": payload.get("note", ""),
            }
        },
    )

    updated = await db.affiliate_payout_requests.find_one({"_id": ObjectId(payout_id)})
    return serialize_doc(updated)
