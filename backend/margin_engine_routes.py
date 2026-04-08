"""
Margin Engine Routes
CRUD for margin rules: individual product > product group > global default.
Supports: percentage, fixed_amount, tiered.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional

router = APIRouter(prefix="/api/admin/margin-rules", tags=["Margin Engine"])


def _now():
    return datetime.now(timezone.utc).isoformat()


def _clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_margin_rules(
    request: Request,
    scope: Optional[str] = Query(None, description="Filter by scope: product, group, global"),
):
    """List all margin rules, optionally filtered by scope."""
    db = request.app.mongodb
    query = {}
    if scope:
        query["scope"] = scope
    rows = await db.margin_rules.find(query).sort("created_at", -1).to_list(500)
    return [_clean(r) for r in rows]


@router.post("")
async def create_margin_rule(payload: dict, request: Request):
    """
    Create a margin rule.
    Required: scope (product|group|global), method (percentage|fixed_amount|tiered)
    For scope=product: target_id = product_id
    For scope=group: target_id = group_id
    For scope=global: target_id = null
    """
    db = request.app.mongodb
    scope = payload.get("scope")
    method = payload.get("method")

    if scope not in ("product", "group", "global"):
        raise HTTPException(400, "scope must be: product, group, or global")
    if method not in ("percentage", "fixed_amount", "tiered"):
        raise HTTPException(400, "method must be: percentage, fixed_amount, or tiered")

    if scope in ("product", "group") and not payload.get("target_id"):
        raise HTTPException(400, f"target_id is required for scope={scope}")

    # For global, ensure only one exists
    if scope == "global":
        existing = await db.margin_rules.find_one({"scope": "global"})
        if existing:
            raise HTTPException(409, "Global margin rule already exists. Update it instead.")

    # For product/group, ensure uniqueness
    if scope in ("product", "group"):
        existing = await db.margin_rules.find_one({"scope": scope, "target_id": payload.get("target_id")})
        if existing:
            raise HTTPException(409, f"Margin rule for this {scope} already exists. Update it instead.")

    rule = {
        "id": str(uuid4()),
        "scope": scope,
        "target_id": payload.get("target_id"),
        "target_name": payload.get("target_name", ""),
        "method": method,
        "value": payload.get("value", 0),
        "tiers": payload.get("tiers", []),
        "distributable_margin_pct": payload.get("distributable_margin_pct"),
        "active": True,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.margin_rules.insert_one(rule)
    return _clean(rule)


@router.put("/{rule_id}")
async def update_margin_rule(rule_id: str, payload: dict, request: Request):
    """Update an existing margin rule."""
    db = request.app.mongodb
    existing = await db.margin_rules.find_one({"id": rule_id})
    if not existing:
        raise HTTPException(404, "Margin rule not found")

    updates = {"updated_at": _now()}
    for key in ("method", "value", "tiers", "target_name", "active", "distributable_margin_pct"):
        if key in payload:
            updates[key] = payload[key]

    if "method" in updates and updates["method"] not in ("percentage", "fixed_amount", "tiered"):
        raise HTTPException(400, "method must be: percentage, fixed_amount, or tiered")

    await db.margin_rules.update_one({"id": rule_id}, {"$set": updates})
    updated = await db.margin_rules.find_one({"id": rule_id})
    return _clean(updated)


@router.delete("/{rule_id}")
async def delete_margin_rule(rule_id: str, request: Request):
    """Delete a margin rule."""
    db = request.app.mongodb
    result = await db.margin_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Margin rule not found")
    return {"ok": True}


@router.post("/calculate")
async def calculate_price(payload: dict, request: Request):
    """
    Calculate selling price for a product using the margin engine.
    Priority: individual product rule > product group rule > global default.
    Input: { "product_id": "...", "group_id": "...", "base_cost": 1000 }
    """
    from services.margin_calculator import calculate_selling_price

    db = request.app.mongodb
    product_id = payload.get("product_id")
    group_id = payload.get("group_id")
    base_cost = float(payload.get("base_cost", 0))

    if base_cost <= 0:
        raise HTTPException(400, "base_cost must be greater than 0")

    # Priority 1: Individual product rule
    rule = None
    if product_id:
        rule_doc = await db.margin_rules.find_one({"scope": "product", "target_id": product_id, "active": True})
        if rule_doc:
            rule = _clean(rule_doc)

    # Priority 2: Product group rule
    if not rule and group_id:
        rule_doc = await db.margin_rules.find_one({"scope": "group", "target_id": group_id, "active": True})
        if rule_doc:
            rule = _clean(rule_doc)

    # Priority 3: Global default
    if not rule:
        rule_doc = await db.margin_rules.find_one({"scope": "global", "active": True})
        if rule_doc:
            rule = _clean(rule_doc)

    selling_price = calculate_selling_price(base_cost, rule)
    margin = round(selling_price - base_cost, 2)

    return {
        "base_cost": base_cost,
        "selling_price": selling_price,
        "margin": margin,
        "rule_applied": {
            "id": rule.get("id") if rule else None,
            "scope": rule.get("scope") if rule else None,
            "method": rule.get("method") if rule else None,
        } if rule else None,
    }


@router.post("/resolve-distribution")
async def resolve_distribution(payload: dict, request: Request):
    """
    Resolve full pricing with distribution layer for a product/service.
    Combines margin engine (rule hierarchy) + distribution settings (splits).
    Input: { "product_id": "...", "group_id": "...", "vendor_price": 10000 }
    """
    from services.margin_engine import resolve_margin_rule, get_split_settings, resolve_pricing

    db = request.app.mongodb
    product_id = payload.get("product_id")
    group_id = payload.get("group_id")
    service_id = payload.get("service_id")
    service_group_id = payload.get("service_group_id")
    vendor_price = float(payload.get("vendor_price", 0))

    if vendor_price <= 0:
        raise HTTPException(400, "vendor_price must be greater than 0")

    rule = await resolve_margin_rule(db, product_id=product_id, group_id=group_id,
                                      service_id=service_id, service_group_id=service_group_id)
    split = await get_split_settings(db)
    pricing = resolve_pricing(vendor_price, rule, split)
    return {"ok": True, "pricing": pricing}
