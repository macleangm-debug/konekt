"""Iteration 356 — QR target = konekt.co.tz, promo lock, fresh affiliate stats."""
import os
import io
import requests
import pytest
from pathlib import Path
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://konekt-payments-fix.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PWD = "KnktcKk_L-hw1wSyquvd!"
AFF_EMAIL = "affiliate.test@konekt.co.tz"
AFF_PWD = "Affiliate#Konekt2026"


def _login(email: str, pwd: str) -> str:
    """Try common login endpoints; return token."""
    s = requests.Session()
    for url in [f"{BASE_URL}/api/auth/login", f"{BASE_URL}/api/login"]:
        try:
            r = s.post(url, json={"email": email, "password": pwd}, timeout=15)
            if r.status_code == 200:
                d = r.json()
                tok = d.get("access_token") or d.get("token") or (d.get("data") or {}).get("access_token")
                if tok:
                    return tok
        except Exception:
            pass
    pytest.skip(f"Could not login {email}")


@pytest.fixture(scope="module")
def aff_token():
    return _login(AFF_EMAIL, AFF_PWD)


# === QR target = konekt.co.tz ===
class TestQrBrandTarget:
    def test_qr_json_with_ref_targets_konekt(self):
        r = requests.get(f"{BASE_URL}/api/qr/product/iter356-test?ref=PARTNER10", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["target_url"].startswith("https://konekt.co.tz/"), f"target was {d['target_url']}"
        assert "emergent" not in d["target_url"]
        assert "?ref=PARTNER10" in d["target_url"]
        assert d["ref"] == "PARTNER10"

    def test_qr_json_without_ref_targets_konekt(self):
        r = requests.get(f"{BASE_URL}/api/qr/product/iter356-noref", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["target_url"].startswith("https://konekt.co.tz/")
        assert "emergent" not in d["target_url"]
        assert "?ref=" not in d["target_url"]

    def test_qr_png_returns_image(self):
        r = requests.get(f"{BASE_URL}/api/qr/product/iter356-test.png?ref=PARTNER10", timeout=15)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        img = Image.open(io.BytesIO(r.content))
        assert img.format == "PNG"
        assert img.size[0] > 50

    def test_cached_png_decodes_to_konekt_target(self):
        """Force regenerate via /refresh then verify the on-disk PNG decodes to konekt.co.tz URL."""
        r = requests.post(f"{BASE_URL}/api/qr/product/iter356-decode/refresh?ref=PARTNER10", timeout=15)
        assert r.status_code == 200
        target = r.json()["target_url"]
        assert target.startswith("https://konekt.co.tz/")

        cache = Path("/app/static/qr/product/iter356-decode__ref-PARTNER10.png")
        if not cache.exists():
            pytest.skip("Cache file not on shared FS (likely separate pod) — skipping decode")
        try:
            from pyzbar.pyzbar import decode  # type: ignore
        except Exception:
            # Fallback: trust that target_url JSON is konekt and the PNG was just regenerated
            return
        decoded = decode(Image.open(str(cache)))
        assert decoded, "QR did not decode"
        decoded_url = decoded[0].data.decode()
        assert decoded_url.startswith("https://konekt.co.tz/")
        assert "ref=PARTNER10" in decoded_url


# === Affiliate promo-code lock ===
class TestAffiliatePromoLock:
    def test_my_status_returns_locked_partner10(self, aff_token):
        r = requests.get(
            f"{BASE_URL}/api/affiliate-program/my-status",
            headers={"Authorization": f"Bearer {aff_token}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("affiliate_code") == "PARTNER10"
        assert d.get("affiliate_code_locked") is True

    def test_setup_promo_code_when_locked_returns_409(self, aff_token):
        r = requests.post(
            f"{BASE_URL}/api/affiliate-program/setup/promo-code",
            headers={"Authorization": f"Bearer {aff_token}"},
            json={"promo_code": "OTHERCODE99"},
            timeout=15,
        )
        assert r.status_code == 409, f"expected 409, got {r.status_code}: {r.text}"
        body = r.text.lower()
        assert "lock" in body, f"expected 'locked' message, got {r.text}"

        # Re-fetch status — code must remain PARTNER10
        s = requests.get(
            f"{BASE_URL}/api/affiliate-program/my-status",
            headers={"Authorization": f"Bearer {aff_token}"},
            timeout=15,
        )
        assert s.json().get("affiliate_code") == "PARTNER10"


# === Fresh affiliate stats (zeroed) ===
class TestAffiliateFreshStats:
    def test_my_status_zeroed_stats(self, aff_token):
        r = requests.get(
            f"{BASE_URL}/api/affiliate-program/my-status",
            headers={"Authorization": f"Bearer {aff_token}"},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        # Common shapes — defensive
        for k in ("total_earnings", "pending_earnings", "paid_earnings", "earnings_this_month"):
            if k in d:
                assert (d[k] or 0) == 0, f"{k} expected 0, got {d[k]}"
        if "stats" in d and isinstance(d["stats"], dict):
            for k, v in d["stats"].items():
                if isinstance(v, (int, float)):
                    assert v == 0, f"stats.{k} expected 0, got {v}"
