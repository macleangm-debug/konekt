from datetime import datetime

def calculate_margin_pool(
    *,
    selling_price: float,
    base_cost: float,
    protected_company_margin_percent: float = 8.0,
):
    selling_price = float(selling_price or 0)
    base_cost = float(base_cost or 0)
    gross_margin = max(selling_price - base_cost, 0)
    protected_company_margin_amount = round(selling_price * (float(protected_company_margin_percent or 0) / 100.0), 2)
    distributable_margin = max(gross_margin - protected_company_margin_amount, 0)

    return {
        "selling_price": round(selling_price, 2),
        "base_cost": round(base_cost, 2),
        "gross_margin": round(gross_margin, 2),
        "protected_company_margin_amount": round(protected_company_margin_amount, 2),
        "distributable_margin": round(distributable_margin, 2),
    }


def calculate_distribution(
    *,
    selling_price: float,
    base_cost: float,
    protected_company_margin_percent: float = 8.0,
    affiliate_percent_of_distributable: float = 0.0,
    sales_percent_of_distributable: float = 0.0,
    promo_percent_of_distributable: float = 0.0,
    referral_percent_of_distributable: float = 0.0,
    country_bonus_percent_of_distributable: float = 0.0,
    non_margin_touching_promo_amount: float = 0.0,
):
    pool = calculate_margin_pool(
        selling_price=selling_price,
        base_cost=base_cost,
        protected_company_margin_percent=protected_company_margin_percent,
    )

    distributable = pool["distributable_margin"]

    affiliate_amount = round(distributable * (float(affiliate_percent_of_distributable or 0) / 100.0), 2)
    sales_amount = round(distributable * (float(sales_percent_of_distributable or 0) / 100.0), 2)
    promo_amount = round(distributable * (float(promo_percent_of_distributable or 0) / 100.0), 2)
    referral_amount = round(distributable * (float(referral_percent_of_distributable or 0) / 100.0), 2)
    country_bonus_amount = round(distributable * (float(country_bonus_percent_of_distributable or 0) / 100.0), 2)

    allocated = round(
        affiliate_amount
        + sales_amount
        + promo_amount
        + referral_amount
        + country_bonus_amount,
        2,
    )

    if allocated > distributable:
        scale = distributable / allocated if allocated else 1
        affiliate_amount = round(affiliate_amount * scale, 2)
        sales_amount = round(sales_amount * scale, 2)
        promo_amount = round(promo_amount * scale, 2)
        referral_amount = round(referral_amount * scale, 2)
        country_bonus_amount = round(country_bonus_amount * scale, 2)
        allocated = round(
            affiliate_amount
            + sales_amount
            + promo_amount
            + referral_amount
            + country_bonus_amount,
            2,
        )

    retained_company_margin = round(pool["gross_margin"] - allocated, 2)

    return {
        "calculated_at": datetime.utcnow().isoformat(),
        "pool": pool,
        "distribution": {
            "affiliate_amount": affiliate_amount,
            "sales_amount": sales_amount,
            "promo_amount": promo_amount,
            "referral_amount": referral_amount,
            "country_bonus_amount": country_bonus_amount,
            "allocated_distributable_margin": allocated,
            "retained_company_margin": retained_company_margin,
            "non_margin_touching_promo_amount": round(float(non_margin_touching_promo_amount or 0), 2),
        },
        "rules": {
            "protected_company_margin_percent": float(protected_company_margin_percent or 0),
            "affiliate_percent_of_distributable": float(affiliate_percent_of_distributable or 0),
            "sales_percent_of_distributable": float(sales_percent_of_distributable or 0),
            "promo_percent_of_distributable": float(promo_percent_of_distributable or 0),
            "referral_percent_of_distributable": float(referral_percent_of_distributable or 0),
            "country_bonus_percent_of_distributable": float(country_bonus_percent_of_distributable or 0),
        },
    }
