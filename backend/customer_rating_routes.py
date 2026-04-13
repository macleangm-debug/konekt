"""
Customer Rating System — Closed feedback loop with anti-manipulation.
Ratings triggered after order completion. Token-based access. Staff cannot self-rate.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from bson import ObjectId
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/ratings", tags=["Customer Ratings"])

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

COMPLETION_STATES = {"completed", "completed_signed", "completed_confirmed", "closed", "delivered"}
RATING_DELAY_MINUTES = 30


def _safe_id(doc):
    if not doc:
        return None
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            d[k] = str(v)
    return d


# ─── TOKEN GENERATION (called when order completes) ───

async def generate_rating_token(order_id: str, order_number: str, customer_phone: str, staff_id: str = ""):
    """Generate a unique rating token for a completed order."""
    existing = await db.rating_tokens.find_one({"order_id": order_id})
    if existing:
        return existing.get("token", "")

    token = uuid4().hex[:16].upper()
    now = datetime.now(timezone.utc)
    await db.rating_tokens.insert_one({
        "token": token,
        "order_id": order_id,
        "order_number": order_number,
        "customer_phone": customer_phone,
        "staff_id": staff_id,
        "created_at": now,
        "expires_at": now + timedelta(days=14),
        "rating_available_at": now + timedelta(minutes=RATING_DELAY_MINUTES),
        "used": False,
    })
    return token


# ─── PUBLIC RATING ENDPOINTS ───

@router.get("/check")
async def check_rating_eligibility(token: str = "", order_number: str = "", phone: str = ""):
    """Check if a rating can be submitted — returns order info + eligibility."""
    now = datetime.now(timezone.utc)

    if token:
        token_doc = await db.rating_tokens.find_one({"token": token, "used": False})
        if not token_doc:
            raise HTTPException(status_code=404, detail="Invalid or expired rating link.")
        if token_doc.get("expires_at") and now > token_doc["expires_at"]:
            raise HTTPException(status_code=400, detail="Rating link has expired.")
        available_at = token_doc.get("rating_available_at", now)
        if now < available_at:
            mins_left = max(1, int((available_at - now).total_seconds() / 60))
            return {"eligible": False, "reason": f"Rating available in {mins_left} minutes.", "order_number": token_doc.get("order_number", "")}
        # Get order info
        order = await db.orders.find_one({"order_number": token_doc["order_number"]}, {"_id": 0, "order_number": 1, "customer_name": 1, "status": 1, "assigned_sales_name": 1, "line_items": 1, "total_amount": 1, "total": 1, "sales_channel": 1})
        return {"eligible": True, "token": token, "order": order or {}, "order_number": token_doc.get("order_number", "")}

    elif order_number and phone:
        # Verify phone matches order
        order = await db.orders.find_one(
            {"order_number": order_number},
            {"_id": 0, "order_number": 1, "customer_name": 1, "customer_phone": 1, "status": 1, "assigned_sales_name": 1, "total_amount": 1, "total": 1, "sales_channel": 1}
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")
        if order.get("customer_phone", "") != phone:
            raise HTTPException(status_code=403, detail="Phone number does not match this order.")
        status = (order.get("status") or "").lower()
        if status not in COMPLETION_STATES:
            return {"eligible": False, "reason": "Order is not yet completed.", "order_number": order_number}
        # Check if already rated
        existing_rating = await db.customer_ratings.find_one({"order_number": order_number})
        if existing_rating:
            return {"eligible": False, "reason": "This order has already been rated.", "order_number": order_number}
        return {"eligible": True, "order": order, "order_number": order_number}

    raise HTTPException(status_code=400, detail="Provide a rating token or order number + phone.")


@router.post("/submit")
async def submit_rating(payload: dict):
    """Submit a customer rating for a completed order."""
    token = payload.get("token", "")
    order_number = payload.get("order_number", "")
    phone = payload.get("phone", "")
    rating = int(payload.get("rating", 0))
    comment = payload.get("comment", "").strip()[:500]

    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")

    now = datetime.now(timezone.utc)

    # Resolve order
    if token:
        token_doc = await db.rating_tokens.find_one({"token": token, "used": False})
        if not token_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired rating token.")
        if token_doc.get("expires_at") and now > token_doc["expires_at"]:
            raise HTTPException(status_code=400, detail="Rating link has expired.")
        available_at = token_doc.get("rating_available_at", now)
        if now < available_at:
            raise HTTPException(status_code=400, detail="Rating not yet available. Please wait.")
        order_number = token_doc["order_number"]
        phone = token_doc.get("customer_phone", "")
    elif order_number and phone:
        order = await db.orders.find_one({"order_number": order_number})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")
        if order.get("customer_phone", "") != phone:
            raise HTTPException(status_code=403, detail="Phone does not match.")
    else:
        raise HTTPException(status_code=400, detail="Provide token or order_number + phone.")

    # Check not already rated (one rating per order)
    existing = await db.customer_ratings.find_one({"order_number": order_number})
    if existing:
        raise HTTPException(status_code=400, detail="This order has already been rated.")

    # Get order details for the rating record
    order = await db.orders.find_one({"order_number": order_number})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    order_type = "product"
    if order.get("sales_channel") == "group_deal":
        order_type = "group_deal"
    elif any("service" in str(li.get("name", "")).lower() for li in (order.get("line_items") or [])):
        order_type = "service"

    rating_doc = {
        "order_number": order_number,
        "order_id": str(order.get("_id", "")),
        "customer_name": order.get("customer_name", ""),
        "customer_phone": phone or order.get("customer_phone", ""),
        "staff_id": order.get("assigned_sales_id", ""),
        "staff_name": order.get("assigned_sales_name", ""),
        "rating": rating,
        "comment": comment,
        "order_type": order_type,
        "created_at": now,
    }
    await db.customer_ratings.insert_one(rating_doc)

    # Mark token as used
    if token:
        await db.rating_tokens.update_one({"token": token}, {"$set": {"used": True, "used_at": now}})

    return {"status": "submitted", "rating": rating, "order_number": order_number}


# ─── ADMIN ENDPOINTS ───

admin_router = APIRouter(prefix="/api/admin/ratings", tags=["Admin Ratings"])


@admin_router.get("/summary")
async def ratings_summary():
    """Admin: summary of ratings and follow-up queue."""
    total = await db.customer_ratings.count_documents({})
    pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}]
    agg = await db.customer_ratings.aggregate(pipeline).to_list(1)
    avg_rating = round(agg[0]["avg"], 1) if agg else 0

    # Low ratings
    low_count = await db.customer_ratings.count_documents({"rating": {"$lte": 2}})

    return {
        "total_ratings": total,
        "average_rating": avg_rating,
        "low_rating_count": low_count,
    }


@admin_router.get("/unrated-orders")
async def unrated_completed_orders():
    """Admin: list completed orders that have NOT been rated yet."""
    completed_orders = await db.orders.find(
        {"status": {"$in": list(COMPLETION_STATES)}},
        {"_id": 0, "order_number": 1, "customer_name": 1, "customer_phone": 1,
         "status": 1, "assigned_sales_name": 1, "sales_channel": 1,
         "created_at": 1, "completed_at": 1, "updated_at": 1}
    ).sort("updated_at", -1).to_list(200)

    # Filter out those already rated
    rated_numbers = set()
    rated_docs = await db.customer_ratings.find({}, {"_id": 0, "order_number": 1}).to_list(5000)
    for r in rated_docs:
        rated_numbers.add(r.get("order_number", ""))

    unrated = []
    now = datetime.now(timezone.utc)
    for o in completed_orders:
        if o.get("order_number") in rated_numbers:
            continue
        completed_at = o.get("completed_at") or o.get("updated_at") or o.get("created_at")
        if isinstance(completed_at, str):
            try:
                completed_at = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                completed_at = now
        if completed_at and completed_at.tzinfo is None:
            completed_at = completed_at.replace(tzinfo=timezone.utc)
        days_since = max(0, (now - (completed_at or now)).days) if completed_at else 0

        # Check follow-up status
        followup = await db.rating_followups.find_one({"order_number": o["order_number"]}, {"_id": 0})

        unrated.append({
            "order_number": o["order_number"],
            "customer_name": o.get("customer_name", ""),
            "customer_phone": o.get("customer_phone", ""),
            "sales_officer": o.get("assigned_sales_name", ""),
            "order_type": o.get("sales_channel", "direct"),
            "completed_at": str(completed_at or ""),
            "days_since": days_since,
            "followup_status": followup.get("status", "pending") if followup else "pending",
        })

    # Sort by days_since descending (oldest unrated first)
    unrated.sort(key=lambda x: -x["days_since"])
    return unrated


@admin_router.post("/followup/{order_number}")
async def update_followup(order_number: str, payload: dict):
    """Admin: update follow-up status for an unrated order."""
    status = payload.get("status", "contacted")
    notes = payload.get("notes", "")
    now = datetime.now(timezone.utc)

    await db.rating_followups.update_one(
        {"order_number": order_number},
        {"$set": {"order_number": order_number, "status": status, "notes": notes, "updated_at": now}},
        upsert=True,
    )
    return {"status": "updated", "order_number": order_number}


@admin_router.get("/all")
async def all_ratings(limit: int = 50):
    """Admin: list all ratings."""
    docs = await db.customer_ratings.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for d in docs:
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
    return docs
