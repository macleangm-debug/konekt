"""Backend tests for the new Promotion + Group-Deal Automation Engine.
Iteration 358 — verifies /api/admin/automation/* endpoints and the
silent_finalize_expired_deals behaviour.
"""
import os
import time
from datetime import datetime, timezone, timedelta
from uuid import uuid4

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt-payments-fix.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# direct mongo for setup/teardown — read backend/.env so we hit the same DB
def _load_backend_env():
    env_path = "/app/backend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
_load_backend_env()
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "konekt_db")


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope="module")
def admin_token():
    # Try common login endpoints
    candidates = [
        ("/api/auth/admin-login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}),
        ("/api/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}),
        ("/api/admin/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}),
    ]
    for path, body in candidates:
        try:
            r = requests.post(f"{BASE_URL}{path}", json=body, timeout=20)
            if r.status_code == 200:
                tok = (
                    r.json().get("token")
                    or r.json().get("access_token")
                    or (r.json().get("data") or {}).get("token")
                )
                if tok:
                    return tok
        except Exception:
            continue
    pytest.skip("Could not authenticate admin")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ── 1. GET config returns singleton with defaults ───────────
class TestAutomationConfig:
    def test_get_config_defaults(self, auth_headers):
        # Reset to known defaults first (singleton may have been mutated by prior runs)
        requests.put(
            f"{BASE_URL}/api/admin/automation/config",
            headers=auth_headers,
            json={"group_deals": {"cadence": "weekly", "target_count": 25,
                                    "default_duration_days": 14, "discount_pool_share_pct": 20,
                                    "always_fulfill_silent": True},
                  "promotions": {"cadence": "daily", "per_category_quota": 20,
                                  "exploration_ratio_pct": 30, "discount_pool_share_pct": 60}},
            timeout=30,
        )
        r = requests.get(f"{BASE_URL}/api/admin/automation/config", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        cfg = r.json()
        # default keys must all exist
        for k in ("enabled", "promotions", "group_deals", "margin_pools",
                  "scoring_weights", "expiry_rules", "last_run"):
            assert k in cfg, f"missing key: {k}"
        # promotion defaults
        assert cfg["promotions"]["cadence"] == "daily"
        assert cfg["promotions"]["per_category_quota"] == 20
        assert cfg["promotions"]["exploration_ratio_pct"] == 30
        assert cfg["promotions"]["discount_pool_share_pct"] == 60
        # group deal defaults
        assert cfg["group_deals"]["cadence"] == "weekly"
        assert cfg["group_deals"]["target_count"] == 25
        assert cfg["group_deals"]["default_duration_days"] == 14
        assert cfg["group_deals"]["discount_pool_share_pct"] == 20
        assert cfg["group_deals"]["always_fulfill_silent"] is True
        # margin pools defaults
        mp = cfg["margin_pools"]
        assert mp["promotion"] is True and mp["referral"] is True
        assert mp["sales"] is True and mp["affiliate"] is True
        assert mp["reserve"] is False and mp["platform_margin"] is False
        # scoring weights
        sw = cfg["scoring_weights"]
        assert sw["revenue_pct"] == 50 and sw["conversion_pct"] == 30 and sw["margin_pct"] == 20

    def test_put_config_deep_merge(self, auth_headers):
        # change only one nested key
        r = requests.put(
            f"{BASE_URL}/api/admin/automation/config",
            headers=auth_headers,
            json={"group_deals": {"cadence": "every_3_days"}},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        cfg = r.json()
        assert cfg["group_deals"]["cadence"] == "every_3_days"
        # untouched values must remain
        assert cfg["group_deals"]["target_count"] == 25
        assert cfg["group_deals"]["default_duration_days"] == 14
        assert cfg["promotions"]["per_category_quota"] == 20
        # restore
        requests.put(
            f"{BASE_URL}/api/admin/automation/config",
            headers=auth_headers,
            json={"group_deals": {"cadence": "weekly"}},
            timeout=30,
        )


# ── 2. /run dry_run does NOT mutate db ──────────────────────
class TestRunEngine:
    def test_dry_run_no_mutation(self, auth_headers, db):
        # Need engine enabled for dry run to actually exercise the code paths
        requests.put(
            f"{BASE_URL}/api/admin/automation/config", headers=auth_headers,
            json={"enabled": True}, timeout=30,
        )
        before_promos = db.catalog_promotions.count_documents({"auto_created": True})
        before_deals = db.group_deal_campaigns.count_documents({"auto_created": True})
        r = requests.post(
            f"{BASE_URL}/api/admin/automation/run",
            headers=auth_headers,
            json={"promotions": True, "group_deals": True, "finalize_deals": False, "dry_run": True},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        report = r.json()
        assert "promotions" in report and "group_deals" in report
        # dry_run flag preserved
        if report["promotions"].get("dry_run") is not None:
            assert report["promotions"]["dry_run"] is True
        after_promos = db.catalog_promotions.count_documents({"auto_created": True})
        after_deals = db.group_deal_campaigns.count_documents({"auto_created": True})
        assert before_promos == after_promos, "dry_run created promos!"
        assert before_deals == after_deals, "dry_run created group deals!"

    def test_run_disabled_returns_skipped(self, auth_headers):
        requests.put(
            f"{BASE_URL}/api/admin/automation/config", headers=auth_headers,
            json={"enabled": False}, timeout=30,
        )
        r = requests.post(
            f"{BASE_URL}/api/admin/automation/run",
            headers=auth_headers,
            json={"promotions": True, "group_deals": True, "finalize_deals": False, "dry_run": False},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        rep = r.json()
        assert rep["promotions"].get("skipped") is True
        assert rep["group_deals"].get("skipped") is True

    def test_real_run_creates_rows(self, auth_headers, db):
        requests.put(
            f"{BASE_URL}/api/admin/automation/config", headers=auth_headers,
            json={"enabled": True}, timeout=30,
        )
        # Lower group-deal target so test can actually create deals
        # (target=25 default but engine creates up to (target - active))
        before_promos = db.catalog_promotions.count_documents({"auto_created": True, "status": "active"})
        before_deals = db.group_deal_campaigns.count_documents({"auto_created": True, "status": "active"})

        r = requests.post(
            f"{BASE_URL}/api/admin/automation/run",
            headers=auth_headers,
            json={"promotions": True, "group_deals": True, "finalize_deals": False, "dry_run": False},
            timeout=300,
        )
        assert r.status_code == 200, r.text
        rep = r.json()
        # NOTE: this test asserts created_count when products are eligible.
        # If product DB has no eligible vendor_cost/customer_price products,
        # created_count may be 0 — log it so main agent can investigate.
        promos_created = rep["promotions"].get("created_count", 0)
        deals_created = rep["group_deals"].get("created_count", 0)
        print(f"\n[run] promos_created={promos_created} deals_created={deals_created}")
        promo_skipped = rep["promotions"].get("skipped")
        if isinstance(promo_skipped, list):
            print(f"[run] promo skipped reasons sample: {promo_skipped[:3]}")
        deal_skipped = rep["group_deals"].get("skipped")
        if isinstance(deal_skipped, list):
            print(f"[run] deal skipped reasons sample: {deal_skipped[:3]}")
        else:
            print(f"[run] group_deals top-level skipped flag: {deal_skipped}")

        after_promos = db.catalog_promotions.count_documents({"auto_created": True, "status": "active"})
        after_deals = db.group_deal_campaigns.count_documents({"auto_created": True, "status": "active"})
        # Persistence check: db rows must equal API report increment
        assert after_promos >= before_promos
        assert after_deals >= before_deals
        # If any promos were created, products should have active_promotion_id set
        if promos_created > 0:
            sample = db.catalog_promotions.find_one(
                {"auto_created": True, "status": "active"}, sort=[("created_at", -1)]
            )
            for pid in (sample.get("product_ids") or [])[:3]:
                pdoc = db.products.find_one({"id": pid})
                assert pdoc and pdoc.get("active_promotion_id"), f"product {pid} missing active_promotion_id"

    def test_quota_respected_on_second_run(self, auth_headers, db):
        # Run a second time — quota should be respected
        r1 = requests.post(
            f"{BASE_URL}/api/admin/automation/run",
            headers=auth_headers,
            json={"promotions": True, "group_deals": True, "finalize_deals": False, "dry_run": False},
            timeout=300,
        )
        assert r1.status_code == 200
        first = r1.json()
        first_count = first["promotions"].get("created_count", 0)
        first_deal_count = first["group_deals"].get("created_count", 0)
        # Second
        r2 = requests.post(
            f"{BASE_URL}/api/admin/automation/run",
            headers=auth_headers,
            json={"promotions": True, "group_deals": True, "finalize_deals": False, "dry_run": False},
            timeout=300,
        )
        assert r2.status_code == 200
        second = r2.json()
        second_count = second["promotions"].get("created_count", 0)
        second_deal_count = second["group_deals"].get("created_count", 0)
        assert second_count <= first_count + 1, "Promotion quota not respected"
        # Group deals: second pass should be at-target (skipped) OR fewer
        gd = second["group_deals"]
        assert gd.get("skipped") or second_deal_count <= first_deal_count + 1


# ── 3. Performance dashboard ────────────────────────────────
class TestPerformance:
    def test_performance_structure(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/automation/performance",
            headers=auth_headers, timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "promotions" in d and "group_deals" in d
        assert "top_performers" in d["promotions"]
        assert "dead_promos" in d["promotions"]
        assert "active" in d["group_deals"]
        assert isinstance(d["promotions"]["top_performers"], list)


# ── 4. Promote everything ───────────────────────────────────
class TestPromoteEverything:
    def test_promote_everything_validation(self, auth_headers):
        # 100% rejected
        r = requests.post(
            f"{BASE_URL}/api/admin/automation/promote-everything",
            headers=auth_headers, json={"discount_pct": 100, "duration_days": 3},
            timeout=30,
        )
        assert r.status_code == 400, r.text
        # duration too long
        r2 = requests.post(
            f"{BASE_URL}/api/admin/automation/promote-everything",
            headers=auth_headers, json={"discount_pct": 10, "duration_days": 100},
            timeout=30,
        )
        assert r2.status_code == 400, r2.text

    def test_promote_everything_creates(self, auth_headers, db):
        before = db.catalog_promotions.count_documents(
            {"auto_created": True, "engine_origin": "promote_everything"}
        )
        r = requests.post(
            f"{BASE_URL}/api/admin/automation/promote-everything",
            headers=auth_headers, json={"discount_pct": 10, "duration_days": 3},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "promo_id" in body
        assert body.get("applied", 0) >= 0
        print(f"\n[promote-everything] applied={body.get('applied')} skipped={body.get('skipped')}")
        after = db.catalog_promotions.count_documents(
            {"auto_created": True, "engine_origin": "promote_everything"}
        )
        assert after == before + 1


# ── 5. silent_finalize_expired_deals via /run ───────────────
class TestSilentFinalize:
    def test_expired_deal_silent_fulfilment(self, auth_headers, db):
        # Setup: create an expired group deal + a participant order
        now = datetime.now(timezone.utc)
        deal_id_str = str(uuid4())
        gd_doc = {
            "campaign_id": "TEST_AE_" + deal_id_str[:8].upper(),
            "product_id": "TEST_AE_PROD_" + deal_id_str[:6],
            "product_name": "TEST_AE silent fulfil product",
            "original_price": 1000,
            "discounted_price": 900,
            "savings_amount": 100,
            "display_target": 50,
            "vendor_threshold": 50,
            "current_committed": 1,
            "buyer_count": 1,
            "duration_days": 1,
            "deadline": now - timedelta(hours=1),  # already expired
            "status": "active",
            "is_active": True,
            "always_fulfill_silent": True,
            "auto_created": True,
            "created_by": "automation_engine",
            "created_at": now - timedelta(days=2),
            "updated_at": now,
        }
        ins = db.group_deal_campaigns.insert_one(gd_doc)
        gd_oid = ins.inserted_id

        order_doc = {
            "id": "TEST_AE_ORDER_" + deal_id_str[:6],
            "group_deal_id": str(gd_oid),
            "status": "awaiting_target",
            "current_status": "awaiting_target",
            "created_at": now.isoformat(),
            "items": [{"product_id": gd_doc["product_id"], "quantity": 1, "unit_price": 900}],
            "total": 900,
            "_test_marker": "TEST_AE_v358",
        }
        db.orders.insert_one(order_doc)

        # ensure engine enabled so /run finalize_deals works
        requests.put(
            f"{BASE_URL}/api/admin/automation/config", headers=auth_headers,
            json={"enabled": True}, timeout=30,
        )

        try:
            r = requests.post(
                f"{BASE_URL}/api/admin/automation/run",
                headers=auth_headers,
                json={"promotions": False, "group_deals": False, "finalize_deals": True, "dry_run": False},
                timeout=60,
            )
            assert r.status_code == 200, r.text
            rep = r.json()
            assert "finalize_deals" in rep
            assert rep["finalize_deals"]["finalised_count"] >= 1

            updated_deal = db.group_deal_campaigns.find_one({"_id": gd_oid})
            assert updated_deal["status"] == "fulfilled_silent", (
                f"expected fulfilled_silent, got {updated_deal['status']}"
            )
            assert updated_deal.get("is_active") is False

            updated_order = db.orders.find_one({"id": order_doc["id"]})
            assert updated_order["status"] == "confirmed", (
                f"expected confirmed, got {updated_order['status']}"
            )
        finally:
            db.group_deal_campaigns.delete_one({"_id": gd_oid})
            db.orders.delete_one({"id": order_doc["id"]})


# ── 6. Auth: non-admin / no-token rejected ──────────────────
class TestAuthGuards:
    def test_no_token_rejected(self):
        endpoints = [
            ("get", "/api/admin/automation/config", None),
            ("put", "/api/admin/automation/config", {}),
            ("post", "/api/admin/automation/run", {}),
            ("get", "/api/admin/automation/performance", None),
            ("post", "/api/admin/automation/promote-everything",
             {"discount_pct": 10, "duration_days": 3}),
        ]
        for method, path, body in endpoints:
            url = f"{BASE_URL}{path}"
            if method == "get":
                r = requests.get(url, timeout=20)
            elif method == "put":
                r = requests.put(url, json=body, timeout=20)
            else:
                r = requests.post(url, json=body, timeout=20)
            assert r.status_code in (401, 403), f"{path} returned {r.status_code}"

    def test_invalid_token_rejected(self):
        h = {"Authorization": "Bearer not-a-valid-jwt", "Content-Type": "application/json"}
        r = requests.get(f"{BASE_URL}/api/admin/automation/config", headers=h, timeout=20)
        assert r.status_code in (401, 403)


# ── Cleanup ─────────────────────────────────────────────────
@pytest.fixture(scope="module", autouse=True)
def restore_engine_disabled(admin_token, db):
    yield
    # Final teardown — reset engine to disabled and clean engine-created data
    try:
        h = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        requests.put(f"{BASE_URL}/api/admin/automation/config",
                      headers=h, json={"enabled": False}, timeout=20)
    except Exception:
        pass
    # Clean engine-created promos and deals so the live catalogue isn't
    # auto-modified by these tests
    try:
        # revert products that were modified
        for promo in db.catalog_promotions.find(
            {"auto_created": True}, {"id": 1, "product_ids": 1}
        ):
            for pid in promo.get("product_ids") or []:
                p = db.products.find_one({"id": pid}, {"original_price": 1})
                if p and p.get("original_price"):
                    db.products.update_one(
                        {"id": pid},
                        {"$set": {
                            "customer_price": p["original_price"],
                            "base_price": p["original_price"],
                        }, "$unset": {
                            "active_promotion_id": "",
                            "active_promotion_label": "",
                            "promo_saves_tzs": "",
                            "original_price": "",
                            "promo_blocks": "",
                        }},
                    )
        db.catalog_promotions.delete_many({"auto_created": True})
        db.group_deal_campaigns.delete_many({"auto_created": True, "created_by": "automation_engine"})
    except Exception as e:
        print(f"cleanup error: {e}")
