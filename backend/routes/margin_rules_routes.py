from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.margin_engine import resolve_margin_rule, get_split_settings, resolve_pricing

router = APIRouter(prefix="/api/admin/margin-rules", tags=["margin-rules"])


class MarginRuleIn(BaseModel):
    scope_type: str  # global, product_group, product, service_group, service
    scope_id: Optional[str] = None
    scope_label: str = "Global Default"
    operational_margin_pct: float = 20
    distributable_margin_pct: float = 10


class PricingResolveIn(BaseModel):
    vendor_price: float
    product_id: Optional[str] = None
    group_id: Optional[str] = None
    service_id: Optional[str] = None
    service_group_id: Optional[str] = None


@router.get("/")
async def list_margin_rules(request: Request):
    db = request.app.mongodb
    rules = await db.margin_rules.find({}, {"_id": 0}).sort("scope_type", 1).to_list(200)
    return {"ok": True, "rules": rules}


@router.post("/")
async def upsert_margin_rule(payload: MarginRuleIn, request: Request):
    db = request.app.mongodb

    if payload.distributable_margin_pct > payload.operational_margin_pct:
        return {
            "ok": False,
            "error": f"Distributable ({payload.distributable_margin_pct}%) cannot exceed operational margin ({payload.operational_margin_pct}%)",
        }

    doc = payload.dict()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()

    query = {"scope_type": doc["scope_type"]}
    if doc["scope_id"]:
        query["scope_id"] = doc["scope_id"]

    await db.margin_rules.update_one(query, {"$set": doc}, upsert=True)
    return {"ok": True, "rule": doc}


@router.delete("/{scope_type}/{scope_id}")
async def delete_margin_rule(scope_type: str, scope_id: str, request: Request):
    db = request.app.mongodb
    result = await db.margin_rules.delete_one({"scope_type": scope_type, "scope_id": scope_id})
    return {"ok": True, "deleted": result.deleted_count}


@router.post("/resolve")
async def resolve_item_pricing(payload: PricingResolveIn, request: Request):
    db = request.app.mongodb
    rule = await resolve_margin_rule(
        db,
        product_id=payload.product_id,
        group_id=payload.group_id,
        service_id=payload.service_id,
        service_group_id=payload.service_group_id,
    )
    split = await get_split_settings(db)
    pricing = resolve_pricing(payload.vendor_price, rule, split)
    return {"ok": True, "pricing": pricing}
