"""
Campaign Content Engine Routes

POST /api/content-engine/generate-campaign  — Generate content from promotion
POST /api/content-engine/generate-product   — Generate content for product
GET  /api/content-engine/campaigns          — List active campaigns
GET  /api/content-engine/suggestions        — Smart content suggestions
GET  /api/content-engine/{content_id}       — Get single content item
GET  /api/content-engine/{content_id}/share-data — Shareable bundle
GET  /api/admin/content-center              — Admin list with filters
PUT  /api/admin/content-center/{content_id} — Admin edit
POST /api/admin/content-center/{content_id}/archive — Archive
GET  /api/staff/content-feed                — Sales feed
GET  /api/partner/affiliate-content-feed    — Affiliate feed
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(tags=["content-engine"])


class GenerateCampaignIn(BaseModel):
    promotion_id: str
    roles: Optional[List[str]] = None


class GenerateProductIn(BaseModel):
    product_id: str
    roles: Optional[List[str]] = None


class UpdateContentIn(BaseModel):
    headline: Optional[str] = None
    captions: Optional[dict] = None
    status: Optional[str] = None
    cta: Optional[str] = None


# ═══ CAMPAIGN CONTENT GENERATION ═══

@router.post("/api/content-engine/generate-campaign")
async def generate_from_campaign(payload: GenerateCampaignIn, request: Request):
    """Generate a full content asset pack from a promotion/campaign."""
    db = request.app.mongodb
    from services.content_engine_service import generate_campaign_from_promotion
    assets = await generate_campaign_from_promotion(
        db,
        promotion_id=payload.promotion_id,
        roles=payload.roles,
    )
    return {"ok": True, "count": len(assets), "assets": assets}


@router.post("/api/content-engine/generate-product")
async def generate_from_product(payload: GenerateProductIn, request: Request):
    """Generate a content asset pack for a specific product."""
    db = request.app.mongodb
    from services.content_engine_service import generate_product_content
    assets = await generate_product_content(
        db,
        product_id=payload.product_id,
        roles=payload.roles,
    )
    return {"ok": True, "count": len(assets), "assets": assets}


@router.get("/api/content-engine/campaigns")
async def list_campaigns(request: Request):
    """List active campaigns (promotions) with content counts."""
    db = request.app.mongodb
    from services.content_engine_service import get_active_campaigns
    campaigns = await get_active_campaigns(db)
    return {"ok": True, "campaigns": campaigns}


@router.get("/api/content-engine/suggestions")
async def content_suggestions(request: Request):
    """Get smart content suggestions."""
    db = request.app.mongodb
    from services.content_engine_service import get_content_suggestions
    suggestions = await get_content_suggestions(db)
    return {"ok": True, "suggestions": suggestions}


# ═══ CONTENT ITEM ACCESS ═══

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
        "promotion_code": item.get("promotion_code", ""),
        "image_url": item.get("image_url", ""),
        "captions": item.get("captions", {}),
        "headline": item.get("headline", ""),
        "final_price": item.get("final_price", 0),
        "cta": item.get("cta", ""),
        "format": item.get("format", "square"),
    }


# ═══ ADMIN CONTENT CENTER ═══

@router.get("/api/admin/content-center")
async def list_content_center(request: Request, role: str = None, status: str = None, campaign_id: str = None, format: str = None):
    db = request.app.mongodb
    query = {}
    if role:
        query["role"] = role
    if status:
        query["status"] = status
    if campaign_id:
        query["campaign_id"] = campaign_id
    if format:
        query["format"] = format

    items = await db.content_center.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)

    total = await db.content_center.count_documents({"status": "active"})
    sales_count = await db.content_center.count_documents({"status": "active", "role": "sales"})
    campaigns = await db.content_center.distinct("campaign_id", {"status": "active"})

    return {
        "ok": True,
        "items": items,
        "kpis": {
            "active_campaigns": len([c for c in campaigns if c]),
            "total_content": total,
            "sales_content": sales_count,
            "formats": {
                "square": await db.content_center.count_documents({"status": "active", "format": "square"}),
                "vertical": await db.content_center.count_documents({"status": "active", "format": "vertical"}),
            },
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


class PublishCreativeIn(BaseModel):
    image_data: str  # base64 PNG
    item_name: str
    item_id: str
    item_type: str  # "product" or "service"
    format: str  # "square" or "vertical"
    theme: str
    category: Optional[str] = ""
    headline: Optional[str] = ""
    selling_price: Optional[float] = 0
    final_price: Optional[float] = 0
    discount_amount: Optional[float] = 0
    promo_code: Optional[str] = ""
    promotion_name: Optional[str] = ""
    captions: Optional[dict] = None
    status: Optional[str] = "active"  # "draft" or "active"


@router.post("/api/admin/content-center/publish")
async def publish_creative(payload: PublishCreativeIn, request: Request):
    """Save a rendered branded creative to content center."""
    import base64
    import uuid
    db = request.app.mongodb

    # Decode base64 image
    try:
        img_bytes = base64.b64decode(payload.image_data.split(",")[-1])
    except Exception:
        return {"ok": False, "error": "Invalid image data"}

    # Upload to storage
    storage_path = ""
    try:
        from services.file_storage import upload_file
        result = upload_file(img_bytes, f"creative-{content_id}.png", "image/png", folder="content-studio")
        storage_path = result.get("storage_path", "")
    except Exception:
        # Fallback: save locally
        import os
        local_dir = "/app/backend/static/content-studio"
        os.makedirs(local_dir, exist_ok=True)
        fname = f"{uuid.uuid4().hex[:12]}.png"
        fpath = os.path.join(local_dir, fname)
        with open(fpath, "wb") as f:
            f.write(img_bytes)
        storage_path = f"content-studio/{fname}"

    # Build the content_center entry
    content_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    entry = {
        "id": content_id,
        "campaign_id": "",
        "target_id": payload.item_id,
        "target_type": payload.item_type,
        "target_name": payload.item_name,
        "headline": payload.headline or payload.item_name,
        "category": payload.category or "",
        "image_url": storage_path,
        "format": payload.format,
        "theme": payload.theme,
        "original_price": payload.selling_price,
        "final_price": payload.final_price,
        "discount_amount": payload.discount_amount,
        "has_promotion": bool(payload.promo_code),
        "promotion_code": payload.promo_code,
        "promotion_name": payload.promotion_name,
        "captions": payload.captions or {},
        "cta": "Order Now",
        "status": payload.status,
        "role": "sales",
        "source": "content_studio",
        "created_at": now,
        "updated_at": now,
    }

    await db.content_center.insert_one(entry)
    entry.pop("_id", None)

    return {"ok": True, "item": entry, "storage_path": storage_path}



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
