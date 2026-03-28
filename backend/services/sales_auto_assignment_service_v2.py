def resolve_sales_assignment(customer: dict, sales_pool: list) -> str:
    """Resolve sales rep: check customer's existing assignment first, then pool."""
    existing = (
        customer.get("assigned_sales_id")
        or (customer.get("account") or {}).get("assigned_sales_id")
    )
    if existing:
        return existing
    for rep in sales_pool or []:
        if rep.get("is_active", True) and rep.get("role") in ("sales", "staff"):
            return rep.get("id")
    return None

def apply_sales_assignment(order: dict, customer: dict, sales_pool: list) -> dict:
    """Assign a sales rep to the order."""
    sid = resolve_sales_assignment(customer, sales_pool)
    if sid:
        order["assigned_sales_id"] = sid
    return order
