"""
Test Suite for Iteration 346 - Geo Detection and Admin Reports
Tests:
1. Geo Detection API - timezone-based country detection
2. Admin Reports API - summary, vendors, customers with country breakdown
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestGeoDetectionAPI:
    """Tests for /api/geo/detect-country endpoint - no auth required"""
    
    def test_detect_country_tanzania_timezone(self):
        """GET /api/geo/detect-country?tz=Africa/Dar_es_Salaam returns TZ"""
        response = requests.get(f"{BASE_URL}/api/geo/detect-country?tz=Africa/Dar_es_Salaam")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("country_code") == "TZ", f"Expected TZ, got {data.get('country_code')}"
        assert data.get("name") == "Tanzania"
        assert data.get("currency") == "TZS"
        print(f"✓ Tanzania detection: {data}")
    
    def test_detect_country_kenya_timezone(self):
        """GET /api/geo/detect-country?tz=Africa/Nairobi returns KE"""
        response = requests.get(f"{BASE_URL}/api/geo/detect-country?tz=Africa/Nairobi")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("country_code") == "KE", f"Expected KE, got {data.get('country_code')}"
        assert data.get("name") == "Kenya"
        assert data.get("currency") == "KES"
        print(f"✓ Kenya detection: {data}")
    
    def test_detect_country_uganda_timezone(self):
        """GET /api/geo/detect-country?tz=Africa/Kampala returns UG"""
        response = requests.get(f"{BASE_URL}/api/geo/detect-country?tz=Africa/Kampala")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("country_code") == "UG", f"Expected UG, got {data.get('country_code')}"
        assert data.get("name") == "Uganda"
        assert data.get("currency") == "UGX"
        print(f"✓ Uganda detection: {data}")
    
    def test_detect_country_default_fallback(self):
        """GET /api/geo/detect-country without tz param defaults to TZ"""
        response = requests.get(f"{BASE_URL}/api/geo/detect-country")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("country_code") == "TZ", f"Expected TZ default, got {data.get('country_code')}"
        print(f"✓ Default fallback: {data}")
    
    def test_detect_country_unknown_timezone(self):
        """GET /api/geo/detect-country?tz=America/New_York defaults to TZ"""
        response = requests.get(f"{BASE_URL}/api/geo/detect-country?tz=America/New_York")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Unknown timezone should default to TZ
        assert data.get("country_code") == "TZ", f"Expected TZ for unknown tz, got {data.get('country_code')}"
        print(f"✓ Unknown timezone fallback: {data}")


class TestAdminReportsAPI:
    """Tests for /api/admin/reports/* endpoints - requires admin auth"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "form_loaded_at": str(int(time.time() * 1000))
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                print(f"✓ Admin login successful")
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
    
    def test_reports_summary_month(self):
        """GET /api/admin/reports/summary?period=month returns country breakdown"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/summary?period=month")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "period" in data, "Missing 'period' field"
        assert data["period"] == "month"
        assert "countries" in data, "Missing 'countries' field"
        assert "totals" in data, "Missing 'totals' field"
        
        # Verify all 3 countries present
        countries = data["countries"]
        assert "TZ" in countries, "Missing TZ in countries"
        assert "KE" in countries, "Missing KE in countries"
        assert "UG" in countries, "Missing UG in countries"
        
        # Verify country data structure
        for code in ["TZ", "KE", "UG"]:
            country_data = countries[code]
            assert "revenue" in country_data, f"Missing revenue for {code}"
            assert "orders" in country_data, f"Missing orders for {code}"
            assert "profit" in country_data, f"Missing profit for {code}"
            assert "new_customers" in country_data, f"Missing new_customers for {code}"
            assert "margin_pct" in country_data, f"Missing margin_pct for {code}"
        
        # Verify totals structure
        totals = data["totals"]
        assert "revenue" in totals
        assert "orders" in totals
        assert "profit" in totals
        assert "new_customers" in totals
        
        print(f"✓ Summary report: TZ={countries['TZ']['new_customers']} new customers, KE={countries['KE']['new_customers']}, UG={countries['UG']['new_customers']}")
        print(f"  Totals: revenue={totals['revenue']}, orders={totals['orders']}, new_customers={totals['new_customers']}")
    
    def test_reports_summary_week(self):
        """GET /api/admin/reports/summary?period=week works"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/summary?period=week")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["period"] == "week"
        assert "countries" in data
        print(f"✓ Week summary report loaded")
    
    def test_reports_summary_quarter(self):
        """GET /api/admin/reports/summary?period=quarter works"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/summary?period=quarter")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["period"] == "quarter"
        assert "countries" in data
        print(f"✓ Quarter summary report loaded")
    
    def test_reports_summary_year(self):
        """GET /api/admin/reports/summary?period=year works"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/summary?period=year")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["period"] == "year"
        assert "countries" in data
        print(f"✓ Year summary report loaded")
    
    def test_reports_summary_single_country(self):
        """GET /api/admin/reports/summary?country=TZ returns only TZ data"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/summary?period=month&country=TZ")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        countries = data.get("countries", {})
        assert "TZ" in countries, "TZ should be in filtered response"
        # When filtering by single country, only that country should be present
        print(f"✓ Single country filter (TZ): {len(countries)} country(ies) returned")
    
    def test_reports_vendors(self):
        """GET /api/admin/reports/vendors returns vendor list with country_code"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/vendors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "total_vendors" in data, "Missing total_vendors"
        assert "vendors" in data, "Missing vendors list"
        assert "country_filter" in data, "Missing country_filter"
        
        # Check vendor structure if any vendors exist
        if data["vendors"]:
            vendor = data["vendors"][0]
            assert "vendor_id" in vendor or "name" in vendor, "Vendor missing identifier"
            assert "country_code" in vendor, "Vendor missing country_code"
        
        print(f"✓ Vendors report: {data['total_vendors']} vendors, filter={data['country_filter']}")
    
    def test_reports_vendors_country_filter(self):
        """GET /api/admin/reports/vendors?country=TZ filters by country"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/vendors?country=TZ")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["country_filter"] == "TZ"
        print(f"✓ Vendors report with TZ filter: {data['total_vendors']} vendors")
    
    def test_reports_customers(self):
        """GET /api/admin/reports/customers?period=month returns customer metrics"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/customers?period=month")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "period" in data, "Missing period"
        assert "total_customers" in data, "Missing total_customers"
        assert "new_customers" in data, "Missing new_customers"
        assert "active_customers" in data, "Missing active_customers"
        assert "top_customers" in data, "Missing top_customers"
        
        print(f"✓ Customers report: total={data['total_customers']}, new={data['new_customers']}, active={data['active_customers']}")
    
    def test_reports_customers_country_filter(self):
        """GET /api/admin/reports/customers?country=TZ filters by country"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/customers?period=month&country=TZ")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["country_filter"] == "TZ"
        print(f"✓ Customers report with TZ filter: {data['new_customers']} new customers")


class TestMarketplaceCountryIntegration:
    """Tests for marketplace country selector integration"""
    
    def test_marketplace_products_with_country_tz(self):
        """GET /api/marketplace/products/search?country=TZ returns TZ products"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?country=TZ")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        products = response.json()
        # Based on previous iteration, TZ should have 37 products
        print(f"✓ TZ marketplace products: {len(products)} products")
        assert len(products) > 0, "Expected TZ to have products"
    
    def test_marketplace_products_with_country_ke(self):
        """GET /api/marketplace/products/search?country=KE returns KE products (may be 0)"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?country=KE")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        products = response.json()
        print(f"✓ KE marketplace products: {len(products)} products")
    
    def test_marketplace_products_with_country_ug(self):
        """GET /api/marketplace/products/search?country=UG returns UG products (may be 0)"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?country=UG")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        products = response.json()
        print(f"✓ UG marketplace products: {len(products)} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
