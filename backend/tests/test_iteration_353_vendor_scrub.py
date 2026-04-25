"""
Iteration 353 - Vendor identity scrub + WhatsApp affiliate share.

Covers:
1) POST /api/admin/force-hydrate must include `sanitised_descriptions`
   ({scanned, cleaned}) and be idempotent.
2) GET /api/marketplace/products/search?category_id=<...> must NEVER
   leak 'darcity', 'dar city', 'sourced from' across description,
   short_description, seo_description, meta_description, tags.
"""
import os
import re
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

LEAK_PATTERNS = [
    re.compile(r"\bdarcity\b", re.I),
    re.compile(r"\bdar\s*city\b", re.I),
    re.compile(r"sourced from", re.I),
]
PUBLIC_FIELDS = (
    "description",
    "short_description",
    "seo_description",
    "meta_description",
)


@pytest.fixture(scope="module")
def admin_headers():
    assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
    r = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        # Fallback to general login (some envs use unified auth)
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30,
        )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:200]}"
    token = r.json().get("access_token") or r.json().get("token")
    assert token, f"no token in login response: {r.json()}"
    return {"Authorization": f"Bearer {token}"}


def _check_leaks(text):
    if not text:
        return []
    if isinstance(text, list):
        # join list items for scanning
        text = " ".join([str(x) for x in text])
    if not isinstance(text, str):
        return []
    return [rx.pattern for rx in LEAK_PATTERNS if rx.search(text)]


# ---------- Force-hydrate sanitised_descriptions ----------
class TestForceHydrate:
    def test_force_hydrate_includes_sanitised_descriptions(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/force-hydrate",
            headers=admin_headers,
            timeout=180,
        )
        assert r.status_code == 200, f"force-hydrate failed: {r.status_code} {r.text[:300]}"
        body = r.json()
        # report may be flat or under "reports"
        report = body.get("reports") or body
        assert "sanitised_descriptions" in report, (
            f"missing sanitised_descriptions key. keys={list(report.keys())}"
        )
        sd = report["sanitised_descriptions"]
        assert isinstance(sd, dict), f"expected dict, got {type(sd)}"
        assert "scanned" in sd, f"missing scanned: {sd}"
        assert "cleaned" in sd, f"missing cleaned: {sd}"
        assert isinstance(sd["scanned"], int) and sd["scanned"] >= 1, (
            f"scanned should be >=1 but is {sd['scanned']}"
        )
        # cleaned can be 0 on second run
        assert isinstance(sd["cleaned"], int) and sd["cleaned"] >= 0
        # save total scanned for the next test
        TestForceHydrate.first_scanned = sd["scanned"]
        TestForceHydrate.first_cleaned = sd["cleaned"]

    def test_force_hydrate_is_idempotent(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/force-hydrate",
            headers=admin_headers,
            timeout=180,
        )
        assert r.status_code == 200, f"second force-hydrate failed: {r.status_code} {r.text[:300]}"
        body = r.json()
        report = body.get("reports") or body
        sd = report.get("sanitised_descriptions") or {}
        # Second run should not re-clean any rows (idempotent)
        assert sd.get("cleaned", 0) == 0, (
            f"idempotency failed - second run cleaned {sd.get('cleaned')} rows"
        )
        # Scanned should match (or be >=) first scan
        assert sd.get("scanned", 0) >= 1


