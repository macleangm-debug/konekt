"""
Payment Release Policy Routes
CRUD for release rules per scope: global, product_group, service_group, product, service.
Controls when vendor orders become visible/released.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional

router = APIRouter(prefix="/api/admin/payment-release-policies", tags=["Payment Release Policy"])


def _now():
    return datetime.now(timezone.utc).isoformat()


def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_policies(request: Request, scope_type: Optional[str] = None):
    db = request.app.mongodb
    query = {}
    if scope_type:
        query["scope_type"] = scope_type
    docs = await db.payment_release_policies.find(query).sort("created_at", -1).to_list(500)
    return [_clean(d) for d in docs]


@router.post("")
async def create_policy(payload: dict, request: Request):
    db = request.app.mongodb

    scope_type = payload.get("scope_type")
    valid_scopes = {"global", "product_group", "service_group", "product", "service"}
    if scope_type not in valid_scopes:
        raise HTTPException(400, f"scope_type must be one of: {valid_scopes}")

    payment_mode = payload.get("payment_mode")
    valid_modes = {"full_upfront", "installment", "credit_terms", "phased_service"}
    if payment_mode not in valid_modes:
        raise HTTPException(400, f"payment_mode must be one of: {valid_modes}")

    release_rule = payload.get("release_rule")
    valid_rules = {"after_full_payment", "after_advance_payment", "manual_admin_release", "after_credit_approval"}
    if release_rule not in valid_rules:
        raise HTTPException(400, f"release_rule must be one of: {valid_rules}")

    # Uniqueness: one policy per scope_type+scope_id
    scope_id = payload.get("scope_id")
    existing = await db.payment_release_policies.find_one({"scope_type": scope_type, "scope_id": scope_id})
    if existing:
        raise HTTPException(409, "Policy for this scope already exists. Update it instead.")

    policy = {
        "id": str(uuid4()),
        "scope_type": scope_type,
        "scope_id": scope_id,
        "payment_mode": payment_mode,
        "release_rule": release_rule,
        "requires_advance_payment": payload.get("requires_advance_payment", False),
        "advance_percent": float(payload.get("advance_percent", 0)),
        "final_percent": float(payload.get("final_percent", 0)),
        "credit_days": int(payload.get("credit_days", 0)),
        "active": True,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.payment_release_policies.insert_one(policy)
    return _clean(policy)


@router.put("/{policy_id}")
async def update_policy(policy_id: str, payload: dict, request: Request):
    db = request.app.mongodb
    existing = await db.payment_release_policies.find_one({"id": policy_id})
    if not existing:
        raise HTTPException(404, "Policy not found")

    updates = {"updated_at": _now()}
    for key in ("payment_mode", "release_rule", "requires_advance_payment", "advance_percent", "final_percent", "credit_days", "active"):
        if key in payload:
            updates[key] = payload[key]

    await db.payment_release_policies.update_one({"id": policy_id}, {"$set": updates})
    updated = await db.payment_release_policies.find_one({"id": policy_id})
    return _clean(updated)


@router.delete("/{policy_id}")
async def delete_policy(policy_id: str, request: Request):
    db = request.app.mongodb
    result = await db.payment_release_policies.delete_one({"id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Policy not found")
    return {"ok": True}


@router.post("/check-release")
async def check_vendor_release(payload: dict, request: Request):
    """
    Check if a vendor order should be released based on payment status and release rules.
    Input: { "order_id": "...", "amount_paid": 500, "total_amount": 1000 }
    """
    from services.payment_release_rule_engine import can_release_to_vendor

    db = request.app.mongodb
    order_id = payload.get("order_id")
    amount_paid = float(payload.get("amount_paid", 0))
    total_amount = float(payload.get("total_amount", 0))
    manual_release = payload.get("manual_release", False)
    credit_approved = payload.get("credit_approved", False)

    # Find applicable policy (specific > global)
    policy = None
    if order_id:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0, "type": 1, "product_group": 1})
        if order:
            order_type = order.get("type", "product")
            group = order.get("product_group")
            # Try specific scope
            if group:
                scope = "product_group" if order_type == "product" else "service_group"
                policy = await db.payment_release_policies.find_one({"scope_type": scope, "scope_id": group, "active": True})

    # Always fall back to global
    if not policy:
        policy = await db.payment_release_policies.find_one({"scope_type": "global", "active": True})

    if not policy:
        # No policy at all — default: products require full payment
        can_release = manual_release or (amount_paid >= total_amount)
        return {"can_release": can_release, "policy_applied": None, "reason": "No policy found; defaulting to full payment required."}

    policy = _clean(policy)
    can_release = can_release_to_vendor(
        payment_mode=policy.get("payment_mode", "full_upfront"),
        release_rule=policy.get("release_rule", "after_full_payment"),
        amount_paid=amount_paid,
        total_amount=total_amount,
        advance_percent=policy.get("advance_percent", 0),
        credit_approved=credit_approved,
        manual_release=manual_release,
    )
    return {
        "can_release": can_release,
        "policy_applied": {
            "id": policy.get("id"),
            "scope_type": policy.get("scope_type"),
            "payment_mode": policy.get("payment_mode"),
            "release_rule": policy.get("release_rule"),
        },
    }
