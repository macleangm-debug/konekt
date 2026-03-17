"""
Partner Settlement Routes
Manage partner payout profiles and settlement workflow.
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/partner-settlements", tags=["Partner Settlements"])

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


# ==================== PAYOUT PROFILES ====================

@router.get("/payout-profiles")
async def list_partner_payout_profiles():
    """List all partner payout profiles."""
    docs = await db.partner_payout_profiles.find({}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/payout-profiles/{partner_id}")
async def get_partner_payout_profile(partner_id: str):
    """Get a partner's payout profile."""
    doc = await db.partner_payout_profiles.find_one({"partner_id": partner_id})
    if not doc:
        # Return empty profile structure
        return {
            "partner_id": partner_id,
            "account_name": "",
            "bank_name": "",
            "bank_account_number": "",
            "bank_branch": "",
            "bank_swift_code": "",
            "mobile_money_provider": "",
            "mobile_money_number": "",
            "preferred_method": "bank",
            "currency": "TZS",
            "country_code": "TZ",
            "tax_id": "",
            "is_verified": False,
        }
    return serialize_doc(doc)


@router.post("/payout-profiles")
async def create_or_update_payout_profile(payload: dict):
    """Create or update a partner payout profile."""
    now = datetime.now(timezone.utc).isoformat()
    partner_id = payload.get("partner_id")

    if not partner_id:
        raise HTTPException(status_code=400, detail="partner_id is required")

    existing = await db.partner_payout_profiles.find_one({"partner_id": partner_id})

    doc = {
        "partner_id": partner_id,
        "account_name": payload.get("account_name", ""),
        "bank_name": payload.get("bank_name", ""),
        "bank_account_number": payload.get("bank_account_number", ""),
        "bank_branch": payload.get("bank_branch", ""),
        "bank_swift_code": payload.get("bank_swift_code", ""),
        "mobile_money_provider": payload.get("mobile_money_provider", ""),
        "mobile_money_number": payload.get("mobile_money_number", ""),
        "preferred_method": payload.get("preferred_method", "bank"),  # bank | mobile_money
        "currency": payload.get("currency", "TZS"),
        "country_code": payload.get("country_code", "TZ"),
        "tax_id": payload.get("tax_id", ""),
        "business_registration": payload.get("business_registration", ""),
        "is_verified": bool(payload.get("is_verified", False)),
        "updated_at": now,
    }

    if existing:
        await db.partner_payout_profiles.update_one({"partner_id": partner_id}, {"$set": doc})
        updated = await db.partner_payout_profiles.find_one({"partner_id": partner_id})
        return serialize_doc(updated)
    else:
        doc["created_at"] = now
        result = await db.partner_payout_profiles.insert_one(doc)
        created = await db.partner_payout_profiles.find_one({"_id": result.inserted_id})
        return serialize_doc(created)


# ==================== SETTLEMENTS ====================

@router.get("/settlements")
async def list_settlements(status: str = None, partner_id: str = None):
    """List partner settlements."""
    query = {}
    if status:
        query["status"] = status
    if partner_id:
        query["partner_id"] = partner_id
    
    docs = await db.partner_settlements.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/settlements/{settlement_id}")
async def get_settlement(settlement_id: str):
    """Get a specific settlement."""
    doc = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return serialize_doc(doc)


@router.post("/settlements")
async def create_settlement(payload: dict):
    """Create a new settlement record."""
    now = datetime.now(timezone.utc).isoformat()

    partner_id = payload.get("partner_id")
    if not partner_id:
        raise HTTPException(status_code=400, detail="partner_id is required")

    # Get partner details
    partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    doc = {
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "period_start": payload.get("period_start"),
        "period_end": payload.get("period_end"),
        "assignment_ids": payload.get("assignment_ids", []),
        "total_jobs": int(payload.get("total_jobs", 0) or 0),
        "gross_amount": float(payload.get("gross_amount", 0) or 0),
        "deductions": float(payload.get("deductions", 0) or 0),
        "net_amount": float(payload.get("net_amount", 0) or 0),
        "currency": payload.get("currency", "TZS"),
        "status": "pending",  # pending | eligible | under_review | approved | paid | disputed | held
        "notes": payload.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }

    result = await db.partner_settlements.insert_one(doc)
    created = await db.partner_settlements.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.post("/settlements/{settlement_id}/mark-eligible")
async def mark_settlement_eligible(settlement_id: str):
    """Mark a settlement as eligible for payout."""
    now = datetime.now(timezone.utc).isoformat()

    settlement = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    await db.partner_settlements.update_one(
        {"_id": ObjectId(settlement_id)},
        {"$set": {"status": "eligible", "eligible_at": now, "updated_at": now}}
    )
    updated = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    return serialize_doc(updated)


@router.post("/settlements/{settlement_id}/approve")
async def approve_settlement(settlement_id: str):
    """Approve a settlement for payout."""
    now = datetime.now(timezone.utc).isoformat()

    settlement = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    await db.partner_settlements.update_one(
        {"_id": ObjectId(settlement_id)},
        {"$set": {"status": "approved", "approved_at": now, "updated_at": now}}
    )
    updated = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    return serialize_doc(updated)


@router.post("/settlements/{settlement_id}/mark-paid")
async def mark_settlement_paid(settlement_id: str, payload: dict):
    """Mark a settlement as paid."""
    now = datetime.now(timezone.utc).isoformat()

    settlement = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    await db.partner_settlements.update_one(
        {"_id": ObjectId(settlement_id)},
        {"$set": {
            "status": "paid",
            "paid_at": now,
            "payment_reference": payload.get("payment_reference", ""),
            "payment_method": payload.get("payment_method", "bank"),
            "updated_at": now,
        }}
    )
    updated = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    return serialize_doc(updated)


@router.post("/settlements/{settlement_id}/hold")
async def hold_settlement(settlement_id: str, payload: dict):
    """Put a settlement on hold."""
    now = datetime.now(timezone.utc).isoformat()

    settlement = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    await db.partner_settlements.update_one(
        {"_id": ObjectId(settlement_id)},
        {"$set": {
            "status": "held",
            "hold_reason": payload.get("hold_reason", ""),
            "updated_at": now,
        }}
    )
    updated = await db.partner_settlements.find_one({"_id": ObjectId(settlement_id)})
    return serialize_doc(updated)


# ==================== SUMMARY ====================

@router.get("/summary")
async def settlement_summary():
    """Get settlement summary statistics."""
    pending = await db.partner_settlements.count_documents({"status": "pending"})
    eligible = await db.partner_settlements.count_documents({"status": "eligible"})
    approved = await db.partner_settlements.count_documents({"status": "approved"})
    paid = await db.partner_settlements.count_documents({"status": "paid"})
    held = await db.partner_settlements.count_documents({"status": "held"})

    # Total amounts
    total_pending = 0
    async for row in db.partner_settlements.aggregate([
        {"$match": {"status": {"$in": ["pending", "eligible", "approved"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$net_amount"}}},
    ]):
        total_pending = row.get("total", 0)

    total_paid = 0
    async for row in db.partner_settlements.aggregate([
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$net_amount"}}},
    ]):
        total_paid = row.get("total", 0)

    return {
        "pending_count": pending,
        "eligible_count": eligible,
        "approved_count": approved,
        "paid_count": paid,
        "held_count": held,
        "total_pending_amount": total_pending,
        "total_paid_amount": total_paid,
    }
