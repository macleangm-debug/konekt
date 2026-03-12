from pydantic import BaseModel, EmailStr
from typing import List, Optional, Literal
from datetime import datetime


BriefFieldType = Literal["text", "textarea", "select", "multi_select", "boolean", "file", "number"]


class CreativeServiceAddon(BaseModel):
    code: str
    label: str
    description: Optional[str] = None
    price: float = 0.0
    is_active: bool = True


class CreativeBriefField(BaseModel):
    key: str
    label: str
    field_type: BriefFieldType
    required: bool = False
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    options: List[str] = []


class CreativeServiceCreate(BaseModel):
    slug: str
    title: str
    category: str
    description: Optional[str] = None
    base_price: float = 0.0
    currency: str = "TZS"
    brief_fields: List[CreativeBriefField] = []
    addons: List[CreativeServiceAddon] = []
    is_active: bool = True


class CreativeServiceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    currency: Optional[str] = None
    brief_fields: Optional[List[CreativeBriefField]] = None
    addons: Optional[List[CreativeServiceAddon]] = None
    is_active: Optional[bool] = None


class CreativeServiceOrderCreate(BaseModel):
    service_slug: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    company_name: Optional[str] = None
    brief_answers: dict = {}
    selected_addons: List[str] = []
    uploaded_files: List[str] = []
    notes: Optional[str] = None
