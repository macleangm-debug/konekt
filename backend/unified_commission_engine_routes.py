from fastapi import APIRouter, Request
from unified_commission_engine_service import build_commission_record

router = APIRouter(prefix="/api/commission-engine-unified", tags=["Unified Commission Engine"])

@router.post("/create")
async def create_commission(payload: dict, request: Request):
    db = request.app.mongodb
    doc = build_commission_record(
        order_id=payload.get("order_id", ""),
        beneficiary_type=payload.get("beneficiary_type", "affiliate"),
        beneficiary_user_id=payload.get("beneficiary_user_id"),
        amount=payload.get("amount", 0),
        source_type=payload.get("source_type", "website"),
        status=payload.get("status", "pending"),
        campaign_id=payload.get("campaign_id"),
        attribution_reference=payload.get("attribution_reference"),
    )
    result = await db.commission_records.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

@router.get("/my")
async def my_commissions(request: Request, beneficiary_type: str):
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    user_id = str((user or {}).get("_id")) if (user or {}).get("_id") else None
    docs = await db.commission_records.find({
        "beneficiary_type": beneficiary_type,
        "beneficiary_user_id": user_id,
    }).sort("created_at", -1).to_list(length=500)
    out = []
    for d in docs:
        d["id"] = str(d["_id"])
        del d["_id"]
        out.append(d)
    return out
