"""
Konekt Order Operations Models
"""
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

OrderStatus = Literal[
    "pending",
    "confirmed",
    "awaiting_payment",
    "in_review",
    "approved",
    "in_production",
    "quality_check",
    "ready_for_dispatch",
    "in_transit",
    "delivered",
    "cancelled",
]

ProductionStatus = Literal[
    "queued",
    "assigned",
    "in_progress",
    "waiting_approval",
    "quality_check",
    "completed",
    "blocked",
]

PriorityLevel = Literal["low", "medium", "high", "urgent"]


class ReserveInventoryItem(BaseModel):
    sku: str
    quantity: int


class ReserveInventoryRequest(BaseModel):
    order_id: str
    items: List[ReserveInventoryItem]


class AssignOrderTaskRequest(BaseModel):
    order_id: str
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: PriorityLevel = "medium"


class ProductionQueueCreate(BaseModel):
    order_id: str
    order_number: str
    customer_name: str
    production_type: str
    assigned_to: Optional[str] = None
    priority: PriorityLevel = "medium"
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: ProductionStatus = "queued"


class UpdateProductionStatusRequest(BaseModel):
    status: ProductionStatus
    note: Optional[str] = None
