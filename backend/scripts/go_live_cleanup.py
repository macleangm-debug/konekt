"""Go-Live Cleanup — Feb 2026

Hard cleanup before going to production:
  1. Delete all TEST user accounts (TEST_*, @test.com, @example.com, bot@test.com, etc.)
  2. Delete demo seed products (A5 Notebook / Branded Cap / Ceramic Coffee Mug etc.)
     that may exist from an earlier seeder — Konekt Tanzania only sells Darcity SKUs.
  3. Delete all inactive promotions.
  4. Approve any Darcity products still in 'pending' state.
  5. Create vendor account info@darcity.tz linked to the Darcity partner
     (partner_ops role so ops can impersonate + Darcity can log in directly).

Idempotent — safe to re-run.
"""
import asyncio
import os
import re
import sys
import secrets
import uuid
from pathlib import Path
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(Path(__file__).parent.parent / ".env")


DARCITY_VENDOR_EMAIL = "info@darcity.tz"
DARCITY_VENDOR_PASSWORD = "Darcity#Konekt2026"


async def cleanup(db):
    # ---------- 1. Test users ----------
    test_regex = {
        "$or": [
            {"email": {"$regex": "^TEST_", "$options": "i"}},
            {"email": {"$regex": "@test\\.com$", "$options": "i"}},
            {"email": {"$regex": "@example\\.com$", "$options": "i"}},
            {"email": {"$regex": "^bot@", "$options": "i"}},
            {"email": {"$regex": "^fastbot_", "$options": "i"}},
            {"email": {"$regex": "^human_test_", "$options": "i"}},
            {"email": {"$regex": "^human[0-9]", "$options": "i"}},
            {"email": {"$regex": "^edge_timing_", "$options": "i"}},
            {"email": {"$regex": "^normal_[0-9]", "$options": "i"}},
            {"email": {"$regex": "^test_", "$options": "i"}},
            {"email": {"$regex": "konekt\\.demo$", "$options": "i"}},
        ]
    }
    user_count = await db.users.count_documents(test_regex)
    res = await db.users.delete_many(test_regex)
    print(f"[1] Deleted {res.deleted_count}/{user_count} test user accounts")

    # ---------- 2. Demo seed products ----------
    demo_names = [
        "A5 Notebook", "A4 Notebook", "Branded Cap", "Ceramic Coffee Mug",
        "Classic Cotton T-Shirt", "Logo Mug", "Sample Product", "Demo Product",
    ]
    q_demo = {"$or": [
        {"name": {"$in": demo_names}},
        {"source": "seed_demo"},
        {"is_test": True},
        {"sku": {"$regex": "^DEMO[_-]", "$options": "i"}},
    ]}
    c = await db.products.count_documents(q_demo)
    r = await db.products.delete_many(q_demo)
    print(f"[2] Deleted {r.deleted_count}/{c} demo seed products")

    # ---------- 3. Promotions ----------
    pr = await db.promotions.count_documents({})
    res = await db.promotions.delete_many({})
    print(f"[3] Deleted {res.deleted_count}/{pr} stale promotions")

    # ---------- 3b. Group deals (clean slate before auto-suggest) ----------
    res = await db.group_deals.delete_many({})
    print(f"[3b] Deleted {res.deleted_count} existing group deals (clean slate)")

    # ---------- 4. Approve pending Darcity products ----------
    res = await db.products.update_many(
        {"$or": [
            {"approval_status": "pending"},
            {"status": "draft", "source": "url_import"},
            {"is_active": False, "source": "url_import"},
        ]},
        {"$set": {
            "approval_status": "approved",
            "status": "published",
            "is_active": True,
            "approved_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    print(f"[4] Approved/published {res.modified_count} previously-pending products")

    # ---------- 5. Darcity vendor login ----------
    darcity = await db.partners.find_one({"name": {"$regex": "darcity", "$options": "i"}})
    if not darcity:
        print("[5] Darcity partner not found — skipping vendor login creation.")
        return
    partner_id = darcity.get("id") or str(darcity.get("_id"))

    existing = await db.users.find_one({"email": DARCITY_VENDOR_EMAIL})
    import bcrypt
    hashed = bcrypt.hashpw(DARCITY_VENDOR_PASSWORD.encode(), bcrypt.gensalt()).decode()

    vendor_doc = {
        "id": existing.get("id") if existing else str(uuid.uuid4()),
        "email": DARCITY_VENDOR_EMAIL,
        "full_name": "Darcity Promotion",
        "company_name": "Darcity Promotion Ltd",
        "phone": "+255754000000",
        "role": "partner_vendor",
        "partner_id": partner_id,
        "password": hashed,
        "is_active": True,
        "is_verified": True,
        "country_code": "TZ",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if existing:
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {k: v for k, v in vendor_doc.items() if k != "id"}})
        print(f"[5] Updated Darcity vendor user ({DARCITY_VENDOR_EMAIL}) — linked to partner {partner_id}")
    else:
        await db.users.insert_one(vendor_doc)
        print(f"[5] Created Darcity vendor user {DARCITY_VENDOR_EMAIL} (role=partner_vendor) linked to partner {partner_id}")
    # Also mirror onto the partner doc
    await db.partners.update_one(
        {"_id": darcity["_id"]},
        {"$set": {
            "email": DARCITY_VENDOR_EMAIL,
            "primary_contact_email": DARCITY_VENDOR_EMAIL,
            "portal_user_email": DARCITY_VENDOR_EMAIL,
        }},
    )
    print(f"    → Password: {DARCITY_VENDOR_PASSWORD}")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    print("=== Go-Live Cleanup ===")
    await cleanup(db)
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
