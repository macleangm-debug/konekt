"""
Canonical Category API — Single source of truth for categories and subcategories.
Used by product/service creation forms, reporting, and the pricing engine.
"""
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
async def list_categories(request: Request):
    """Get all canonical categories with their subcategories."""
    db = request.app.mongodb

    cats = await db.catalog_categories.find(
        {"is_active": True, "name": {"$not": {"$regex": "^TEST_"}}},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(100)

    subcats = await db.catalog_subcategories.find(
        {"is_active": True, "name": {"$not": {"$regex": "^TEST_"}}},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(500)

    # Group subcategories under their parent category
    sub_by_cat = {}
    for s in subcats:
        cid = s.get("category_id", "")
        if cid not in sub_by_cat:
            sub_by_cat[cid] = []
        sub_by_cat[cid].append({
            "id": s.get("id", ""),
            "name": s.get("name", ""),
            "slug": s.get("slug", ""),
        })

    result = []
    for c in cats:
        cid = c.get("id", "")
        result.append({
            "id": cid,
            "name": c.get("name", ""),
            "slug": c.get("slug", ""),
            "group_id": c.get("group_id", ""),
            "subcategories": sub_by_cat.get(cid, []),
        })

    return {"ok": True, "categories": result}
