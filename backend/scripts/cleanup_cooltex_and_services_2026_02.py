"""Data cleanup — Feb 2026 (targets admin_settings.settings_hub.catalog.product_categories)

  1. Add 'Cooltex Polo - ' prefix to orphan Cooltex SKUs (T.Blue / Yellow / White / Golden Yellow).
     (Product rename step — run only if not already renamed.)
  2. Merge 'Printing & Stationery' service category into 'Printing & Branding' (delete stationery,
     preserve unique subs).
  3. Expand service subcategories with missing high-demand services.
"""
import asyncio
import os
import re
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


EXTRA_SUBCATEGORIES = {
    "Printing & Branding": [
        "Corporate Gifts Printing", "Packaging Printing", "Custom Merchandise",
    ],
    "Creative & Design": [
        "Website UX/UI Design", "Motion Graphics & Video", "Product Photography",
        "Pitch Deck Design", "Brand Strategy",
    ],
    "Facilities Services": [
        "Garden & Landscape Maintenance", "Plumbing Services",
        "HVAC / AC Servicing", "Pest Control", "Waste Management",
    ],
    "Technical Support": [
        "IT Helpdesk (SLA)", "Cybersecurity Audit", "Data Backup & Recovery",
        "Cloud Migration", "VOIP & Phone Setup",
    ],
    "Office Branding": [
        "Vehicle Branding & Wraps", "Event Booth Branding",
        "Window Graphics", "Glass Frosting",
    ],
    "Uniforms & Workwear": [
        "Hi-Vis / Safety Jackets", "Chef & Hospitality Wear",
        "Medical Scrubs", "Branded T-Shirts & Polos", "Custom Embroidery",
    ],
}


async def rename_orphan_cooltex_skus(db):
    """Prefix color-only SKUs in the Cooltex category with 'Cooltex Polo -'."""
    orphan_prefixes = ["T.Blue", "White", "Yellow", "Golden Yellow"]
    rows = await db.products.find({
        "category": "Cooltex",
        "name": {"$not": re.compile(r"^Cooltex Polo", re.IGNORECASE)},
    }).to_list(length=500)
    print(f"  Found {len(rows)} orphan Cooltex SKUs")
    renamed = 0
    for p in rows:
        old_name = p.get("name", "").strip()
        detected = next((pref for pref in sorted(orphan_prefixes, key=len, reverse=True)
                         if old_name.lower().startswith(pref.lower())), None)
        if not detected:
            continue
        rest = old_name[len(detected):].strip(" -")
        new_name = f"Cooltex Polo - {detected}" + (f" - {rest}" if rest else "")
        if new_name == old_name:
            continue
        await db.products.update_one(
            {"_id": p["_id"]},
            {"$set": {"name": new_name, "original_name_before_cleanup": old_name}},
        )
        print(f"    RENAMED: {old_name!r} → {new_name!r}")
        renamed += 1
    print(f"  Renamed {renamed} SKUs")


async def _load_settings_hub(db):
    settings_row = await db.admin_settings.find_one({"key": "settings_hub"})
    if not settings_row:
        raise RuntimeError("settings_hub document not found in admin_settings")
    value = settings_row.get("value", {})
    catalog = value.get("catalog", {})
    cats = catalog.get("product_categories", [])
    return settings_row, value, catalog, cats


async def _save_product_categories(db, settings_row, value, catalog, cats):
    catalog["product_categories"] = cats
    value["catalog"] = catalog
    await db.admin_settings.update_one(
        {"_id": settings_row["_id"]},
        {"$set": {"value": value}},
    )


async def merge_stationery_into_branding(db):
    settings_row, value, catalog, cats = await _load_settings_hub(db)
    # Locate categories
    stationery_idx = next((i for i, c in enumerate(cats)
                           if isinstance(c, dict) and c.get("name") == "Printing & Stationery"), None)
    branding_idx = next((i for i, c in enumerate(cats)
                         if isinstance(c, dict) and c.get("name") == "Printing & Branding"), None)
    if stationery_idx is None:
        print("  'Printing & Stationery' not present — nothing to merge.")
        return
    if branding_idx is None:
        print("  'Printing & Branding' not present — aborting merge.")
        return

    sta = cats[stationery_idx]
    bra = cats[branding_idx]
    sta_subs = [s.strip() for s in (sta.get("subcategories") or []) if s and s.strip()]
    bra_subs = [s.strip() for s in (bra.get("subcategories") or []) if s and s.strip()]
    seen_lower = {s.lower(): s for s in bra_subs}

    added = []
    for s in sta_subs:
        if s.lower() in seen_lower:
            continue
        # Skip dupes like "Banners" when "Banners & Posters" already exists
        if any(s.lower() in existing.lower() for existing in bra_subs):
            continue
        seen_lower[s.lower()] = s
        bra_subs.append(s)
        added.append(s)

    bra["subcategories"] = bra_subs
    cats[branding_idx] = bra
    # Drop the Printing & Stationery category
    cats.pop(stationery_idx if stationery_idx < branding_idx else stationery_idx - 1) \
        if stationery_idx > branding_idx else cats.pop(stationery_idx)
    # Re-find branding index after pop in case it shifted
    # (If stationery_idx < branding_idx we popped something before it — handled by pop logic above.)
    await _save_product_categories(db, settings_row, value, catalog, cats)
    print(f"  Deleted 'Printing & Stationery'. Added to Branding: {added or '(none — all were duplicates)'}")


async def expand_service_subcategories(db):
    settings_row, value, catalog, cats = await _load_settings_hub(db)
    changed = False
    for i, c in enumerate(cats):
        if not isinstance(c, dict):
            continue
        name = c.get("name")
        if c.get("category_type") != "service":
            continue
        extras = EXTRA_SUBCATEGORIES.get(name, [])
        if not extras:
            continue
        existing = [s.strip() for s in (c.get("subcategories") or []) if s and s.strip()]
        lower_set = {s.lower() for s in existing}
        added = []
        for s in extras:
            if s.lower() not in lower_set:
                existing.append(s)
                lower_set.add(s.lower())
                added.append(s)
        if added:
            c["subcategories"] = existing
            cats[i] = c
            changed = True
            print(f"  '{name}' += {added}")
        else:
            print(f"  '{name}' already complete")
    if changed:
        await _save_product_categories(db, settings_row, value, catalog, cats)


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "konekt")]
    print("STEP 1: Rename orphan Cooltex SKUs")
    await rename_orphan_cooltex_skus(db)
    print("\nSTEP 2: Merge Printing & Stationery into Printing & Branding")
    await merge_stationery_into_branding(db)
    print("\nSTEP 3: Expand service subcategories")
    await expand_service_subcategories(db)
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
