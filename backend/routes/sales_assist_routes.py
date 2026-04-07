"""Sales Assist Routes — public endpoint for sales assist requests."""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from services.sales_assist_request_service import create_sales_assist_request

router = APIRouter(prefix="/api/public/sales-assist", tags=["sales-assist"])


class SalesAssistIn(BaseModel):
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    notes: Optional[str] = None
    page_url: Optional[str] = None
    source: Optional[str] = "marketplace_sales_assist"


@router.post("")
async def submit_sales_assist_request(payload: SalesAssistIn, request: Request):
    db = request.app.mongodb
    result = await create_sales_assist_request(db, payload.dict())
    return {"ok": True, "request": result}
