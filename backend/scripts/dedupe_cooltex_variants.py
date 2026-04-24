"""Deduplicate products with matching (canonical base name + normalized size).

Strategy: for each duplicate cluster, keep the SKU that was ALREADY properly named
in Darcity (no `original_name_before_cleanup` marker). Delete the orphan-renamed
duplicates. Falls back to keeping the lowest-priced SKU otherwise.
"""
import asyncio
import os
import re
from pathlib import Path
from collections import defaultdict
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


SIZE_NORMALISE = {
    "XS": "XS", "X SMALL": "XS", "X-SMALL": "XS", "XSMALL": "XS", "EXTRA SMALL": "XS",
    "S": "S", "SM": "S", "SMALL": "S",
    "M": "M", "MD": "M", "MEDIUM": "M",
    "L": "L", "LG": "L", "LARGE": "L",
    "XL": "XL", "X LARGE": "XL", "X-LARGE": "XL", "XLARGE": "XL", "EXTRA LARGE": "XL",
    "1XL": "XL", "1 XL": "XL", "1X LARGE": "XL",
    "XXL": "XXL", "XX LARGE": "XXL", "XX-LARGE": "XXL", "XXLARGE": "XXL",
    "2XL": "XXL", "2 XL": "XXL", "2X LARGE": "XXL",
    "XXXL": "XXXL", "XXX LARGE": "XXXL", "XXX-LARGE": "XXXL", "XXXLARGE": "XXXL",
    "3XL": "XXXL", "3 XL": "XXXL", "3X LARGE": "XXXL",
    "4XL": "4XL", "4 XL": "4XL", "4X LARGE": "4XL",
    "5XL": "5XL", "5 XL": "5XL", "5X LARGE": "5XL",
}


def normalize_size(raw: str) -> str:
    if not raw:
        return ""
    up = re.sub(r"\s+", " ", raw.strip().upper())
    return SIZE_NORMALISE.get(up, up)


def canonical_key(name: str) -> tuple:
    """Return (base_name, normalized_size) for deduplication.

    We strip only the trailing size token (whatever's after the LAST ' - ').
    """
    if " - " in name:
        base, tail = name.rsplit(" - ", 1)
    else:
        # Space-separated trailing size like "T.Blue 2XL"
        parts = name.rsplit(" ", 1)
        if len(parts) == 2 and normalize_size(parts[1]) in SIZE_NORMALISE.values():
            base, tail = parts
        else:
            return (name.strip(), "")
    return (base.strip(), normalize_size(tail))


async def dedupe_cooltex_duplicates(db):
    rows = await db.products.find({"category": "Cooltex"}).to_list(length=1000)
    print(f"Total Cooltex SKUs: {len(rows)}")

    clusters = defaultdict(list)
    for p in rows:
        base, size = canonical_key(p.get("name", ""))
        if not size:
            continue  # nothing to dedupe — unique product
        clusters[(base, size)].append(p)

    deletes = 0
    for key, group in clusters.items():
        if len(group) <= 1:
            continue
        # Prefer SKUs WITHOUT original_name_before_cleanup (i.e. Darcity-native names)
        natives = [p for p in group if not p.get("original_name_before_cleanup")]
        renamed = [p for p in group if p.get("original_name_before_cleanup")]
        if natives:
            keep = natives[0]
            to_delete = natives[1:] + renamed
        else:
            # All were renamed — keep lowest-price
            group.sort(key=lambda p: float(p.get("customer_price") or p.get("base_price") or 1e18))
            keep = group[0]
            to_delete = group[1:]

        print(f"\\n[{key}] keeping {keep['name']!r} (id={keep.get('_id')})")
        for d in to_delete:
            print(f"  deleting {d['name']!r} (id={d.get('_id')}, price={d.get('customer_price')})")
            await db.products.delete_one({"_id": d["_id"]})
            deletes += 1

    print(f"\\nDeleted {deletes} duplicate SKUs")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "konekt")]
    await dedupe_cooltex_duplicates(db)


if __name__ == "__main__":
    asyncio.run(main())
