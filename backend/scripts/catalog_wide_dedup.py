"""Catalog-wide variant duplicate audit.

For every category, group products by (canonical_base_name, normalized_size).
Where a cluster has more than one SKU, keep the one with no
`original_name_before_cleanup` marker (i.e. the native Darcity name) and
delete the rest — same logic proven on Cooltex.

Dry-run by default. Pass `--apply` to actually delete.
"""
import asyncio
import os
import re
import sys
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

SIZE_TOKENS_FLAT = set(SIZE_NORMALISE.keys())


def normalize_size(raw: str) -> str:
    if not raw:
        return ""
    up = re.sub(r"\s+", " ", raw.strip().upper())
    return SIZE_NORMALISE.get(up, up)


def canonical_key(name: str):
    """Return (base_name, normalized_size). Only strip if tail is a size token."""
    s = name.strip()
    # Try " - <size>" first
    if " - " in s:
        base, tail = s.rsplit(" - ", 1)
        if tail.strip().upper() in SIZE_TOKENS_FLAT:
            return (base.strip(), normalize_size(tail))
        # Try parenthetical: "... (L)", "... (Landscape)"
        m = re.match(r"^(.+?)\s*\(\s*([A-Za-z0-9 ]+)\s*\)$", tail)
        if m and m.group(2).strip().upper() in SIZE_TOKENS_FLAT:
            return (f"{base} - {m.group(1).strip()}".strip(), normalize_size(m.group(2)))
    # Try trailing "Color Size" like "T.Blue 2XL" or "Yellow Small"
    parts = s.rsplit(" ", 1)
    if len(parts) == 2 and parts[1].strip().upper() in SIZE_TOKENS_FLAT:
        return (parts[0].strip(), normalize_size(parts[1]))
    # Trailing "(L)", etc.
    m = re.match(r"^(.+?)\s*\(\s*([A-Za-z0-9 ]+)\s*\)$", s)
    if m and m.group(2).strip().upper() in SIZE_TOKENS_FLAT:
        return (m.group(1).strip(), normalize_size(m.group(2)))
    return (s, "")


async def main(apply: bool = False):
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "konekt_db")]

    all_products = await db.products.find({"is_active": True}).to_list(length=5000)
    print(f"Total active products: {len(all_products)}")

    # Cluster by (category, base, size)
    clusters = defaultdict(list)
    for p in all_products:
        base, size = canonical_key(p.get("name", ""))
        if not size:
            continue  # single SKU — not a variant bucket
        key = (p.get("category", ""), base.lower(), size)
        clusters[key].append(p)

    duplicates = {k: v for k, v in clusters.items() if len(v) > 1}
    print(f"Duplicate variant clusters: {len(duplicates)}")

    delete_total = 0
    for key, group in sorted(duplicates.items()):
        cat, base, size = key
        # Prefer SKUs without original_name_before_cleanup (native names)
        natives = [p for p in group if not p.get("original_name_before_cleanup")]
        renamed = [p for p in group if p.get("original_name_before_cleanup")]
        if natives:
            keep = natives[0]
            to_delete = natives[1:] + renamed
        else:
            group.sort(key=lambda p: float(p.get("customer_price") or p.get("base_price") or 1e18))
            keep = group[0]
            to_delete = group[1:]

        if not to_delete:
            continue
        print(f"\n[{cat} | {base} | {size}] keeping {keep['name']!r}")
        for d in to_delete:
            print(f"  {'DELETE' if apply else 'would delete'}: {d['name']!r}  price={d.get('customer_price')}")
            if apply:
                await db.products.delete_one({"_id": d["_id"]})
            delete_total += 1

    print(f"\n{'DELETED' if apply else 'WOULD DELETE'} {delete_total} duplicate SKUs")


if __name__ == "__main__":
    asyncio.run(main(apply="--apply" in sys.argv))
