from fastapi import APIRouter
from commission_margin_engine_service import calculate_distribution

router = APIRouter(prefix="/api/commission-engine", tags=["Commission Engine"])

@router.post("/preview")
async def preview_distribution(payload: dict):
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
