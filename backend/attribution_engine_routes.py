from fastapi import APIRouter, Request
from attribution_engine_service import build_attribution_record

router = APIRouter(prefix="/api/attribution-engine", tags=["Attribution Engine"])

@router.post("/capture")
async def capture_attribution(payload: dict, request: Request):
    db = request.app.mongodb
    doc = build_attribution_record(
        source_type=payload.get("source_type", "website"),
        affiliate_code=payload.get("affiliate_code"),
        affiliate_user_id=payload.get("affiliate_user_id"),
        sales_user_id=payload.get("sales_user_id"),
        promo_code=payload.get("promo_code"),
        session_id=payload.get("session_id"),
        quote_id=payload.get("quote_id"),
        order_id=payload.get("order_id"),
        invoice_id=payload.get("invoice_id"),
    )
    result = await db.attribution_records.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}

@router.get("/by-order/{order_id}")
async def attribution_by_order(order_id: str, request: Request):
    db = request.app.mongodb
    docs = await db.attribution_records.find({"order_id": order_id}).sort("created_at", -1).to_list(length=20)
    out = []
    for d in docs:
        d["id"] = str(d["_id"])
        del d["_id"]
        out.append(d)
    return out
