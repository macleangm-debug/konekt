"""
Vendor-facing Quote Requests (RFQ) routes.

Lets the vendor (partner) see incoming RFQs that Ops has sent to them and submit
their quote response online. All responses land in Ops review state — Ops compares
vendor base price with the Konekt pricing-engine reference before approving.
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os

from partner_access_service import get_partner_user_from_header

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/vendor/quote-requests", tags=["Vendor Quote Requests"])


async def _auto_expire(pr: dict) -> dict:
    """Mark vendor's quote as expired if quote_expiry has passed and status is still awaiting_response."""
    now = datetime.now(timezone.utc)
    changed = False
    for q in pr.get("vendor_quotes", []) or []:
        if q.get("status") == "awaiting_response":
            expiry = q.get("quote_expiry")
            # Also check default expiry based on sent_at + default_quote_expiry_hours
            if not expiry and q.get("sent_at"):
                try:
                    sent = q["sent_at"] if isinstance(q["sent_at"], datetime) else datetime.fromisoformat(str(q["sent_at"]).replace("Z", "+00:00"))
                    hours = int(pr.get("default_quote_expiry_hours") or 48)
                    expiry_dt = sent + timedelta(hours=hours)
                except Exception:
                    expiry_dt = None
            else:
                try:
                    expiry_dt = datetime.fromisoformat(str(expiry).replace("Z", "+00:00")) if expiry else None
                except Exception:
                    expiry_dt = None
            if expiry_dt and expiry_dt <= now:
                q["status"] = "expired"
                changed = True
    if changed:
        await db.price_requests.update_one({"id": pr["id"]}, {"$set": {"vendor_quotes": pr["vendor_quotes"]}})
    return pr


def _strip_ops(pr: dict, partner_id: str) -> dict:
    """Return RFQ shape suitable for the vendor — hide other vendors' prices and internal notes."""
    my_quote = None
    for q in pr.get("vendor_quotes", []) or []:
        if q.get("vendor_id") == partner_id:
            my_quote = q
            break
    return {
        "id": pr.get("id"),
        "product_or_service": pr.get("product_or_service", ""),
        "description": pr.get("description", ""),
        "category": pr.get("category", ""),
        "quantity": pr.get("quantity", 1),
        "unit_of_measurement": pr.get("unit_of_measurement", "Piece"),
        "sourcing_mode": pr.get("sourcing_mode", "preferred"),
        "status": pr.get("status", "new"),
        "notes_from_sales": pr.get("notes_from_sales", ""),
        "default_quote_expiry_hours": pr.get("default_quote_expiry_hours", 48),
        "default_lead_time_days": pr.get("default_lead_time_days", 3),
        "created_at": pr.get("created_at", ""),
        "my_quote": my_quote,  # ONLY the vendor's own quote row — never show competitors
    }


@router.get("")
async def list_vendor_rfqs(
    authorization: Optional[str] = Header(None),
    tab: str = "all",
):
    """List RFQs where this partner is among the invited vendors."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]
    docs = await db.price_requests.find(
        {"vendor_quotes.vendor_id": partner_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(500)

    result = []
    for pr in docs:
        pr = await _auto_expire(pr)
        row = _strip_ops(pr, partner_id)
        mq = row["my_quote"] or {}
        my_status = mq.get("status", "awaiting_response")
        # Tab filter
        if tab == "awaiting" and my_status != "awaiting_response":
            continue
        if tab == "quoted" and my_status != "quoted":
            continue
        if tab == "won" and my_status != "awarded":
            continue
        if tab == "expired" and my_status != "expired":
            continue
        if tab == "lost" and my_status not in ("not_selected", "rejected"):
            continue
        result.append(row)
    return {"quote_requests": result, "total": len(result)}


@router.get("/stats")
async def vendor_rfq_stats(authorization: Optional[str] = Header(None)):
    """Counts for dashboard card."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]
    docs = await db.price_requests.find(
        {"vendor_quotes.vendor_id": partner_id}, {"_id": 0, "vendor_quotes": 1}
    ).to_list(1000)
    counts = {"awaiting": 0, "quoted": 0, "won": 0, "expired": 0, "lost": 0}
    for pr in docs:
        for q in pr.get("vendor_quotes", []) or []:
            if q.get("vendor_id") != partner_id:
                continue
            s = q.get("status", "awaiting_response")
            if s == "awaiting_response":
                counts["awaiting"] += 1
            elif s == "quoted":
                counts["quoted"] += 1
            elif s == "awarded":
                counts["won"] += 1
            elif s == "expired":
                counts["expired"] += 1
            elif s in ("not_selected", "rejected"):
                counts["lost"] += 1
    return counts


