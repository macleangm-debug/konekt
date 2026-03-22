from datetime import datetime

def build_commission_record(
    *,
    order_id: str,
    beneficiary_type: str,   # affiliate | sales
    beneficiary_user_id: str | None,
    amount: float,
    source_type: str,
    status: str = "pending",
    campaign_id: str | None = None,
    attribution_reference: str | None = None,
):
    return {
        "order_id": order_id,
        "beneficiary_type": beneficiary_type,
        "beneficiary_user_id": beneficiary_user_id,
        "amount": round(float(amount or 0), 2),
        "source_type": source_type,
        "campaign_id": campaign_id,
        "attribution_reference": attribution_reference,
        "status": status,  # pending | approved | paid
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
