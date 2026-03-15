"""
Campaign Marketing Routes
Generate and retrieve platform-specific marketing messages
"""
import os
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from campaign_marketing_service import build_campaign_share_message

router = APIRouter(prefix="/api/admin/campaign-marketing", tags=["Campaign Marketing"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("/{campaign_id}/messages")
async def get_campaign_messages(campaign_id: str):
    """Get pre-formatted marketing messages for all platforms"""
    campaign = await db.affiliate_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return {
        "generic": build_campaign_share_message(campaign, "generic"),
        "whatsapp": build_campaign_share_message(campaign, "whatsapp"),
        "instagram": build_campaign_share_message(campaign, "instagram"),
        "facebook": build_campaign_share_message(campaign, "facebook"),
        "linkedin": build_campaign_share_message(campaign, "linkedin"),
        "x": build_campaign_share_message(campaign, "x"),
    }


@router.post("/{campaign_id}/custom-message")
async def generate_custom_message(campaign_id: str, payload: dict):
    """Generate a custom message with override parameters"""
    campaign = await db.affiliate_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Allow overriding marketing fields
    if payload.get("cta"):
        campaign.setdefault("marketing", {})["cta"] = payload["cta"]
    if payload.get("landing_url"):
        campaign.setdefault("marketing", {})["landing_url"] = payload["landing_url"]
    if payload.get("promo_code"):
        campaign.setdefault("marketing", {})["promo_code"] = payload["promo_code"]

    platform = payload.get("platform", "generic")
    return {"message": build_campaign_share_message(campaign, platform)}
