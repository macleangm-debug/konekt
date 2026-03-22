from datetime import datetime

def calculate_safe_promotion_budget(
    *,
    base_amount: float,
    company_markup_percent: float = 20.0,
    extra_sell_percent: float = 10.0,
):
    base_amount = float(base_amount or 0)
    protected_company_markup_amount = round(base_amount * (float(company_markup_percent or 0) / 100.0), 2)
    distributable_layer_amount = round(base_amount * (float(extra_sell_percent or 0) / 100.0), 2)
    selling_price = round(base_amount + protected_company_markup_amount + distributable_layer_amount, 2)

    max_safe_promotion_amount = distributable_layer_amount
    max_safe_promotion_percent_of_selling_price = round(
        (max_safe_promotion_amount / selling_price) * 100.0, 2
    ) if selling_price else 0

    return {
        "base_amount": round(base_amount, 2),
        "protected_company_markup_amount": protected_company_markup_amount,
        "distributable_layer_amount": distributable_layer_amount,
        "selling_price": selling_price,
        "max_safe_promotion_amount": round(max_safe_promotion_amount, 2),
        "max_safe_promotion_percent_of_selling_price": max_safe_promotion_percent_of_selling_price,
        "calculated_at": datetime.utcnow().isoformat(),
    }
