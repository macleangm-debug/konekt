"""
Catalog Taxonomy Service
Manages groups → categories → subcategories hierarchy.
Seeds initial data from existing product categories.
"""
import logging
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger("catalog_taxonomy")

def _now():
    return datetime.now(timezone.utc).isoformat()

def _id():
    return str(uuid4())

# Initial taxonomy seed based on existing product categories
SEED_TAXONOMY = {
    "Office Supplies": {
        "type": "product",
        "categories": {
            "Office Supplies": ["Paper", "Filing", "Desk Accessories"],
            "Stationery": ["Notebooks", "Pens & Pencils", "Envelopes"],
            "Desk Organizers": ["Trays", "Holders", "Storage"],
            "Furniture": ["Desks", "Chairs", "Storage Units"],
            "Consumables": ["Toner & Ink", "Cleaning Supplies"],
        },
    },
    "Promotional Items": {
        "type": "product",
        "categories": {
            "Apparel": ["T-Shirts", "Polo Shirts", "Jackets"],
            "Bags": ["Tote Bags", "Backpacks", "Laptop Bags"],
            "Caps": ["Baseball Caps", "Bucket Hats"],
            "Headwear": ["Visors", "Beanies"],
            "Drinkware": ["Mugs", "Water Bottles", "Tumblers"],
            "Tech Accessories": ["USB Drives", "Phone Accessories", "Power Banks"],
            "ID Products": ["Lanyards", "Badge Holders", "Name Tags"],
            "Promotional Items": ["Branded Gifts", "Event Giveaways"],
        },
    },
    "Printing & Branding": {
        "type": "product",
        "categories": {
            "Printed Materials": ["Flyers", "Brochures", "Business Cards"],
            "Display Materials": ["Banners", "Posters", "Roll-ups"],
            "Marketing Materials": ["Catalogues", "Leaflets"],
            "Signage": ["Indoor Signs", "Outdoor Signs", "Vehicle Wraps"],
            "Brand Identity": ["Logo Design", "Brand Guidelines"],
            "Digital Design": ["Social Media", "Presentations"],
        },
    },
    "Office Equipment": {
        "type": "product",
        "categories": {
            "Printers": ["Laser Printers", "Inkjet Printers", "Multifunction"],
            "Laptops": ["Business Laptops", "Budget Laptops"],
            "Desktops": ["Workstations", "All-in-Ones"],
            "Scanners": ["Flatbed", "Document Scanners"],
        },
    },
}


async def seed_taxonomy(db):
    """Seed initial taxonomy if collections are empty."""
    existing = await db.catalog_groups.count_documents({})
    if existing > 0:
        return 0

    groups_created = 0
    sort_order = 0

    for group_name, group_data in SEED_TAXONOMY.items():
        sort_order += 1
        group_id = _id()
        await db.catalog_groups.insert_one({
            "id": group_id,
            "market_code": "TZ",
            "type": group_data["type"],
            "name": group_name,
            "slug": group_name.lower().replace(" & ", "-").replace(" ", "-"),
            "is_active": True,
            "sort_order": sort_order,
            "created_at": _now(),
        })
        groups_created += 1

        cat_sort = 0
        for cat_name, subcats in group_data["categories"].items():
            cat_sort += 1
            cat_id = _id()
            await db.catalog_categories.insert_one({
                "id": cat_id,
                "group_id": group_id,
                "name": cat_name,
                "slug": cat_name.lower().replace(" & ", "-").replace(" ", "-"),
                "is_active": True,
                "sort_order": cat_sort,
                "created_at": _now(),
            })

            sub_sort = 0
            for sub_name in subcats:
                sub_sort += 1
                await db.catalog_subcategories.insert_one({
                    "id": _id(),
                    "category_id": cat_id,
                    "group_id": group_id,
                    "name": sub_name,
                    "slug": sub_name.lower().replace(" & ", "-").replace(" ", "-"),
                    "is_active": True,
                    "sort_order": sub_sort,
                    "created_at": _now(),
                })

    # Map existing products to groups based on their category field
    category_to_group = {}
    async for grp in db.catalog_groups.find({}, {"_id": 0}):
        for cat_name in SEED_TAXONOMY.get(grp["name"], {}).get("categories", {}):
            cat_doc = await db.catalog_categories.find_one({"name": cat_name, "group_id": grp["id"]}, {"_id": 0})
            if cat_doc:
                category_to_group[cat_name] = {"group_id": grp["id"], "group_name": grp["name"], "category_id": cat_doc["id"], "category_name": cat_name}

    # Update existing products with taxonomy IDs
    updated = 0
    async for product in db.products.find({}):
        cat = product.get("category", "")
        mapping = category_to_group.get(cat)
        if mapping:
            await db.products.update_one(
                {"_id": product["_id"]},
                {"$set": {
                    "group_id": mapping["group_id"],
                    "group_name": mapping["group_name"],
                    "category_id": mapping["category_id"],
                    "category_name": mapping["category_name"],
                }}
            )
            updated += 1

    logger.info("Seeded taxonomy: %d groups, mapped %d products", groups_created, updated)
    return groups_created


