from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AffiliateCommissionCreate(BaseModel):
    affiliate_id: str
    affiliate_code: str
    affiliate_email: EmailStr
    order_id: str
    order_number: str
    customer_email: Optional[str] = None
    order_total: float
    commission_type: str = "percentage"
    commission_value: float = 10.0
    commission_amount: float
    status: str = "pending"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AffiliatePayoutRequestCreate(BaseModel):
    affiliate_id: str
    affiliate_email: EmailStr
    requested_amount: float
    notes: Optional[str] = None
