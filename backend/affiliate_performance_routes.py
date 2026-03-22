from datetime import datetime
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/affiliate-performance", tags=["Affiliate Performance"])

@router.get("/me")
async def affiliate_my_performance(request: Request):
    db = request.app.mongodb
    user = getattr(request.state, "user", None)
    uid = str((user or {}).get("_id")) if (user or {}).get("_id") else None

    clicks = await db.attribution_records.count_documents({"affiliate_user_id": uid})
    leads = await db.guest_leads.count_documents({"affiliate_user_id": uid}) if uid else 0
    sales = await db.commission_records.count_documents({"beneficiary_type": "affiliate", "beneficiary_user_id": uid})
    rows = await db.commission_records.find({"beneficiary_type": "affiliate", "beneficiary_user_id": uid}).to_list(length=1000)
    total_commission = round(sum(float(x.get("amount", 0) or 0) for x in rows), 2)
    conversion_rate = round((sales / clicks) * 100.0, 2) if clicks else 0

    status = "active"
    if clicks > 20 and sales == 0:
        status = "watchlist"
    if clicks == 0:
        status = "watchlist"

    return {
        "clicks": clicks,
        "leads": leads,
        "sales": sales,
        "total_commission": total_commission,
        "conversion_rate": conversion_rate,
        "status": status,
        "promo_code_recommended": (user or {}).get("name", "AFFILIATE").split(" ")[0].upper() if user else "AFFILIATE",
    }

@router.get("/leaderboard")
async def affiliate_leaderboard(request: Request):
    db = request.app.mongodb
    pipeline = [
        {"$match": {"beneficiary_type": "affiliate"}},
        {"$group": {"_id": "$beneficiary_user_id", "total_commission": {"$sum": "$amount"}, "sales": {"$sum": 1}}},
        {"$sort": {"total_commission": -1}},
        {"$limit": 20},
    ]
    return await db.commission_records.aggregate(pipeline).to_list(length=20)

@router.post("/status")
async def set_affiliate_status(payload: dict, request: Request):
    db = request.app.mongodb
    await db.users.update_one(
        {"_id": payload.get("user_id")},
        {"$set": {"affiliate_status": payload.get("status", "active"), "affiliate_status_updated_at": datetime.utcnow()}},
    )
    return {"ok": True}
