"""
Test Suite for Iteration 236:
1. App Launcher (shows on every page load - no sessionStorage)
2. Global Branded Loader (AppLoader component)
3. Notification Preferences (GET/PUT /api/notifications/preferences)
4. Welcome Notification (one-time, role-aware)
5. Preference Enforcement (check → then send)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
SALES_MANAGER_EMAIL = "sales.manager@konekt.co.tz"
SALES_MANAGER_PASSWORD = "Manager123!"
FINANCE_MANAGER_EMAIL = "finance@konekt.co.tz"
FINANCE_MANAGER_PASSWORD = "Finance123!"
CUSTOMER_EMAIL = "test@konekt.tz"
CUSTOMER_PASSWORD = "TestUser123!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Customer login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def sales_manager_token():
    """Get sales manager auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_MANAGER_EMAIL,
        "password": SALES_MANAGER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Sales Manager login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def finance_manager_token():
    """Get finance manager auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": FINANCE_MANAGER_EMAIL,
        "password": FINANCE_MANAGER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Finance Manager login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Partner login failed: {resp.status_code} - {resp.text}")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """API health endpoint returns healthy"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")


class TestNotificationPreferencesAdmin:
    """Test notification preferences for admin role"""
    
    def test_get_preferences_admin(self, admin_token):
        """GET /api/notifications/preferences returns correct structure for admin"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify structure
        assert data.get("ok") is True
        assert data.get("role") == "admin"
        assert "groups" in data
        assert "channels" in data
        
        # Verify channels
        channels = data["channels"]
        assert channels.get("in_app") is True
        
        # Verify admin events are present
        groups = data["groups"]
        all_events = []
        for group_name, events in groups.items():
            for event in events:
                all_events.append(event["event_key"])
        
        # Admin should have these events
        expected_admin_events = ["admin_sales_override", "admin_delay_flagged", "weekly_report", "alert_critical"]
        for event in expected_admin_events:
            assert event in all_events, f"Missing admin event: {event}"
        
        print(f"✓ Admin preferences returned {len(all_events)} events in {len(groups)} groups")
        print(f"  Groups: {list(groups.keys())}")
    
    def test_update_preferences_admin(self, admin_token):
        """PUT /api/notifications/preferences saves toggle changes"""
        # Update a preference
        update_payload = {
            "preferences": {
                "admin_sales_override": {"in_app": False, "email": True}
            }
        }
        resp = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_payload
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        
        # Verify the change persisted
        resp2 = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        
        # Find the updated event
        found = False
        for group_name, events in data2["groups"].items():
            for event in events:
                if event["event_key"] == "admin_sales_override":
                    assert event["in_app"] is False, "in_app should be False after update"
                    assert event["email"] is True, "email should be True after update"
                    found = True
                    break
        
        assert found, "admin_sales_override event not found in response"
        
        # Revert the change
        revert_payload = {
            "preferences": {
                "admin_sales_override": {"in_app": True, "email": True}
            }
        }
        requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=revert_payload
        )
        
        print("✓ Admin preference update and persistence verified")


class TestNotificationPreferencesCustomer:
    """Test notification preferences for customer role"""
    
    def test_get_preferences_customer(self, customer_token):
        """GET /api/notifications/preferences returns correct catalog for customer"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data.get("ok") is True
        assert data.get("role") == "customer"
        
        # Collect all customer events
        groups = data["groups"]
        all_events = []
        for group_name, events in groups.items():
            for event in events:
                all_events.append(event["event_key"])
        
        # Customer should have these 8 events
        expected_customer_events = [
            "order_created", "payment_verified", "payment_approved", "payment_rejected",
            "order_in_fulfillment", "order_dispatched", "order_delivered", "order_delayed"
        ]
        
        for event in expected_customer_events:
            assert event in all_events, f"Missing customer event: {event}"
        
        print(f"✓ Customer preferences returned {len(all_events)} events")
        print(f"  Events: {all_events}")
    
    def test_customer_event_structure(self, customer_token):
        """Verify each customer event has correct structure"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for group_name, events in data["groups"].items():
            for event in events:
                assert "event_key" in event
                assert "label" in event
                assert "in_app" in event
                assert "email" in event
                assert "whatsapp" in event
                assert isinstance(event["in_app"], bool)
                assert isinstance(event["email"], bool)
                assert isinstance(event["whatsapp"], bool)
        
        print("✓ Customer event structure verified")


class TestNotificationPreferencesSalesManager:
    """Test notification preferences for sales_manager role"""
    
    def test_get_preferences_sales_manager(self, sales_manager_token):
        """GET /api/notifications/preferences returns correct catalog for sales_manager"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {sales_manager_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data.get("ok") is True
        assert data.get("role") == "sales_manager"
        
        groups = data["groups"]
        all_events = []
        for group_name, events in groups.items():
            for event in events:
                all_events.append(event["event_key"])
        
        # Sales manager should have these events
        expected_events = ["admin_sales_override", "admin_delay_flagged", "weekly_report", "alert_critical"]
        for event in expected_events:
            assert event in all_events, f"Missing sales_manager event: {event}"
        
        print(f"✓ Sales Manager preferences returned {len(all_events)} events")


