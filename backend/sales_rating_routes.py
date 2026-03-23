from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/sales-ratings", tags=["Sales Ratings"])

@router.get("/pending-for-customer")
async def pending_ratings_for_customer(request: Request, customer_id: str):
    """Get pending rating tasks for a customer - completed orders not yet rated"""
    db = request.app.mongodb
    orders = await db.orders.find({
        "customer_id": customer_id,
        "status": {"$in": ["completed", "delivered"]},
        "sales_owner_id": {"$exists": True, "$ne": None},
    }).sort("updated_at", -1).to_list(length=100)

    rated_order_ids = set()
    existing = await db.sales_ratings.find({"customer_id": customer_id}).to_list(length=500)
    for row in existing:
        rated_order_ids.add(row.get("order_id"))

    pending = []
    for order in orders:
        oid = order.get("id") or str(order.get("_id"))
        if oid in rated_order_ids:
            continue
        pending.append({
            "order_id": oid,
            "order_number": order.get("order_number", ""),
            "order_title": order.get("title") or order.get("name") or "Completed Order",
            "sales_owner_id": order.get("sales_owner_id"),
            "sales_owner_name": order.get("sales_owner_name", "Sales Advisor"),
            "completed_at": str(order.get("updated_at", "")),
        })

    return pending

@router.post("/submit")
async def submit_sales_rating(payload: dict, request: Request):
    """Submit a rating for a sales advisor"""
    db = request.app.mongodb

    customer_id = payload.get("customer_id")
    order_id = payload.get("order_id")
    sales_owner_id = payload.get("sales_owner_id")
    stars = int(payload.get("stars", 0) or 0)
    feedback = (payload.get("feedback") or "").strip()

    if not customer_id or not order_id or not sales_owner_id:
        raise HTTPException(status_code=400, detail="Missing customer_id, order_id, or sales_owner_id")
    if stars < 1 or stars > 5:
        raise HTTPException(status_code=400, detail="Stars must be between 1 and 5")

    existing = await db.sales_ratings.find_one({"customer_id": customer_id, "order_id": order_id})
    if existing:
        raise HTTPException(status_code=409, detail="Rating already submitted for this order")

    row = {
        "customer_id": customer_id,
        "order_id": order_id,
        "sales_owner_id": sales_owner_id,
        "sales_owner_name": payload.get("sales_owner_name", "Sales Advisor"),
        "stars": stars,
        "feedback": feedback,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sales_ratings.insert_one(row)

    # Update order to mark rating submitted
    order = await db.orders.find_one({"id": order_id})
    if not order:
        order = await db.orders.find_one({"_id": order_id})
    if order:
        await db.orders.update_one(
            {"_id": order["_id"]},
            {"$set": {"sales_rating_submitted": True, "sales_rating_stars": stars}}
        )

    return {"ok": True}

@router.get("/summary")
async def sales_rating_summary(request: Request, sales_owner_id: str):
    """Get rating summary for a specific sales advisor"""
    db = request.app.mongodb
    rows = await db.sales_ratings.find({"sales_owner_id": sales_owner_id}).to_list(length=5000)

    total = len(rows)
    avg = round(sum(float(r.get("stars", 0) or 0) for r in rows) / total, 2) if total else 0
    five_star = len([r for r in rows if int(r.get("stars", 0) or 0) == 5])
    recent_feedback = [
        {
            "stars": r.get("stars", 0),
            "feedback": r.get("feedback", ""),
            "created_at": str(r.get("created_at", "")),
        }
        for r in sorted(rows, key=lambda x: str(x.get("created_at", "")), reverse=True)[:5]
    ]

    return {
        "sales_owner_id": sales_owner_id,
        "ratings_count": total,
        "average_rating": avg,
        "five_star_count": five_star,
        "recent_feedback": recent_feedback,
    }

@router.get("/leaderboard")
async def sales_rating_leaderboard(request: Request):
    """Get leaderboard of top-rated sales advisors"""
    db = request.app.mongodb
    rows = await db.sales_ratings.find({}).to_list(length=10000)

    grouped = {}
    for r in rows:
        sid = r.get("sales_owner_id")
        if not sid:
            continue
        if sid not in grouped:
            grouped[sid] = {
                "sales_owner_id": sid,
                "sales_owner_name": r.get("sales_owner_name", "Sales Advisor"),
                "ratings_count": 0,
                "stars_total": 0.0,
            }
        grouped[sid]["ratings_count"] += 1
        grouped[sid]["stars_total"] += float(r.get("stars", 0) or 0)

    out = []
    for _, row in grouped.items():
        avg = round(row["stars_total"] / row["ratings_count"], 2) if row["ratings_count"] else 0
        out.append({
            "sales_owner_id": row["sales_owner_id"],
            "sales_owner_name": row["sales_owner_name"],
            "ratings_count": row["ratings_count"],
            "average_rating": avg,
        })

    out.sort(key=lambda x: (x["average_rating"], x["ratings_count"]), reverse=True)
    return out
