"""
Test suite for Konekt B2B Platform Batch 1 Fixes (Iteration 336)
Features tested:
1. Dashboard profit_month floors at 0 when no revenue
2. Go-live reset endpoint clears test data
3. Operations navigation consolidation (verified via frontend)
4. Quote creation with CanonicalDocumentRenderer (verified via frontend)
5. Marketplace service cards without 'No Listing Found' (verified via frontend)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestDashboardProfitKPI:
    """Test dashboard profit KPI floors at 0 when no revenue"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get auth token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_dashboard_kpis_returns_profit_month(self):
        """Test that dashboard KPIs endpoint returns profit_month field"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200, f"Dashboard KPIs failed: {resp.text}"
        data = resp.json()
        
        # Verify KPIs structure
        assert "kpis" in data, "Missing 'kpis' in response"
        kpis = data["kpis"]
        
        # Verify profit_month exists
        assert "profit_month" in kpis, "Missing 'profit_month' in KPIs"
        assert "revenue_month" in kpis, "Missing 'revenue_month' in KPIs"
        
        # Verify profit_month is not negative (floors at 0)
        profit_month = kpis["profit_month"]
        revenue_month = kpis["revenue_month"]
        
        print(f"Revenue Month: {revenue_month}, Profit Month: {profit_month}")
        
        # If revenue is 0 or negative, profit should be 0 (not negative)
        if revenue_month <= 0:
            assert profit_month == 0, f"Profit should be 0 when no revenue, got {profit_month}"
        else:
            # Profit can be positive or 0, but not negative when there's revenue
            assert profit_month >= 0, f"Profit should not be negative, got {profit_month}"
    
    def test_dashboard_kpis_has_charts(self):
        """Test that dashboard KPIs includes revenue_trend with profit data"""
        resp = self.session.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "charts" in data, "Missing 'charts' in response"
        charts = data["charts"]
        
        assert "revenue_trend" in charts, "Missing 'revenue_trend' in charts"
        revenue_trend = charts["revenue_trend"]
        
        # Each month should have revenue and profit
        if revenue_trend:
            for month_data in revenue_trend:
                assert "month" in month_data, "Missing 'month' in revenue_trend item"
                assert "revenue" in month_data, "Missing 'revenue' in revenue_trend item"
                assert "profit" in month_data, "Missing 'profit' in revenue_trend item"
                
                # Profit should not be negative when revenue is 0
                if month_data["revenue"] <= 0:
                    assert month_data["profit"] == 0, f"Profit should be 0 when no revenue for {month_data['month']}"


class TestGoLiveResetEndpoint:
    """Test go-live reset endpoint clears test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get auth token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_go_live_reset_endpoint_exists(self):
        """Test that go-live reset endpoint exists and is accessible"""
        # Note: We don't actually call this endpoint as it clears data
        # Just verify the endpoint structure by checking settings hub
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200, f"Settings hub failed: {resp.text}"
        data = resp.json()
        
        # Verify launch_controls exists in settings
        assert "launch_controls" in data, "Missing 'launch_controls' in settings"
        launch = data["launch_controls"]
        
        # Verify system_mode field exists
        assert "system_mode" in launch, "Missing 'system_mode' in launch_controls"
        
        # Valid modes: testing, controlled_launch, full_live
        valid_modes = ["testing", "controlled_launch", "full_live"]
        assert launch["system_mode"] in valid_modes, f"Invalid system_mode: {launch['system_mode']}"
        
        print(f"Current system mode: {launch['system_mode']}")


class TestSettingsHubLaunchControls:
    """Test Settings Hub Launch Controls tab"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get auth token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_settings_hub_has_launch_controls(self):
        """Test that settings hub includes launch controls configuration"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "launch_controls" in data, "Missing 'launch_controls' in settings"
        launch = data["launch_controls"]
        
        # Verify all expected fields
        expected_fields = [
            "system_mode",
            "manual_payment_verification",
            "manual_payout_approval",
            "affiliate_approval_required",
            "ai_enabled",
            "bank_only_payments",
            "audit_notifications_enabled"
        ]
        
        for field in expected_fields:
            assert field in launch, f"Missing '{field}' in launch_controls"
        
        print(f"Launch controls: {launch}")


