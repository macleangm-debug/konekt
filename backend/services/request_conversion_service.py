"""
Pack 6 — Request-to-Quote Conversion Service (Hardened)
Shared service for converting requests into quotes.
Used by: requests_module_routes.py, sample_flow_routes.py

Applies the 20% default margin unless overridden.
"""
import logging

logger = logging.getLogger("request_conversion_service")

DEFAULT_MARGIN_PERCENT = 20.0


def create_quote_from_request(request_doc: dict, vendor_cost: float, margin_percent: float = None) -> dict:
    """
    Convert a request document into a quote dict.
    Uses default 20% margin if not specified.
    """
    if margin_percent is None:
        margin_percent = DEFAULT_MARGIN_PERCENT
    margin_amount = round(vendor_cost * (margin_percent / 100.0), 2)
    final_price = round(vendor_cost + margin_amount, 2)
    result = {
        "request_id": request_doc.get("id"),
        "customer_user_id": request_doc.get("customer_user_id"),
        "request_type": request_doc.get("request_type"),
        "status": "awaiting_approval",
        "vendor_cost": vendor_cost,
        "margin_percent": margin_percent,
        "margin_amount": margin_amount,
        "selling_price": final_price,
        "details": request_doc.get("details", {}),
    }
    logger.info(
        "[request_conversion] quote created from request=%s vendor_cost=%.2f margin=%.1f%% price=%.2f",
        request_doc.get("id"), vendor_cost, margin_percent, final_price,
    )
    return result


def create_sample_quote_from_request(request_doc: dict, vendor_cost: float, margin_percent: float = None) -> dict:
    """
    Create a sample quote from a promo_sample request.
    Same margin logic, tagged as sample stage.
    """
    if margin_percent is None:
        margin_percent = DEFAULT_MARGIN_PERCENT
    margin_amount = round(vendor_cost * (margin_percent / 100.0), 2)
    final_price = round(vendor_cost + margin_amount, 2)
    result = {
        "request_id": request_doc.get("id"),
        "type": "promo_sample",
        "status": "awaiting_approval",
        "vendor_cost": vendor_cost,
        "margin_percent": margin_percent,
        "margin_amount": margin_amount,
        "selling_price": final_price,
        "sample_stage": "quoted",
    }
    logger.info(
        "[request_conversion] sample quote created from request=%s vendor_cost=%.2f",
        request_doc.get("id"), vendor_cost,
    )
    return result


def create_actual_order_quote_from_approved_sample(sample_workflow: dict, actual_vendor_cost: float, margin_percent: float = None) -> dict:
    """
    Create a production order quote from an approved sample.
    """
    if margin_percent is None:
        margin_percent = DEFAULT_MARGIN_PERCENT
    margin_amount = round(actual_vendor_cost * (margin_percent / 100.0), 2)
    final_price = round(actual_vendor_cost + margin_amount, 2)
    result = {
        "sample_workflow_id": sample_workflow.get("id"),
        "type": "promo_custom",
        "status": "awaiting_approval",
        "vendor_cost": actual_vendor_cost,
        "margin_percent": margin_percent,
        "margin_amount": margin_amount,
        "selling_price": final_price,
        "created_from_sample_approval": True,
    }
    logger.info(
        "[request_conversion] production quote from sample=%s vendor_cost=%.2f",
        sample_workflow.get("id"), actual_vendor_cost,
    )
    return result


def can_progress_to_actual_order(sample_workflow: dict) -> bool:
    """Check if a sample workflow is eligible for production order conversion."""
    return (
        sample_workflow.get("sample_status") == "approved"
        or sample_workflow.get("approved_by_sales_override")
        or sample_workflow.get("approved_by_admin_override")
    )
