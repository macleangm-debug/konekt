from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

ReferralTriggerEvent = Literal["first_paid_order", "every_paid_order", "delivered_order"]
ReferralRewardMode = Literal["points_per_amount", "fixed_points"]


class ReferralSettings(BaseModel):
    enabled: bool = True
    reward_type: str = "points"
    reward_mode: ReferralRewardMode = "points_per_amount"
    trigger_event: ReferralTriggerEvent = "every_paid_order"

    points_per_amount: float = 1.0
    amount_unit: float = 1000.0

    fixed_points: int = 0

    minimum_order_amount: float = 0.0
    max_points_per_order: int = 5000
    max_points_per_referred_customer: int = 20000

    redemption_enabled: bool = True
    point_value_points: int = 100
    point_value_amount: float = 5000.0
    minimum_redeem_points: int = 100
    max_redeem_percent_per_order: float = 50.0

    share_message: str = (
        "I use Konekt for branded products and design services. "
        "Join using my link: {referral_link}"
    )
    whatsapp_message: str = (
        "I use Konekt for branded products and design services. "
        "Join using my link: {referral_link}"
    )

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
