"""
Test Scheduled Weekly Report Delivery APIs
Tests: GET/PUT /api/admin/settings-hub/report-schedule, POST /api/admin/settings-hub/report-schedule/deliver-now
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestScheduledReportDelivery:
    """Tests for Scheduled Weekly Report Delivery feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.admin_id = login_response.json().get("user", {}).get("id")
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    # ── GET /api/admin/settings-hub/report-schedule ──
    def test_get_report_schedule_returns_default_config(self):
        """GET report-schedule returns default schedule config with correct fields"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings-hub/report-schedule")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all required fields exist
        assert "enabled" in data, "Missing 'enabled' field"
        assert "day" in data, "Missing 'day' field"
        assert "time" in data, "Missing 'time' field"
        assert "timezone" in data, "Missing 'timezone' field"
        assert "recipient_roles" in data, "Missing 'recipient_roles' field"
        
        # Verify default values
        assert isinstance(data["enabled"], bool), "enabled should be boolean"
        assert data["day"] in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], f"Invalid day: {data['day']}"
        assert ":" in data["time"], f"Time should be in HH:MM format: {data['time']}"
        assert isinstance(data["recipient_roles"], list), "recipient_roles should be a list"
        
        print(f"✓ GET report-schedule returns valid config: enabled={data['enabled']}, day={data['day']}, time={data['time']}")
    
    def test_get_report_schedule_includes_last_delivery_info(self):
        """GET report-schedule includes last_delivery info"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings-hub/report-schedule")
        
        assert response.status_code == 200
        data = response.json()
        
        # last_delivery should be present (may be empty object if never delivered)
        assert "last_delivery" in data, "Missing 'last_delivery' field"
        
        print(f"✓ GET report-schedule includes last_delivery: {data.get('last_delivery', {})}")
    
    # ── PUT /api/admin/settings-hub/report-schedule ──
    def test_put_report_schedule_saves_config(self):
        """PUT report-schedule correctly saves updated schedule config"""
        # First get current config
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings-hub/report-schedule")
        original_config = get_response.json()
        
        # Update config
        new_config = {
            "enabled": True,
            "day": "tuesday",
            "time": "09:00",
            "timezone": "Africa/Nairobi",
            "recipient_roles": ["admin", "sales_manager"]
        }
        
        put_response = self.session.put(f"{BASE_URL}/api/admin/settings-hub/report-schedule", json=new_config)
        
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}: {put_response.text}"
        
        saved_data = put_response.json()
        assert saved_data["day"] == "tuesday", f"Day not saved: {saved_data['day']}"
        assert saved_data["time"] == "09:00", f"Time not saved: {saved_data['time']}"
        assert saved_data["timezone"] == "Africa/Nairobi", f"Timezone not saved: {saved_data['timezone']}"
        assert "admin" in saved_data["recipient_roles"], "admin role not in recipient_roles"
        assert "sales_manager" in saved_data["recipient_roles"], "sales_manager role not in recipient_roles"
        
        # Verify persistence with GET
        verify_response = self.session.get(f"{BASE_URL}/api/admin/settings-hub/report-schedule")
        verify_data = verify_response.json()
        
        assert verify_data["day"] == "tuesday", "Day not persisted"
        assert verify_data["time"] == "09:00", "Time not persisted"
        
        print(f"✓ PUT report-schedule saves and persists config correctly")
        
        # Restore original config
        restore_config = {
            "enabled": original_config.get("enabled", True),
            "day": original_config.get("day", "monday"),
            "time": original_config.get("time", "08:00"),
            "timezone": original_config.get("timezone", "Africa/Dar_es_Salaam"),
            "recipient_roles": original_config.get("recipient_roles", ["admin", "sales_manager", "finance_manager"])
        }
        self.session.put(f"{BASE_URL}/api/admin/settings-hub/report-schedule", json=restore_config)
    
    # ── POST /api/admin/settings-hub/report-schedule/deliver-now ──
    def test_deliver_now_triggers_delivery(self):
        """POST deliver-now triggers immediate delivery and returns recipients count"""
        response = self.session.post(f"{BASE_URL}/api/admin/settings-hub/report-schedule/deliver-now")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Missing 'status' field"
        assert data["status"] == "delivered", f"Expected status 'delivered', got '{data['status']}'"
        assert "recipients_count" in data, "Missing 'recipients_count' field"
        assert isinstance(data["recipients_count"], int), "recipients_count should be integer"
        assert data["recipients_count"] >= 0, "recipients_count should be non-negative"
        
        print(f"✓ POST deliver-now succeeded: status={data['status']}, recipients_count={data['recipients_count']}")
    
    def test_deliver_now_updates_last_delivery_status(self):
        """After deliver-now, last_delivery status is updated"""
        # Trigger delivery
        deliver_response = self.session.post(f"{BASE_URL}/api/admin/settings-hub/report-schedule/deliver-now")
        assert deliver_response.status_code == 200
        
        # Check last_delivery is updated
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings-hub/report-schedule")
        data = get_response.json()
        
        last_delivery = data.get("last_delivery", {})
        assert last_delivery.get("status") == "success", f"Expected last_delivery status 'success', got '{last_delivery.get('status')}'"
        assert "delivered_at" in last_delivery, "Missing 'delivered_at' in last_delivery"
        assert "recipients_count" in last_delivery, "Missing 'recipients_count' in last_delivery"
        
        print(f"✓ Last delivery status updated: {last_delivery}")
    
    # ── Notification verification ──
    def test_deliver_now_creates_notifications(self):
        """After deliver-now, admin notifications contain 'Weekly Performance Report'"""
        # Trigger delivery
        deliver_response = self.session.post(f"{BASE_URL}/api/admin/settings-hub/report-schedule/deliver-now")
        assert deliver_response.status_code == 200
        
        # Check notifications for admin
        notif_response = self.session.get(f"{BASE_URL}/api/notifications")
        
        assert notif_response.status_code == 200, f"Failed to get notifications: {notif_response.status_code}"
        
        notifications = notif_response.json()
        if isinstance(notifications, dict):
            notifications = notifications.get("notifications", [])
        
        # Find weekly report notification
        weekly_report_notifs = [n for n in notifications if "Weekly Performance Report" in n.get("title", "") or "Weekly Performance" in n.get("message", "")]
        
        assert len(weekly_report_notifs) > 0, "No 'Weekly Performance Report' notification found"
        
        # Verify notification content
        notif = weekly_report_notifs[0]
        assert "Weekly Performance" in notif.get("title", "") or "Weekly Performance" in notif.get("message", ""), "Notification should mention Weekly Performance"
        
        # Check for executive summary content (revenue, orders, rating, alerts)
        message = notif.get("message", "")
        # At least one of these should be present
        has_summary = any(term in message.lower() for term in ["revenue", "orders", "rating", "alerts", "tzs"])
        assert has_summary, f"Notification message should contain executive summary (revenue/orders/rating/alerts): {message}"
        
        print(f"✓ Weekly Performance Report notification created with executive summary")
    
    def test_notification_target_url_points_to_weekly_report(self):
        """Notification target_url points to /admin/reports/weekly-performance?weeks_back=1"""
        # Trigger delivery
        self.session.post(f"{BASE_URL}/api/admin/settings-hub/report-schedule/deliver-now")
        
        # Get notifications
        notif_response = self.session.get(f"{BASE_URL}/api/notifications")
        notifications = notif_response.json()
        if isinstance(notifications, dict):
            notifications = notifications.get("notifications", [])
        
        # Find weekly report notification
        weekly_report_notifs = [n for n in notifications if "Weekly Performance" in n.get("title", "") or "Weekly Performance" in n.get("message", "")]
        
        if weekly_report_notifs:
            notif = weekly_report_notifs[0]
            target_url = notif.get("target_url", "")
            
            assert "/admin/reports/weekly-performance" in target_url, f"target_url should point to weekly-performance report: {target_url}"
            assert "weeks_back=1" in target_url, f"target_url should include weeks_back=1: {target_url}"
            
            print(f"✓ Notification target_url correct: {target_url}")
        else:
            pytest.skip("No weekly report notification found to verify target_url")
    
    # ── Auth tests ──
    def test_report_schedule_requires_auth(self):
        """Report schedule endpoints require authentication"""
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        # GET without auth
        response = unauth_session.get(f"{BASE_URL}/api/admin/settings-hub/report-schedule")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # PUT without auth
        response = unauth_session.put(f"{BASE_URL}/api/admin/settings-hub/report-schedule", json={"enabled": True})
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # POST deliver-now without auth
        response = unauth_session.post(f"{BASE_URL}/api/admin/settings-hub/report-schedule/deliver-now")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✓ Report schedule endpoints require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
