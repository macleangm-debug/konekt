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
    # Tax & Registration
    tin_number: Optional[str] = None  # Tax Identification Number
    business_registration_number: Optional[str] = None  # BRELA Registration
    vat_number: Optional[str] = None  # VAT Registration Number
    tax_number: Optional[str] = None  # Legacy field for backward compatibility
    # Tax Settings
    default_tax_rate: float = 18.0  # VAT rate in Tanzania is 18%
    tax_inclusive_pricing: bool = False  # Whether prices include tax
    apply_tax_to_services: bool = True
    apply_tax_to_products: bool = True
    # Currency & Banking
    currency: str = "TZS"
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_branch: Optional[str] = None
    swift_code: Optional[str] = None
    payment_instructions: Optional[str] = None
    # Document Terms
    invoice_terms: Optional[str] = None
    quote_terms: Optional[str] = None
    quote_validity_days: int = 30
    invoice_payment_days: int = 14


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
    customer_address: Optional[str] = None
    customer_tin: Optional[str] = None  # Client TIN
    customer_registration_number: Optional[str] = None  # Client Business Registration
    customer_user_id: Optional[str] = None  # For notification routing
    customer_id: Optional[str] = None  # Fallback for notification routing
    lead_id: Optional[str] = None
    order_reference: Optional[str] = None
    currency: str = "TZS"
    line_items: List[QuoteLineItem]
    subtotal: float
    tax: float = 0.0
    tax_rate: float = 18.0  # Applied tax rate
    discount: float = 0.0
    total: float
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: QuoteStatus = "draft"
    # Payment Terms (inherited from customer profile)
    payment_term_type: Optional[str] = "due_on_receipt"
    payment_term_days: int = 0
    payment_term_label: Optional[str] = "Due on Receipt"
    payment_term_notes: Optional[str] = None
    # Attribution fields
    affiliate_code: Optional[str] = None
    affiliate_email: Optional[str] = None
    affiliate_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_discount: float = 0.0


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
    customer_address: Optional[str] = None
    customer_tin: Optional[str] = None  # Client TIN
    customer_registration_number: Optional[str] = None  # Client Business Registration
    customer_user_id: Optional[str] = None  # For notification routing
    customer_id: Optional[str] = None  # Fallback for notification routing
    order_id: Optional[str] = None
    quote_id: Optional[str] = None
    currency: str = "TZS"
    line_items: List[InvoiceLineItem]
    subtotal: float
    tax: float = 0.0
    tax_rate: float = 18.0  # Applied tax rate
    discount: float = 0.0
    total: float
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: InvoiceStatus = "draft"
    # Payment Terms (inherited from customer profile)
    payment_term_type: Optional[str] = "due_on_receipt"
    payment_term_days: int = 0
    payment_term_label: Optional[str] = "Due on Receipt"
    payment_term_notes: Optional[str] = None
    # Attribution fields
    affiliate_code: Optional[str] = None
    affiliate_email: Optional[str] = None
    affiliate_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_discount: float = 0.0


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
