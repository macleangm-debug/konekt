"""
Session 5 regression tests — wiring-audit follow-up.

Covers:
  • Notification System Control (GET/PUT /api/admin/notification-system/config)
  • Resend status (does NOT send an email)
  • Agreement version bump (POST /api/admin/vendor-agreements/bump-version)
  • Smart Import failed-rows export endpoint auth/404 paths
"""
import os
import pytest
import httpx

API_URL = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PW = "KnktcKk_L-hw1wSyquvd!"

_cached_token = None
def admin_token():
    global _cached_token
    if _cached_token:
        return _cached_token
    r = httpx.post(f"{API_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    _cached_token = d.get("token") or d.get("access_token")
    return _cached_token


# ── Notification System Control ───────────────────────────────────

def test_system_config_requires_admin():
    r = httpx.get(f"{API_URL}/api/admin/notification-system/config", timeout=15)
    assert r.status_code == 401


def test_system_config_structure():
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.get(f"{API_URL}/api/admin/notification-system/config", headers=h, timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "groups" in j and isinstance(j["groups"], dict)
    assert j["total_events"] >= 10
    assert set(j["channels"]) >= {"in_app", "email", "whatsapp"}
    # Every event has the 3 enabled flags
    for group, events in j["groups"].items():
        for ev in events:
            assert "in_app_enabled" in ev and "email_enabled" in ev and "whatsapp_enabled" in ev
            assert "roles" in ev


def test_system_config_toggle_and_readback():
    h = {"Authorization": f"Bearer {admin_token()}"}
    # Toggle payment_rejected email off
    r = httpx.put(
        f"{API_URL}/api/admin/notification-system/config", headers=h,
        json={"toggles": [{"event_key": "payment_rejected", "channel": "email", "enabled": False}]},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["updated"] == 1

    r = httpx.get(f"{API_URL}/api/admin/notification-system/config", headers=h, timeout=15)
    evs = [e for evs in r.json()["groups"].values() for e in evs]
    pr = next(e for e in evs if e["event_key"] == "payment_rejected")
    assert pr["email_enabled"] is False

    # Flip it back
    r = httpx.put(
        f"{API_URL}/api/admin/notification-system/config", headers=h,
        json={"toggles": [{"event_key": "payment_rejected", "channel": "email", "enabled": True}]},
        timeout=15,
    )
    assert r.status_code == 200


def test_system_config_rejects_unknown_event():
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.put(
        f"{API_URL}/api/admin/notification-system/config", headers=h,
        json={"toggles": [{"event_key": "totally_made_up", "channel": "email", "enabled": False}]},
        timeout=15,
    )
    assert r.status_code == 400


def test_system_config_rejects_unknown_channel():
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.put(
        f"{API_URL}/api/admin/notification-system/config", headers=h,
        json={"toggles": [{"event_key": "payment_rejected", "channel": "telepathy", "enabled": True}]},
        timeout=15,
    )
    assert r.status_code == 400


def test_resend_status_reachable():
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.get(f"{API_URL}/api/admin/notification-system/resend-status", headers=h, timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "configured" in j and "from_email" in j and "is_default_domain" in j


def test_resend_test_rejects_bad_email():
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.post(f"{API_URL}/api/admin/notification-system/resend-test", headers=h,
                   json={"to": "not-an-email"}, timeout=15)
    assert r.status_code == 400


# ── Agreement version bump ────────────────────────────────────────

def test_agreement_bump_roundtrip():
    h = {"Authorization": f"Bearer {admin_token()}"}
    # bump to 1.9 temporarily
    r = httpx.post(f"{API_URL}/api/admin/vendor-agreements/bump-version", headers=h,
                   json={"new_version": "1.9", "reason": "test"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["current_version"] == "1.9"

    # stats reflect new version
    r = httpx.get(f"{API_URL}/api/admin/vendor-agreements/stats", headers=h, timeout=15)
    assert r.status_code == 200
    assert r.json()["current_version"] == "1.9"

    # idempotent same-version rejected
    r = httpx.post(f"{API_URL}/api/admin/vendor-agreements/bump-version", headers=h,
                   json={"new_version": "1.9"}, timeout=15)
    assert r.status_code == 400

    # reset
    r = httpx.post(f"{API_URL}/api/admin/vendor-agreements/bump-version", headers=h,
                   json={"new_version": "1.0", "reason": "reset"}, timeout=15)
    assert r.status_code == 200


def test_agreement_bump_empty_version_400():
    h = {"Authorization": f"Bearer {admin_token()}"}
    r = httpx.post(f"{API_URL}/api/admin/vendor-agreements/bump-version", headers=h,
                   json={"new_version": ""}, timeout=15)
    assert r.status_code == 400


# ── Smart Import failed-rows export ───────────────────────────────

def test_failed_rows_download_404_on_unknown_session():
    r = httpx.get(f"{API_URL}/api/smart-import/failed-rows/does-not-exist.xlsx", timeout=15)
    assert r.status_code == 404
