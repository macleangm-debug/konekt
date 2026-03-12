from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AffiliateCreate(BaseModel):
    name: str
    email: EmailStr
    affiliate_code: str
    affiliate_link: Optional[str] = None
    is_active: bool = True
    commission_type: str = "percentage"
    commission_value: float = 10.0
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
