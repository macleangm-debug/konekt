"""
Iteration 350 — Konekt B2B marketplace fork: post-hydration verification.

Verifies:
1. /api/admin/vendor-agreements/stats -> total_vendors=1, current_version='2.0'
2. /api/admin/catalog-workspace/stats -> exactly 4 categories with strict Konekt
   branch names; Promo=596, OE=14, Stationery=0, Services=0, active_products=610.
3. /api/marketplace/taxonomy -> Products group includes Office Equipment,
   Stationery, Promotional Materials. OE has >=1 active subcategory.
4. /api/marketplace/products/search?category_id=<OE> returns ~14 ID-printer products.
5. /api/admin/force-hydrate -> 200 with reports; idempotent (run twice).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt-payments-fix.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    s = requests.Session()
    # Try /api/auth/login first
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    if r.status_code == 200:
        body = r.json()
        token = body.get("access_token") or body.get("token") or body.get("jwt")
        if token:
            return token
    r = s.post(f"{BASE_URL}/api/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Vendor agreement stats ---
def test_vendor_agreement_stats(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/vendor-agreements/stats", headers=auth_headers, timeout=20)
    assert r.status_code == 200, f"stats failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    print("vendor-agreement-stats =>", data)
    assert data.get("total_vendors") == 1, f"total_vendors expected 1, got {data.get('total_vendors')}"
    assert str(data.get("current_version")) == "2.0", f"current_version expected '2.0', got {data.get('current_version')}"


# --- Catalog workspace stats ---
EXPECTED_BRANCHES = {"Promotional Materials", "Office Equipment", "Stationery", "Services"}


def test_catalog_workspace_stats(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats", headers=auth_headers, timeout=30)
    assert r.status_code == 200, f"catalog stats failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    print("catalog-workspace-stats =>", data)
    cats = data.get("categories") or []
    names = {c.get("name") for c in cats}
    assert names == EXPECTED_BRANCHES, f"Branches mismatch. Got {names}, expected {EXPECTED_BRANCHES}"
    assert data.get("category_count") == 4, f"category_count expected 4, got {data.get('category_count')}"
    assert data.get("active_products") == 610, f"active_products expected 610, got {data.get('active_products')}"
    counts = {c["name"]: c.get("product_count") for c in cats}
    assert counts.get("Promotional Materials") == 596, f"PM count={counts.get('Promotional Materials')}"
    assert counts.get("Office Equipment") == 14, f"OE count={counts.get('Office Equipment')}"
    assert counts.get("Stationery") == 0, f"Stationery count={counts.get('Stationery')}"
    assert counts.get("Services") == 0, f"Services count={counts.get('Services')}"


# --- Marketplace taxonomy ---
@pytest.fixture(scope="module")
def taxonomy_payload():
    r = requests.get(f"{BASE_URL}/api/marketplace/taxonomy", timeout=30)
    assert r.status_code == 200, f"taxonomy failed: {r.status_code} {r.text[:300]}"
    return r.json()


def _find_group(payload, name):
    for g in payload.get("groups") or []:
        if (g.get("name") or "").strip().lower() == name.lower():
            return g
    return None


def _categories_for_group(payload, group_id, active_only=True):
    return [c for c in payload.get("categories") or []
            if c.get("group_id") == group_id and (not active_only or c.get("is_active"))]


def _subcategories_for_category(payload, category_id, active_only=True):
    return [s for s in payload.get("subcategories") or []
            if s.get("category_id") == category_id and (not active_only or s.get("is_active"))]


def test_taxonomy_products_group(taxonomy_payload):
    pg = _find_group(taxonomy_payload, "Products")
    assert pg is not None, f"Products group not found. Groups: {[g.get('name') for g in taxonomy_payload.get('groups') or []]}"
    cats = _categories_for_group(taxonomy_payload, pg["id"])
    cat_names = {(c.get("name") or "").strip() for c in cats}
    print("products group categories =>", cat_names)
    for required in ("Office Equipment", "Stationery", "Promotional Materials"):
        assert required in cat_names, f"Missing category {required}; have {cat_names}"


def test_taxonomy_office_equipment_has_subcategory(taxonomy_payload):
    pg = _find_group(taxonomy_payload, "Products")
    assert pg
    cats = _categories_for_group(taxonomy_payload, pg["id"])
    oe = next((c for c in cats if (c.get("name") or "").strip() == "Office Equipment"), None)
    assert oe is not None, "Office Equipment category not found"
    subs = _subcategories_for_category(taxonomy_payload, oe["id"])
    sub_names = [s.get("name") for s in subs]
    print("OE subcategories (active) =>", sub_names)
    assert len(subs) >= 1, f"Office Equipment must have >=1 active subcategory; got {sub_names}"
    assert any("ID Printer" in (s.get("name") or "") for s in subs), \
        f"Expected 'ID Printers and Accessories' under Office Equipment; got {sub_names}"


def test_taxonomy_promotional_has_many_subs(taxonomy_payload):
    pg = _find_group(taxonomy_payload, "Products")
    cats = _categories_for_group(taxonomy_payload, pg["id"])
    pm = next((c for c in cats if (c.get("name") or "").strip() == "Promotional Materials"), None)
    assert pm is not None, "Promotional Materials category not found"
    subs = _subcategories_for_category(taxonomy_payload, pm["id"])
    print("PM subcategory count =>", len(subs))
    # Spec says ~34.
    assert len(subs) >= 20, f"Promotional Materials expected ~34 subcategories; got {len(subs)}"


def test_search_by_office_equipment(taxonomy_payload):
    pg = _find_group(taxonomy_payload, "Products")
    cats = _categories_for_group(taxonomy_payload, pg["id"])
    oe = next((c for c in cats if (c.get("name") or "").strip() == "Office Equipment"), None)
    assert oe and oe.get("id"), "Could not resolve Office Equipment category id"
    oe_id = oe["id"]
    r = requests.get(f"{BASE_URL}/api/marketplace/products/search", params={"category_id": oe_id, "limit": 50}, timeout=30)
    assert r.status_code == 200, f"search failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    items = body if isinstance(body, list) else (body.get("products") or body.get("items") or body.get("results") or body.get("data") or [])
    total = len(items) if isinstance(body, list) else body.get("total")
    print(f"OE search returned {len(items)} products; total field={total}")
    assert len(items) >= 10, f"Expected ~14 OE products, got {len(items)}"


# --- Force hydrate (idempotent) ---
def test_force_hydrate_runs(auth_headers):
    r = requests.post(f"{BASE_URL}/api/admin/force-hydrate", headers=auth_headers, timeout=120)
    assert r.status_code == 200, f"force-hydrate failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    print("force-hydrate keys =>", list(body.keys()))
    for key in ("pruned", "hydrated", "data_integrity", "taxonomy", "partners"):
        assert key in body or key in (body.get("reports") or {}), f"force-hydrate response missing '{key}'; got {list(body.keys())}"


def test_force_hydrate_idempotent(auth_headers):
    r = requests.post(f"{BASE_URL}/api/admin/force-hydrate", headers=auth_headers, timeout=120)
    assert r.status_code == 200, f"second hydrate failed: {r.status_code} {r.text[:200]}"
