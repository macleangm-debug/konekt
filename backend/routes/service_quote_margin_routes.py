"""Service Quote Margin Routes — admin endpoint for previewing margin calculations."""
from fastapi import APIRouter
from pydantic import BaseModel
from services.service_quote_margin_service import (
    build_internal_service_quote_line,
    build_customer_facing_service_quote_line,
)

router = APIRouter(prefix="/api/admin/service-quote-margin", tags=["service-quote-margin"])


class ServiceQuoteMarginIn(BaseModel):
    service_name: str
    vendor_base_tax_inclusive: float
    margin_percent: float


@router.post("/preview")
def preview_service_quote(payload: ServiceQuoteMarginIn):
    internal = build_internal_service_quote_line(
        payload.service_name,
        payload.vendor_base_tax_inclusive,
        payload.margin_percent,
    )
    customer = build_customer_facing_service_quote_line(
        payload.service_name,
        payload.vendor_base_tax_inclusive,
        payload.margin_percent,
    )
    return {"ok": True, "internal": internal, "customer": customer}
