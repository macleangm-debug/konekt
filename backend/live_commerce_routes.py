from typing import Optional

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from core.live_commerce_service import LiveCommerceService

router = APIRouter(prefix="/api/live-commerce", tags=["Live Commerce"])


class CustomerPayload(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    company_name: str = ""


class DeliveryPayload(BaseModel):
    address: str = ""
    city: str = ""
    country: str = "Tanzania"
    notes: str = ""


class ProductItemPayload(BaseModel):
    id: Optional[str] = None
    product_id: Optional[str] = None
    sku: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    quantity: int = 1
    price: float = 0
    unit_price: Optional[float] = None
    vendor_id: Optional[str] = None
    customization_summary: Optional[str] = None
    attributes: dict = Field(default_factory=dict)


class ProductCheckoutPayload(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer: CustomerPayload = Field(default_factory=CustomerPayload)
    delivery: DeliveryPayload = Field(default_factory=DeliveryPayload)
    items: list[ProductItemPayload] = Field(default_factory=list)
    vat_percent: float = 18
    quote_details: dict = Field(default_factory=dict)


class QuoteAcceptPayload(BaseModel):
    accepted_by_role: str = "customer"


class PaymentIntentPayload(BaseModel):
    payment_mode: str = "full"
    deposit_percent: float = 0


class PaymentProofPayload(BaseModel):
    amount_paid: float
    file_url: str
    payer_name: str = ""
    customer_email: str = ""


class FinanceActionPayload(BaseModel):
    approver_role: str
    assigned_sales_id: Optional[str] = None
    assigned_sales_name: Optional[str] = None
    reason: str = ""


@router.get("/health")
async def health():
    return {
        "ok": True,
        "message": "Use this simplified facade for go-live checkout, payments, finance approval, and order creation.",
    }


@router.post("/product-checkout")
async def product_checkout(payload: ProductCheckoutPayload, request: Request):
    service = LiveCommerceService(request.app.mongodb)
    return await service.create_product_checkout(payload.model_dump())


@router.post("/quotes/{quote_id}/accept")
async def accept_quote(quote_id: str, payload: QuoteAcceptPayload, request: Request):
    service = LiveCommerceService(request.app.mongodb)
    return await service.accept_quote(quote_id, payload.accepted_by_role)


@router.post("/invoices/{invoice_id}/payment-intent")
async def create_payment_intent(invoice_id: str, payload: PaymentIntentPayload, request: Request):
    service = LiveCommerceService(request.app.mongodb)
    return await service.create_payment_intent(invoice_id, payload.payment_mode, payload.deposit_percent)


@router.post("/payments/{payment_id}/proof")
async def submit_payment_proof(payment_id: str, payload: PaymentProofPayload, request: Request):
    service = LiveCommerceService(request.app.mongodb)
    return await service.submit_payment_proof(
        payment_id=payment_id,
        amount_paid=payload.amount_paid,
        file_url=payload.file_url,
        payer_name=payload.payer_name,
        customer_email=payload.customer_email,
    )


@router.get("/finance/queue")
async def finance_queue(request: Request, search: Optional[str] = Query(default=None)):
    service = LiveCommerceService(request.app.mongodb)
    return await service.finance_queue(customer_query=search)


@router.post("/finance/proofs/{payment_proof_id}/approve")
async def approve_payment_proof(payment_proof_id: str, payload: FinanceActionPayload, request: Request):
    service = LiveCommerceService(request.app.mongodb)
    return await service.approve_payment_proof(
        payment_proof_id=payment_proof_id,
        approver_role=payload.approver_role,
        assigned_sales_id=payload.assigned_sales_id,
        assigned_sales_name=payload.assigned_sales_name,
    )


@router.post("/finance/proofs/{payment_proof_id}/reject")
async def reject_payment_proof(payment_proof_id: str, payload: FinanceActionPayload, request: Request):
    service = LiveCommerceService(request.app.mongodb)
    return await service.reject_payment_proof(
        payment_proof_id=payment_proof_id,
        approver_role=payload.approver_role,
        reason=payload.reason,
    )


@router.get("/customers/{customer_id}/workspace")
async def customer_workspace(customer_id: str, request: Request):
    service = LiveCommerceService(request.app.mongodb)
    return await service.customer_workspace(customer_id)
