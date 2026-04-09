"""
Discount Request Service — Phase E
Sales Discount Request Workflow: Sales requests → Admin approves/rejects → unlocks in quote.

Margin floor protection:
  - Vendor/base price is ALWAYS protected
  - Konekt operational margin is protected
  - Discount can only eat into the distributable margin pool
  - If discount exceeds available distributable margin → rejected by system

Uses the canonical margin_engine for price resolution.
"""

from datetime import datetime, timezone, timedelta
from uuid import uuid4
from services.margin_engine import resolve_margin_rule_for_price, resolve_pricing, get_split_settings


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _money(v):
    return round(float(v or 0), 2)


async def create_discount_request(db, *, payload: dict, staff_id: str, staff_email: str, staff_name: str):
    """
    Sales staff submits a discount request.
    Validates margin floor before saving as 'pending'.
    """
    quote_ref = payload.get("quote_ref", "")
    order_ref = payload.get("order_ref", "")
    customer_name = payload.get("customer_name", "")
    customer_email = payload.get("customer_email", "")
    discount_type = payload.get("discount_type", "percentage")  # 'percentage' or 'fixed'
    discount_value = float(payload.get("discount_value", 0))
    reason = payload.get("reason", "")
    notes = payload.get("notes", "")
    urgency = payload.get("urgency", "normal")  # low / normal / high / urgent
    item_notes = payload.get("item_notes", "")  # optional notes for item-specific intent
    expires_in_days = int(payload.get("expires_in_days", 7))

    # Resolve the quote/order to get pricing data
    source_doc = None
    source_type = None
    if quote_ref:
        source_doc = await db.quotes_v2.find_one({"quote_number": quote_ref}, {"_id": 0})
        if not source_doc:
            source_doc = await db.quotes.find_one({"quote_number": quote_ref}, {"_id": 0})
        source_type = "quote"
    if not source_doc and order_ref:
        source_doc = await db.orders.find_one({"order_number": order_ref}, {"_id": 0})
        source_type = "order"

    # Calculate standard price from the source document
    standard_price = 0
    line_items = []
    if source_doc:
        standard_price = _money(source_doc.get("total") or source_doc.get("total_amount") or 0)
        line_items = source_doc.get("line_items") or source_doc.get("items") or []
        if not customer_name:
            customer_name = source_doc.get("customer_name", "")
        if not customer_email:
            customer_email = source_doc.get("customer_email", "")

    # Calculate the requested discount amount
    if discount_type == "percentage":
        discount_amount = _money(standard_price * discount_value / 100)
    else:
        discount_amount = _money(discount_value)

    proposed_final_price = _money(standard_price - discount_amount)

    # ── Margin Impact Analysis ──
    margin_impact = await _calculate_margin_impact(db, line_items, discount_amount, standard_price)

    # Check margin floor
    margin_safe = margin_impact.get("margin_safe", True)
    margin_warning = ""
    if not margin_safe:
        margin_warning = (
            f"Discount of TZS {discount_amount:,.0f} breaches the margin floor. "
            f"Maximum safe discount: TZS {margin_impact.get('max_safe_discount', 0):,.0f}"
        )

    request_id = f"DR-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
    now = _now_iso()

    doc = {
        "request_id": request_id,
        "source_type": source_type or "manual",
        "quote_ref": quote_ref,
        "order_ref": order_ref,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "sales_rep_id": staff_id,
        "sales_rep_email": staff_email,
        "sales_rep_name": staff_name,
        "discount_type": discount_type,
        "discount_value": discount_value,
        "discount_amount": discount_amount,
        "standard_price": standard_price,
        "proposed_final_price": proposed_final_price,
        "reason": reason,
        "notes": notes,
        "item_notes": item_notes,
        "urgency": urgency,
        "status": "pending",
        "margin_impact": margin_impact,
        "margin_safe": margin_safe,
        "margin_warning": margin_warning,
        "admin_note": "",
        "reviewed_by": "",
        "reviewed_at": "",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat(),
        "created_at": now,
        "updated_at": now,
    }

    await db.discount_requests.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "request": doc}


async def list_discount_requests_for_staff(db, *, staff_id: str, staff_email: str):
    """List discount requests submitted by this sales rep."""
    query = {"$or": [
        {"sales_rep_id": staff_id},
        {"sales_rep_email": staff_email},
    ]}
    docs = await db.discount_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


