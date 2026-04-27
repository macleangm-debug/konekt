"""
P1 Pack — Feb 27, 2026
─────────────────────────────────────────────────────────────────────────────
Covers the 5 P1 items shipped this round:
  1. promo_blocks consumer audit (referral / affiliate / sales)
  2. Bell-icon notification routing → unified `notifications` collection
  3. Vendor-driven group-deal flow (suggest endpoint)
  4. (UI) "Why Konekt" Content Studio template — covered by lint + screenshot
  5. (UI) Promo Focus card vs full-creative parity — covered by lint + screenshot

This file exercises only the backend-testable parts.
"""
import os
import sys
import asyncio
import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


@pytest.fixture
async def db():
    client = AsyncIOMotorClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


# ── 1. promo_blocks ─────────────────────────────────────────
@pytest.mark.asyncio
async def test_compute_eligible_amount_excludes_blocked_products(db):
    """Items whose product has promo_blocks.<channel>=true are excluded."""
    from services.promo_blocks_service import compute_eligible_amount

    pid_blocked = f"test_blk_{uuid4().hex[:8]}"
    pid_open = f"test_open_{uuid4().hex[:8]}"
    await db.products.insert_many([
        {"id": pid_blocked, "promo_blocks": {"affiliate": True, "referral": True}},
        {"id": pid_open, "promo_blocks": {}},
    ])
    try:
        items = [
            {"product_id": pid_blocked, "quantity": 2, "unit_price": 5_000},
            {"product_id": pid_open, "quantity": 1, "unit_price": 12_000},
        ]
        eligible_aff, blocked_aff = await compute_eligible_amount(db, items, "affiliate")
        assert eligible_aff == 12_000
        assert blocked_aff == [pid_blocked]

        eligible_ref, _ = await compute_eligible_amount(db, items, "referral")
        assert eligible_ref == 12_000

        # Sales is not blocked on either product → full amount eligible.
        eligible_sal, blocked_sal = await compute_eligible_amount(db, items, "sales")
        assert eligible_sal == 22_000
        assert blocked_sal == []
    finally:
        await db.products.delete_many({"id": {"$in": [pid_blocked, pid_open]}})


@pytest.mark.asyncio
async def test_referral_reward_skips_blocked_lines(db):
    """calculate_tier_aware_referral_reward must skip lines whose product is
    blocked on the referral pool."""
    from referral_hooks import calculate_tier_aware_referral_reward

    pid = f"test_refblk_{uuid4().hex[:8]}"
    await db.products.insert_one({
        "id": pid,
        "promo_blocks": {"referral": True},
    })
    try:
        order = {
            "items": [
                {"product_id": pid, "vendor_price": 1000, "quantity": 5},
            ],
        }
        reward = await calculate_tier_aware_referral_reward(db, order)
        assert reward == 0.0
    finally:
        await db.products.delete_one({"id": pid})


# ── 2. Bell notification routing ────────────────────────────
@pytest.mark.asyncio
async def test_promo_renewal_notifications_land_in_notifications_collection(db):
    """emit_expiry_renewal_notifications writes to db.notifications with
    recipient_role='admin' so the existing NotificationBell picks it up."""
    from services.automation_engine_service import emit_expiry_renewal_notifications

    pid = f"test_promo_{uuid4().hex[:8]}"
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
    promo = {
        "id": pid,
        "name": "Test Auto Promo for Renewal",
        "auto_created": True,
        "status": "active",
        "end_date": yesterday,
        "scope": {"branch": "Promotional Materials"},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.catalog_promotions.insert_one(promo)
    try:
        emitted = await emit_expiry_renewal_notifications(db)
        assert emitted >= 1

        notif = await db.notifications.find_one({
            "kind": "promo_expiry_renewal",
            "promo_id": pid,
        }, {"_id": 0})
        assert notif is not None
        assert notif["recipient_role"] == "admin"
        assert notif["is_read"] is False
        assert notif["target_url"] == "/admin/promotions-manager"
        assert "Test Auto Promo for Renewal" in notif["title"]

        # Idempotent: a second sweep should not duplicate.
        prev = await db.notifications.count_documents({"promo_id": pid})
        await emit_expiry_renewal_notifications(db)
        cur = await db.notifications.count_documents({"promo_id": pid})
        assert cur == prev
    finally:
        await db.notifications.delete_many({"promo_id": pid})
        await db.catalog_promotions.delete_one({"id": pid})


# ── 3. Vendor-driven group deal suggester ───────────────────
@pytest.mark.asyncio
async def test_vendor_driven_deal_suggester_math(db):
    """suggest-from-vendor returns a discounted price between vendor_best_price
    and the current customer_price, with the customer share applied."""
    import httpx
    import jwt as pyjwt

    JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")
    token = pyjwt.encode({"role": "admin", "is_admin": True, "user_id": "p1-test"}, JWT_SECRET, algorithm="HS256")

    pid = f"test_vd_{uuid4().hex[:8]}"
    await db.products.insert_one({
        "id": pid,
        "name": "Test Vendor Deal Product",
        "vendor_cost": 25_000,
        "customer_price": 33_750,
        "base_price": 33_750,
        "is_active": True,
    })
    try:
        # Use the local app URL via the supervisor backend port.
        backend_url = "http://localhost:8001"
        async with httpx.AsyncClient(base_url=backend_url, timeout=15) as cx:
            r = await cx.post(
                "/api/admin/group-deals/suggest-from-vendor",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "product_id": pid,
                    "vendor_best_price": 18_500,
                    "customer_share_pct": 50,
                },
            )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["product_id"] == pid
        assert data["vendor_best_price"] == 18_500
        assert data["current_customer_price"] == 33_750
        # Saving = 25,000 - 18,500 = 6,500. Customer share 50% = 3,250 (rounded to 3,250)
        # Discounted price ≈ 33,750 - 3,250 = 30,500
        assert 30_000 <= data["suggested_discounted_price"] <= 31_000
        # Margin at deal must be positive
        assert data["margin_per_unit_at_deal"] > 0
        # Display target sane default
        assert data["suggested_display_target"] >= 20
    finally:
        await db.products.delete_one({"id": pid})
