from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class PaymentAllocationItem(BaseModel):
    invoice_id: str
    invoice_number: Optional[str] = None
    allocated_amount: float


class ManualPaymentCreate(BaseModel):
    customer_email: EmailStr
    customer_name: Optional[str] = None
    customer_company: Optional[str] = None

    payment_method: str  # bank_transfer, mobile_money, cash, cheque, card, manual
    payment_source: str = "admin"  # admin, web, invoice, bank_transfer, kwikpay
    payment_reference: Optional[str] = None
    external_reference: Optional[str] = None

    currency: str = "TZS"
    amount_received: float
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None

    allocations: List[PaymentAllocationItem] = []


class PaymentAllocationUpdate(BaseModel):
    allocations: List[PaymentAllocationItem]
