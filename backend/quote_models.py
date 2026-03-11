"""
Konekt Quote and Invoice Models with Company Settings
"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Literal
from datetime import datetime

QuoteStatus = Literal[
    "draft",
    "sent",
    "approved",
    "rejected",
    "expired",
    "converted"
]

InvoiceStatus = Literal[
    "draft",
    "sent",
    "partially_paid",
    "paid",
    "overdue",
    "cancelled"
]


class CompanySettings(BaseModel):
    company_name: str
    logo_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tax_number: Optional[str] = None
    currency: str = "TZS"
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_branch: Optional[str] = None
    swift_code: Optional[str] = None
    payment_instructions: Optional[str] = None
    invoice_terms: Optional[str] = None
    quote_terms: Optional[str] = None


class QuoteLineItem(BaseModel):
    description: str
    quantity: int
    unit_price: float
    total: float


class QuoteCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_company: Optional[str] = None
    customer_phone: Optional[str] = None
    lead_id: Optional[str] = None
    order_reference: Optional[str] = None
    currency: str = "TZS"
    line_items: List[QuoteLineItem]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: QuoteStatus = "draft"


class QuoteOut(QuoteCreate):
    id: str
    quote_number: str
    created_at: datetime
    updated_at: datetime


class InvoiceLineItem(BaseModel):
    description: str
    quantity: int
    unit_price: float
    total: float


class InvoiceCreateNew(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_company: Optional[str] = None
    customer_phone: Optional[str] = None
    order_id: Optional[str] = None
    quote_id: Optional[str] = None
    currency: str = "TZS"
    line_items: List[InvoiceLineItem]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: InvoiceStatus = "draft"


class InvoiceOut(InvoiceCreateNew):
    id: str
    invoice_number: str
    created_at: datetime
    updated_at: datetime


class ConvertQuoteToOrderRequest(BaseModel):
    quote_id: str


class ConvertOrderToInvoiceRequest(BaseModel):
    order_id: str
    due_date: Optional[datetime] = None