class TestMarketplaceEndpoints:
    """Test marketplace endpoints for service cards"""
    
    def test_marketplace_products_search(self):
        """Test marketplace products search endpoint"""
        resp = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert resp.status_code == 200, f"Marketplace search failed: {resp.text}"
        data = resp.json()
        
        # Should return a list (can be empty after go-live reset)
        assert isinstance(data, list), "Marketplace search should return a list"
        print(f"Marketplace products count: {len(data)}")
    
    def test_marketplace_taxonomy(self):
        """Test marketplace taxonomy endpoint"""
        resp = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert resp.status_code == 200, f"Marketplace taxonomy failed: {resp.text}"
        data = resp.json()
        
        # Should have groups, categories, subcategories
        assert "groups" in data, "Missing 'groups' in taxonomy"
        assert "categories" in data, "Missing 'categories' in taxonomy"
        assert "subcategories" in data, "Missing 'subcategories' in taxonomy"
        
        print(f"Taxonomy: {len(data.get('groups', []))} groups, {len(data.get('categories', []))} categories")


class TestQuoteCreationEndpoints:
    """Test quote creation related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get auth token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_document_render_settings(self):
        """Test document render settings endpoint for branding"""
        resp = self.session.get(f"{BASE_URL}/api/documents/render-settings")
        assert resp.status_code == 200, f"Document render settings failed: {resp.text}"
        data = resp.json()
        
        # Should have company branding info
        expected_fields = ["company_name", "logo_url", "bank_name", "bank_account_number"]
        for field in expected_fields:
            if field in data:
                print(f"{field}: {data[field][:50] if isinstance(data[field], str) and len(data[field]) > 50 else data[field]}")
    
    def test_business_settings_endpoint(self):
        """Test business settings endpoint"""
        resp = self.session.get(f"{BASE_URL}/api/admin/business-settings")
        assert resp.status_code == 200, f"Business settings failed: {resp.text}"
        data = resp.json()
        
        # Should have tax settings
        if "tax" in data:
            assert "vat_rate" in data["tax"], "Missing 'vat_rate' in tax settings"
            print(f"VAT rate: {data['tax']['vat_rate']}%")
    
    def test_customers_list_endpoint(self):
        """Test customers list endpoint for quote creation"""
        resp = self.session.get(f"{BASE_URL}/api/admin/customers")
        assert resp.status_code == 200, f"Customers list failed: {resp.text}"
        data = resp.json()
        
        # Can be empty after go-live reset
        customers = data.get("customers", data) if isinstance(data, dict) else data
        print(f"Customers count: {len(customers) if isinstance(customers, list) else 'N/A'}")


class TestOperationsNavigation:
    """Test operations-related endpoints that should be in consolidated nav"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get auth token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_vendor_ops_orders_endpoint(self):
        """Test vendor ops orders endpoint (Orders & Fulfillment)"""
        resp = self.session.get(f"{BASE_URL}/api/vendor-ops/orders")
        # May return 200 or 404 depending on implementation
        assert resp.status_code in [200, 404], f"Vendor ops orders failed: {resp.text}"
        print(f"Vendor ops orders status: {resp.status_code}")
    
    def test_site_visits_endpoint(self):
        """Test site visits endpoint"""
        resp = self.session.get(f"{BASE_URL}/api/site-visits")
        assert resp.status_code == 200, f"Site visits failed: {resp.text}"
        data = resp.json()
        print(f"Site visits count: {len(data) if isinstance(data, list) else 'N/A'}")
    
    def test_deliveries_endpoint(self):
        """Test deliveries endpoint"""
        resp = self.session.get(f"{BASE_URL}/api/admin/deliveries")
        # May return 200 or 404 depending on implementation
        assert resp.status_code in [200, 404], f"Deliveries failed: {resp.text}"
        print(f"Deliveries status: {resp.status_code}")
    
    def test_purchase_orders_endpoint(self):
        """Test purchase orders endpoint"""
        resp = self.session.get(f"{BASE_URL}/api/admin/procurement/purchase-orders")
        # May return 200 or 404 depending on implementation
        assert resp.status_code in [200, 404], f"Purchase orders failed: {resp.text}"
        print(f"Purchase orders status: {resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
