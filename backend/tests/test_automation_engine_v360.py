"""Iteration 360 — Automation Engine Draft → Review → Publish flow + strict
attribution + renewal notifications + cleanup verification."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


def _noop():
    """Compat shim placeholder."""
    return None


def _make_synthetic_draft(mdb, status="draft"):
    """Insert a synthetic engine draft tied to a real product."""
    product = mdb.products.find_one({"is_active": True, "vendor_cost": {"$gt": 0}})
    if not product:
        return None
    pid = product["id"]
    cur = float(product.get("customer_price") or product.get("base_price") or 1000)
    sug = round(cur * 0.9 / 100) * 100
    if sug >= cur:
        sug = cur - 100
    draft = {
        "id": f"TEST_DRAFT_{uuid4().hex[:8]}",
        "name": f"TEST Auto · {product.get('name')}",
        "scope": {"branch": product.get("branch") or "", "skus": []},
        "pools": ["promotion"],
        "status": status,
        "auto_created": True,
        "engine_origin": "automation",
        "product_ids": [pid],
        "code": "",
        "promo_code_required": False,
        "start_date": datetime.now(timezone.utc).date().isoformat(),
        "end_date": (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "preview": {
            "product_id": pid,
            "product_name": product.get("name"),
            "category": product.get("branch") or "",
            "current_price": cur,
            "suggested_price": sug,
            "save_tzs": cur - sug,
            "save_pct": round((cur - sug) / cur * 100, 1) if cur else 0,
            "duration_days": 7,
        },
    }
    mdb.catalog_promotions.insert_one(draft)
    return draft


# ── 1. Drafts list ──────────────────────────────────────────
def test_get_drafts(headers):
    r = requests.get(f"{BASE_URL}/api/admin/automation/drafts", headers=headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "drafts" in data and "count" in data
    assert isinstance(data["drafts"], list)
    assert data["count"] == len(data["drafts"])
    if data["count"] > 0:
        d = data["drafts"][0]
        assert "id" in d and "name" in d
        assert "preview" in d
        prev = d["preview"]
        for k in ("product_id", "current_price", "suggested_price",
                  "save_tzs", "duration_days"):
            assert k in prev, f"missing preview.{k}"
        # category, code, pools, start/end_date all surfaced
        for k in ("category", "code", "pools", "start_date", "end_date", "duration_days"):
            assert k in d


# ── 2. Run Now creates DRAFTs that don't modify products ────
def test_run_now_creates_drafts_without_price_change(headers, db):
    mdb = db
    # Ensure engine enabled
    cfg = requests.get(f"{BASE_URL}/api/admin/automation/config", headers=headers).json()
    if not cfg.get("enabled"):
        requests.put(f"{BASE_URL}/api/admin/automation/config",
                     headers=headers, json={"enabled": True})

    r = requests.post(f"{BASE_URL}/api/admin/automation/run",
                      headers=headers,
                      json={"promotions": True, "group_deals": False,
                            "finalize_deals": False, "dry_run": False},
                      timeout=60)
    assert r.status_code == 200
    rep = r.json().get("promotions", {})
    # Either created some or already-at-quota (count drafts toward quota)
    drafts_resp = requests.get(f"{BASE_URL}/api/admin/automation/drafts",
                                headers=headers).json()
    drafts = drafts_resp["drafts"]
    if not drafts:
        pytest.skip("No drafts in queue to inspect")

    sample = drafts[0]
    # Fetch the doc directly to confirm status='draft' + auto_created=true
    doc = mdb.catalog_promotions.find_one({"id": sample["id"]})
    assert doc is not None
    assert doc["status"] == "draft"
    assert doc["auto_created"] is True
    assert "preview" in doc
    pid = doc["preview"]["product_id"]
    # Verify product was NOT modified by draft creation
    product = mdb.products.find_one({"id": pid})
    if product:
        # active_promotion_id should not equal this draft id (might be unset or other)
        assert product.get("active_promotion_id") != sample["id"], \
            "Draft must not set product.active_promotion_id"


# ── 3. Approve with code ────────────────────────────────────
def test_approve_draft_with_code(headers, db):
    mdb = db
    draft = _make_synthetic_draft(mdb)
    if not draft:
        pytest.skip("Could not create synthetic draft")
    d_id = draft["id"]
    pid = draft["preview"]["product_id"]
    cur = draft["preview"]["current_price"]
    sug = draft["preview"]["suggested_price"]

    r = requests.post(f"{BASE_URL}/api/admin/automation/drafts/{d_id}/approve",
                      headers=headers,
                      json={"code": "cooltex", "required": True},
                      timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["code"] == "COOLTEX"  # uppercased

    promo = mdb.catalog_promotions.find_one({"id": d_id})
    assert promo["status"] == "active"
    assert promo["code"] == "COOLTEX"
    assert promo["promo_code_required"] is True

    product = mdb.products.find_one({"id": pid})
    assert product is not None
    assert product["active_promotion_id"] == d_id
    assert abs(float(product["customer_price"]) - sug) < 0.5
    assert abs(float(product["original_price"]) - cur) < 0.5

    # Cleanup: revert product + delete promo
    mdb.products.update_one({"id": pid},
        {"$set": {"customer_price": cur, "base_price": cur, "original_price": cur},
         "$unset": {"active_promotion_id": "", "active_promotion_label": "",
                    "promo_saves_tzs": "", "promo_blocks": ""}})
    mdb.catalog_promotions.delete_one({"id": d_id})


# ── 4. Approve open promo (no code) ─────────────────────────
def test_approve_draft_open(headers, db):
    mdb = db
    draft = _make_synthetic_draft(mdb)
    if not draft:
        pytest.skip("Could not create synthetic draft")
    d_id = draft["id"]
    pid = draft["preview"]["product_id"]
    cur = draft["preview"]["current_price"]
    r = requests.post(f"{BASE_URL}/api/admin/automation/drafts/{d_id}/approve",
                      headers=headers, json={}, timeout=30)
    assert r.status_code == 200
    promo = mdb.catalog_promotions.find_one({"id": d_id})
    assert promo["status"] == "active"
    assert promo.get("code", "") == ""
    assert promo.get("promo_code_required") is False
    # Cleanup
    mdb.products.update_one({"id": pid},
        {"$set": {"customer_price": cur, "base_price": cur, "original_price": cur},
         "$unset": {"active_promotion_id": "", "active_promotion_label": "",
                    "promo_saves_tzs": "", "promo_blocks": ""}})
    mdb.catalog_promotions.delete_one({"id": d_id})


# ── 5. Reject deletes draft ─────────────────────────────────
def test_reject_draft(headers, db):
    mdb = db
    draft = _make_synthetic_draft(mdb)
    if not draft:
        pytest.skip("Could not create synthetic draft")
    d_id = draft["id"]
    r = requests.post(f"{BASE_URL}/api/admin/automation/drafts/{d_id}/reject",
                      headers=headers, timeout=30)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    found = mdb.catalog_promotions.find_one({"id": d_id})
    assert found is None


# ── 6. Approve-all ──────────────────────────────────────────
def test_approve_all(headers, db):
    mdb = db
    # Make sure there are some drafts; trigger run-now to be safe
    requests.post(f"{BASE_URL}/api/admin/automation/run", headers=headers,
                  json={"promotions": True, "group_deals": False,
                        "finalize_deals": False, "dry_run": False}, timeout=60)
    before = requests.get(f"{BASE_URL}/api/admin/automation/drafts",
                           headers=headers).json()["count"]
    r = requests.post(f"{BASE_URL}/api/admin/automation/drafts/approve-all",
                      headers=headers, timeout=120)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["approved"] == before
    after = requests.get(f"{BASE_URL}/api/admin/automation/drafts",
                          headers=headers).json()["count"]
    assert after == 0


# ── 7. Strict performance attribution ───────────────────────
def test_performance_strict_attribution(headers, db):
    mdb = db
    # Pick a recent active engine promo (within last day) so orders fit window
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    promo = mdb.catalog_promotions.find_one(
        {"auto_created": True, "status": "active",
         "product_ids": {"$exists": True, "$ne": []},
         "created_at": {"$gte": cutoff}},
        sort=[("created_at", -1)])
    if not promo:
        pytest.skip("No recent active engine promo to attribute against")
    pid = promo["product_ids"][0]
    promo_created = promo["created_at"]
    # parse promo_created into datetime
    if isinstance(promo_created, str):
        pc_dt = datetime.fromisoformat(promo_created.replace("Z", "+00:00"))
    else:
        pc_dt = promo_created
    if pc_dt.tzinfo is None:
        pc_dt = pc_dt.replace(tzinfo=timezone.utc)

    pre_id = f"TEST_PRE_{uuid4().hex[:8]}"
    post_id = f"TEST_POST_{uuid4().hex[:8]}"
    pre_order = {
        "id": pre_id,
        "created_at": (pc_dt - timedelta(days=2)).isoformat(),
        "items": [{"product_id": pid, "quantity": 1, "unit_price": 5000}],
    }
    post_order = {
        "id": post_id,
        "created_at": (pc_dt + timedelta(minutes=5)).isoformat(),
        "items": [{"product_id": pid, "quantity": 1, "unit_price": 5000}],
    }
    mdb.orders.insert_many([pre_order, post_order])

    try:
        r = requests.get(f"{BASE_URL}/api/admin/automation/performance",
                          headers=headers, timeout=60)
        assert r.status_code == 200
        data = r.json()
        # Find this promo in top performers or dead promos
        all_promos = (data["promotions"]["top_performers"]
                      + data["promotions"]["dead_promos"])
        match = next((p for p in all_promos if p["promo_id"] == promo["id"]), None)
        assert match is not None, "promo not in performance output"
        # Must count ONLY post order (1 order, 5000 revenue) — pre excluded
        assert match["orders"] == 1, f"expected 1 (post only), got {match['orders']}"
        assert abs(match["revenue"] - 5000) < 0.5
    finally:
        mdb.orders.delete_many({"id": {"$in": [pre_id, post_id]}})


# ── 8. Renewal notifications sweep ──────────────────────────
def test_sweep_renewals(headers, db):
    mdb = db
    # Insert a synthetic expired engine promo
    fake_id = f"TEST_RENEW_{uuid4().hex[:8]}"
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
    promo = {
        "id": fake_id,
        "name": "TEST renewal promo",
        "auto_created": True,
        "status": "active",
        "end_date": yesterday,
        "scope": {"branch": "TestCat"},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "product_ids": [],
    }
    mdb.catalog_promotions.insert_one(promo)
    try:
        r = requests.post(f"{BASE_URL}/api/admin/automation/notifications/sweep-renewals",
                          headers=headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["emitted"] >= 1
        # admin_notifications row exists
        notif = mdb.admin_notifications.find_one(
            {"promo_id": fake_id, "kind": "promo_expiry_renewal"})
        assert notif is not None
        # Promo marked
        updated = mdb.catalog_promotions.find_one({"id": fake_id})
        assert updated.get("renewal_notified_at")
        # Idempotent — second sweep should not re-emit
        r2 = requests.post(f"{BASE_URL}/api/admin/automation/notifications/sweep-renewals",
                            headers=headers, timeout=30)
        # this promo shouldn't be re-emitted (renewal_notified_at set)
        notif_count = mdb.admin_notifications.count_documents(
            {"promo_id": fake_id, "kind": "promo_expiry_renewal"})
        assert notif_count == 1
    finally:
        mdb.catalog_promotions.delete_one({"id": fake_id})
        mdb.admin_notifications.delete_many({"promo_id": fake_id})


# ── 9. Branding template — phone/trading_name/tagline ─────
def test_branding_template_phone_source(headers, db):
    mdb = db
    r = requests.get(f"{BASE_URL}/api/content-engine/template-data/branding",
                      headers=headers, timeout=30)
    assert r.status_code == 200
    body = r.json()
    # Endpoint returns {ok, branding: {...}}
    data = body.get("branding") or body
    assert "phone" in data
    assert "trading_name" in data
    assert "tagline" in data
    # Verify it sources from business_profile.support_phone if set
    profile = mdb.settings_hub.find_one(
        {"_id": "business_profile"}) or {}
    legacy = mdb.business_settings.find_one({}) or {}
    expected_phone = profile.get("support_phone") or legacy.get("phone") or ""
    if expected_phone:
        assert data["phone"] == expected_phone


# ── 10. Cleanup verification ────────────────────────────────
def test_cleanup_test_data(db):
    mdb = db
    test_email_re = {"$regex": "@example.com|@test.com", "$options": "i"}
    aff_count = mdb.affiliates.count_documents({"email": test_email_re})
    assert aff_count == 0, f"Found {aff_count} test affiliates"
    app_count = mdb.affiliate_applications.count_documents(
        {"email": test_email_re})
    assert app_count == 0, f"Found {app_count} test affiliate applications"
    user_count = mdb.users.count_documents({
        "email": test_email_re,
        "role": {"$nin": ["admin", "super_admin", "sales", "ops"]},
    })
    assert user_count == 0, f"Found {user_count} test users"


# ── 11. Teardown — leave clean state ────────────────────────
def test_teardown_clean_drafts(headers, db):
    mdb = db
    # Reject any remaining drafts
    drafts = requests.get(f"{BASE_URL}/api/admin/automation/drafts",
                           headers=headers).json()["drafts"]
    for d in drafts:
        requests.post(f"{BASE_URL}/api/admin/automation/drafts/{d['id']}/reject",
                       headers=headers, timeout=15)
    # Disable engine
    requests.put(f"{BASE_URL}/api/admin/automation/config",
                  headers=headers, json={"enabled": False}, timeout=15)
    after = requests.get(f"{BASE_URL}/api/admin/automation/drafts",
                          headers=headers).json()["count"]
    assert after == 0
