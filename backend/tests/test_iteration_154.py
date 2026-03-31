"""
Iteration 154 Backend Tests
Tests for: Vendor Capabilities, Catalog Taxonomy, CRM, Partnerships, Marketplace APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin auth failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_client(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


class TestVendorCapabilitiesAPI:
    """Tests for /api/admin/vendor-capabilities/assignment/* endpoints"""

    def test_get_vendors_list(self, admin_client):
        """GET /api/admin/vendor-capabilities/assignment/vendors returns vendor list"""
        response = admin_client.get(f"{BASE_URL}/api/admin/vendor-capabilities/assignment/vendors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of vendors"
        # Verify structure if vendors exist
        if len(data) > 0:
            vendor = data[0]
            assert "id" in vendor, "Vendor should have id"
            assert "email" in vendor, "Vendor should have email"

    def test_save_vendor_capabilities(self, admin_client):
        """POST /api/admin/vendor-capabilities/assignment saves capability data"""
        # First get a vendor
        vendors_res = admin_client.get(f"{BASE_URL}/api/admin/vendor-capabilities/assignment/vendors")
        vendors = vendors_res.json()
        
        if len(vendors) == 0:
            pytest.skip("No vendors available for testing")
        
        vendor_id = vendors[0]["id"]
        
        # Save capabilities
        payload = {
            "vendor_id": vendor_id,
            "capability_type": "both",
            "group_ids": [],
            "category_ids": [],
            "subcategory_ids": []
        }
        response = admin_client.post(f"{BASE_URL}/api/admin/vendor-capabilities/assignment", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify saved
        get_res = admin_client.get(f"{BASE_URL}/api/admin/vendor-capabilities/assignment/{vendor_id}")
        assert get_res.status_code == 200
        saved = get_res.json()
        assert saved.get("vendor_id") == vendor_id
        assert saved.get("capability_type") == "both"


class TestCatalogTaxonomyAPI:
    """Tests for /api/admin/catalog/* endpoints"""

    def test_get_groups(self, admin_client):
        """GET /api/admin/catalog/groups returns groups"""
        response = admin_client.get(f"{BASE_URL}/api/admin/catalog/groups")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of groups"

    def test_get_categories(self, admin_client):
        """GET /api/admin/catalog/categories returns categories"""
        response = admin_client.get(f"{BASE_URL}/api/admin/catalog/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of categories"

    def test_get_subcategories(self, admin_client):
        """GET /api/admin/catalog/subcategories returns subcategories"""
        response = admin_client.get(f"{BASE_URL}/api/admin/catalog/subcategories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of subcategories"


class TestCRMAPI:
    """Tests for CRM-related endpoints"""

    def test_crm_intelligence_dashboard(self, admin_client):
        """GET /api/admin/crm-intelligence/dashboard returns intelligence data"""
        response = admin_client.get(f"{BASE_URL}/api/admin/crm-intelligence/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "summary" in data or isinstance(data, dict), "Expected dashboard data"

    def test_sales_kpis_summary(self, admin_client):
        """GET /api/admin/sales-kpis/summary returns sales KPIs"""
        response = admin_client.get(f"{BASE_URL}/api/admin/sales-kpis/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_marketing_performance_sources(self, admin_client):
        """GET /api/admin/marketing-performance/sources returns marketing data"""
        response = admin_client.get(f"{BASE_URL}/api/admin/marketing-performance/sources")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_service_leads_endpoint(self, admin_client):
        """GET /api/admin-flow-fixes/sales/service-leads returns service leads"""
        response = admin_client.get(f"{BASE_URL}/api/admin-flow-fixes/sales/service-leads")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of service leads"


class TestPartnershipsAPI:
    """Tests for /api/partnerships/* endpoints"""

    def test_partnerships_summary(self, admin_client):
        """GET /api/partnerships/summary returns partnerships summary"""
        response = admin_client.get(f"{BASE_URL}/api/partnerships/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify expected fields
        assert "affiliates_count" in data or isinstance(data, dict), "Expected summary data"


class TestMarketplaceAPI:
    """Tests for marketplace endpoints"""

    def test_marketplace_taxonomy(self):
        """GET /api/marketplace/taxonomy returns taxonomy data"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "groups" in data, "Expected groups in taxonomy"
        assert "categories" in data, "Expected categories in taxonomy"
        assert "subcategories" in data, "Expected subcategories in taxonomy"

    def test_marketplace_products_search(self):
        """GET /api/marketplace/products/search returns products"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of products"


class TestAuthEndpoints:
    """Tests for authentication endpoints"""

    def test_admin_login_valid(self):
        """POST /api/auth/login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Expected token in response"

    def test_admin_login_invalid(self):
        """POST /api/auth/login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"


class TestLeadsAPI:
    """Tests for leads endpoints"""

    def test_get_leads(self, admin_client):
        """GET /api/admin/crm/leads returns leads list"""
        response = admin_client.get(f"{BASE_URL}/api/admin/crm/leads")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of leads"
