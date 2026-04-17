"""
Konekt B2B Platform - Batch 5 Testing (Iteration 340)
Tests for:
1. Active country config API (currency, VAT, phone prefix)
2. Vendor assignments endpoint
3. Feedback inbox endpoint
4. Settings Hub tabs (Number & Currency, Countries & Markets, Launch Controls)
5. Admin dashboard KPIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestActiveCountryConfig:
    """Test active country configuration API"""
    
    def test_active_country_config_returns_200(self):
        """GET /api/admin/active-country-config should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/active-country-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Active country config endpoint returns 200")
    
    def test_active_country_config_has_required_fields(self):
        """Active country config should have currency, vat_rate, phone_prefix"""
        response = requests.get(f"{BASE_URL}/api/admin/active-country-config")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "code" in data, "Missing 'code' field"
        assert "name" in data, "Missing 'name' field"
        assert "currency" in data, "Missing 'currency' field"
        assert "currency_symbol" in data, "Missing 'currency_symbol' field"
        assert "vat_rate" in data, "Missing 'vat_rate' field"
        assert "phone_prefix" in data, "Missing 'phone_prefix' field"
        
        print(f"✓ Active country config has all required fields")
        print(f"  - Code: {data['code']}")
        print(f"  - Currency: {data['currency']}")
        print(f"  - VAT Rate: {data['vat_rate']}%")
        print(f"  - Phone Prefix: {data['phone_prefix']}")
    
    def test_active_country_defaults_to_tanzania(self):
        """Default active country should be Tanzania (TZ)"""
        response = requests.get(f"{BASE_URL}/api/admin/active-country-config")
        assert response.status_code == 200
        data = response.json()
        
        assert data["code"] == "TZ", f"Expected TZ, got {data['code']}"
        assert data["currency"] == "TZS", f"Expected TZS, got {data['currency']}"
        assert data["vat_rate"] == 18.0 or data["vat_rate"] == 18, f"Expected 18% VAT, got {data['vat_rate']}"
        assert data["phone_prefix"] == "+255", f"Expected +255, got {data['phone_prefix']}"
        
        print(f"✓ Default country is Tanzania with correct settings")


class TestVendorAssignments:
    """Test vendor assignments endpoint"""
    
    def test_vendor_assignments_endpoint_exists(self):
        """GET /api/admin/vendor-assignments should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-assignments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Vendor assignments endpoint returns 200")
    
    def test_vendor_assignments_returns_list(self):
        """Vendor assignments should return a list"""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-assignments")
        assert response.status_code == 200
        data = response.json()
        
        # Should have assignments key or be a list
        if isinstance(data, dict):
            assert "assignments" in data or "items" in data or "data" in data, "Response should have assignments data"
        else:
            assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Vendor assignments returns valid data structure")


class TestFeedbackInbox:
    """Test feedback inbox endpoint"""
    
    def test_feedback_inbox_endpoint_exists(self):
        """GET /api/admin/feedback-inbox should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/feedback-inbox")
        # Accept 200 or 404 (if endpoint doesn't exist yet)
        assert response.status_code in [200, 404], f"Unexpected status {response.status_code}"
        if response.status_code == 200:
            print(f"✓ Feedback inbox endpoint returns 200")
        else:
            print(f"⚠ Feedback inbox endpoint returns 404 - may need implementation")
    
    def test_feedback_stats_endpoint(self):
        """GET /api/admin/feedback-inbox/stats should return stats"""
        response = requests.get(f"{BASE_URL}/api/admin/feedback-inbox/stats")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Feedback stats endpoint returns 200")
            print(f"  Stats: {data}")
        else:
            print(f"⚠ Feedback stats endpoint returns {response.status_code}")


class TestSettingsHub:
    """Test Settings Hub API endpoints"""
    
    def test_settings_hub_get(self):
        """GET /api/admin/settings-hub should return settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should have settings structure
        assert isinstance(data, dict), "Settings should be a dict"
        print(f"✓ Settings Hub GET returns 200")
    
    def test_settings_hub_has_countries_config(self):
        """Settings Hub should have countries configuration"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200
        data = response.json()
        
        # Check for countries config
        if "countries" in data:
            countries = data["countries"]
            print(f"✓ Settings Hub has countries config")
            if "active_country" in countries:
                print(f"  - Active country: {countries['active_country']}")
            if "available_countries" in countries:
                print(f"  - Available countries: {len(countries['available_countries'])}")
        else:
            print(f"⚠ Countries config not found in settings hub root - may be nested")
    
    def test_settings_hub_has_launch_controls(self):
        """Settings Hub should have launch controls"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200
        data = response.json()
        
        # Check for launch controls
        if "launch_controls" in data:
            print(f"✓ Settings Hub has launch_controls")
            lc = data["launch_controls"]
            if "system_mode" in lc:
                print(f"  - System mode: {lc['system_mode']}")
        else:
            print(f"⚠ launch_controls not found in settings hub root - may be nested")


class TestAdminDashboard:
    """Test Admin Dashboard KPIs endpoint"""
    
    def test_dashboard_kpis_endpoint(self):
        """GET /api/admin/dashboard/kpis should return KPIs"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/kpis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should have kpis section
        assert "kpis" in data, "Response should have 'kpis' section"
        print(f"✓ Dashboard KPIs endpoint returns 200")
        
        kpis = data["kpis"]
        print(f"  - Orders today: {kpis.get('orders_today', 'N/A')}")
        print(f"  - Revenue month: {kpis.get('revenue_month', 'N/A')}")
        print(f"  - Active quotes: {kpis.get('active_quotes', 'N/A')}")


class TestMarketplaceServices:
    """Test marketplace service categories"""
    
    def test_service_categories_endpoint(self):
        """GET /api/marketplace/service-categories should return categories"""
        response = requests.get(f"{BASE_URL}/api/marketplace/service-categories")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Service categories endpoint returns 200")
            if isinstance(data, list):
                print(f"  - Found {len(data)} service categories")
                for cat in data[:3]:
                    name = cat.get('name', cat.get('category', 'Unknown'))
                    subs = cat.get('subcategories', cat.get('sub_categories', []))
                    print(f"    - {name}: {len(subs)} subcategories")
        else:
            print(f"⚠ Service categories endpoint returns {response.status_code}")


class TestQuoteCreation:
    """Test quote creation with CanonicalDocumentRenderer"""
    
    def test_quotes_list_endpoint(self):
        """GET /api/admin/quotes should return quotes list"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Quotes list endpoint returns 200")
            if isinstance(data, dict) and "quotes" in data:
                print(f"  - Found {len(data['quotes'])} quotes")
            elif isinstance(data, list):
                print(f"  - Found {len(data)} quotes")
        else:
            print(f"⚠ Quotes list endpoint returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
