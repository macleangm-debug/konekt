"""
Pricing Validation Routes
Provides API endpoints for price validation and margin protection.
"""
import os
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from pricing_service import (
    calculate_protected_price,
    validate_line_item_pricing,
    validate_quote_pricing,
    get_max_allowed_discount
)

router = APIRouter(prefix="/api/admin/pricing-validation", tags=["Pricing Validation"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.post("/calculate-price")
async def api_calculate_protected_price(payload: dict):
    """
    Calculate selling price with margin protection.
    
    Payload:
    {
        "partner_cost": 10000,
        "product_group": "Apparel",
        "service_group": null,
        "country_code": "TZ",
        "promo_discount": 2000,
        "affiliate_commission": 1000,
        "points_discount": 500
    }
    """
    result = await calculate_protected_price(
        db,
        partner_cost=float(payload.get("partner_cost", 0) or 0),
        product_group=payload.get("product_group"),
        service_group=payload.get("service_group"),
        country_code=payload.get("country_code", "TZ"),
        promo_discount=float(payload.get("promo_discount", 0) or 0),
        affiliate_commission=float(payload.get("affiliate_commission", 0) or 0),
        points_discount=float(payload.get("points_discount", 0) or 0),
    )
    return result


@router.post("/validate-line-item")
async def api_validate_line_item(payload: dict):
    """
    Validate pricing on a single line item.
    
    Payload:
    {
        "name": "Custom T-Shirt",
        "partner_cost": 10000,
        "unit_price": 12500,
        "quantity": 50,
        "product_group": "Apparel",
        "country_code": "TZ"
    }
    """
    result = await validate_line_item_pricing(
        db,
        line_item=payload,
        country_code=payload.get("country_code", "TZ"),
    )
    return result


@router.post("/validate-quote")
async def api_validate_quote(payload: dict):
    """
    Validate all pricing on a quote.
    
    Payload:
    {
        "line_items": [...],
        "discount": 5000,
        "affiliate_commission": 2500,
        "points_discount": 1000,
        "country_code": "TZ"
    }
    """
    result = await validate_quote_pricing(
        db,
        line_items=payload.get("line_items", []),
        discount=float(payload.get("discount", 0) or 0),
        affiliate_commission=float(payload.get("affiliate_commission", 0) or 0),
        points_discount=float(payload.get("points_discount", 0) or 0),
        country_code=payload.get("country_code", "TZ"),
    )
    return result


@router.post("/max-discount")
async def api_get_max_discount(payload: dict):
    """
    Get maximum allowed discount for a price point.
    
    Payload:
    {
        "selling_price": 15000,
        "partner_cost": 10000,
        "product_group": "Apparel",
        "country_code": "TZ"
    }
    """
    result = await get_max_allowed_discount(
        db,
        selling_price=float(payload.get("selling_price", 0) or 0),
        partner_cost=float(payload.get("partner_cost", 0) or 0),
        product_group=payload.get("product_group"),
        service_group=payload.get("service_group"),
        country_code=payload.get("country_code", "TZ"),
    )
    return result