async def get_taxonomy_tree(db, market_code="TZ"):
    """Returns the full group → category → subcategory tree."""
    groups = []
    async for g in db.catalog_groups.find(
        {"is_active": True, "market_code": market_code},
        {"_id": 0}
    ).sort("sort_order", 1):
        groups.append(g)

    categories = []
    async for c in db.catalog_categories.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1):
        categories.append(c)

    subcategories = []
    async for s in db.catalog_subcategories.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1):
        subcategories.append(s)

    return {"groups": groups, "categories": categories, "subcategories": subcategories}



async def sync_settings_categories_to_taxonomy(db):
    """Sync product categories from Settings Hub to the taxonomy collections.
    
    Hierarchy:
      - catalog_groups: "Products" and "Services" (top-level)
      - catalog_categories: actual category names under their group
      - catalog_subcategories: subcategories under each category
    """
    hub = await db.admin_settings.find_one({"key": "settings_hub"})
    if not hub or not hub.get("value"):
        return {"synced": 0}

    cats = hub["value"].get("catalog", {}).get("product_categories", [])

    # Ensure top-level groups exist: Products and Services
    for gname, gtype in [("Products", "product"), ("Services", "service")]:
        exists = await db.catalog_groups.find_one({"name": gname, "type": gtype})
        if not exists:
            await db.catalog_groups.insert_one({
                "id": _id(), "market_code": "TZ", "type": gtype,
                "name": gname, "slug": gname.lower(), "is_active": True,
                "sort_order": 0 if gtype == "product" else 1, "created_at": _now(),
            })

    products_group = await db.catalog_groups.find_one({"name": "Products", "type": "product"})
    services_group = await db.catalog_groups.find_one({"name": "Services", "type": "service"})
    products_gid = products_group["id"] if products_group else None
    services_gid = services_group["id"] if services_group else None

    synced = 0
    for cat_data in cats:
        if isinstance(cat_data, str):
            cat_name = cat_data
            subcategories = []
            cat_type = "product"
            fulfillment_type = "delivery_pickup"
        else:
            cat_name = cat_data.get("name", "")
            subcategories = cat_data.get("subcategories", [])
            cat_type = cat_data.get("category_type", "product")
            fulfillment_type = cat_data.get("fulfillment_type", "delivery_pickup")

        if not cat_name:
            continue

        parent_gid = services_gid if cat_type == "service" else products_gid

        # Upsert as catalog_category under the right group
        existing_cat = await db.catalog_categories.find_one({"name": cat_name, "group_id": parent_gid})
        if existing_cat:
            await db.catalog_categories.update_one(
                {"_id": existing_cat["_id"]},
                {"$set": {
                    "is_active": cat_data.get("active", True) if isinstance(cat_data, dict) else True,
                    "category_type": cat_type,
                    "fulfillment_type": fulfillment_type,
                }}
            )
            cat_id = existing_cat.get("id")
        else:
            cat_id = _id()
            await db.catalog_categories.insert_one({
                "id": cat_id, "group_id": parent_gid,
                "name": cat_name,
                "slug": cat_name.lower().replace(" & ", "-").replace(" ", "-"),
                "is_active": True, "category_type": cat_type,
                "fulfillment_type": fulfillment_type,
                "sort_order": synced, "created_at": _now(),
            })
        synced += 1

        # Sync subcategories
        for si, sub_name in enumerate(subcategories):
            if not sub_name:
                continue
            sub_exists = await db.catalog_subcategories.find_one({"name": sub_name, "category_id": cat_id})
            if not sub_exists:
                await db.catalog_subcategories.insert_one({
                    "id": _id(), "category_id": cat_id,
                    "name": sub_name,
                    "slug": sub_name.lower().replace(" & ", "-").replace(" ", "-"),
                    "is_active": True, "sort_order": si, "created_at": _now(),
                })

    # Clean up old standalone groups that are now categories
    old_groups = []
    async for g in db.catalog_groups.find({"name": {"$nin": ["Products", "Services"]}}):
        old_groups.append(g["_id"])
    if old_groups:
        await db.catalog_groups.delete_many({"_id": {"$in": old_groups}})
        logger.info("Cleaned up %d old standalone groups", len(old_groups))

    logger.info("Synced %d categories from Settings Hub to taxonomy", synced)
    return {"synced": synced}

    logger.info("Synced %d categories from Settings Hub to taxonomy", synced)
    return {"synced": synced}
