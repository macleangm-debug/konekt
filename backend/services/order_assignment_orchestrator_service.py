"""
Pack 1 — Order Assignment Orchestrator
Calls assignment_policy_service to determine sales + vendor,
then applies to order document.
"""
from services.assignment_policy_service import resolve_sales_assignment, resolve_vendor_assignment


async def orchestrate_order_assignment(db, order_doc: dict, explicit_sales_id=None, explicit_vendor_id=None) -> dict:
    """
    Assign sales + vendor to an order using the centralized policy.
    Returns updated fields dict.
    """
    sales_id, sales_name, sales_phone, sales_email = await resolve_sales_assignment(
        db, explicit_sales_id=explicit_sales_id
    )

    vendor_id, vendor_name = await resolve_vendor_assignment(
        db, items=order_doc.get("items", []), explicit_vendor_id=explicit_vendor_id
    )

    return {
        "assigned_sales_id": sales_id,
        "assigned_sales_name": sales_name,
        "sales_phone": sales_phone,
        "sales_email": sales_email,
        "assigned_vendor_id": vendor_id,
        "assigned_vendor_name": vendor_name,
    }
