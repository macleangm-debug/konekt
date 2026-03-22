from datetime import datetime

def build_attribution_record(
    *,
    source_type: str,
    affiliate_code: str | None = None,
    affiliate_user_id: str | None = None,
    sales_user_id: str | None = None,
    promo_code: str | None = None,
    session_id: str | None = None,
    quote_id: str | None = None,
    order_id: str | None = None,
    invoice_id: str | None = None,
):
    return {
        "source_type": source_type,  # website | affiliate | sales | hybrid
        "affiliate_code": affiliate_code,
        "affiliate_user_id": affiliate_user_id,
        "sales_user_id": sales_user_id,
        "promo_code": promo_code,
        "session_id": session_id,
        "quote_id": quote_id,
        "order_id": order_id,
        "invoice_id": invoice_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
