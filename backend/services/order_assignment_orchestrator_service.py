"""
Order Assignment Orchestrator — Calls assignment_policy_service to determine
sales + vendor, then applies to order document.
Now type-aware: dispatches product, promo, and service orders to separate engines.
"""
import logging
from services.assignment_policy_service import resolve_sales_assignment, resolve_vendor_assignment

logger = logging.getLogger("order_assignment_orchestrator")


async def orchestrate_order_assignment(
    db,
    order_doc: dict,
    explicit_sales_id=None,
    explicit_vendor_id=None,
    order_id=None,
):
    """
    Assign sales + vendor to an order using the centralized type-aware policy.
    Returns updated fields dict.
    """
    sales_id, sales_name, sales_phone, sales_email = await resolve_sales_assignment(
        db, explicit_sales_id=explicit_sales_id
    )

    order_type = (order_doc.get("type") or "product").lower()
    oid = order_id or order_doc.get("id")

    vendor_id, vendor_name, vendor_ids, decision = await resolve_vendor_assignment(
        db,
        items=order_doc.get("items", []),
        explicit_vendor_id=explicit_vendor_id,
        order_type=order_type,
        order_id=oid,
    )

    result = {
        "assigned_sales_id": sales_id,
        "assigned_sales_name": sales_name,
        "sales_phone": sales_phone,
        "sales_email": sales_email,
        "assigned_vendor_id": vendor_id,
        "assigned_vendor_name": vendor_name,
        "vendor_ids": vendor_ids,
    }
    logger.info(
        "[assignment_orchestrator] order=%s type=%s sales=%s vendor=%s engine=%s",
        oid, order_type, sales_id, vendor_id,
        (decision or {}).get("engine_used", "n/a"),
    )
    return result
