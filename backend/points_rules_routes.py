"""
Points Rules Routes
API endpoints for validating points redemption with margin protection.
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

# Import service
import sys
sys.path.insert(0, os.path.dirname(__file__))
from services.points_rules_service import (
    calculate_max_points_redemption_amount,
    apply_points_redemption_guard,
)

router = APIRouter(prefix="/api/points-rules", tags=["Points Rules"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.post("/validate-redemption")
async def validate_points_redemption(payload: dict):
    """
    Validate how many points can be redeemed for an order.
    Points are capped at 10% of distributable margin (not order total).
    """
    final_selling_price = float(payload.get("final_selling_price", 0) or 0)
    partner_cost = float(payload.get("partner_cost", 0) or 0)
    requested_points_amount = float(payload.get("requested_points_amount", 0) or 0)
    protected_margin_percent = float(payload.get("protected_margin_percent", 40) or 40)
    points_cap_percent = float(payload.get("points_cap_percent_of_distributable_margin", 10) or 10)

    calc = calculate_max_points_redemption_amount(
        final_selling_price=final_selling_price,
        partner_cost=partner_cost,
        protected_margin_percent=protected_margin_percent,
        points_cap_percent_of_distributable_margin=points_cap_percent,
    )

    guard = apply_points_redemption_guard(
        requested_points_amount=requested_points_amount,
        max_points_redemption_amount=calc["max_points_redemption_amount"],
    )

    return {
        "margin": calc,
        "points": guard,
    }


@router.get("/config")
async def get_points_config():
    """Get current points configuration"""
    config = await db.reward_settings.find_one({"type": "points_config"}) or {}
    
    return {
        "points_enabled": config.get("points_enabled", True),
        "protected_margin_percent": config.get("protected_margin_percent", 40),
        "points_cap_percent_of_distributable_margin": config.get("points_cap_percent", 10),
        "points_to_currency_rate": config.get("points_to_currency_rate", 1),
    }
