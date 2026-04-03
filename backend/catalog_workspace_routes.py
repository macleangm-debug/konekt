"""
Catalog Workspace Routes — Unified catalog overview endpoint.
Returns aggregated stats across products, services, taxonomy, and vendor supply.
"""
from fastapi import APIRouter, Request


router = APIRouter(prefix="/api/admin/catalog-workspace", tags=["Catalog Workspace"])


@router.get("/stats")
async def catalog_stats(request: Request):
    """Return catalog overview statistics."""
    db = request.app.mongodb
    products_count = await db.products.count_documents({})
    services_count = await db.services.count_documents({}) if "services" in await db.list_collection_names() else 0
    taxonomy_count = await db.taxonomy.count_documents({})
    supply_count = await db.vendor_supply.count_documents({})
    submissions_pending = await db.vendor_product_submissions.count_documents({"review_status": "pending"}) if "vendor_product_submissions" in await db.list_collection_names() else 0

    return {
        "products": products_count,
        "services": services_count,
        "taxonomy_categories": taxonomy_count,
        "vendor_supply_records": supply_count,
        "pending_submissions": submissions_pending,
        "sections": [
            "products",
            "services",
            "taxonomy",
            "vendor_supply",
        ],
    }
