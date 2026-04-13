"""
Performance & KPI Engine — Calculates sales, affiliate, and channel KPIs.
Sales = profit-first. Affiliates = earnings-only. Group Deals = channel-level only.
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
import os
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/performance", tags=["Performance KPI"])

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def _require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "staff", "sales_manager"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _month_range(year: int, month: int):
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


async def _get_targets():
    """Get performance targets from settings hub."""
    settings = await db.admin_settings.find_one({"key": "settings_hub"})
    defaults = {
        "monthly_revenue_target": 500000000,
        "target_margin_pct": 20,
        "channel_allocation": {"sales_pct": 50, "affiliate_pct": 30, "direct_pct": 10, "group_deals_pct": 10},
        "sales_staff_count": 10,
        "affiliate_count": 10,
        "sales_min_kpi_pct": 70,
        "affiliate_min_kpi_pct": 60,
    }
    if settings:
        pt = settings.get("value", {}).get("performance_targets", {})
        for k in defaults:
            if k in pt and pt[k] is not None:
                defaults[k] = pt[k]
    return defaults


@router.get("/dashboard")
async def get_performance_dashboard(year: int = None, month: int = None, _admin=Depends(_require_admin)):
    """Main performance dashboard data — KPIs, channels, leaderboards, actions."""
    now = datetime.now(timezone.utc)
    if not year:
        year = now.year
    if not month:
        month = now.month

    start, end = _month_range(year, month)
    targets = await _get_targets()

    # ─── Channel KPIs ───
    # Query orders by sales channel for the month
    orders = await db.orders.find(
        {"created_at": {"$gte": start.isoformat(), "$lt": end.isoformat()}},
        {"_id": 0, "total_amount": 1, "total": 1, "sales_channel": 1, "sales_contribution_type": 1,
         "assigned_sales_id": 1, "assigned_sales_name": 1, "affiliate_code": 1,
         "payment_status": 1, "status": 1}
    ).to_list(5000)

    # Also check with datetime objects for orders stored as datetime
    orders_dt = await db.orders.find(
        {"created_at": {"$gte": start, "$lt": end}},
        {"_id": 0, "total_amount": 1, "total": 1, "sales_channel": 1, "sales_contribution_type": 1,
         "assigned_sales_id": 1, "assigned_sales_name": 1, "affiliate_code": 1,
         "payment_status": 1, "status": 1}
    ).to_list(5000)

    # Merge and deduplicate
    all_orders = orders + orders_dt
    seen = set()
    unique_orders = []
    for o in all_orders:
        key = f"{o.get('total_amount', o.get('total', 0))}_{o.get('sales_channel', '')}_{o.get('assigned_sales_name', '')}"
        if key not in seen:
            seen.add(key)
            unique_orders.append(o)

    # Categorize by channel
    channel_data = {"sales": [], "affiliate": [], "direct": [], "group_deal": []}
    for o in unique_orders:
        amt = float(o.get("total_amount") or o.get("total") or 0)
        ch = o.get("sales_channel", "direct") or "direct"
        if ch in ("group_deal",):
            channel_data["group_deal"].append(amt)
        elif ch in ("affiliate",) or o.get("affiliate_code"):
            channel_data["affiliate"].append(amt)
        elif ch in ("walkin", "pos", "direct", "website"):
            channel_data["direct"].append(amt)
        else:
            channel_data["sales"].append(amt)

    margin_pct = targets["target_margin_pct"] / 100
    total_revenue = sum(sum(v) for v in channel_data.values())
    total_profit = total_revenue * margin_pct
    target_revenue = targets["monthly_revenue_target"]
    target_profit = target_revenue * margin_pct
    achievement_pct = round((total_profit / target_profit * 100) if target_profit > 0 else 0, 1)

    channels = {}
    alloc = targets["channel_allocation"]
    for ch_key, ch_label in [("sales", "Sales"), ("affiliate", "Affiliate"), ("direct", "Direct"), ("group_deal", "Group Deals")]:
        ch_rev = sum(channel_data[ch_key])
        ch_profit = ch_rev * margin_pct
        alloc_pct = alloc.get(f"{ch_key}_pct", alloc.get(f"{ch_key}s_pct", 10))
        ch_target = target_revenue * (alloc_pct / 100)
        ch_achievement = round((ch_rev / ch_target * 100) if ch_target > 0 else 0, 1)
        channels[ch_key] = {
            "label": ch_label,
            "revenue": ch_rev,
            "profit": ch_profit,
            "target": ch_target,
            "achievement_pct": ch_achievement,
            "contribution_pct": round((ch_rev / total_revenue * 100) if total_revenue > 0 else 0, 1),
            "deal_count": len(channel_data[ch_key]),
        }

    # ─── Sales Leaderboard (profit-first) ───
    sales_users = await db.users.find(
        {"role": {"$in": ["staff", "sales", "sales_manager"]}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
    ).to_list(100)

    sales_target_per_person = (target_revenue * (alloc.get("sales_pct", 50) / 100)) / max(targets["sales_staff_count"], 1)
    sales_leaderboard = []
    for su in sales_users:
        user_orders = [o for o in unique_orders if o.get("assigned_sales_id") == su.get("id") or o.get("assigned_sales_name") == su.get("name")]
        user_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in user_orders)
        user_profit = user_revenue * margin_pct
        user_pct = round((user_profit / (sales_target_per_person * margin_pct) * 100) if sales_target_per_person > 0 else 0, 1)
        status = "top" if user_pct >= 100 else "warning" if user_pct >= targets["sales_min_kpi_pct"] else "underperform"
        sales_leaderboard.append({
            "id": su.get("id", ""),
            "name": su.get("name", su.get("email", "")),
            "profit": user_profit,
            "revenue": user_revenue,
            "deals": len(user_orders),
            "target_profit": sales_target_per_person * margin_pct,
            "achievement_pct": user_pct,
            "status": status,
        })
    sales_leaderboard.sort(key=lambda x: -x["achievement_pct"])

    # ─── Affiliate Leaderboard (earnings-only) ───
    affiliates = await db.users.find(
        {"role": "affiliate"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "affiliate_code": 1}
    ).to_list(100)

    aff_target_per_person = (target_revenue * (alloc.get("affiliate_pct", 30) / 100)) / max(targets["affiliate_count"], 1)
    affiliate_leaderboard = []
    for af in affiliates:
        aff_code = af.get("affiliate_code", "")
        aff_orders = [o for o in unique_orders if o.get("affiliate_code") == aff_code]
        aff_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in aff_orders)
        # Affiliates see earnings (commission), not revenue — calculate from distributable margin
        aff_earnings = aff_revenue * margin_pct * 0.25  # ~25% of distributable margin as affiliate commission
        aff_pct = round((aff_revenue / aff_target_per_person * 100) if aff_target_per_person > 0 else 0, 1)
        status = "top" if aff_pct >= 100 else "warning" if aff_pct >= targets["affiliate_min_kpi_pct"] else "underperform"
        affiliate_leaderboard.append({
            "id": af.get("id", ""),
            "name": af.get("name", af.get("email", "")),
            "earnings": aff_earnings,
            "deals": len(aff_orders),
            "conversions": len(aff_orders),
            "achievement_pct": aff_pct,
            "status": status,
        })
    affiliate_leaderboard.sort(key=lambda x: -x["achievement_pct"])

    # ─── Action Panel (recommendations) ───
    actions = []
    underperforming_sales = [s for s in sales_leaderboard if s["status"] == "underperform"]
    if underperforming_sales:
        actions.append({
            "type": "warning",
            "message": f"{len(underperforming_sales)} sales staff below {targets['sales_min_kpi_pct']}% KPI threshold",
            "names": [s["name"] for s in underperforming_sales[:3]],
        })

    underperforming_affs = [a for a in affiliate_leaderboard if a["status"] == "underperform"]
    if underperforming_affs:
        actions.append({
            "type": "warning",
            "message": f"{len(underperforming_affs)} affiliates below {targets['affiliate_min_kpi_pct']}% KPI threshold",
            "names": [a["name"] for a in underperforming_affs[:3]],
        })

    # Staffing recommendation
    if total_revenue > 0 and len(sales_leaderboard) > 0:
        avg_profit_per_sales = total_profit / max(len(sales_leaderboard), 1)
        if avg_profit_per_sales > 0:
            needed = max(0, round((target_profit - total_profit) / avg_profit_per_sales))
            if needed > 0:
                actions.append({
                    "type": "insight",
                    "message": f"You need +{needed} more sales staff at current averages to hit target",
                })

    for ch_key, ch_info in channels.items():
        if ch_info["achievement_pct"] < 80 and ch_info["target"] > 0:
            gap_pct = round(100 - ch_info["achievement_pct"], 1)
            actions.append({
                "type": "insight",
                "message": f"{ch_info['label']} channel is below target by {gap_pct}%",
            })

    return {
        "period": {"year": year, "month": month},
        "kpi_strip": {
            "total_profit": total_profit,
            "target_profit": target_profit,
            "achievement_pct": achievement_pct,
            "total_revenue": total_revenue,
            "target_revenue": target_revenue,
            "active_sales": len(sales_leaderboard),
            "active_affiliates": len(affiliate_leaderboard),
        },
        "channels": channels,
        "sales_leaderboard": sales_leaderboard,
        "affiliate_leaderboard": affiliate_leaderboard,
        "actions": actions,
        "targets": targets,
    }
