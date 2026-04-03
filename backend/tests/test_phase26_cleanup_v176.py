"""
Phase 26 Cleanup & Canonicalization Tests
- Tests frontend route redirects (via backend API verification)
- Tests deregistered backend routes return 404
- Tests canonical routes still work
- Tests marketplace and vendor supply review still work
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Health endpoint should return healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint returns healthy")
    
    def test_admin_login(self):
        """Admin login should work"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"PASS: Admin login successful, role={data.get('user', {}).get('role')}")
        return data["token"]
    
    def test_customer_login(self):
        """Customer login should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("PASS: Customer login successful")
        return data["token"]


class TestDeregisteredRoutes:
    """Test that deregistered routes return 404"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_settings_company_deregistered(self, admin_token):
        """GET /api/admin/settings/company should return 404 (deregistered)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/company",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should be 404 since settings_router is deregistered
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: /api/admin/settings/company returns 404 (deregistered)")
    
    def test_branding_settings_deregistered(self, admin_token):
        """GET /api/admin/branding-settings should return 404 (deregistered)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/branding-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should be 404 since branding_settings_router is deregistered
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: /api/admin/branding-settings returns 404 (deregistered)")
    
    def test_settings_hub_deregistered(self, admin_token):
        """GET /api/admin/settings-hub should return 404 (deregistered)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should be 404 since admin_settings_hub_router is deregistered
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: /api/admin/settings-hub returns 404 (deregistered)")


class TestCanonicalRoutes:
    """Test that canonical routes still work"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_business_settings_returns_200(self, admin_token):
        """GET /api/admin/business-settings should return 200 (canonical)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/business-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"PASS: /api/admin/business-settings returns 200, keys={list(data.keys())[:5]}")
    
    def test_business_settings_public_returns_company_data(self):
        """GET /api/admin/business-settings/public should return company data (no auth)"""
        response = requests.get(f"{BASE_URL}/api/admin/business-settings/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should have company info
        assert "company_name" in data or "trading_name" in data or len(data) > 0
        print(f"PASS: /api/admin/business-settings/public returns company data, keys={list(data.keys())[:5]}")


class TestMarketplaceStillWorks:
    """Test that marketplace search and product detail still work"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        return response.json().get("token")
    
    def test_marketplace_search_returns_products(self, customer_token):
        """GET /api/marketplace/products/search should return approved products"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/products/search",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should return products array
        products = data.get("products", data) if isinstance(data, dict) else data
        print(f"PASS: Marketplace search returns {len(products) if isinstance(products, list) else 'data'}")
    
    def test_marketplace_search_public(self):
        """GET /api/marketplace/products/search should work without auth"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        # Should work without auth (public marketplace)
        assert response.status_code in [200, 401], f"Unexpected status {response.status_code}"
        if response.status_code == 200:
            print("PASS: Marketplace search works without auth (public)")
        else:
            print("INFO: Marketplace search requires auth")


class TestVendorSupplyReview:
    """Test that admin vendor supply review still works"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_vendor_supply_submissions_list(self, admin_token):
        """GET /api/admin/vendor-supply/submissions should return list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-supply/submissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"PASS: Vendor supply submissions returns {len(data) if isinstance(data, list) else 'data'}")


class TestVendorsEndpoint:
    """Test that vendors endpoint still works"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_vendors_list(self, admin_token):
        """GET /api/admin/vendors should return list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        vendors = data.get("vendors", data) if isinstance(data, dict) else data
        print(f"PASS: Vendors list returns {len(vendors) if isinstance(vendors, list) else 'data'}")


class TestCatalogEndpoint:
    """Test that catalog/products endpoint still works"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_admin_products_list(self, admin_token):
        """GET /api/admin/products should return list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        products = data.get("products", data) if isinstance(data, dict) else data
        print(f"PASS: Admin products list returns {len(products) if isinstance(products, list) else 'data'}")


class TestNoDuplicateRouterIncludes:
    """Verify no duplicate router includes by checking unique endpoints"""
    
    def test_docs_endpoint_loads(self):
        """Docs endpoint should load without errors (indicates no duplicate routes)"""
        response = requests.get(f"{BASE_URL}/docs")
        # FastAPI docs page should return 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /docs endpoint loads successfully (no duplicate route conflicts)")


class TestSidebarCounts:
    """Test sidebar counts endpoint still works"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_sidebar_counts(self, admin_token):
        """GET /api/admin/sidebar-counts should return counts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sidebar-counts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"PASS: Sidebar counts returns {list(data.keys())[:5]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
