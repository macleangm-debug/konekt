"""
Pack 2 — Assignment Policy Service
Centralized, deterministic assignment logic for sales and vendor.
Used by: live_commerce_service.py, order_ops_routes.py
"""


async def resolve_sales_assignment(db, explicit_sales_id=None, explicit_sales_name=None):
    """
    Deterministic sales assignment.
    Priority: explicit > least-loaded sales > any staff > admin fallback.
    Returns (sales_id, sales_name, sales_phone, sales_email).
    """
    if explicit_sales_id:
        user = await db.users.find_one({"id": explicit_sales_id}, {"_id": 0, "id": 1, "full_name": 1, "phone": 1, "email": 1})
        if user:
            return user["id"], user.get("full_name", explicit_sales_name or "Sales"), user.get("phone", ""), user.get("email", "")

    candidates = await db.users.find(
        {"role": {"$in": ["sales", "staff", "admin"]}, "is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1, "role": 1}
    ).to_list(50)

    for preferred_role in ["sales", "staff", "admin"]:
        role_candidates = [u for u in candidates if u.get("role") == preferred_role]
        if role_candidates:
            best = role_candidates[0]
            return best["id"], best.get("full_name", "Sales"), best.get("phone", ""), best.get("email", "")

    return None, "Unassigned", "", ""


async def resolve_vendor_assignment(db, items=None, explicit_vendor_id=None):
    """
    Deterministic vendor assignment.
    Priority: explicit > first item's vendor_id > product catalog lookup.
    Returns (vendor_id, vendor_name).
    """
    if explicit_vendor_id:
        vendor = await db.users.find_one(
            {"$or": [{"id": explicit_vendor_id}, {"partner_id": explicit_vendor_id}]},
            {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1}
        )
        if vendor:
            return vendor.get("partner_id") or vendor["id"], vendor.get("full_name", "Vendor")

    if items:
        for item in items:
            vid = item.get("vendor_id") or item.get("partner_id")
            if vid:
                vendor = await db.users.find_one(
                    {"$or": [{"id": vid}, {"partner_id": vid}]},
                    {"_id": 0, "id": 1, "full_name": 1, "partner_id": 1}
                )
                if vendor:
                    return vendor.get("partner_id") or vendor["id"], vendor.get("full_name", "Vendor")

            product_id = item.get("product_id") or item.get("sku")
            if product_id:
                product = await db.products.find_one(
                    {"$or": [{"id": product_id}, {"sku": product_id}]},
                    {"_id": 0, "vendor_id": 1, "partner_id": 1}
                )
                if product:
                    vid = product.get("vendor_id") or product.get("partner_id")
                    if vid:
                        return vid, "Vendor"

    return None, "Unassigned"
