from datetime import datetime
from fastapi import APIRouter, Request, HTTPException
from bson import ObjectId

router = APIRouter(prefix="/api/admin/affiliates", tags=["Affiliate Partner Manager"])

def serialize(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.get("")
async def list_affiliates(request: Request, status: str | None = None):
    db = request.app.mongodb
    query = {"role": "affiliate"}
    if status:
        query["affiliate_status"] = status
    rows = await db.users.find(query).sort("created_at", -1).to_list(length=500)
    out = []
    for r in rows:
        uid = str(r["_id"])
        clicks = await db.attribution_records.count_documents({"affiliate_user_id": uid})
        sales = await db.commission_records.count_documents({"beneficiary_type": "affiliate", "beneficiary_user_id": uid})
        comm_rows = await db.commission_records.find({"beneficiary_type": "affiliate", "beneficiary_user_id": uid}).to_list(length=1000)
        total_commission = round(sum(float(x.get("amount", 0) or 0) for x in comm_rows), 2)
        out.append({
            "id": uid,
            "name": r.get("name") or r.get("full_name") or r.get("email"),
            "email": r.get("email"),
            "promo_code": r.get("promo_code") or (r.get("name", "AFF").split(" ")[0].upper() if r.get("name") else "AFF"),
            "clicks": clicks,
            "sales": sales,
            "total_commission": total_commission,
            "affiliate_status": r.get("affiliate_status", "active"),
        })
    return out

@router.get("/{affiliate_id}")
async def get_affiliate_detail(affiliate_id: str, request: Request):
    db = request.app.mongodb
    row = await db.users.find_one({"_id": ObjectId(affiliate_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    uid = str(row["_id"])
    clicks = await db.attribution_records.count_documents({"affiliate_user_id": uid})
    sales = await db.commission_records.count_documents({"beneficiary_type": "affiliate", "beneficiary_user_id": uid})
    comm_rows = await db.commission_records.find({"beneficiary_type": "affiliate", "beneficiary_user_id": uid}).sort("created_at", -1).to_list(length=200)
    total_commission = round(sum(float(x.get("amount", 0) or 0) for x in comm_rows), 2)
    masked_sales = []
    for x in comm_rows[:20]:
        masked_sales.append({
            "order_id": x.get("order_id"),
            "amount": x.get("amount"),
            "status": x.get("status"),
            "customer_masked": "Customer Hidden",
            "created_at": x.get("created_at"),
        })
    return {
        "id": uid,
        "name": row.get("name") or row.get("full_name") or row.get("email"),
        "email": row.get("email"),
        "promo_code": row.get("promo_code") or (row.get("name", "AFF").split(" ")[0].upper() if row.get("name") else "AFF"),
        "affiliate_status": row.get("affiliate_status", "active"),
        "clicks": clicks,
        "sales": sales,
        "total_commission": total_commission,
        "masked_sales": masked_sales,
    }

@router.put("/{affiliate_id}/status")
async def update_affiliate_status(affiliate_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    await db.users.update_one(
        {"_id": ObjectId(affiliate_id)},
        {"$set": {"affiliate_status": payload.get("affiliate_status", "active"), "affiliate_status_updated_at": datetime.utcnow()}},
    )
    return {"ok": True}

@router.put("/{affiliate_id}/promo-code")
async def update_affiliate_promo_code(affiliate_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    await db.users.update_one(
        {"_id": ObjectId(affiliate_id)},
        {"$set": {"promo_code": payload.get("promo_code"), "updated_at": datetime.utcnow()}},
    )
    return {"ok": True}
