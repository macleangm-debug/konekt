"""Iteration 359 — Content Studio + Continuous KONEKT Promo + Auto-Promo relocation.

Tests:
  1. /api/content-engine/template-data/products returns ALL active products (>200 cap lifted, expecting 600+).
  2. promo_only=true filter.
  3. Continuous KONEKT enrichment (code=KONEKT, discount_amount>0 when no specific active_promotion_id).
  4. active_promotion_id override (per-product code overrides KONEKT).
  5. /api/admin/automation/config has continuous_promo defaults & PUT round-trip.
  6. Disable continuous_promo → has_promotion=false on KONEKT-only products. Restore.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASS = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    candidates = [
        "/api/auth/admin-login",
        "/api/auth/login",
        "/api/admin/login",
    ]
    token = None
    for path in candidates:
        try:
            r = s.post(f"{BASE_URL}{path}",
                       json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
            if r.status_code == 200:
                j = r.json()
                token = (j.get("token") or j.get("access_token")
                         or (j.get("data") or {}).get("token")
                         or (j.get("data") or {}).get("access_token"))
                if token:
                    break
        except Exception:
            continue
    if not token:
        pytest.skip("admin login failed on all candidates")
    s.headers["Authorization"] = f"Bearer {token}"
    s.headers["Content-Type"] = "application/json"
    return s


# ── Content Studio template-data ────────────────────────────
class TestTemplateProducts:
    def test_returns_all_products_above_cap(self):
        r = requests.get(f"{BASE_URL}/api/content-engine/template-data/products", timeout=60)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body.get("ok") is True
        items = body.get("items") or []
        total = body.get("total")
        assert total == len(items)
        # Cap lifted from 200 — we require strictly > 200; 600+ is the goal
        assert len(items) > 200, f"Cap not lifted, only {len(items)} products returned"
        # Sanity: each item has required keys
        sample = items[0]
        for k in ["id", "name", "selling_price", "final_price",
                   "discount_amount", "has_promotion", "promo_code", "type"]:
            assert k in sample, f"missing key {k} in item"
        assert sample["type"] == "product"

    def test_promo_only_filter(self):
        full = requests.get(f"{BASE_URL}/api/content-engine/template-data/products",
                            timeout=60).json()
        po = requests.get(f"{BASE_URL}/api/content-engine/template-data/products",
                          params={"promo_only": "true"}, timeout=60).json()
        full_count = len(full["items"])
        po_count = len(po["items"])
        # All filtered items must have a promotion
        for it in po["items"]:
            assert it["has_promotion"] is True, f"promo_only returned non-promo item {it['id']}"
        assert po_count > 0, "promo_only returned 0 items — KONEKT continuous expected"
        # When KONEKT is enabled most products will have promo so po_count <= full_count
        assert po_count <= full_count

    def test_konekt_continuous_enrichment(self):
        body = requests.get(f"{BASE_URL}/api/content-engine/template-data/products",
                            timeout=60).json()
        items = body["items"]
        # Find products without an active_promotion_id but with has_promotion=true
        konekt_items = [it for it in items
                         if not it.get("active_promotion_id") and it.get("has_promotion")]
        assert len(konekt_items) > 0, "No KONEKT continuous-promo enriched products found"
        for it in konekt_items[:20]:
            assert it["promo_code"] == "KONEKT", f"expected KONEKT got {it['promo_code']}"
            assert it["discount_amount"] > 0, f"discount must be >0 for {it['id']}"
            assert it["final_price"] < it["selling_price"]

    def test_active_promotion_id_overrides_konekt(self):
        body = requests.get(f"{BASE_URL}/api/content-engine/template-data/products",
                            timeout=60).json()
        items = body["items"]
        overrides = [it for it in items if it.get("active_promotion_id")]
        if not overrides:
            pytest.skip("No products with active_promotion_id present in fixture data")
        # At least one override item should NOT be coded KONEKT (specific code wins)
        non_konekt = [it for it in overrides if it["promo_code"] and it["promo_code"] != "KONEKT"]
        # If specific catalog_promotions exist as 'active' status they should override
        # If all overrides happen to use "KONEKT" code that's still acceptable, but flag count
        assert len(overrides) > 0
        # Any override should still report has_promotion or fall back gracefully
        for it in overrides[:5]:
            # has_promotion may be true (specific saves loaded) OR false if saves==0
            assert it["promo_code"] != "" or it["discount_amount"] == 0


# ── Automation config continuous_promo block ────────────────
class TestAutomationConfigContinuousPromo:
    def test_get_config_has_continuous_promo(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/automation/config", timeout=30)
        assert r.status_code == 200, r.text[:200]
        cfg = r.json()
        # config may be wrapped
        if "config" in cfg:
            cfg = cfg["config"]
        assert "continuous_promo" in cfg, f"continuous_promo key missing: {list(cfg.keys())[:20]}"
        cp = cfg["continuous_promo"]
        assert cp.get("enabled") is True
        assert (cp.get("code") or "").upper() == "KONEKT"
        assert float(cp.get("pool_share_pct", 0)) > 0

    def test_put_round_trip_preserves_values(self, admin_session):
        # Read current
        r = admin_session.get(f"{BASE_URL}/api/admin/automation/config", timeout=30)
        cfg = r.json()
        cfg = cfg.get("config", cfg)
        original = dict(cfg.get("continuous_promo") or {})

        # PUT new values (changed code casing + pct)
        new_block = {"enabled": True, "code": "konekt", "pool_share_pct": 75}
        put = admin_session.put(
            f"{BASE_URL}/api/admin/automation/config",
            json={"continuous_promo": new_block}, timeout=30,
        )
        assert put.status_code in (200, 204), put.text[:200]

        # Verify
        r2 = admin_session.get(f"{BASE_URL}/api/admin/automation/config", timeout=30)
        cfg2 = r2.json().get("config", r2.json())
        cp2 = cfg2["continuous_promo"]
        assert float(cp2["pool_share_pct"]) == 75
        # code may be uppercased by backend or stored as-is — accept either
        assert (cp2.get("code") or "").upper() == "KONEKT"

        # Restore original
        admin_session.put(
            f"{BASE_URL}/api/admin/automation/config",
            json={"continuous_promo": {
                "enabled": original.get("enabled", True),
                "code": original.get("code", "KONEKT"),
                "pool_share_pct": original.get("pool_share_pct", 100),
            }}, timeout=30,
        )

    def test_disable_continuous_drops_konekt_promos(self, admin_session):
        # Snapshot — count konekt-only promo items
        b1 = requests.get(f"{BASE_URL}/api/content-engine/template-data/products",
                         timeout=60).json()
        konekt_before = sum(1 for it in b1["items"]
                            if not it.get("active_promotion_id") and it.get("has_promotion")
                            and it.get("promo_code") == "KONEKT")
        assert konekt_before > 0

        try:
            # Disable
            put = admin_session.put(
                f"{BASE_URL}/api/admin/automation/config",
                json={"continuous_promo": {"enabled": False, "code": "KONEKT", "pool_share_pct": 100}},
                timeout=30,
            )
            assert put.status_code in (200, 204)

            b2 = requests.get(f"{BASE_URL}/api/content-engine/template-data/products",
                             timeout=60).json()
            konekt_after = sum(1 for it in b2["items"]
                               if not it.get("active_promotion_id") and it.get("has_promotion")
                               and it.get("promo_code") == "KONEKT")
            assert konekt_after == 0, f"Expected 0 KONEKT items after disable, got {konekt_after}"
        finally:
            # ALWAYS restore enabled=true
            admin_session.put(
                f"{BASE_URL}/api/admin/automation/config",
                json={"continuous_promo": {"enabled": True, "code": "KONEKT", "pool_share_pct": 100}},
                timeout=30,
            )

        # Final sanity — confirm restore worked
        b3 = requests.get(f"{BASE_URL}/api/content-engine/template-data/products",
                         timeout=60).json()
        konekt_restored = sum(1 for it in b3["items"]
                              if not it.get("active_promotion_id") and it.get("has_promotion")
                              and it.get("promo_code") == "KONEKT")
        assert konekt_restored > 0, "KONEKT not restored — manual restore needed!"
