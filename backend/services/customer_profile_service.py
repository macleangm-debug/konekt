"""
Customer Profile Service — Aggregates profile-level KPIs for Customer 360.
Computes: total revenue, outstanding balance, avg order value, payment punctuality.
Does NOT build a shadow finance model — all data comes from existing collections.
"""
from datetime import datetime, timezone


def _safe_float(val):
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0


async def get_profile_summary(db, customer_id: str) -> dict:
    """Aggregate profile-level KPIs from orders, invoices, payment_proofs."""

    # --- Revenue from orders ---
    orders_cursor = db.orders.find({"customer_id": customer_id}, {"total_amount": 1, "created_at": 1, "_id": 0})
    orders = await orders_cursor.to_list(length=5000)
    total_revenue = sum(_safe_float(o.get("total_amount")) for o in orders)
    order_count = len(orders)
    avg_order_value = total_revenue / order_count if order_count else 0.0

    # --- Outstanding balance from invoices ---
    unpaid_invoices = await db.invoices.find(
        {"customer_id": customer_id, "status": {"$nin": ["paid", "cancelled"]}},
        {"total_amount": 1, "_id": 0}
    ).to_list(length=5000)
    outstanding_balance = sum(_safe_float(i.get("total_amount")) for i in unpaid_invoices)

    # --- Total paid ---
    paid_payments = await db.payment_proofs.find(
        {"customer_id": customer_id, "status": "approved"},
        {"amount": 1, "_id": 0}
    ).to_list(length=5000)
    total_paid = sum(_safe_float(p.get("amount")) for p in paid_payments)

    # --- Payment punctuality (% of invoices paid) ---
    total_invoices = await db.invoices.count_documents({"customer_id": customer_id})
    paid_invoices = await db.invoices.count_documents({"customer_id": customer_id, "status": "paid"})
    punctuality_score = round((paid_invoices / total_invoices * 100), 1) if total_invoices else 0.0

    # --- Requests count ---
    total_requests = await db.requests.count_documents({"customer_id": customer_id})
    active_requests = await db.requests.count_documents(
        {"customer_id": customer_id, "status": {"$nin": ["completed", "cancelled", "closed"]}}
    )

    return {
        "total_revenue": round(total_revenue, 2),
        "outstanding_balance": round(outstanding_balance, 2),
        "total_paid": round(total_paid, 2),
        "order_count": order_count,
        "avg_order_value": round(avg_order_value, 2),
        "payment_punctuality_pct": punctuality_score,
        "total_invoices": total_invoices,
        "paid_invoices": paid_invoices,
        "unpaid_invoices_count": len(unpaid_invoices),
        "total_requests": total_requests,
        "active_requests": active_requests,
    }
