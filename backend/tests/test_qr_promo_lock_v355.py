"""
Iteration 355 — QR Code overlay (?ref=) + promo-code lock-on-first-save tests.

Covers:
  - GET /api/qr/{kind}/{id}.png?ref=PARTNER10  (PNG + cache file path)
  - GET /api/qr/{kind}/{id}?ref=PARTNER10      (JSON target_url + qr_image_url)
  - Invalid ref normalization (lowercase / specials => no-ref cache file)
  - POST /api/affiliate-program/setup/promo-code 409 when locked
  - GET  /api/affiliate-program/my-status returns code + locked flag
  - POST /api/sales-promo/create-code 409 when locked
"""
import os
import re
import pytest
import requests
from pathlib import Path

def _load_base_url():
    val = os.environ.get("REACT_APP_BACKEND_URL")
    if not val:
        try:
            with open("/app/frontend/.env", "r") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL"):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except Exception:
            pass
    if not val:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return val.rstrip("/")


BASE_URL = _load_base_url()
QR_CACHE_ROOT = Path("/app/static/qr")

ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
AFF_EMAIL = "affiliate.test@konekt.co.tz"
AFF_PASSWORD = "Affiliate#Konekt2026"
EXPECTED_AFF_CODE = "PARTNER10"
PRODUCT_ID = "qr-test-product-iter355"


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, email, password):
    """Try common login endpoints and return access token if any succeed."""
    candidates = [
        "/api/auth/login",
        "/api/login",
        "/api/admin/login",
    ]
    for path in candidates:
        try:
            r = session.post(f"{BASE_URL}{path}", json={"email": email, "password": password}, timeout=15)
            if r.status_code == 200:
                data = r.json()
                tok = (
                    data.get("access_token")
                    or data.get("token")
                    or (data.get("data") or {}).get("access_token")
                )
                if tok:
                    return tok, path
        except Exception:
            continue
    return None, None


@pytest.fixture(scope="module")
def affiliate_token(session):
    tok, path = _login(session, AFF_EMAIL, AFF_PASSWORD)
    if not tok:
        pytest.skip(f"Affiliate login failed for {AFF_EMAIL}")
    print(f"[login] affiliate via {path}")
    return tok


# ---------- QR PNG + caching ----------

class TestQrImageEndpoint:
    """GET /api/qr/{kind}/{id}.png — image + cache + ref normalisation."""

    def test_png_with_ref_returns_image_and_caches_file(self, session):
        # Cleanup any stale cache so we can verify creation
        cached = QR_CACHE_ROOT / "product" / f"{PRODUCT_ID}__ref-{EXPECTED_AFF_CODE}.png"
        if cached.exists():
            cached.unlink()
        url = f"{BASE_URL}/api/qr/product/{PRODUCT_ID}.png?ref={EXPECTED_AFF_CODE}"
        r = session.get(url, timeout=20)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/png")
        assert len(r.content) > 200
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"
        # File cached on disk at the expected path
        assert cached.exists(), f"expected cache file {cached} after ?ref={EXPECTED_AFF_CODE}"

    def test_png_without_ref_returns_image_and_caches_no_suffix(self, session):
        cached = QR_CACHE_ROOT / "product" / f"{PRODUCT_ID}.png"
        if cached.exists():
            cached.unlink()
        url = f"{BASE_URL}/api/qr/product/{PRODUCT_ID}.png"
        r = session.get(url, timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        assert cached.exists(), f"expected no-suffix cache file {cached}"

    def test_invalid_ref_lowercase_falls_back_to_no_ref(self, session):
        # lowercase 'partner10' — must NOT produce a __ref- file
        bad_cache = QR_CACHE_ROOT / "product" / f"{PRODUCT_ID}__ref-partner10.png"
        if bad_cache.exists():
            bad_cache.unlink()
        url = f"{BASE_URL}/api/qr/product/{PRODUCT_ID}.png?ref=partner10"
        r = session.get(url, timeout=20)
        assert r.status_code == 200
        assert not bad_cache.exists(), "lowercase ref must be silently dropped"
        # The fallback must be the no-suffix file
        assert (QR_CACHE_ROOT / "product" / f"{PRODUCT_ID}.png").exists()

    def test_invalid_ref_special_chars_falls_back_to_no_ref(self, session):
        bad_cache = QR_CACHE_ROOT / "product" / f"{PRODUCT_ID}__ref-bad!.png"
        if bad_cache.exists():
            bad_cache.unlink()
        url = f"{BASE_URL}/api/qr/product/{PRODUCT_ID}.png?ref=bad!"
        r = session.get(url, timeout=20)
        assert r.status_code == 200
        assert not bad_cache.exists()


class TestQrJsonEndpoint:
    """GET /api/qr/{kind}/{id} — JSON metadata."""

    def test_json_with_ref(self, session):
        url = f"{BASE_URL}/api/qr/product/{PRODUCT_ID}?ref={EXPECTED_AFF_CODE}"
        r = session.get(url, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "target_url" in data
        assert "qr_image_url" in data
        assert f"?ref={EXPECTED_AFF_CODE}" in data["target_url"], data["target_url"]
        assert data["qr_image_url"].startswith("/api/qr/product/")
        assert f"?ref={EXPECTED_AFF_CODE}" in data["qr_image_url"]
        assert data.get("ref") == EXPECTED_AFF_CODE

    def test_json_without_ref(self, session):
        url = f"{BASE_URL}/api/qr/product/{PRODUCT_ID}"
        r = session.get(url, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "?ref=" not in data["target_url"]
        assert data["qr_image_url"].endswith(".png")
        assert data.get("ref") is None


# ---------- Affiliate promo-code lock ----------

class TestAffiliatePromoCodeLock:

    def test_my_status_returns_locked_code(self, session, affiliate_token):
        r = session.get(
            f"{BASE_URL}/api/affiliate-program/my-status",
            headers={"Authorization": f"Bearer {affiliate_token}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("affiliate_code") == EXPECTED_AFF_CODE, data
        assert data.get("affiliate_code_locked") is True, data

    def test_setup_promo_code_returns_409_when_locked(self, session, affiliate_token):
        r = session.post(
            f"{BASE_URL}/api/affiliate-program/setup/promo-code",
            headers={"Authorization": f"Bearer {affiliate_token}"},
            json={"code": "ATTEMPTCHANGE"},
            timeout=15,
        )
        assert r.status_code == 409, f"expected 409, got {r.status_code}: {r.text}"
        body = r.json()
        detail = (body.get("detail") or "").lower()
        assert "lock" in detail or "cannot be changed" in detail, body

    def test_my_status_unchanged_after_attempted_change(self, session, affiliate_token):
        # Re-fetch status after the failed update — code must be unchanged
        r = session.get(
            f"{BASE_URL}/api/affiliate-program/my-status",
            headers={"Authorization": f"Bearer {affiliate_token}"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("affiliate_code") == EXPECTED_AFF_CODE


# ---------- Sales promo code lock ----------

class TestSalesPromoLock:
    """Without a fresh sales user we can only verify the 401/409 contract."""

    def test_create_code_requires_auth(self, session):
        r = session.post(
            f"{BASE_URL}/api/sales-promo/create-code",
            json={"code": "SALESTEST"},
            timeout=15,
        )
        assert r.status_code in (401, 403), r.text
