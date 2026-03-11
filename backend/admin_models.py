"""
Konekt Admin Models - CRM, Inventory, Invoices, Tasks
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime


# Type definitions
LeadStatus = Literal["new", "contacted", "qualified", "proposal_sent", "won", "lost"]
TaskStatus = Literal["todo", "in_progress", "done", "blocked"]
PriorityLevel = Literal["low", "medium", "high", "urgent"]
StockMovementType = Literal["in", "out", "adjustment"]
InvoiceStatus = Literal["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]
QuoteStatus = Literal["draft", "sent", "accepted", "rejected", "expired", "converted"]


# CRM Models
class CRMLeadCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None
    source: Optional[str] = None
    industry: Optional[str] = None
    notes: Optional[str] = None
    status: LeadStatus = "new"
    assigned_to: Optional[str] = None
    estimated_value: Optional[float] = 0.0


class CRMLeadOut(CRMLeadCreate):
    id: str
    created_at: datetime
    updated_at: datetime


# Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    related_type: Optional[str] = None  # order, lead, invoice, service_order
    related_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: PriorityLevel = "medium"
    status: TaskStatus = "todo"


class TaskOut(TaskCreate):
    id: str
    created_at: datetime
    updated_at: datetime


# Inventory Models
class InventoryItemCreate(BaseModel):
    product_slug: str
    product_title: str
    sku: str
    category: str
    branch: str
    quantity_on_hand: int = 0
    reorder_level: int = 5
    unit_cost: float = 0.0
    location: Optional[str] = None
    is_active: bool = True


class InventoryItemOut(InventoryItemCreate):
    id: str
    created_at: datetime
    updated_at: datetime


class StockMovementCreate(BaseModel):
    sku: str
    movement_type: StockMovementType
    quantity: int
    note: Optional[str] = None
    reference_type: Optional[str] = None  # order, adjustment, return
    reference_id: Optional[str] = None
    created_by: Optional[str] = None


class StockMovementOut(StockMovementCreate):
    id: str
    created_at: datetime


# Invoice Models
class InvoiceLineItem(BaseModel):
    description: str
    quantity: int
    unit_price: float
    total: float


class InvoiceCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_company: Optional[str] = None
    order_id: Optional[str] = None
    quote_id: Optional[str] = None
    currency: str = "TZS"
    line_items: List[InvoiceLineItem]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float
    due_date: Optional[datetime] = None
    status: InvoiceStatus = "draft"
    notes: Optional[str] = None


class InvoiceOut(InvoiceCreate):
    id: str
    invoice_number: str
    created_at: datetime
    updated_at: datetime


# Quote Models
class QuoteLineItem(BaseModel):
    product_name: str
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
    currency: str = "TZS"
    line_items: List[QuoteLineItem]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float
    valid_until: Optional[datetime] = None
    status: QuoteStatus = "draft"
    notes: Optional[str] = None
    terms: Optional[str] = None


class QuoteOut(QuoteCreate):
    id: str
    quote_number: str
    created_at: datetime
    updated_at: datetime
