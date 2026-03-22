from datetime import datetime
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/payout-engine", tags=["Payout Engine"])

DEFAULT_MINIMUM_PAYOUT = 50000

@router.get("/summary")
async def payout_summary(request: Request, beneficiary_type: str):
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    user_id = str((user or {}).get("_id")) if (user or {}).get("_id") else None

    pending = await db.commission_records.find({
        "beneficiary_type": beneficiary_type,
        "beneficiary_user_id": user_id,
        "status": "approved",
    }).to_list(length=1000)

    paid = await db.commission_records.find({
        "beneficiary_type": beneficiary_type,
        "beneficiary_user_id": user_id,
        "status": "paid",
    }).to_list(length=1000)

    pending_total = round(sum(float(x.get("amount", 0) or 0) for x in pending), 2)
    paid_total = round(sum(float(x.get("amount", 0) or 0) for x in paid), 2)

    return {
        "pending_total": pending_total,
        "paid_total": paid_total,
        "minimum_payout_threshold": DEFAULT_MINIMUM_PAYOUT,
        "eligible_for_payout": pending_total >= DEFAULT_MINIMUM_PAYOUT,
        "payout_cycle": "monthly",
    }

@router.post("/request")
async def request_payout(request: Request, payload: dict):
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    user_id = str((user or {}).get("_id")) if (user or {}).get("_id") else None

    doc = {
        "beneficiary_type": payload.get("beneficiary_type"),
        "beneficiary_user_id": user_id,
        "requested_amount": float(payload.get("requested_amount", 0) or 0),
        "status": "pending_review",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.payout_requests.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}
