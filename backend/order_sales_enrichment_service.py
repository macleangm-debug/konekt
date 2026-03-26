"""
Order Sales Enrichment Service
Enriches order documents with real sales person profile data from the users collection.
"""


async def enrich_order_with_sales(order: dict, db) -> dict:
    """Look up assigned_sales_id in users collection and attach full sales profile."""
    sales_id = order.get("assigned_sales_id")
    if not sales_id or sales_id == "auto-sales":
        return order

    sales_user = await db.users.find_one(
        {"id": sales_id},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1, "role": 1},
    )
    if sales_user:
        order["sales"] = {
            "id": sales_user.get("id"),
            "name": sales_user.get("full_name", ""),
            "email": sales_user.get("email", ""),
            "phone": sales_user.get("phone", ""),
        }
        order["assigned_sales_name"] = sales_user.get("full_name", order.get("assigned_sales_name", ""))
    return order


async def enrich_orders_batch(orders: list, db) -> list:
    """Batch-enrich a list of orders. Caches sales lookups to avoid repeated queries."""
    cache = {}
    for order in orders:
        sid = order.get("assigned_sales_id")
        if not sid or sid == "auto-sales":
            continue
        if sid not in cache:
            user = await db.users.find_one(
                {"id": sid},
                {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1},
            )
            cache[sid] = user
        sales_user = cache.get(sid)
        if sales_user:
            order["sales"] = {
                "id": sales_user.get("id"),
                "name": sales_user.get("full_name", ""),
                "email": sales_user.get("email", ""),
                "phone": sales_user.get("phone", ""),
            }
            order["assigned_sales_name"] = sales_user.get("full_name", order.get("assigned_sales_name", ""))
    return orders
