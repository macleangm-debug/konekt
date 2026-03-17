"""
Assignment Workflow Service
Handles sales and operations staff assignment for leads, quotes, and orders.
"""
from datetime import datetime, timezone
from staff_assignment_service import (
    get_best_staff_for_assignment,
    resolve_sale_source,
    record_task_assignment,
)


async def assign_sales_owner(
    db,
    *,
    entity_type: str,
    entity_id: str,
    category: str = None,
    affiliate_code: str = None,
    created_by_staff: bool = False,
    touched_by_staff: bool = False,
):
    """
    Assign the best sales staff to a lead/quote/order.
    Returns assignment details including sale source.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    best_sales = await get_best_staff_for_assignment(db, role="sales", category=category)
    
    sale_source = resolve_sale_source(
        created_by_staff=created_by_staff,
        affiliate_code=affiliate_code,
        touched_by_staff=touched_by_staff,
    )

    assignment = {
        "assigned_sales_id": str(best_sales["_id"]) if best_sales else None,
        "assigned_sales_name": best_sales.get("name") if best_sales else None,
        "assigned_sales_email": best_sales.get("email") if best_sales else None,
        "sale_source": sale_source,
        "sales_assigned_at": now,
    }
    
    # Record for performance tracking
    if best_sales:
        await record_task_assignment(
            db,
            staff_id=str(best_sales["_id"]),
            role="sales",
            entity_type=entity_type,
            entity_id=entity_id,
            status="assigned",
        )

    return assignment


async def assign_operations_owner(
    db,
    *,
    entity_type: str,
    entity_id: str,
    category: str = None,
):
    """
    Assign the best operations staff for delivery/fulfillment follow-up.
    Called when an order moves to fulfillment stage.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    best_ops = await get_best_staff_for_assignment(db, role="operations", category=category)
    
    assignment = {
        "assigned_operations_id": str(best_ops["_id"]) if best_ops else None,
        "assigned_operations_name": best_ops.get("name") if best_ops else None,
        "assigned_operations_email": best_ops.get("email") if best_ops else None,
        "operations_assigned_at": now,
    }
    
    # Record for performance tracking
    if best_ops:
        await record_task_assignment(
            db,
            staff_id=str(best_ops["_id"]),
            role="operations",
            entity_type=entity_type,
            entity_id=entity_id,
            status="assigned",
        )

    return assignment


async def handoff_to_operations(
    db,
    *,
    entity_type: str,
    entity_id: str,
    category: str = None,
    sales_staff_id: str = None,
):
    """
    Handoff from sales to operations when order enters fulfillment.
    Updates sales task to 'converted' and creates operations task.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Mark sales task as converted (success)
    if sales_staff_id:
        await db.staff_task_metrics.update_one(
            {"staff_id": sales_staff_id, "entity_id": entity_id},
            {"$set": {"status": "completed", "completed_at": now, "updated_at": now}}
        )
    
    # Assign operations owner
    ops_assignment = await assign_operations_owner(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
        category=category,
    )
    
    return ops_assignment
