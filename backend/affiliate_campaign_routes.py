"""
Affiliate Campaign Routes
CRUD operations for promotion campaigns
"""
from datetime import datetime
import os
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/affiliate-campaigns", tags=["Affiliate Campaigns"])

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
async def list_campaigns(status: str | None = None):
    query = {}
    now = datetime.utcnow()

    if status == "active":
        query["is_active"] = True
        query["start_date"] = {"$lte": now}
        query["end_date"] = {"$gte": now}
    elif status == "inactive":
        query["is_active"] = False
    elif status == "upcoming":
        query["is_active"] = True
        query["start_date"] = {"$gt": now}
    elif status == "expired":
        query["end_date"] = {"$lt": now}

    docs = await db.affiliate_campaigns.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/current")
async def list_current_campaigns():
    """Get all currently active campaigns"""
    now = datetime.utcnow()

    docs = await db.affiliate_campaigns.find(
        {
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now},
        }
    ).sort("created_at", -1).to_list(length=100)

    return [serialize_doc(doc) for doc in docs]


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str):
    doc = await db.affiliate_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return serialize_doc(doc)


@router.post("")
async def create_campaign(payload: dict):
    doc = {
        "name": payload.get("name"),
        "slug": payload.get("slug"),
        "description": payload.get("description"),
        "headline": payload.get("headline"),
        "is_active": bool(payload.get("is_active", True)),
        "channel": payload.get("channel", "affiliate"),  # affiliate | public | both
        "start_date": datetime.fromisoformat(payload["start_date"].replace("Z", "+00:00")) if payload.get("start_date") else datetime.utcnow(),
        "end_date": datetime.fromisoformat(payload["end_date"].replace("Z", "+00:00")) if payload.get("end_date") else datetime.utcnow(),
        "eligibility": payload.get("eligibility", {
            "requires_affiliate_code": True,
            "specific_affiliate_codes": [],
            "first_order_only": False,
            "min_order_amount": 0,
            "allowed_categories": [],
            "allowed_service_slugs": [],
        }),
        "reward": payload.get("reward", {
            "type": "percentage_discount",
            "value": 0,
            "cap": 0,
            "free_addon_code": "",
        }),
        "limits": payload.get("limits", {
            "max_uses_per_customer": 1,
            "max_total_redemptions": 0,
        }),
        "stacking": payload.get("stacking", {
            "allow_with_points": False,
            "allow_with_other_promos": False,
            "allow_with_referral_rewards": False,
        }),
        "affiliate_commission": payload.get("affiliate_commission", {
            "mode": "default",
            "override_rate": 0,
        }),
        "marketing": payload.get("marketing", {
            "promo_code": "",
            "landing_url": "",
            "cta": "",
            "hashtags": [],
        }),
        "redemption_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.affiliate_campaigns.insert_one(doc)
    created = await db.affiliate_campaigns.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{campaign_id}")
async def update_campaign(campaign_id: str, payload: dict):
    existing = await db.affiliate_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_doc = {
        "name": payload.get("name", existing.get("name")),
        "slug": payload.get("slug", existing.get("slug")),
        "description": payload.get("description", existing.get("description")),
        "headline": payload.get("headline", existing.get("headline")),
        "is_active": bool(payload.get("is_active", existing.get("is_active"))),
        "channel": payload.get("channel", existing.get("channel")),
        "eligibility": payload.get("eligibility", existing.get("eligibility")),
        "reward": payload.get("reward", existing.get("reward")),
        "limits": payload.get("limits", existing.get("limits")),
        "stacking": payload.get("stacking", existing.get("stacking")),
        "affiliate_commission": payload.get("affiliate_commission", existing.get("affiliate_commission")),
        "marketing": payload.get("marketing", existing.get("marketing")),
        "updated_at": datetime.utcnow(),
    }

    if payload.get("start_date"):
        update_doc["start_date"] = datetime.fromisoformat(payload["start_date"].replace("Z", "+00:00"))
    if payload.get("end_date"):
        update_doc["end_date"] = datetime.fromisoformat(payload["end_date"].replace("Z", "+00:00"))

    await db.affiliate_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": update_doc},
    )

    updated = await db.affiliate_campaigns.find_one({"_id": ObjectId(campaign_id)})
    return serialize_doc(updated)


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str):
    result = await db.affiliate_campaigns.delete_one({"_id": ObjectId(campaign_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"deleted": True}
