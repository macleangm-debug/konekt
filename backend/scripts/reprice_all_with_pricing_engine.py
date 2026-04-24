"""Repriced-All: apply the Settings Hub pricing policy tiers to every product.

Flow per product:
  vendor_cost → resolve tier by amount → customer_price = vendor_cost × (1 + tier.total_margin_pct/100)

This ensures customer_price always reflects Konekt's protected + distributable margin
structure, not a flat 35% import-time default. Run after tier config changes or
catalog imports to realign pricing.
"""
import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Make sibling backend modules importable when running from scripts/
sys.path.insert(0, str(Path(__file__).parent.parent))

load_dotenv(Path(__file__).parent.parent / ".env")

# Import modules that expect env to be loaded
from services.settings_resolver import get_pricing_policy_tiers  # noqa: E402
from commission_margin_engine_service import resolve_tier  # noqa: E402


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "konekt_db")]
    tiers = await get_pricing_policy_tiers(db)
    if not tiers:
        print("No pricing tiers configured in Settings Hub — aborting.")
        return

    updated = 0
    no_tier = 0
    total = 0
    breakdown = {"preserved": 0, "realigned": 0}

    cursor = db.products.find({"vendor_cost": {"$gt": 0}}, {"_id": 1, "name": 1, "vendor_cost": 1, "customer_price": 1})
    async for p in cursor:
        total += 1
        cost = float(p.get("vendor_cost") or 0)
        tier = resolve_tier(cost, tiers)
        if not tier:
            no_tier += 1
            continue
        margin_pct = float(tier.get("total_margin_pct", 0))
        new_price = round(cost * (1 + margin_pct / 100.0), 0)  # round to whole TZS
        old_price = p.get("customer_price", 0) or 0

        if abs(new_price - old_price) <= 1:
            breakdown["preserved"] += 1
            continue

        await db.products.update_one(
            {"_id": p["_id"]},
            {"$set": {
                "customer_price": new_price,
                "base_price": new_price,
                "pricing_tier_label": tier.get("label"),
                "pricing_total_margin_pct": margin_pct,
                "pricing_protected_margin_pct": float(tier.get("protected_platform_margin_pct", 0)),
                "pricing_distributable_margin_pct": float(tier.get("distributable_margin_pct", 0)),
                "pricing_last_realigned": True,
            }},
        )
        print(f"  REALIGNED: {p['name'][:50]:50} cost={cost:>8.0f} {old_price:>7.0f} → {new_price:>7.0f}  [{tier.get('label')}]")
        updated += 1
        breakdown["realigned"] += 1

    print()
    print(f"Total products with vendor_cost > 0: {total}")
    print(f"  Preserved (already correct): {breakdown['preserved']}")
    print(f"  Realigned: {breakdown['realigned']}")
    print(f"  No matching tier: {no_tier}")


if __name__ == "__main__":
    asyncio.run(main())
