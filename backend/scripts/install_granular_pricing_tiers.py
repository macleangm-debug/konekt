"""Install a finer-grained pricing tier structure.

Replaces the original 5-tier blanket (0-100K: 35%, 100K-500K: 30%, 500K-2M: 25%, 2M-10M: 20%, 10M+: 15%)
with an 8-tier U-curve that:

  * Protects absolute margin on tiny items (Micro / Ultra-Low)
  * Drops margin in the 10K–30K commodity apparel zone to stay price-competitive
    (the user's key concern — Cooltex polo at 25K cost should marketplace at ~28K)
  * Keeps healthy margin in the 30K–500K "accessible premium" range
  * Stays competitive on enterprise-scale deals

Protected / distributable ratio ≈ 2:1 on total margin (matches prior convention).

Distribution split (affiliate 25% / promotion 20% / sales 20% / referral 20% / reserve 15%)
is preserved so commission/referral logic doesn't break.
"""
import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(Path(__file__).parent.parent / ".env")


DEFAULT_DISTRIBUTION_SPLIT = {
    "affiliate_pct": 25,
    "promotion_pct": 20,
    "sales_pct": 20,
    "referral_pct": 20,
    "reserve_pct": 15,
}


NEW_TIERS = [
    # Tiny items — high % protects absolute margin (would be cents otherwise)
    {
        "label": "Micro (0 – 2K)",
        "min_amount": 0,
        "max_amount": 2000,
        "total_margin_pct": 50,
        "protected_platform_margin_pct": 33,
        "distributable_margin_pct": 17,
        "distribution_split": DEFAULT_DISTRIBUTION_SPLIT,
    },
    {
        "label": "Ultra-Low (2K – 10K)",
        "min_amount": 2001,
        "max_amount": 10000,
        "total_margin_pct": 30,
        "protected_platform_margin_pct": 20,
        "distributable_margin_pct": 10,
        "distribution_split": DEFAULT_DISTRIBUTION_SPLIT,
    },
    # COMMODITY ZONE — compete on apparel like Cooltex polos (25K → 28K)
    {
        "label": "Low (10K – 30K)",
        "min_amount": 10001,
        "max_amount": 30000,
        "total_margin_pct": 12,
        "protected_platform_margin_pct": 8,
        "distributable_margin_pct": 4,
        "distribution_split": DEFAULT_DISTRIBUTION_SPLIT,
    },
    {
        "label": "Low-Mid (30K – 100K)",
        "min_amount": 30001,
        "max_amount": 100000,
        "total_margin_pct": 20,
        "protected_platform_margin_pct": 13,
        "distributable_margin_pct": 7,
        "distribution_split": DEFAULT_DISTRIBUTION_SPLIT,
    },
    {
        "label": "Mid (100K – 500K)",
        "min_amount": 100001,
        "max_amount": 500000,
        "total_margin_pct": 22,
        "protected_platform_margin_pct": 15,
        "distributable_margin_pct": 7,
        "distribution_split": DEFAULT_DISTRIBUTION_SPLIT,
    },
    {
        "label": "Upper-Mid (500K – 2M)",
        "min_amount": 500001,
        "max_amount": 2000000,
        "total_margin_pct": 18,
        "protected_platform_margin_pct": 12,
        "distributable_margin_pct": 6,
        "distribution_split": DEFAULT_DISTRIBUTION_SPLIT,
    },
    {
        "label": "Large (2M – 10M)",
        "min_amount": 2000001,
        "max_amount": 10000000,
        "total_margin_pct": 14,
        "protected_platform_margin_pct": 9,
        "distributable_margin_pct": 5,
        "distribution_split": DEFAULT_DISTRIBUTION_SPLIT,
    },
    {
        "label": "Enterprise (10M+)",
        "min_amount": 10000001,
        "max_amount": 999999999,
        "total_margin_pct": 10,
        "protected_platform_margin_pct": 7,
        "distributable_margin_pct": 3,
        "distribution_split": DEFAULT_DISTRIBUTION_SPLIT,
    },
]


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    from services.tiered_margin_engine import save_global_tiers
    await save_global_tiers(db, NEW_TIERS)

    print(f"Installed {len(NEW_TIERS)} pricing tiers:")
    for t in NEW_TIERS:
        hi = "10M+" if t["max_amount"] > 100_000_000 else f"{t['max_amount']:,}"
        print(f"  {t['label']:30} {t['min_amount']:>12,} – {hi:>12}  margin={t['total_margin_pct']:>4}% "
              f"(protected {t['protected_platform_margin_pct']}% + distributable {t['distributable_margin_pct']}%)")


if __name__ == "__main__":
    asyncio.run(main())
