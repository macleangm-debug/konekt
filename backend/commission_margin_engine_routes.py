"""
Commission + Margin Distribution Engine Routes
API endpoints for calculating and previewing commission distributions.
"""
from fastapi import APIRouter, Request
from commission_margin_engine_service import (
    calculate_distribution, 
    calculate_order_commission,
    DEFAULT_DISTRIBUTION_CONFIG
)

router = APIRouter(prefix="/api/commission-engine", tags=["Commission Engine"])


@router.post("/preview")
async def preview_distribution(payload: dict):
    """
    Preview commission distribution for a single line item.
    Does not persist anything - just calculates and returns.
    
    Body:
    {
        "selling_price": 100000,
        "base_cost": 60000,
        "protected_company_margin_percent": 8,
        "affiliate_percent_of_distributable": 10,
        "sales_percent_of_distributable": 15,
        "promo_percent_of_distributable": 10,
        "referral_percent_of_distributable": 5,
        "country_bonus_percent_of_distributable": 5,
        "non_margin_touching_promo_amount": 0
    }
    """
    return calculate_distribution(
        selling_price=payload.get("selling_price", 0),
        base_cost=payload.get("base_cost", 0),
        protected_company_margin_percent=payload.get("protected_company_margin_percent", 8),
        affiliate_percent_of_distributable=payload.get("affiliate_percent_of_distributable", 0),
        sales_percent_of_distributable=payload.get("sales_percent_of_distributable", 0),
        promo_percent_of_distributable=payload.get("promo_percent_of_distributable", 0),
        referral_percent_of_distributable=payload.get("referral_percent_of_distributable", 0),
        country_bonus_percent_of_distributable=payload.get("country_bonus_percent_of_distributable", 0),
        non_margin_touching_promo_amount=payload.get("non_margin_touching_promo_amount", 0),
    )


@router.post("/calculate-order")
async def calculate_order(payload: dict, request: Request):
    """
    Calculate commission distribution for an entire order.
    
    Body:
    {
        "order_id": "order123",
        "line_items": [
            {"sku": "SKU001", "name": "Product 1", "selling_price": 50000, "base_cost": 30000, "quantity": 2},
            {"sku": "SKU002", "name": "Product 2", "selling_price": 75000, "base_cost": 45000, "quantity": 1}
        ],
        "source_type": "affiliate",
        "affiliate_user_id": "aff123",
        "assigned_sales_id": "sales456",
        "referral_user_id": null,
        "country_code": "TZ"
    }
    """
    db = request.app.mongodb
    return await calculate_order_commission(
        db,
        order_id=payload.get("order_id", ""),
        line_items=payload.get("line_items", []),
        source_type=payload.get("source_type", "website"),
        affiliate_user_id=payload.get("affiliate_user_id"),
        assigned_sales_id=payload.get("assigned_sales_id"),
        referral_user_id=payload.get("referral_user_id"),
        country_code=payload.get("country_code"),
        config=payload.get("config"),
    )


@router.get("/default-config")
async def get_default_config():
    """Get the default distribution configuration."""
    return {
        "config": DEFAULT_DISTRIBUTION_CONFIG,
        "explanation": {
            "protected_company_margin_percent": "Minimum company margin as % of selling price (protected, never distributed)",
            "affiliate_percent_of_distributable": "Affiliate commission as % of distributable margin",
            "sales_percent_of_distributable": "Sales commission as % of distributable margin",
            "promo_percent_of_distributable": "Promotional discount as % of distributable margin",
            "referral_percent_of_distributable": "Customer referral bonus as % of distributable margin",
            "country_bonus_percent_of_distributable": "Country director bonus as % of distributable margin",
        },
        "notes": [
            "Distributable margin = Gross margin - Protected company margin",
            "Total distribution is auto-scaled if it exceeds distributable margin",
            "Non-margin-touching promos are tracked separately and don't reduce company margin",
        ]
    }


@router.post("/validate-config")
async def validate_config(payload: dict):
    """
    Validate a commission distribution configuration.
    Returns warnings if total allocation might exceed distributable margin.
    """
    total_percent = (
        float(payload.get("affiliate_percent_of_distributable", 0)) +
        float(payload.get("sales_percent_of_distributable", 0)) +
        float(payload.get("promo_percent_of_distributable", 0)) +
        float(payload.get("referral_percent_of_distributable", 0)) +
        float(payload.get("country_bonus_percent_of_distributable", 0))
    )
    
    valid = total_percent <= 100
    warnings = []
    
    if total_percent > 100:
        warnings.append(f"Total allocation ({total_percent}%) exceeds 100% - will be auto-scaled down")
    if total_percent > 80:
        warnings.append(f"High allocation ({total_percent}%) leaves little retained margin")
    
    protected = float(payload.get("protected_company_margin_percent", 8))
    if protected < 5:
        warnings.append(f"Protected margin ({protected}%) is quite low - consider at least 5-8%")
    
    return {
        "valid": valid,
        "total_allocation_percent": total_percent,
        "protected_company_margin_percent": protected,
        "warnings": warnings,
        "recommendation": "Total allocation should ideally be 40-60% of distributable margin"
    }
