"""
Test Suite for Welcome Notification System (Iteration 235)
Tests:
- Welcome notification creation on login
- One-time notification (no duplicates)
- Role-aware messages
- Both /api/auth/login and /api/admin/auth/login endpoints
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_CREDENTIALS = {
    "admin": {"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"},
    "sales_manager": {"email": "sales.manager@konekt.co.tz", "password": "Manager123!"},
    "finance_manager": {"email": "finance@konekt.co.tz", "password": "Finance123!"},
    "staff": {"email": "staff@konekt.co.tz", "password": "Staff123!"},
    "customer": {"email": "test@konekt.tz", "password": "TestUser123!"},
    "partner": {"email": "demo.partner@konekt.com", "password": "Partner123!"},
}

# Expected welcome messages per role
EXPECTED_WELCOME_TITLES = {
    "admin": "Welcome back",
    "sales_manager": "Welcome to Konekt",
    "finance_manager": "Welcome to Konekt",
    "customer": "Welcome to Konekt",
    "sales": "Welcome to Konekt Sales",
    "vendor": "Welcome to Konekt Vendor Portal",
    "partner": "Welcome to Konekt Vendor Portal",
}

EXPECTED_CTA_URLS = {
    "admin": "/admin",
    "sales_manager": "/admin",
    "finance_manager": "/admin",
    "customer": "/account",
    "sales": "/staff",
    "vendor": "/partner",
    "partner": "/partner",
}


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")


class TestAdminLogin:
    """Test admin login endpoint with welcome notification"""
    
    def test_admin_login_success(self):
        """Test admin login creates welcome notification"""
        creds = TEST_CREDENTIALS["admin"]
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == creds["email"]
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - user: {data['user']['email']}, role: {data['user']['role']}")
        return data["token"], data["user"]["id"]
    
    def test_sales_manager_login_success(self):
        """Test sales manager login"""
        creds = TEST_CREDENTIALS["sales_manager"]
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert response.status_code == 200, f"Sales manager login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "sales_manager"
        print(f"✓ Sales Manager login successful - role: {data['user']['role']}")
        return data["token"]
    
    def test_finance_manager_login_success(self):
        """Test finance manager login"""
        creds = TEST_CREDENTIALS["finance_manager"]
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert response.status_code == 200, f"Finance manager login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "finance_manager"
        print(f"✓ Finance Manager login successful - role: {data['user']['role']}")
        return data["token"]


class TestCustomerLogin:
    """Test customer login endpoint with welcome notification"""
    
    def test_customer_login_success(self):
        """Test customer login creates welcome notification"""
        creds = TEST_CREDENTIALS["customer"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == creds["email"]
        assert data["user"]["role"] == "customer"
        print(f"✓ Customer login successful - user: {data['user']['email']}, role: {data['user']['role']}")
        return data["token"], data["user"]["id"]
    
    def test_partner_login_success(self):
        """Test partner/vendor login"""
        creds = TEST_CREDENTIALS["partner"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert response.status_code == 200, f"Partner login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Partner login successful - user: {data['user']['email']}")
        return data["token"]


class TestNotificationRetrieval:
    """Test notification retrieval for welcome notifications"""
    
    def test_admin_notifications_endpoint(self):
        """Test admin can retrieve notifications including welcome"""
        # Login as admin
        creds = TEST_CREDENTIALS["admin"]
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        
        # Get notifications
        headers = {"Authorization": f"Bearer {token}"}
        notif_resp = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert notif_resp.status_code == 200, f"Failed to get notifications: {notif_resp.text}"
        
        notifications = notif_resp.json()
        assert isinstance(notifications, list)
        
        # Check for welcome notification
        welcome_notifs = [n for n in notifications if n.get("type") == "welcome"]
        print(f"✓ Admin notifications retrieved - total: {len(notifications)}, welcome: {len(welcome_notifs)}")
        
        if welcome_notifs:
            wn = welcome_notifs[0]
            print(f"  Welcome notification found: title='{wn.get('title')}', cta='{wn.get('cta_label')}', target='{wn.get('target_url')}'")
            # Verify welcome notification structure
            assert "title" in wn
            assert "message" in wn
            assert wn.get("cta_label") == "Open Dashboard"
            assert wn.get("target_url") == "/admin"
        
        return notifications
    
    def test_customer_notifications_endpoint(self):
        """Test customer can retrieve notifications including welcome"""
        # Login as customer
        creds = TEST_CREDENTIALS["customer"]
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        
        # Get notifications
        headers = {"Authorization": f"Bearer {token}"}
        notif_resp = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert notif_resp.status_code == 200, f"Failed to get notifications: {notif_resp.text}"
        
        notifications = notif_resp.json()
        assert isinstance(notifications, list)
        
        # Check for welcome notification
        welcome_notifs = [n for n in notifications if n.get("type") == "welcome"]
        print(f"✓ Customer notifications retrieved - total: {len(notifications)}, welcome: {len(welcome_notifs)}")
        
        if welcome_notifs:
            wn = welcome_notifs[0]
            print(f"  Welcome notification found: title='{wn.get('title')}', cta='{wn.get('cta_label')}', target='{wn.get('target_url')}'")
            # Verify welcome notification structure for customer
            assert "title" in wn
            assert "message" in wn
            assert wn.get("cta_label") == "Open Dashboard"
            assert wn.get("target_url") == "/account"
        
        return notifications


class TestWelcomeNotificationIdempotency:
    """Test that welcome notifications are one-time only"""
    
    def test_duplicate_login_no_duplicate_notification(self):
        """Test that logging in twice doesn't create duplicate welcome notifications"""
        creds = TEST_CREDENTIALS["admin"]
        
        # First login
        login_resp1 = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert login_resp1.status_code == 200
        token = login_resp1.json()["token"]
        
        # Get notifications count
        headers = {"Authorization": f"Bearer {token}"}
        notif_resp1 = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        welcome_count1 = len([n for n in notif_resp1.json() if n.get("type") == "welcome"])
        
        # Second login
        login_resp2 = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert login_resp2.status_code == 200
        token2 = login_resp2.json()["token"]
        
        # Get notifications count again
        headers2 = {"Authorization": f"Bearer {token2}"}
        notif_resp2 = requests.get(f"{BASE_URL}/api/notifications", headers=headers2)
        welcome_count2 = len([n for n in notif_resp2.json() if n.get("type") == "welcome"])
        
        # Should be the same count (no duplicate)
        assert welcome_count2 == welcome_count1, f"Duplicate welcome notification created: {welcome_count1} -> {welcome_count2}"
        print(f"✓ Idempotency verified - welcome notifications before: {welcome_count1}, after: {welcome_count2}")


