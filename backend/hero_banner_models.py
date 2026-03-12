from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class HeroBannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: str
    mobile_image_url: Optional[str] = None

    primary_cta_label: Optional[str] = None
    primary_cta_url: Optional[str] = None
    secondary_cta_label: Optional[str] = None
    secondary_cta_url: Optional[str] = None

    badge_text: Optional[str] = None
    theme: str = "dark"
    position: int = 0
    is_active: bool = True
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None


class HeroBannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None

    primary_cta_label: Optional[str] = None
    primary_cta_url: Optional[str] = None
    secondary_cta_label: Optional[str] = None
    secondary_cta_url: Optional[str] = None

    badge_text: Optional[str] = None
    theme: Optional[str] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None


class HeroBannerOut(BaseModel):
    id: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: str
    mobile_image_url: Optional[str] = None
    primary_cta_label: Optional[str] = None
    primary_cta_url: Optional[str] = None
    secondary_cta_label: Optional[str] = None
    secondary_cta_url: Optional[str] = None
    badge_text: Optional[str] = None
    theme: str = "dark"
    position: int = 0
    is_active: bool = True
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    created_at: str
    updated_at: str