async def list_discount_requests_for_admin(db, *, status: str = None, limit: int = 100):
    """Admin queue of all discount requests with KPIs."""
    query = {}
    if status:
        query["status"] = status

    docs = await db.discount_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)

    # KPIs
    all_docs = await db.discount_requests.find({}, {"_id": 0, "status": 1}).to_list(500)
    pending_count = sum(1 for d in all_docs if d.get("status") == "pending")
    approved_count = sum(1 for d in all_docs if d.get("status") == "approved")
    rejected_count = sum(1 for d in all_docs if d.get("status") == "rejected")

    return {
        "items": docs,
        "kpis": {
            "total": len(all_docs),
            "pending": pending_count,
            "approved": approved_count,
            "rejected": rejected_count,
        }
    }


async def get_discount_request_detail(db, request_id: str):
    """Get full detail of a discount request."""
    doc = await db.discount_requests.find_one({"request_id": request_id}, {"_id": 0})
    return doc


async def approve_discount_request(db, request_id: str, *, admin_name: str, admin_note: str = ""):
    """
    Admin approves a discount request.
    Re-validates margin floor before approving.
    """
    doc = await db.discount_requests.find_one({"request_id": request_id})
    if not doc:
        return {"ok": False, "error": "Request not found"}

    if doc.get("status") != "pending":
        return {"ok": False, "error": f"Request is already {doc.get('status')}"}

    # Re-validate margin floor
    line_items = []
    source_doc = None
    if doc.get("quote_ref"):
        source_doc = await db.quotes_v2.find_one({"quote_number": doc["quote_ref"]}, {"_id": 0})
        if not source_doc:
            source_doc = await db.quotes.find_one({"quote_number": doc["quote_ref"]}, {"_id": 0})
    elif doc.get("order_ref"):
        source_doc = await db.orders.find_one({"order_number": doc["order_ref"]}, {"_id": 0})

    if source_doc:
        line_items = source_doc.get("line_items") or source_doc.get("items") or []

    margin_impact = await _calculate_margin_impact(db, line_items, doc.get("discount_amount", 0), doc.get("standard_price", 0))
    if not margin_impact.get("margin_safe", True):
        return {
            "ok": False,
            "error": "Discount breaches the margin floor. Cannot approve.",
            "margin_impact": margin_impact,
        }

    now = _now_iso()
    await db.discount_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "approved",
            "reviewed_by": admin_name,
            "reviewed_at": now,
            "admin_note": admin_note,
            "margin_impact": margin_impact,
            "updated_at": now,
        }}
    )

    # Apply approved discount to the quote/order
    await _apply_discount_to_source(db, doc)

    updated = await db.discount_requests.find_one({"request_id": request_id}, {"_id": 0})
    return {"ok": True, "request": updated}


async def reject_discount_request(db, request_id: str, *, admin_name: str, admin_note: str = ""):
    """Admin rejects a discount request."""
    doc = await db.discount_requests.find_one({"request_id": request_id})
    if not doc:
        return {"ok": False, "error": "Request not found"}

    if doc.get("status") != "pending":
        return {"ok": False, "error": f"Request is already {doc.get('status')}"}

    now = _now_iso()
    await db.discount_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "rejected",
            "reviewed_by": admin_name,
            "reviewed_at": now,
            "admin_note": admin_note,
            "updated_at": now,
        }}
    )

    updated = await db.discount_requests.find_one({"request_id": request_id}, {"_id": 0})
    return {"ok": True, "request": updated}