class TestNotificationPreferencesFinanceManager:
    """Test notification preferences for finance_manager role"""
    
    def test_get_preferences_finance_manager(self, finance_manager_token):
        """GET /api/notifications/preferences returns correct catalog for finance_manager"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {finance_manager_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data.get("ok") is True
        assert data.get("role") == "finance_manager"
        
        groups = data["groups"]
        all_events = []
        for group_name, events in groups.items():
            for event in events:
                all_events.append(event["event_key"])
        
        # Finance manager should have these events
        expected_events = ["admin_delay_flagged", "weekly_report", "alert_critical"]
        for event in expected_events:
            assert event in all_events, f"Missing finance_manager event: {event}"
        
        print(f"✓ Finance Manager preferences returned {len(all_events)} events")


class TestNotificationPreferencesVendor:
    """Test notification preferences for vendor/partner role"""
    
    def test_get_preferences_vendor(self, partner_token):
        """GET /api/notifications/preferences returns correct catalog for vendor"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data.get("ok") is True
        # Partner users are mapped to vendor role for preferences
        assert data.get("role") in ["vendor", "partner"]
        
        groups = data["groups"]
        all_events = []
        for group_name, events in groups.items():
            for event in events:
                all_events.append(event["event_key"])
        
        # Vendor should have vendor_order_assigned
        assert "vendor_order_assigned" in all_events, "Missing vendor event: vendor_order_assigned"
        
        print(f"✓ Vendor preferences returned {len(all_events)} events")


class TestWelcomeNotification:
    """Test welcome notification creation on login"""
    
    def test_admin_welcome_notification_exists(self, admin_token):
        """Admin should have welcome notification after login"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        notifications = resp.json()
        
        # Find welcome notification
        welcome = [n for n in notifications if n.get("type") == "welcome"]
        assert len(welcome) >= 1, "Admin should have at least one welcome notification"
        
        # Verify welcome notification structure
        w = welcome[0]
        assert w.get("title") in ["Welcome back", "Welcome to Konekt"]
        assert w.get("cta_label") == "Open Dashboard"
        assert w.get("target_url") == "/admin"
        
        print(f"✓ Admin welcome notification found: '{w.get('title')}'")
    
    def test_customer_welcome_notification_exists(self, customer_token):
        """Customer should have welcome notification after login"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200
        notifications = resp.json()
        
        # Find welcome notification
        welcome = [n for n in notifications if n.get("type") == "welcome"]
        assert len(welcome) >= 1, "Customer should have at least one welcome notification"
        
        w = welcome[0]
        assert w.get("title") == "Welcome to Konekt"
        assert w.get("cta_label") == "Open Dashboard"
        assert w.get("target_url") == "/account"
        
        print(f"✓ Customer welcome notification found: '{w.get('title')}'")
    
    def test_welcome_notification_is_one_time(self, admin_token):
        """Welcome notification should not duplicate on second login"""
        # Get current notifications
        resp1 = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp1.status_code == 200
        count1 = len([n for n in resp1.json() if n.get("type") == "welcome"])
        
        # Login again
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        new_token = login_resp.json().get("token")
        
        # Get notifications again
        resp2 = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {new_token}"}
        )
        assert resp2.status_code == 200
        count2 = len([n for n in resp2.json() if n.get("type") == "welcome"])
        
        # Should not have created a duplicate
        assert count2 == count1, f"Welcome notification duplicated: {count1} -> {count2}"
        
        print("✓ Welcome notification is one-time (no duplicate on second login)")
    
    def test_sales_manager_welcome_notification(self, sales_manager_token):
        """Sales Manager should have welcome notification with correct message"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {sales_manager_token}"}
        )
        assert resp.status_code == 200
        notifications = resp.json()
        
        welcome = [n for n in notifications if n.get("type") == "welcome"]
        assert len(welcome) >= 1, "Sales Manager should have welcome notification"
        
        w = welcome[0]
        assert w.get("target_url") == "/admin"
        
        print(f"✓ Sales Manager welcome notification found")


class TestNotificationUnreadCount:
    """Test notification unread count endpoint"""
    
    def test_unread_count_endpoint(self, admin_token):
        """GET /api/notifications/unread-count returns count"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        
        print(f"✓ Unread count: {data['count']}")


class TestNotificationMarkRead:
    """Test marking notifications as read"""
    
    def test_mark_all_read(self, admin_token):
        """PUT /api/notifications/mark-all-read works"""
        resp = requests.put(
            f"{BASE_URL}/api/notifications/mark-all-read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        
        print("✓ Mark all read endpoint works")


class TestEventCatalogCompleteness:
    """Verify EVENT_CATALOG has all required events"""
    
    def test_admin_has_all_required_events(self, admin_token):
        """Admin role should have all admin events"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        groups = data["groups"]
        
        # Check for expected groups
        group_names = list(groups.keys())
        expected_groups = ["Approvals", "Alerts", "Reports"]
        
        for g in expected_groups:
            assert g in group_names, f"Missing group: {g}"
        
        print(f"✓ Admin has all expected groups: {expected_groups}")
    
    def test_customer_has_all_required_groups(self, customer_token):
        """Customer role should have Order Updates, Payments, Alerts groups"""
        resp = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        groups = data["groups"]
        group_names = list(groups.keys())
        
        expected_groups = ["Order Updates", "Payments", "Alerts"]
        for g in expected_groups:
            assert g in group_names, f"Missing customer group: {g}"
        
        print(f"✓ Customer has all expected groups: {expected_groups}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
