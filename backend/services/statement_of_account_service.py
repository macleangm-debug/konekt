"""
Statement of Account Service — Finance-clean ledger.
Only includes: invoices (debits) and approved payments (credits).
Calculates opening balance, running balance, closing balance.
Does NOT include scoring, analytics, or derived data.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional


def _safe_float(val):
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0


def _parse_dt(val):
    """Parse a datetime value from various formats."""
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return None
    return None


def _fmt_money(val):
    return f"TZS {val:,.0f}"


async def generate_statement(
    db,
    customer_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    """
    Generate a Statement of Account for a customer.
    Returns ledger entries sorted chronologically with running balance.
    """

    # Default: last 12 months
    now = datetime.now(timezone.utc)
    if date_to:
        end_dt = _parse_dt(date_to) or now
    else:
        end_dt = now

    if date_from:
        start_dt = _parse_dt(date_from) or (now - timedelta(days=365))
    else:
        start_dt = now - timedelta(days=365)

    # --- Calculate opening balance (all invoices - all payments BEFORE start_dt) ---
    pre_invoices = await db.invoices.find(
        {"customer_id": customer_id, "created_at": {"$lt": start_dt}},
        {"total_amount": 1, "_id": 0}
    ).to_list(length=10000)
    pre_invoice_total = sum(_safe_float(i.get("total_amount")) for i in pre_invoices)

    pre_payments = await db.payment_proofs.find(
        {"customer_id": customer_id, "status": "approved", "created_at": {"$lt": start_dt}},
        {"amount": 1, "_id": 0}
    ).to_list(length=10000)
    pre_payment_total = sum(_safe_float(p.get("amount")) for p in pre_payments)

    opening_balance = pre_invoice_total - pre_payment_total

    # --- Fetch invoices in the period (debits) ---
    period_invoices = await db.invoices.find(
        {"customer_id": customer_id, "created_at": {"$gte": start_dt, "$lte": end_dt}},
        {"total_amount": 1, "invoice_number": 1, "created_at": 1, "status": 1, "id": 1, "_id": 0}
    ).to_list(length=5000)

    # --- Fetch approved payments in the period (credits) ---
    period_payments = await db.payment_proofs.find(
        {"customer_id": customer_id, "status": "approved", "created_at": {"$gte": start_dt, "$lte": end_dt}},
        {"amount": 1, "payment_reference": 1, "created_at": 1, "id": 1, "payer_name": 1, "_id": 0}
    ).to_list(length=5000)

    # --- Build ledger entries ---
    entries = []

    for inv in period_invoices:
        dt = _parse_dt(inv.get("created_at"))
        entries.append({
            "date": dt.isoformat() if dt else "",
            "sort_key": dt or datetime.min.replace(tzinfo=timezone.utc),
            "type": "invoice",
            "reference": inv.get("invoice_number") or inv.get("id", ""),
            "description": f"Invoice {inv.get('invoice_number', '')}",
            "debit": _safe_float(inv.get("total_amount")),
            "credit": 0.0,
            "doc_id": inv.get("id", ""),
        })

    for pmt in period_payments:
        dt = _parse_dt(pmt.get("created_at"))
        entries.append({
            "date": dt.isoformat() if dt else "",
            "sort_key": dt or datetime.min.replace(tzinfo=timezone.utc),
            "type": "payment",
            "reference": pmt.get("payment_reference") or pmt.get("id", ""),
            "description": f"Payment received — {pmt.get('payer_name', '')}".strip(" —"),
            "debit": 0.0,
            "credit": _safe_float(pmt.get("amount")),
            "doc_id": pmt.get("id", ""),
        })

    # Sort chronologically
    entries.sort(key=lambda e: e["sort_key"])

    # Calculate running balance
    running = opening_balance
    for entry in entries:
        running = running + entry["debit"] - entry["credit"]
        entry["running_balance"] = round(running, 2)
        entry["debit_fmt"] = _fmt_money(entry["debit"]) if entry["debit"] else ""
        entry["credit_fmt"] = _fmt_money(entry["credit"]) if entry["credit"] else ""
        entry["balance_fmt"] = _fmt_money(entry["running_balance"])
        del entry["sort_key"]  # Remove internal sort key

    closing_balance = running
    total_debits = sum(e["debit"] for e in entries)
    total_credits = sum(e["credit"] for e in entries)

    # Fetch customer info for statement header
    customer = await db.users.find_one({"id": customer_id}, {"_id": 0, "full_name": 1, "company": 1, "email": 1, "phone": 1})

    return {
        "customer_id": customer_id,
        "customer_name": customer.get("full_name", "") if customer else "",
        "customer_company": customer.get("company", "") if customer else "",
        "customer_email": customer.get("email", "") if customer else "",
        "customer_phone": customer.get("phone", "") if customer else "",
        "period_from": start_dt.isoformat(),
        "period_to": end_dt.isoformat(),
        "opening_balance": round(opening_balance, 2),
        "opening_balance_fmt": _fmt_money(round(opening_balance, 2)),
        "closing_balance": round(closing_balance, 2),
        "closing_balance_fmt": _fmt_money(round(closing_balance, 2)),
        "total_debits": round(total_debits, 2),
        "total_debits_fmt": _fmt_money(round(total_debits, 2)),
        "total_credits": round(total_credits, 2),
        "total_credits_fmt": _fmt_money(round(total_credits, 2)),
        "entries": entries,
        "entry_count": len(entries),
    }
