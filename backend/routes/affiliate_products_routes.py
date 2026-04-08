"""
Affiliate Products + Promotions API
Returns resolved pricing per product for the affiliate dashboard.
Shows per-product affiliate earnings, customer discount, promo code, share link.
Uses the canonical margin engine (single source of truth).
"""
from fastapi import APIRouter, Request, HTTPException
from services.margin_engine import resolve_margin_rule_for_price, get_split_settings, resolve_pricing

router = APIRouter(prefix="/api/affiliate", tags=["affiliate-products"])


def _money(v):
    return round(float(v or 0), 2)


@router.get("/product-promotions")
async def get_affiliate_product_promotions(request: Request):
    """
    Returns all active products with resolved affiliate earnings + customer discount.
    Uses canonical pricing engine — no separate calculation.
    """
    db = request.app.mongodb

    # Get affiliate info from token
    affiliate_code = "KONEKT"
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        import jwt
        try:
            token = auth.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("user_id") or payload.get("sub")
            if user_id:
                user = await db.users.find_one({"id": user_id}, {"_id": 0})
                if user:
                    aff = await db.affiliates.find_one({"email": user.get("email")}, {"_id": 0})
                    if aff:
                        affiliate_code = aff.get("promo_code") or affiliate_code
        except Exception:
            pass

    # Get active products
    products = await db.products.find(
        {"status": {"$in": ["active", "approved", None]}},
        {"_id": 0}
    ).to_list(200)

    split = await get_split_settings(db)
    result = []

    for p in products:
        vendor_price = float(p.get("vendor_price") or p.get("base_cost") or p.get("base_price") or 0)
        if vendor_price <= 0:
            continue

        product_id = p.get("id") or p.get("product_id")
        group_id = p.get("group_id") or p.get("category_id")

        rule = await resolve_margin_rule_for_price(db, vendor_price, product_id=product_id, group_id=group_id)
        pricing = resolve_pricing(vendor_price, rule, split)

        result.append({
            "id": product_id,
            "product_name": p.get("name") or p.get("title") or "Unnamed Product",
            "category_name": p.get("group_name") or p.get("category_name") or p.get("category") or "",
            "image_url": p.get("image_url") or p.get("primary_image") or "",
            "final_price": pricing["final_price"],
            "affiliate_amount": pricing["affiliate_amount"],
            "affiliate_pct": pricing["affiliate_share_pct"],
            "discount_amount": pricing["discount_amount"],
            "discount_pct": pricing["discount_share_pct"],
            "sales_amount": pricing["sales_amount"],
            "promo_code": affiliate_code,
            "share_link": f"/marketplace/{product_id}?ref={affiliate_code}",
            "rule_scope": pricing["rule_scope"],
        })

    return {"ok": True, "products": result, "promo_code": affiliate_code}


@router.get("/earnings-summary")
async def get_affiliate_earnings_summary(request: Request):
    """
    Returns affiliate earnings: per-order commissions with status.
    Reads from canonical commissions collection.
    """
    db = request.app.mongodb

    user_email = None
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        import jwt
        try:
            token = auth.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("user_id") or payload.get("sub")
            if user_id:
                user = await db.users.find_one({"id": user_id}, {"_id": 0})
                if user:
                    user_email = user.get("email")
        except Exception:
            pass

    # Query commissions
    query = {"beneficiary_type": "affiliate"}
    if user_email:
        query["$or"] = [
            {"beneficiary_email": user_email},
            {"affiliate_email": user_email},
        ]

    commissions = await db.affiliate_commissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

    total_earned = sum(float(c.get("commission_amount", 0) or c.get("amount", 0)) for c in commissions if c.get("status") in ("approved", "paid"))
    pending_payout = sum(float(c.get("commission_amount", 0) or c.get("amount", 0)) for c in commissions if c.get("status") == "approved")
    paid_out = sum(float(c.get("commission_amount", 0) or c.get("amount", 0)) for c in commissions if c.get("status") == "paid")
    referral_count = len(commissions)

    earnings_rows = []
    for c in commissions[:50]:
        earnings_rows.append({
            "id": c.get("id") or c.get("commission_id", ""),
            "order_number": c.get("order_number") or c.get("order_id", ""),
            "client_name": c.get("customer_name", ""),
            "affiliate_amount": _money(c.get("commission_amount", 0) or c.get("amount", 0)),
            "status": c.get("status", "pending"),
            "date_label": c.get("created_at", "")[:7] if c.get("created_at") else "",
        })

    return {
        "ok": True,
        "summary": {
            "total_earned": _money(total_earned),
            "pending_payout": _money(pending_payout),
            "paid_out": _money(paid_out),
            "referral_count": referral_count,
        },
        "earnings": earnings_rows,
    }
