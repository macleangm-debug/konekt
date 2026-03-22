from datetime import datetime

def calculate_affiliate_safe_distribution(
    *,
    base_amount: float,
    company_markup_percent: float = 20.0,
    extra_sell_percent: float = 10.0,
    affiliate_percent_of_distributable: float = 10.0,
    sales_percent_of_distributable: float = 15.0,
    promo_percent_of_distributable: float = 10.0,
    referral_percent_of_distributable: float = 5.0,
    country_bonus_percent_of_distributable: float = 5.0,
):
    base_amount = float(base_amount or 0)
    company_markup_percent = float(company_markup_percent or 0)
    extra_sell_percent = float(extra_sell_percent or 0)

    protected_company_markup_amount = round(base_amount * (company_markup_percent / 100.0), 2)
    distributable_layer_amount = round(base_amount * (extra_sell_percent / 100.0), 2)
    selling_price = round(base_amount + protected_company_markup_amount + distributable_layer_amount, 2)

    affiliate_amount = round(distributable_layer_amount * (float(affiliate_percent_of_distributable or 0) / 100.0), 2)
    sales_amount = round(distributable_layer_amount * (float(sales_percent_of_distributable or 0) / 100.0), 2)
    promo_amount = round(distributable_layer_amount * (float(promo_percent_of_distributable or 0) / 100.0), 2)
    referral_amount = round(distributable_layer_amount * (float(referral_percent_of_distributable or 0) / 100.0), 2)
    country_bonus_amount = round(distributable_layer_amount * (float(country_bonus_percent_of_distributable or 0) / 100.0), 2)

    allocated = round(affiliate_amount + sales_amount + promo_amount + referral_amount + country_bonus_amount, 2)

    if allocated > distributable_layer_amount:
        scale = distributable_layer_amount / allocated if allocated else 1.0
        affiliate_amount = round(affiliate_amount * scale, 2)
        sales_amount = round(sales_amount * scale, 2)
        promo_amount = round(promo_amount * scale, 2)
        referral_amount = round(referral_amount * scale, 2)
        country_bonus_amount = round(country_bonus_amount * scale, 2)
        allocated = round(affiliate_amount + sales_amount + promo_amount + referral_amount + country_bonus_amount, 2)

    remaining_distributable_retained = round(distributable_layer_amount - allocated, 2)
    company_total_kept = round(protected_company_markup_amount + remaining_distributable_retained, 2)

    return {
        "calculated_at": datetime.utcnow().isoformat(),
        "pricing_model": {
            "base_amount": round(base_amount, 2),
            "company_markup_percent": company_markup_percent,
            "protected_company_markup_amount": protected_company_markup_amount,
            "extra_sell_percent": extra_sell_percent,
            "distributable_layer_amount": distributable_layer_amount,
            "selling_price": selling_price,
        },
        "distribution": {
            "affiliate_amount": affiliate_amount,
            "sales_amount": sales_amount,
            "promo_amount": promo_amount,
            "referral_amount": referral_amount,
            "country_bonus_amount": country_bonus_amount,
            "allocated_distributable_amount": allocated,
            "remaining_distributable_retained": remaining_distributable_retained,
            "company_total_kept": company_total_kept,
        },
        "rules": {
            "company_never_below_markup_percent": 20.0,
            "distribution_only_from_extra_layer": True,
        },
    }