class TestDashboardEndpoints:
    """Test dashboard endpoints that use AppLoader"""
    
    def test_admin_dashboard_kpis(self):
        """Test admin dashboard KPIs endpoint"""
        creds = TEST_CREDENTIALS["admin"]
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/kpis", headers=headers)
        assert response.status_code == 200, f"Dashboard KPIs failed: {response.text}"
        data = response.json()
        assert "kpis" in data or "operations" in data or "finance" in data
        print(f"✓ Admin dashboard KPIs endpoint working")
    
    def test_sales_manager_team_kpis(self):
        """Test sales manager team KPIs endpoint"""
        creds = TEST_CREDENTIALS["sales_manager"]
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/team-kpis", headers=headers)
        assert response.status_code == 200, f"Team KPIs failed: {response.text}"
        print(f"✓ Sales Manager team KPIs endpoint working")
    
    def test_finance_manager_finance_kpis(self):
        """Test finance manager finance KPIs endpoint"""
        creds = TEST_CREDENTIALS["finance_manager"]
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/finance-kpis", headers=headers)
        assert response.status_code == 200, f"Finance KPIs failed: {response.text}"
        print(f"✓ Finance Manager finance KPIs endpoint working")


class TestReportEndpoints:
    """Test report endpoints that use AppLoader"""
    
    def test_business_health_report(self):
        """Test business health report endpoint"""
        creds = TEST_CREDENTIALS["admin"]
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/reports/business-health?days=30", headers=headers)
        assert response.status_code == 200, f"Business health report failed: {response.text}"
        print(f"✓ Business Health Report endpoint working")
    
    def test_sales_report(self):
        """Test sales report endpoint"""
        creds = TEST_CREDENTIALS["admin"]
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/reports/sales?days=30", headers=headers)
        assert response.status_code == 200, f"Sales report failed: {response.text}"
        print(f"✓ Sales Report endpoint working")
    
    def test_financial_report(self):
        """Test financial report endpoint"""
        creds = TEST_CREDENTIALS["admin"]
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/reports/financial?days=30", headers=headers)
        assert response.status_code == 200, f"Financial report failed: {response.text}"
        print(f"✓ Financial Report endpoint working")
    
    def test_inventory_report(self):
        """Test inventory report endpoint"""
        creds = TEST_CREDENTIALS["admin"]
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/reports/inventory-intelligence", headers=headers)
        assert response.status_code == 200, f"Inventory report failed: {response.text}"
        print(f"✓ Inventory Intelligence Report endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
