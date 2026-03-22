from fastapi import APIRouter
from affiliate_margin_rules_service import calculate_affiliate_safe_distribution

router = APIRouter(prefix="/api/affiliate-margin-rules", tags=["Affiliate Margin Rules"])

@router.post("/preview")
async def preview_affiliate_margin_distribution(payload: dict):
    return calculate_affiliate_safe_distribution(
        base_amount=payload.get("base_amount", 0),
        company_markup_percent=payload.get("company_markup_percent", 20),
        extra_sell_percent=payload.get("extra_sell_percent", 10),
        affiliate_percent_of_distributable=payload.get("affiliate_percent_of_distributable", 10),
        sales_percent_of_distributable=payload.get("sales_percent_of_distributable", 15),
        promo_percent_of_distributable=payload.get("promo_percent_of_distributable", 10),
        referral_percent_of_distributable=payload.get("referral_percent_of_distributable", 5),
        country_bonus_percent_of_distributable=payload.get("country_bonus_percent_of_distributable", 5),
    )