@router.get("/{rfq_id}")
async def get_vendor_rfq(
    rfq_id: str,
    authorization: Optional[str] = Header(None),
):
    """Detail view of a single RFQ for the vendor."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]
    pr = await db.price_requests.find_one(
        {"id": rfq_id, "vendor_quotes.vendor_id": partner_id}, {"_id": 0}
    )
    if not pr:
        raise HTTPException(status_code=404, detail="Quote request not found")
    pr = await _auto_expire(pr)
    return _strip_ops(pr, partner_id)


@router.post("/{rfq_id}/respond")
async def respond_to_rfq(
    rfq_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
):
    """Vendor submits their quote response.
    Fields: base_price (required), lead_time (str), quote_expiry (iso), notes (str), attachments (list[str])"""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]
    partner_name = user.get("company_name") or user.get("name") or ""

    pr = await db.price_requests.find_one({"id": rfq_id, "vendor_quotes.vendor_id": partner_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Quote request not found")

    try:
        base_price = float(payload.get("base_price"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="base_price is required and must be a number")
    if base_price <= 0:
        raise HTTPException(status_code=400, detail="base_price must be greater than zero")

    now = datetime.now(timezone.utc).isoformat()
    quotes = pr.get("vendor_quotes", []) or []
    for q in quotes:
        if q.get("vendor_id") == partner_id:
            if q.get("status") == "expired":
                raise HTTPException(status_code=400, detail="This quote request has expired.")
            if q.get("status") in ("awarded", "not_selected", "rejected"):
                raise HTTPException(status_code=400, detail="This RFQ is already closed.")
            q["base_price"] = base_price
            q["lead_time"] = payload.get("lead_time", "")
            q["quote_expiry"] = payload.get("quote_expiry", "")
            q["notes"] = (payload.get("notes") or "")[:2000]
            q["attachments"] = payload.get("attachments") or []
            q["status"] = "quoted"
            q["submitted_at"] = now
            q["submitted_by"] = "vendor_portal"
            break

    # Auto-update RFQ status
    quoted_count = sum(1 for q in quotes if q.get("status") == "quoted")
    new_status = pr.get("status", "new")
    if quoted_count >= len(quotes) and quoted_count > 0:
        new_status = "response_received"
    elif quoted_count > 0:
        new_status = "partially_quoted"

    await db.price_requests.update_one({"id": rfq_id}, {"$set": {
        "vendor_quotes": quotes,
        "status": new_status,
        "updated_at": now,
    }})

    # Notify Ops / Admin
    try:
        await db.notifications.insert_one({
            "target_type": "admin",
            "target_role": "vendor_ops",
            "title": f"Quote received from {partner_name or 'vendor'}",
            "message": f"{pr.get('product_or_service', '')} — Base: {base_price:,.0f}. Ready for review.",
            "link": f"/admin/vendor-ops/price-requests?id={rfq_id}",
            "read": False,
            "created_at": now,
        })
    except Exception:
        pass

    return {"ok": True, "status": "quoted"}


@router.post("/{rfq_id}/decline")
async def decline_rfq(
    rfq_id: str,
    payload: dict = None,
    authorization: Optional[str] = Header(None),
):
    """Vendor declines to quote (e.g., out of stock, not our category)."""
    user = await get_partner_user_from_header(authorization)
    partner_id = user["partner_id"]

    pr = await db.price_requests.find_one({"id": rfq_id, "vendor_quotes.vendor_id": partner_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Quote request not found")

    now = datetime.now(timezone.utc).isoformat()
    reason = (payload or {}).get("reason", "")[:500] if payload else ""
    quotes = pr.get("vendor_quotes", []) or []
    for q in quotes:
        if q.get("vendor_id") == partner_id:
            q["status"] = "declined_by_vendor"
            q["decline_reason"] = reason
            q["submitted_at"] = now
            break

    await db.price_requests.update_one({"id": rfq_id}, {"$set": {
        "vendor_quotes": quotes,
        "updated_at": now,
    }})
    return {"ok": True, "status": "declined_by_vendor"}
