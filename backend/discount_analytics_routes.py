"""
Discount Analytics API — Aggregated metrics, charts, and risk analysis.
Uses existing orders/quotes/discount data. NO duplicated margin logic.
"""
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

router = APIRouter(prefix="/api/admin/discount-analytics", tags=["Discount Analytics"])

security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def _require_admin(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        db = request.app.mongodb
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "staff"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _safe_float(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


async def _get_margin_settings(db):
    """Read margin thresholds from Settings Hub — single source of truth."""
    row = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    hub = row.get("value", {}) if row else {}
    commercial = hub.get("commercial", {})
    return {
        "min_margin_percent": _safe_float(commercial.get("minimum_company_margin_percent"), 20),
        "distribution_percent": _safe_float(commercial.get("distribution_layer_percent"), 10),
        "vat_percent": _safe_float(commercial.get("vat_percent"), 18),
    }


def _classify_risk(remaining_margin_pct, min_margin_pct):
    """Safe / Warning / Critical — identical to pricing logic thresholds."""
    if remaining_margin_pct >= min_margin_pct * 1.2:
        return "safe"
    elif remaining_margin_pct >= min_margin_pct:
        return "warning"
    else:
        return "critical"


@router.get("/kpis")
async def discount_kpis(
    request: Request,
    _admin=Depends(_require_admin),
    days: int = Query(30, ge=1, le=365),
):
    """Top-level KPI cards for discount analytics."""
    db = request.app.mongodb
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_str = cutoff.isoformat()

    # Fetch orders within the date range
    orders = await db.orders.find(
        {"created_at": {"$gte": cutoff_str}},
        {"_id": 0, "total": 1, "discount_amount": 1, "discount_percent": 1, "subtotal": 1}
    ).to_list(10000)

    total_orders = len(orders)
    total_discount = sum(_safe_float(o.get("discount_amount")) for o in orders)
    discounted_orders = [o for o in orders if _safe_float(o.get("discount_amount")) > 0]
    discounted_count = len(discounted_orders)

    avg_discount_pct = 0
    if discounted_orders:
        pcts = [_safe_float(o.get("discount_percent")) for o in discounted_orders if _safe_float(o.get("discount_percent")) > 0]
        avg_discount_pct = round(sum(pcts) / max(len(pcts), 1), 2)

    total_revenue = sum(_safe_float(o.get("total")) for o in orders)
    revenue_before_discount = total_revenue + total_discount

    # Discount requests
    requests = await db.discount_requests.find(
        {"created_at": {"$gte": cutoff_str}},
        {"_id": 0, "status": 1}
    ).to_list(10000)
    approved = sum(1 for r in requests if r.get("status") == "approved")
    rejected = sum(1 for r in requests if r.get("status") == "rejected")
    approval_rate = round(approved / max(approved + rejected, 1) * 100, 1)

    # Margin impact estimate
    settings = await _get_margin_settings(db)
    margin_impact = round(total_discount * (settings["min_margin_percent"] / 100), 2) if total_discount else 0

    return {
        "total_discounts_given": round(total_discount, 2),
        "average_discount_percent": avg_discount_pct,
        "discounted_orders_count": discounted_count,
        "discounted_orders_percent": round(discounted_count / max(total_orders, 1) * 100, 1),
        "total_orders": total_orders,
        "revenue_after_discounts": round(total_revenue, 2),
        "revenue_before_discounts": round(revenue_before_discount, 2),
        "margin_impact": margin_impact,
        "approval_rate": approval_rate,
        "approved_requests": approved,
        "rejected_requests": rejected,
        "total_requests": len(requests),
        "period_days": days,
    }


@router.get("/trend")
async def discount_trend(
    request: Request,
    _admin=Depends(_require_admin),
    days: int = Query(30, ge=1, le=365),
):
    """Daily discount trend for line chart."""
    db = request.app.mongodb
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_str = cutoff.isoformat()

    orders = await db.orders.find(
        {"created_at": {"$gte": cutoff_str}},
        {"_id": 0, "created_at": 1, "discount_amount": 1, "total": 1}
    ).to_list(10000)

    daily = {}
    for o in orders:
        dt_str = (o.get("created_at") or "")[:10]
        if not dt_str:
            continue
        if dt_str not in daily:
            daily[dt_str] = {"date": dt_str, "discount": 0, "revenue": 0, "count": 0}
        daily[dt_str]["discount"] += _safe_float(o.get("discount_amount"))
        daily[dt_str]["revenue"] += _safe_float(o.get("total"))
        daily[dt_str]["count"] += 1

    return sorted(daily.values(), key=lambda x: x["date"])


@router.get("/top-products")
async def top_discounted_products(
    request: Request,
    _admin=Depends(_require_admin),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
):
    """Top products by total discount given."""
    db = request.app.mongodb
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_str = cutoff.isoformat()

    orders = await db.orders.find(
        {"created_at": {"$gte": cutoff_str}, "discount_amount": {"$gt": 0}},
        {"_id": 0, "items": 1, "discount_amount": 1, "discount_percent": 1}
    ).to_list(10000)

    product_map = {}
    for o in orders:
        items = o.get("items") or []
        disc = _safe_float(o.get("discount_amount"))
        pct = _safe_float(o.get("discount_percent"))
        for item in items:
            name = item.get("name") or item.get("product_name") or "Unknown"
            if name not in product_map:
                product_map[name] = {"name": name, "total_discount": 0, "order_count": 0}
            share = disc / max(len(items), 1)
            product_map[name]["total_discount"] += share
            product_map[name]["order_count"] += 1

    result = sorted(product_map.values(), key=lambda x: x["total_discount"], reverse=True)[:limit]
    return result


@router.get("/sales-behavior")
async def sales_discount_behavior(
    request: Request,
    _admin=Depends(_require_admin),
    days: int = Query(30, ge=1, le=365),
):
    """Discount behavior per sales person."""
    db = request.app.mongodb
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_str = cutoff.isoformat()

    requests_list = await db.discount_requests.find(
        {"created_at": {"$gte": cutoff_str}},
        {"_id": 0, "sales_id": 1, "sales_name": 1, "status": 1, "requested_discount": 1, "approved_discount": 1}
    ).to_list(10000)

    sales_map = {}
    for r in requests_list:
        sid = r.get("sales_id") or r.get("sales_name") or "Unknown"
        name = r.get("sales_name") or sid
        if sid not in sales_map:
            sales_map[sid] = {"sales_id": sid, "sales_name": name, "total_requests": 0, "approved": 0, "rejected": 0, "total_requested": 0, "total_approved": 0}
        sales_map[sid]["total_requests"] += 1
        sales_map[sid]["total_requested"] += _safe_float(r.get("requested_discount"))
        if r.get("status") == "approved":
            sales_map[sid]["approved"] += 1
            sales_map[sid]["total_approved"] += _safe_float(r.get("approved_discount"))
        elif r.get("status") == "rejected":
            sales_map[sid]["rejected"] += 1

    for v in sales_map.values():
        v["approval_rate"] = round(v["approved"] / max(v["total_requests"], 1) * 100, 1)

    return sorted(sales_map.values(), key=lambda x: x["total_requests"], reverse=True)


@router.get("/high-risk")
async def high_risk_discounts(
    request: Request,
    _admin=Depends(_require_admin),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
):
    """Orders where discounts significantly reduced margin."""
    db = request.app.mongodb
    settings = await _get_margin_settings(db)
    min_margin = settings["min_margin_percent"]
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_str = cutoff.isoformat()

    orders = await db.orders.find(
        {"created_at": {"$gte": cutoff_str}, "discount_amount": {"$gt": 0}},
        {"_id": 0, "order_number": 1, "customer_name": 1, "assigned_sales_name": 1,
         "total": 1, "subtotal": 1, "discount_amount": 1, "discount_percent": 1,
         "items": 1, "created_at": 1}
    ).to_list(10000)

    risky = []
    for o in orders:
        disc_amt = _safe_float(o.get("discount_amount"))
        subtotal = _safe_float(o.get("subtotal")) or _safe_float(o.get("total")) + disc_amt
        if subtotal <= 0:
            continue

        disc_pct = (disc_amt / subtotal) * 100
        # Estimate remaining margin after discount
        remaining_margin_pct = max(min_margin - disc_pct, 0)
        risk = _classify_risk(remaining_margin_pct + min_margin, min_margin)

        risky.append({
            "order_number": o.get("order_number", "—"),
            "customer_name": o.get("customer_name", "—"),
            "sales_name": o.get("assigned_sales_name", "—"),
            "discount_applied": round(disc_amt, 2),
            "discount_percent": round(disc_pct, 1),
            "total_after_discount": round(_safe_float(o.get("total")), 2),
            "margin_remaining_pct": round(remaining_margin_pct + min_margin, 1),
            "risk_level": risk,
            "created_at": o.get("created_at", ""),
        })

    # Sort critical first, then warning, then safe
    risk_order = {"critical": 0, "warning": 1, "safe": 2}
    risky.sort(key=lambda x: (risk_order.get(x["risk_level"], 3), -x["discount_applied"]))
    return risky[:limit]


@router.get("/requests")
async def discount_requests_list(
    request: Request,
    _admin=Depends(_require_admin),
    days: int = Query(30, ge=1, le=365),
    status: str = Query(None),
):
    """Discount requests table."""
    db = request.app.mongodb
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = {"created_at": {"$gte": cutoff.isoformat()}}
    if status:
        query["status"] = status

    requests_list = await db.discount_requests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)

    return requests_list
