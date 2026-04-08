"""
Content Engine Routes — Phase D
POST /api/content-engine/generate — single product
POST /api/content-engine/generate-bulk — multiple products
GET  /api/content-engine/{content_id} — get single content
GET  /api/content-engine/{content_id}/share-data — shareable bundle
GET  /api/admin/content-center — admin list with filters
PUT  /api/admin/content-center/{content_id} — admin edit
POST /api/admin/content-center/{content_id}/archive — archive
GET  /api/staff/content-feed — sales feed
GET  /api/partner/affiliate-content-feed — affiliate feed
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(tags=["content-engine"])


class GenerateIn(BaseModel):
    role: str = "sales"
    target_id: str
    campaign_id: Optional[str] = None
    promotion_id: Optional[str] = None


class BulkGenerateIn(BaseModel):
    role: str = "sales"
    campaign_id: Optional[str] = None
    target_ids: Optional[List[str]] = None


class UpdateContentIn(BaseModel):
    headline: Optional[str] = None
    captions: Optional[dict] = None
    status: Optional[str] = None
    cta: Optional[str] = None


# ═══ CONTENT GENERATION ═══

@router.post("/api/content-engine/generate")
async def generate_content(payload: GenerateIn, request: Request):
    db = request.app.mongodb
    from services.content_engine_service import generate_content_for_product
    item = await generate_content_for_product(
        db,
        product_id=payload.target_id,
        role=payload.role,
        campaign_id=payload.campaign_id,
        promotion_id=payload.promotion_id,
    )
    if not item:
        return {"ok": False, "error": "Product not found"}

    await db.content_center.update_one({"id": item["id"]}, {"$set": item}, upsert=True)
    return {"ok": True, "item": item}


@router.post("/api/content-engine/generate-bulk")
async def generate_bulk(payload: BulkGenerateIn, request: Request):
    db = request.app.mongodb
    from services.content_engine_service import generate_content_bulk
    items = await generate_content_bulk(
        db,
        role=payload.role,
        campaign_id=payload.campaign_id,
        product_ids=payload.target_ids,
    )
    for item in items:
        await db.content_center.update_one({"id": item["id"]}, {"$set": item}, upsert=True)
    return {"ok": True, "count": len(items), "items": items}


@router.get("/api/content-engine/{content_id}")
async def get_content_item(content_id: str, request: Request):
    db = request.app.mongodb
    item = await db.content_center.find_one({"id": content_id}, {"_id": 0})
    if not item:
        return {"ok": False, "error": "Content not found"}
    return {"ok": True, "item": item}


@router.get("/api/content-engine/{content_id}/share-data")
async def get_share_data(content_id: str, request: Request):
    db = request.app.mongodb
    item = await db.content_center.find_one({"id": content_id}, {"_id": 0})
    if not item:
        return {"ok": False, "error": "Content not found"}
    return {
        "ok": True,
        "short_link": item.get("short_link", ""),
        "promo_code": item.get("promo_code", ""),
        "image_url": item.get("image_url", ""),
        "captions": item.get("captions", {}),
        "headline": item.get("headline", ""),
        "final_price": item.get("final_price", 0),
        "cta": item.get("cta", ""),
    }


# ═══ ADMIN CONTENT CENTER ═══

@router.get("/api/admin/content-center")
async def list_content_center(request: Request, role: str = None, status: str = None, campaign_id: str = None):
    db = request.app.mongodb
    query = {}
    if role:
        query["role"] = role
    if status:
        query["status"] = status
    if campaign_id:
        query["campaign_id"] = campaign_id

    items = await db.content_center.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)

    # KPI counts
    total = await db.content_center.count_documents({"status": "active"})
    sales_count = await db.content_center.count_documents({"status": "active", "role": "sales"})
    affiliate_count = await db.content_center.count_documents({"status": "active", "role": "affiliate"})
    campaigns = await db.content_center.distinct("campaign_id", {"status": "active"})

    return {
        "ok": True,
        "items": items,
        "kpis": {
            "active_campaigns": len([c for c in campaigns if c]),
            "total_content": total,
            "sales_content": sales_count,
            "affiliate_content": affiliate_count,
        }
    }


@router.put("/api/admin/content-center/{content_id}")
async def update_content(content_id: str, payload: UpdateContentIn, request: Request):
    db = request.app.mongodb
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.headline is not None:
        update["headline"] = payload.headline
    if payload.captions is not None:
        update["captions"] = payload.captions
    if payload.status is not None:
        update["status"] = payload.status
    if payload.cta is not None:
        update["cta"] = payload.cta

    result = await db.content_center.update_one({"id": content_id}, {"$set": update})
    if result.matched_count == 0:
        return {"ok": False, "error": "Content not found"}
    item = await db.content_center.find_one({"id": content_id}, {"_id": 0})
    return {"ok": True, "item": item}


@router.post("/api/admin/content-center/{content_id}/archive")
async def archive_content(content_id: str, request: Request):
    db = request.app.mongodb
    result = await db.content_center.update_one(
        {"id": content_id},
        {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        return {"ok": False, "error": "Content not found"}
    return {"ok": True}


# ═══ ROLE-SPECIFIC FEEDS ═══

@router.get("/api/staff/content-feed")
async def staff_content_feed(request: Request):
    db = request.app.mongodb
    from services.content_engine_service import get_content_feed
    items = await get_content_feed(db, role="sales")
    return {"ok": True, "items": items}


@router.get("/api/partner/affiliate-content-feed")
async def affiliate_content_feed(request: Request):
    db = request.app.mongodb
    from services.content_engine_service import get_content_feed
    items = await get_content_feed(db, role="affiliate")
    return {"ok": True, "items": items}
