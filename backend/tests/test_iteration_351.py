"""Iteration 351 regression — Konekt fork.
Verifies: vendor count=1, 4 canonical catalog branches with correct counts,
marketplace taxonomy cascade structure, and Office Equipment search returns 14 products.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt-payments-fix.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
OE_CATEGORY_ID = "08405254-f92b-4d57-b390-25623c7dd09a"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=30)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"no token: {data}"
    assert data.get("user", {}).get("role") == "admin"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- vendor agreements stats ---
def test_vendor_agreement_stats(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/vendor-agreements/stats", headers=admin_headers, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("total_vendors") == 1, f"total_vendors={data.get('total_vendors')} expected 1: {data}"
    assert str(data.get("current_version")) == "2.0", f"current_version={data.get('current_version')} expected 2.0"


# --- catalog workspace stats: 4 canonical branches ---
def test_catalog_workspace_stats(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats", headers=admin_headers, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("category_count") == 4, f"category_count={data.get('category_count')}"
    assert data.get("active_products") == 610, f"active_products={data.get('active_products')}"
    cats = {c["name"]: c.get("product_count", 0) for c in data.get("categories", [])}
    assert cats.get("Promotional Materials") == 596, cats
    assert cats.get("Office Equipment") == 14, cats
    assert cats.get("Stationery") == 0, cats
    assert cats.get("Services") == 0, cats
    assert set(cats.keys()) == {"Promotional Materials", "Office Equipment", "Stationery", "Services"}, cats


# --- marketplace taxonomy ---
def test_marketplace_taxonomy_groups():
    r = requests.get(f"{BASE_URL}/api/marketplace/taxonomy", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    groups = data.get("groups", [])
    categories = data.get("categories", [])
    subcategories = data.get("subcategories", [])
    products_group = next((g for g in groups if g.get("name") == "Products"), None)
    services_group = next((g for g in groups if g.get("name") == "Services"), None)
    assert products_group is not None, f"Products group missing; groups={[g.get('name') for g in groups]}"
    assert services_group is not None
    pg_id = products_group["id"]
    sg_id = services_group["id"]
    products_cats = {c["name"]: c for c in categories if c.get("group_id") == pg_id}
    services_cats = {c["name"]: c for c in categories if c.get("group_id") == sg_id}
    assert "Office Equipment" in products_cats, products_cats.keys()
    assert "Stationery" in products_cats, products_cats.keys()
    assert "Promotional Materials" in products_cats, products_cats.keys()
    assert "Services" in services_cats, services_cats.keys()
    oe = products_cats["Office Equipment"]
    assert oe["id"] == OE_CATEGORY_ID, f"OE id mismatch: {oe['id']}"
    oe_subs = [s["name"] for s in subcategories if s.get("category_id") == OE_CATEGORY_ID]
    assert "ID Printers and Accessories" in oe_subs, f"OE subs={oe_subs}"


# --- product search by category ---
def test_marketplace_search_office_equipment():
    r = requests.get(f"{BASE_URL}/api/marketplace/products/search",
                     params={"category_id": OE_CATEGORY_ID, "limit": 100}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    products = data if isinstance(data, list) else (data.get("products") or data.get("results") or data.get("items") or [])
    assert len(products) == 14, f"expected 14 products, got {len(products)}"
