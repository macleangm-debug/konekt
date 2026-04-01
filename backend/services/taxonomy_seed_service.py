"""
Default Taxonomy Seed — Idempotent, non-destructive.
Seeds only missing defaults. Never overwrites admin-edited records.
"""
from datetime import datetime, timezone
import uuid

DEFAULT_TAXONOMY = [
    {
        "group": "products",
        "categories": [
            {"name": "Office Equipment", "subcategories": ["Printers", "Laptops", "Desktops", "Scanners", "Projectors", "Accessories"]},
            {"name": "Stationery", "subcategories": ["Paper", "Pens", "Diaries", "Files & Folders", "Desk Supplies"]},
            {"name": "Furniture", "subcategories": ["Chairs", "Desks", "Cabinets"]},
        ],
    },
    {
        "group": "promotional_materials",
        "categories": [
            {"name": "Branded Apparel", "subcategories": ["T-Shirts", "Caps", "Hoodies"]},
            {"name": "Event Materials", "subcategories": ["Lanyards", "Name Tags", "Badges"]},
            {"name": "Print Materials", "subcategories": ["Flyers", "Brochures", "Posters", "Business Cards", "Banners"]},
            {"name": "Corporate Gifts", "subcategories": ["Mugs", "Bottles", "Notebooks", "Pens"]},
        ],
    },
    {
        "group": "services",
        "categories": [
            {"name": "Printing & Branding", "subcategories": ["Office Branding", "Billboard Signs", "Signage Installation", "Showroom Design"]},
            {"name": "Creative & Design", "subcategories": ["Graphic Design Support", "Presentation Design", "Social Media Design"]},
            {"name": "Facilities Services", "subcategories": ["Deep Office Cleaning", "Carpet Cleaning", "Fumigation"]},
            {"name": "Technical Support", "subcategories": ["Printer Servicing", "CCTV Installation", "Access Control Installation", "Office Network Setup"]},
            {"name": "Business Support", "subcategories": ["Procurement Support", "Event Support", "Recurring Office Supply Support"]},
            {"name": "Uniforms & Workwear", "subcategories": ["Uniform Tailoring", "PPE Supply", "Name Tags & Lanyards"]},
        ],
    },
]


def _slug(name):
    return name.lower().replace(" ", "_").replace("&", "and").replace("/", "_")


async def seed_taxonomy(db):
    """Seed missing taxonomy records. Returns summary of created/skipped."""
    created = 0
    skipped = 0
    details = []

    for group_def in DEFAULT_TAXONOMY:
        group_name = group_def["group"]
        for cat_def in group_def["categories"]:
            cat_name = cat_def["name"]
            cat_slug = _slug(cat_name)

            # Check if category exists
            existing_cat = await db.taxonomy.find_one(
                {"group": group_name, "slug": cat_slug, "level": "category"}
            )
            if existing_cat:
                cat_id = existing_cat.get("id", str(existing_cat.get("_id", "")))
                skipped += 1
            else:
                cat_id = str(uuid.uuid4())
                await db.taxonomy.insert_one({
                    "id": cat_id,
                    "group": group_name,
                    "level": "category",
                    "name": cat_name,
                    "slug": cat_slug,
                    "parent_id": None,
                    "created_at": datetime.now(timezone.utc),
                    "source": "system_seed",
                })
                created += 1
                details.append(f"+ category: {group_name}/{cat_name}")

            # Seed subcategories
            for sub_name in cat_def.get("subcategories", []):
                sub_slug = _slug(sub_name)
                existing_sub = await db.taxonomy.find_one(
                    {"group": group_name, "slug": sub_slug, "level": "subcategory", "parent_id": cat_id}
                )
                if existing_sub:
                    skipped += 1
                else:
                    await db.taxonomy.insert_one({
                        "id": str(uuid.uuid4()),
                        "group": group_name,
                        "level": "subcategory",
                        "name": sub_name,
                        "slug": sub_slug,
                        "parent_id": cat_id,
                        "created_at": datetime.now(timezone.utc),
                        "source": "system_seed",
                    })
                    created += 1
                    details.append(f"  + sub: {group_name}/{cat_name}/{sub_name}")

    return {"created": created, "skipped": skipped, "details": details}