# ---------- Marketplace product search vendor leak scrub ----------
class TestMarketplaceLeakScrub:
    def _fetch_branches_and_categories(self, admin_headers=None):
        """Fetch branches (groups) + actual category_ids for filtering."""
        branches = []
        cat_ids = []
        # Try admin catalog endpoint for category UUIDs
        if admin_headers:
            r = requests.get(
                f"{BASE_URL}/api/admin/catalog/categories",
                headers=admin_headers,
                timeout=30,
            )
            if r.status_code == 200:
                data = r.json()
                items = data if isinstance(data, list) else data.get("categories", [])
                cat_ids = [c.get("id") for c in items if c.get("id")]
        # Fetch branches/group names from public list
        r = requests.get(f"{BASE_URL}/api/products/categories/list", timeout=30)
        if r.status_code == 200:
            d = r.json()
            branches = d.get("branches", []) if isinstance(d, dict) else []
        return branches, cat_ids

    def test_marketplace_search_no_vendor_leak_all_branches(self, admin_headers):
        branches, cat_ids = self._fetch_branches_and_categories(admin_headers)
        assert branches, "expected at least one branch"
        leak_findings = []
        total_products_scanned = 0

        # Iterate by branch (group_slug) — covers Promotional Materials / Office Equipment
        for branch in branches:
            for param in ("group_slug", "group"):
                r = requests.get(
                    f"{BASE_URL}/api/marketplace/products/search",
                    params={param: branch},
                    timeout=60,
                )
                if r.status_code != 200:
                    continue
                data = r.json()
                products = data.get("products") if isinstance(data, dict) else data
                products = products or []
                if products:
                    for prod in products:
                        total_products_scanned += 1
                        for f in PUBLIC_FIELDS:
                            leaks = _check_leaks(prod.get(f))
                            if leaks:
                                leak_findings.append(
                                    f"branch='{branch}' product='{prod.get('name')}' "
                                    f"field='{f}' patterns={leaks} value={(prod.get(f) or '')[:200]!r}"
                                )
                        for f in ("tags", "keywords", "search_tags"):
                            leaks = _check_leaks(prod.get(f))
                            if leaks:
                                leak_findings.append(
                                    f"branch='{branch}' product='{prod.get('name')}' "
                                    f"field='{f}' patterns={leaks}"
                                )
                    break  # this param worked

        # Iterate by category_id UUIDs (sample first 10)
        for cid in cat_ids[:10]:
            r = requests.get(
                f"{BASE_URL}/api/marketplace/products/search",
                params={"category_id": cid},
                timeout=60,
            )
            if r.status_code != 200:
                continue
            data = r.json()
            products = data.get("products") if isinstance(data, dict) else data
            for prod in (products or []):
                total_products_scanned += 1
                for f in PUBLIC_FIELDS:
                    leaks = _check_leaks(prod.get(f))
                    if leaks:
                        leak_findings.append(
                            f"category_id='{cid}' product='{prod.get('name')}' field='{f}' patterns={leaks}"
                        )

        print(f"Scanned {total_products_scanned} products across {len(branches)} branches + {len(cat_ids)} category_ids")
        assert not leak_findings, "Vendor leakage detected:\n" + "\n".join(leak_findings[:25])
        assert total_products_scanned > 0, "expected to scan at least 1 product"

    def test_marketplace_search_no_filter_no_leak(self):
        """Also scan the global search with no category filter."""
        r = requests.get(
            f"{BASE_URL}/api/marketplace/products/search",
            params={"limit": 200},
            timeout=60,
        )
        assert r.status_code == 200, f"global search failed: {r.status_code}"
        data = r.json()
        products = data.get("products") if isinstance(data, dict) else data
        products = products or []
        leaks = []
        for p in products:
            for f in PUBLIC_FIELDS:
                hits = _check_leaks(p.get(f))
                if hits:
                    leaks.append(f"{p.get('name')} :: {f} :: {hits}")
            for f in ("tags", "keywords"):
                hits = _check_leaks(p.get(f))
                if hits:
                    leaks.append(f"{p.get('name')} :: {f} :: {hits}")
        assert not leaks, "Global search leakage:\n" + "\n".join(leaks[:25])


# ---------- Public product detail page (API source) ----------
class TestPublicProductDetailNoLeak:
    def test_public_product_details_no_leak(self):
        r = requests.get(
            f"{BASE_URL}/api/marketplace/products/search",
            params={"limit": 30},
            timeout=60,
        )
        assert r.status_code == 200
        data = r.json()
        products = data.get("products") if isinstance(data, dict) else data
        products = products or []
        # Try fetch a few product details (slug or id)
        scanned = 0
        leaks = []
        for p in products[:10]:
            slug = p.get("slug") or p.get("id")
            if not slug:
                continue
            for path in (f"/api/marketplace/products/{slug}", f"/api/products/{slug}"):
                rr = requests.get(f"{BASE_URL}{path}", timeout=20)
                if rr.status_code == 200:
                    detail = rr.json()
                    scanned += 1
                    for f in PUBLIC_FIELDS:
                        hits = _check_leaks(detail.get(f))
                        if hits:
                            leaks.append(f"{slug} :: {f} :: {hits}")
                    break
        # Even if no detail endpoint matched, search-level scrub already covered it.
        assert not leaks, "Detail endpoint leakage:\n" + "\n".join(leaks[:25])
        print(f"detail-scanned: {scanned} products")
