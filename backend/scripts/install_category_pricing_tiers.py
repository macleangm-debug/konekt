"""Install 4 category-specific pricing tier structures + preserve a default.

Categories (matched against product.branch):
  1. Promotional Materials — U-curve 8-tier (commodity zone 10-30K at 12%)
  2. Office Equipment      — B2B-oriented, slightly higher margins in mid-range
  3. Stationery            — high-volume small items, protect absolute margin
  4. Services              — flat 35% (catalog model doesn't apply cleanly)

Each tier preserves `protected_platform_margin_pct + distributable_margin_pct
≈ total_margin_pct` with the usual 2:1 protected:distributable split, and keeps
the standard distribution_split (25/20/20/20/15) so downstream commission logic
keeps working.
"""
import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(Path(__file__).parent.parent / ".env")


DIST_SPLIT = {"affiliate_pct": 25, "promotion_pct": 20, "sales_pct": 20, "referral_pct": 20, "reserve_pct": 15}


def _tier(label, lo, hi, total, protected, distributable):
    return {
        "label": label,
        "min_amount": lo,
        "max_amount": hi,
        "total_margin_pct": total,
        "protected_platform_margin_pct": protected,
        "distributable_margin_pct": distributable,
        "distribution_split": DIST_SPLIT,
    }


# ─── Promotional Materials (commodity apparel & merch — competitive) ───
PROMOTIONAL_TIERS = [
    _tier("Micro (0 – 2K)",          0,          2000,     50, 33, 17),
    _tier("Ultra-Low (2K – 10K)",    2001,       10000,    30, 20, 10),
    _tier("Low (10K – 30K)",         10001,      30000,    12,  8,  4),   # Cooltex zone ✓
    _tier("Low-Mid (30K – 100K)",    30001,      100000,   20, 13,  7),
    _tier("Mid (100K – 500K)",       100001,     500000,   22, 15,  7),
    _tier("Upper-Mid (500K – 2M)",   500001,     2000000,  18, 12,  6),
    _tier("Large (2M – 10M)",        2000001,    10000000, 14,  9,  5),
    _tier("Enterprise (10M+)",       10000001,   999999999, 10, 7,  3),
]

# ─── Office Equipment (B2B relationship-driven, less price-sensitive) ───
# Higher margins in mid-range since customers value service bundling
OFFICE_EQUIPMENT_TIERS = [
    _tier("Micro Supplies (0 – 2K)",   0,           2000,     45, 30, 15),
    _tier("Small Accessories (2K – 10K)", 2001,     10000,    35, 23, 12),
    _tier("Basics (10K – 30K)",        10001,       30000,    30, 20, 10),
    _tier("Peripherals (30K – 100K)",  30001,       100000,   28, 19,  9),
    _tier("Mid Equipment (100K – 500K)", 100001,    500000,   25, 17,  8),
    _tier("Printers (500K – 2M)",      500001,      2000000,  20, 13,  7),
    _tier("Enterprise Gear (2M – 10M)", 2000001,    10000000, 17, 11,  6),
    _tier("Installations (10M+)",      10000001,    999999999, 14, 9,  5),
]

# ─── Stationery (high-volume, commodity, very price-sensitive) ───
# Small absolute values — slightly higher % on low end to earn meaningful margin
STATIONERY_TIERS = [
    _tier("Single-Piece (0 – 500)",    0,          500,      60, 40, 20),
    _tier("Micro (500 – 2K)",          501,        2000,     45, 30, 15),
    _tier("Ultra-Low (2K – 10K)",      2001,       10000,    25, 17,  8),
    _tier("Low (10K – 30K)",           10001,      30000,    15, 10,  5),
    _tier("Low-Mid (30K – 100K)",      30001,      100000,   18, 12,  6),
    _tier("Mid (100K – 500K)",         100001,     500000,   20, 13,  7),
    _tier("Upper-Mid (500K – 2M)",     500001,     2000000,  16, 11,  5),
    _tier("Large (2M+)",               2000001,    999999999, 12, 8,  4),
]

# ─── Services (bespoke — simple flat tier; per-quote pricing is the norm) ───
# Only 2 tiers since services are quoted per-job and vendor_cost may not apply
SERVICES_TIERS = [
    _tier("Standard Service (0 – 1M)",   0,         1000000, 35, 23, 12),
    _tier("Enterprise Service (1M+)",    1000001,   999999999, 25, 17, 8),
]

# ─── Default fallback ───
# Products with unmapped branch fall back here. Identical to Promotional Materials
# so behaviour matches the current production baseline.
DEFAULT_TIERS = PROMOTIONAL_TIERS[:]


CATEGORY_TIERS = {
    "default": DEFAULT_TIERS,
    "Promotional Materials": PROMOTIONAL_TIERS,
    "Office Equipment": OFFICE_EQUIPMENT_TIERS,
    "Stationery": STATIONERY_TIERS,
    "Services": SERVICES_TIERS,
}


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    from services.tiered_margin_engine import save_global_tiers

    for category, tiers in CATEGORY_TIERS.items():
        await save_global_tiers(db, tiers, category=category)
        print(f"✓ Installed '{category}' with {len(tiers)} tiers")

    print()
    print("Category tier previews:")
    print()
    for cat, tiers in CATEGORY_TIERS.items():
        print(f"### {cat} ###")
        for t in tiers:
            hi = "10M+" if t["max_amount"] > 100_000_000 else f"{t['max_amount']:,}"
            print(f"  {t['label']:35} {t['min_amount']:>12,} – {hi:>12}  margin={t['total_margin_pct']:>4}%")
        print()


if __name__ == "__main__":
    asyncio.run(main())
