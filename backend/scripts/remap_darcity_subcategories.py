"""Remap Darcity products from deactivated/legacy subcategories to active canonical ones.

Usage:
  python backend/scripts/remap_darcity_subcategories.py           # dry-run
  python backend/scripts/remap_darcity_subcategories.py --apply   # write changes

Idempotent: products already pointing to active canonical subcategories are skipped.
"""

import argparse
import asyncio
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(Path(__file__).parent.parent / ".env")


def _norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _contains_any(text: str, terms: list[str]) -> bool:
    return any(t in text for t in terms)


# Legacy names / brand-pollution buckets -> target canonical subcategory names.
EXACT_LEGACY_MAP = {
    "cooltex": "Apparel & Garments",
    "timeless": "Apparel & Garments",
    "next level": "Apparel & Garments",
    "sub a": "Apparel & Garments",
    "sub b": "Drinkware",
}


HEURISTIC_RULES = [
    ("Apparel & Garments", ["shirt", "t-shirt", "hoodie", "jacket", "wear", "uniform", "apparel", "garment", "cap", "hat", "jersey"]),
    ("Drinkware", ["mug", "bottle", "flask", "cup", "tumbler", "drinkware", "glass"]),
    ("Bags & Carriers", ["bag", "backpack", "tote", "duffel", "carrier", "satchel", "pouch"]),
    ("Stationery & Office", ["notebook", "pen", "pencil", "diary", "stationery", "office", "folder", "journal"]),
]


async def load_active_subcategories(db):
    docs = await db.catalog_subcategories.find({"is_active": True}, {"_id": 0}).to_list(1000)
    by_norm = {_norm(d.get("name", "")): d for d in docs}
    return docs, by_norm


def choose_target(product: dict, active_by_norm: dict):
    old_sub_name = str(product.get("subcategory_name") or product.get("subcategory") or "")
    old_sub_norm = _norm(old_sub_name)

    # 1) exact polluted names first
    if old_sub_norm in EXACT_LEGACY_MAP:
        target_name = EXACT_LEGACY_MAP[old_sub_norm]
        target = active_by_norm.get(_norm(target_name))
        if target:
            return target, f"exact:{old_sub_name}=>{target_name}"

    text = _norm(" ".join([
        str(product.get("name") or ""),
        str(product.get("description") or ""),
        str(product.get("category_name") or product.get("category") or ""),
        old_sub_name,
    ]))

    # 2) heuristics by text fingerprints
    for canonical_name, terms in HEURISTIC_RULES:
        if _contains_any(text, terms):
            target = active_by_norm.get(_norm(canonical_name))
            if target:
                return target, f"heuristic:{canonical_name}"

    return None, "no_match"


async def remap(db, apply: bool = False):
    _, active_by_norm = await load_active_subcategories(db)

    products = await db.products.find(
        {
            "$or": [
                {"vendor_name": {"$regex": "darcity", "$options": "i"}},
                {"source": "url_import"},
                {"partner_name": {"$regex": "darcity", "$options": "i"}},
            ],
            "is_active": {"$ne": False},
        },
        {"_id": 1, "id": 1, "name": 1, "subcategory": 1, "subcategory_name": 1, "subcategory_id": 1, "category": 1, "category_name": 1, "description": 1},
    ).to_list(20000)

    updates = []
    reasons = Counter()

    for p in products:
        target, reason = choose_target(p, active_by_norm)
        reasons[reason] += 1
        if not target:
            continue
        if (p.get("subcategory_id") == target.get("id")) and (_norm(p.get("subcategory_name", "")) == _norm(target.get("name", ""))):
            continue
        updates.append((p, target, reason))

    print(f"Darcity candidates scanned: {len(products)}")
    print(f"Products needing remap: {len(updates)}")
    print("Reason distribution:")
    for k, v in reasons.most_common():
        print(f"  - {k}: {v}")

    for p, target, reason in updates[:20]:
        print(f"  * {p.get('name','<unnamed>')[:64]} :: {p.get('subcategory_name') or p.get('subcategory')} -> {target.get('name')} ({reason})")

    if not apply:
        print("\nDry-run only. Re-run with --apply to persist changes.")
        return

    modified = 0
    now = datetime.now(timezone.utc).isoformat()
    for p, target, reason in updates:
        res = await db.products.update_one(
            {"_id": p["_id"]},
            {
                "$set": {
                    "subcategory_id": target.get("id"),
                    "subcategory_name": target.get("name"),
                    "subcategory": target.get("name"),
                    "updated_at": now,
                    "subcategory_remap_reason": reason,
                }
            },
        )
        modified += res.modified_count

    print(f"Applied updates: {modified}")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Persist remapped subcategories")
    args = parser.parse_args()

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise RuntimeError("MONGO_URL and DB_NAME must be set")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    await remap(db, apply=args.apply)


if __name__ == "__main__":
    asyncio.run(main())
