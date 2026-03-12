"""
Konekt Customer Models with Payment Terms
B2B professional customer management with configurable payment terms
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

PaymentTermType = Literal[
    "due_on_receipt",
    "7_days",
    "14_days",
    "30_days",
    "50_upfront_50_delivery",
    "advance_payment",
    "credit_account",
    "custom",
]


class CustomerCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None

    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

    tax_number: Optional[str] = None
    business_registration_number: Optional[str] = None

    payment_term_type: PaymentTermType = "due_on_receipt"
    payment_term_days: int = 0
    payment_term_label: Optional[str] = "Due on Receipt"
    payment_term_notes: Optional[str] = None

    credit_limit: float = 0.0
    is_active: bool = True

    # Added for Phase B - CRM alignment
    industry: Optional[str] = None
    source: Optional[str] = None
    assigned_to: Optional[str] = None


class CustomerUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

    tax_number: Optional[str] = None
    business_registration_number: Optional[str] = None

    payment_term_type: Optional[PaymentTermType] = None
    payment_term_days: Optional[int] = None
    payment_term_label: Optional[str] = None
    payment_term_notes: Optional[str] = None

    credit_limit: Optional[float] = None
    is_active: Optional[bool] = None

    # Added for Phase B - CRM alignment
    industry: Optional[str] = None
    source: Optional[str] = None
    assigned_to: Optional[str] = None


class CustomerOut(CustomerCreate):
    id: str
    created_at: datetime
    updated_at: datetime
