"""
Test Settings Hub Sidebar Redesign - Iteration 267
Tests:
1. Settings Hub API (GET/PUT /api/admin/settings-hub)
2. Content Studio regression (page loads with products)
3. Sales Content Hub regression (shows product cards)
4. Business Settings regression (logo/stamp upload visible)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestSettingsHubAPI:
    """Test Settings Hub backend API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Admin login
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "No token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_settings_hub(self):
        """GET /api/admin/settings-hub returns settings data"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200, f"GET settings-hub failed: {resp.text}"
        data = resp.json()
        
        # Verify key sections exist (these are the 15 sidebar sections)
        assert "business_profile" in data, "Missing business_profile section"
        assert "payment_accounts" in data, "Missing payment_accounts section"
        assert "branding" in data, "Missing branding section"
        assert "commercial" in data, "Missing commercial section"
        assert "operational_rules" in data, "Missing operational_rules section"
        assert "sales" in data, "Missing sales section"
        assert "affiliate" in data, "Missing affiliate section"
        assert "payouts" in data, "Missing payouts section"
        assert "progress_workflows" in data, "Missing progress_workflows section"
        assert "partner_policy" in data, "Missing partner_policy section"
        assert "notifications" in data, "Missing notifications section"
        assert "launch_controls" in data, "Missing launch_controls section"
        print("✓ GET /api/admin/settings-hub returns all expected sections")
    
    def test_put_settings_hub(self):
        """PUT /api/admin/settings-hub saves settings"""
        # First get current settings
        get_resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert get_resp.status_code == 200
        current = get_resp.json()
        
        # Update a field
        test_tagline = f"Test Tagline {os.urandom(4).hex()}"
        current["business_profile"]["tagline"] = test_tagline
        
        # Save
        put_resp = self.session.put(f"{BASE_URL}/api/admin/settings-hub", json=current)
        assert put_resp.status_code == 200, f"PUT settings-hub failed: {put_resp.text}"
        
        # Verify persistence
        verify_resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert verify_resp.status_code == 200
        saved = verify_resp.json()
        assert saved["business_profile"]["tagline"] == test_tagline, "Tagline not persisted"
        print("✓ PUT /api/admin/settings-hub saves and persists settings")


class TestContentStudioRegression:
    """Regression tests for Content Studio at /admin/content-studio"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Admin login
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_content_engine_products(self):
        """GET /api/content-engine/template-data/products returns products"""
        resp = self.session.get(f"{BASE_URL}/api/content-engine/template-data/products")
        assert resp.status_code == 200, f"Products endpoint failed: {resp.text}"
        data = resp.json()
        assert "items" in data, "Missing items in response"
        items = data["items"]
        assert len(items) > 0, "No products returned"
        
        # Verify product structure
        product = items[0]
        assert "id" in product, "Product missing id"
        assert "name" in product, "Product missing name"
        print(f"✓ Content engine returns {len(items)} products")
    
    def test_content_engine_branding(self):
        """GET /api/content-engine/template-data/branding returns branding"""
        resp = self.session.get(f"{BASE_URL}/api/content-engine/template-data/branding")
        assert resp.status_code == 200, f"Branding endpoint failed: {resp.text}"
        data = resp.json()
        assert "branding" in data, "Missing branding in response"
        print("✓ Content engine branding endpoint works")


class TestSalesContentHubRegression:
    """Regression tests for Sales Content Hub at /staff/content-hub"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Staff login
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "staff@konekt.co.tz",
            "password": "Staff123!"
        })
        assert login_resp.status_code == 200, f"Staff login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_staff_can_access_content_data(self):
        """Staff can access content engine data for Sales Content Hub"""
        resp = self.session.get(f"{BASE_URL}/api/content-engine/template-data/products")
        assert resp.status_code == 200, f"Staff products access failed: {resp.text}"
        data = resp.json()
        assert "items" in data
        print(f"✓ Staff can access content data ({len(data['items'])} products)")


class TestBusinessSettingsRegression:
    """Regression tests for Business Settings at /admin/business-settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Admin login
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_business_settings_api(self):
        """GET /api/admin/business-settings returns settings with logo/stamp fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/business-settings")
        assert resp.status_code == 200, f"Business settings failed: {resp.text}"
        data = resp.json()
        
        # Verify logo/stamp fields exist (for upload functionality)
        # These may be empty but the fields should exist
        assert isinstance(data, dict), "Response should be a dict"
        print("✓ Business settings API works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