async def _calculate_margin_impact(db, line_items, discount_amount, standard_price):
    """
    Calculate margin impact of a discount across all line items.
    Uses the canonical margin engine for resolution.
    """
    if not line_items or standard_price <= 0:
        # Fallback: use global margin rule
        split_settings = await get_split_settings(db)
        discount_pool_pct = split_settings.get("discount_share_pct", 30)
        rule = await resolve_margin_rule_for_price(db, vendor_price=standard_price)
        dp_pct = rule.get("distributable_margin_pct", 10)
        distributable_margin = _money(standard_price * dp_pct / (100 + rule.get("operational_margin_pct", 20) + dp_pct))
        discount_budget = _money(distributable_margin * discount_pool_pct / 100)
        remaining_after = _money(distributable_margin - discount_amount)
        margin_safe = discount_amount <= discount_budget
        op_margin_val = _money(standard_price * rule.get("operational_margin_pct", 20) / (100 + rule.get("operational_margin_pct", 20) + dp_pct))
        risk_level, risk_message = _classify_discount_risk(
            discount_amount, discount_budget, distributable_margin, op_margin_val
        )
        return {
            "total_base_cost": _money(standard_price - distributable_margin - op_margin_val),
            "total_operational_margin": op_margin_val,
            "total_distributable_margin": distributable_margin,
            "discount_pool_pct": discount_pool_pct,
            "max_safe_discount": discount_budget,
            "requested_discount": discount_amount,
            "remaining_margin_after_discount": remaining_after,
            "margin_safe": margin_safe,
            "risk_level": risk_level,
            "risk_message": risk_message,
        }

    # Full item-level resolution
    total_base_cost = 0
    total_op_margin = 0
    total_dp_margin = 0
    split_settings = await get_split_settings(db)

    for item in line_items:
        vendor_price = float(item.get("vendor_price") or item.get("base_price") or item.get("unit_price") or 0)
        qty = int(item.get("quantity", 1))
        product_id = item.get("product_id", "")
        group_id = item.get("group_id") or item.get("category", "")

        rule = await resolve_margin_rule_for_price(db, vendor_price=vendor_price, product_id=product_id, group_id=group_id)
        pricing = resolve_pricing(vendor_price, rule, split_settings)

        total_base_cost += pricing["base_price"] * qty
        total_op_margin += pricing["effective_margin_value"] * qty
        total_dp_margin += pricing["effective_distributable_margin_value"] * qty

    discount_pool_pct = split_settings.get("discount_share_pct", 30)
    discount_budget = _money(total_dp_margin * discount_pool_pct / 100)
    remaining_after = _money(total_dp_margin - discount_amount)

    # Classify risk: safe / warning / critical
    margin_safe = discount_amount <= discount_budget
    risk_level, risk_message = _classify_discount_risk(
        discount_amount, discount_budget, total_dp_margin, total_op_margin
    )

    return {
        "total_base_cost": _money(total_base_cost),
        "total_operational_margin": _money(total_op_margin),
        "total_distributable_margin": _money(total_dp_margin),
        "discount_pool_pct": discount_pool_pct,
        "max_safe_discount": discount_budget,
        "requested_discount": discount_amount,
        "remaining_margin_after_discount": remaining_after,
        "margin_safe": margin_safe,
        "risk_level": risk_level,
        "risk_message": risk_message,
    }


async def _apply_discount_to_source(db, discount_doc):
    """
    When a discount is approved, stamp the discount info on the source quote/order
    so the quote flow can read it.
    """
    discount_stamp = {
        "approved_discount": {
            "request_id": discount_doc.get("request_id"),
            "discount_type": discount_doc.get("discount_type"),
            "discount_value": discount_doc.get("discount_value"),
            "discount_amount": discount_doc.get("discount_amount"),
            "approved_by": discount_doc.get("reviewed_by", ""),
            "approved_at": _now_iso(),
            "expires_at": discount_doc.get("expires_at", ""),
        }
    }

    if discount_doc.get("quote_ref"):
        await db.quotes_v2.update_one(
            {"quote_number": discount_doc["quote_ref"]},
            {"$set": discount_stamp}
        )
        await db.quotes.update_one(
            {"quote_number": discount_doc["quote_ref"]},
            {"$set": discount_stamp}
        )
    elif discount_doc.get("order_ref"):
        await db.orders.update_one(
            {"order_number": discount_doc["order_ref"]},
            {"$set": discount_stamp}
        )


def _classify_discount_risk(discount_amount, discount_budget, distributable_margin, operational_margin):
    """
    Classify discount risk as safe / warning / critical.
    Uses the same margin thresholds as the pricing engine.

    - Safe: discount is well within the discount budget (< 80% of budget)
    - Warning: discount is approaching or at the budget limit (80%-100% of budget)
    - Critical: discount exceeds the budget and eats into operational margin
    """
    if discount_budget <= 0:
        if discount_amount > 0:
            return "critical", "No distributable margin available. This discount would breach the protected pricing floor."
        return "safe", "No discount requested."

    usage_pct = (discount_amount / discount_budget) * 100 if discount_budget > 0 else 999

    if usage_pct <= 80:
        return "safe", "Discount is within safe limits. Healthy margin remains."
    elif usage_pct <= 100:
        remaining = _money(distributable_margin - discount_amount)
        return "warning", (
            f"This discount uses {usage_pct:.0f}% of the discount budget. "
            f"Remaining distributable margin: TZS {remaining:,.0f}. "
            "Approaching the protected pricing floor."
        )
    else:
        over = _money(discount_amount - discount_budget)
        return "critical", (
            f"This discount exceeds the safe budget by TZS {over:,.0f}. "
            f"Maximum safe discount: TZS {discount_budget:,.0f}. "
            "Approval would breach the protected margin floor."
        )
