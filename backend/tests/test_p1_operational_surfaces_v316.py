"""
P1 Operational Control Surfaces Tests - Iteration 316
Tests for:
- Catalog Workspace stats endpoint (categories with display_mode/commercial_mode/sourcing_mode)
- Finance routes (commissions, commission-stats, cash-flow)
- VendorOps vendors endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        return data.get("token") or data.get("access_token")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    data = response.json()
    return data.get("token") or data.get("access_token")


@pytest.fixture
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


# ═══════════════════════════════════════════════════════════════════════════════
# CATALOG WORKSPACE TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestCatalogWorkspaceStats:
    """Tests for GET /api/admin/catalog-workspace/stats"""
    
    def test_catalog_stats_returns_200(self):
        """Catalog stats endpoint should return 200 (no auth required based on code)"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_catalog_stats_has_products_count(self):
        """Stats should include products count"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        assert "products" in data, "Missing 'products' field"
        assert isinstance(data["products"], int), "products should be integer"
        print(f"Total products: {data['products']}")
    
    def test_catalog_stats_has_active_products(self):
        """Stats should include active products count"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        assert "active_products" in data, "Missing 'active_products' field"
        assert isinstance(data["active_products"], int), "active_products should be integer"
        print(f"Active products: {data['active_products']}")
    
    def test_catalog_stats_has_categories(self):
        """Stats should include categories array"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        assert "categories" in data, "Missing 'categories' field"
        assert isinstance(data["categories"], list), "categories should be list"
        assert "category_count" in data, "Missing 'category_count' field"
        print(f"Category count: {data['category_count']}")
    
    def test_categories_have_display_mode(self):
        """Each category should have display_mode (visual/list_quote)"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        categories = data.get("categories", [])
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        for cat in categories:
            assert "display_mode" in cat, f"Category {cat.get('name')} missing display_mode"
            assert cat["display_mode"] in ["visual", "list_quote"], f"Invalid display_mode: {cat['display_mode']}"
        print(f"All {len(categories)} categories have valid display_mode")
    
    def test_categories_have_commercial_mode(self):
        """Each category should have commercial_mode (fixed_price/request_quote/hybrid)"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        categories = data.get("categories", [])
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        for cat in categories:
            assert "commercial_mode" in cat, f"Category {cat.get('name')} missing commercial_mode"
            assert cat["commercial_mode"] in ["fixed_price", "request_quote", "hybrid"], f"Invalid commercial_mode: {cat['commercial_mode']}"
        print(f"All {len(categories)} categories have valid commercial_mode")
    
    def test_categories_have_sourcing_mode(self):
        """Each category should have sourcing_mode (preferred/competitive)"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        categories = data.get("categories", [])
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        for cat in categories:
            assert "sourcing_mode" in cat, f"Category {cat.get('name')} missing sourcing_mode"
            assert cat["sourcing_mode"] in ["preferred", "competitive"], f"Invalid sourcing_mode: {cat['sourcing_mode']}"
        print(f"All {len(categories)} categories have valid sourcing_mode")
    
    def test_categories_have_product_count(self):
        """Each category should have product_count"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        categories = data.get("categories", [])
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        for cat in categories:
            assert "product_count" in cat, f"Category {cat.get('name')} missing product_count"
            assert isinstance(cat["product_count"], int), f"product_count should be int"
        print(f"Sample category: {categories[0]['name']} has {categories[0]['product_count']} products")
    
    def test_catalog_stats_has_pricing_issues(self):
        """Stats should include pricing_issues count"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        assert "pricing_issues" in data, "Missing 'pricing_issues' field"
        assert isinstance(data["pricing_issues"], int), "pricing_issues should be integer"
        print(f"Pricing issues: {data['pricing_issues']}")
    
    def test_catalog_stats_has_pending_review(self):
        """Stats should include pending_review count"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        assert "pending_review" in data, "Missing 'pending_review' field"
        assert isinstance(data["pending_review"], int), "pending_review should be integer"
        print(f"Pending review: {data['pending_review']}")
    
    def test_catalog_stats_has_quote_items(self):
        """Stats should include quote_items count"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        data = response.json()
        assert "quote_items" in data, "Missing 'quote_items' field"
        assert isinstance(data["quote_items"], int), "quote_items should be integer"
        print(f"Quote items: {data['quote_items']}")


# ═══════════════════════════════════════════════════════════════════════════════
# FINANCE ROUTES TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestFinanceCommissions:
    """Tests for GET /api/admin/finance/commissions"""
    
    def test_commissions_requires_auth(self):
        """Commissions endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commissions")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_commissions_returns_200_with_auth(self, auth_headers):
        """Commissions endpoint should return 200 with valid auth"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commissions", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_commissions_returns_list(self, auth_headers):
        """Commissions endpoint should return commissions array"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commissions", headers=auth_headers)
        data = response.json()
        assert "commissions" in data, "Missing 'commissions' field"
        assert isinstance(data["commissions"], list), "commissions should be list"
        assert "total" in data, "Missing 'total' field"
        print(f"Total commissions: {data['total']}")
    
    def test_commissions_filter_by_status(self, auth_headers):
        """Commissions can be filtered by status"""
        for status in ["pending", "approved", "paid"]:
            response = requests.get(f"{BASE_URL}/api/admin/finance/commissions?status={status}", headers=auth_headers)
            assert response.status_code == 200, f"Filter by {status} failed"
            data = response.json()
            # Verify all returned commissions have the filtered status
            for c in data.get("commissions", []):
                if c.get("status"):
                    assert c["status"] == status, f"Expected status {status}, got {c['status']}"
            print(f"Commissions with status '{status}': {data['total']}")
    
    def test_commission_record_structure(self, auth_headers):
        """Commission records should have expected fields"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commissions", headers=auth_headers)
        data = response.json()
        commissions = data.get("commissions", [])
        if len(commissions) == 0:
            pytest.skip("No commissions to test structure")
        
        c = commissions[0]
        # Check for expected fields (based on frontend expectations)
        expected_fields = ["amount", "status"]
        for field in expected_fields:
            assert field in c, f"Commission missing '{field}' field"
        print(f"Sample commission: amount={c.get('amount')}, status={c.get('status')}")


class TestFinanceCommissionStats:
    """Tests for GET /api/admin/finance/commission-stats"""
    
    def test_commission_stats_requires_auth(self):
        """Commission stats endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commission-stats")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_commission_stats_returns_200_with_auth(self, auth_headers):
        """Commission stats endpoint should return 200 with valid auth"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commission-stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_commission_stats_has_total_earned(self, auth_headers):
        """Stats should include total_earned"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commission-stats", headers=auth_headers)
        data = response.json()
        assert "total_earned" in data, "Missing 'total_earned' field"
        assert isinstance(data["total_earned"], (int, float)), "total_earned should be numeric"
        print(f"Total earned: {data['total_earned']}")
    
    def test_commission_stats_has_pending_amount(self, auth_headers):
        """Stats should include pending_amount"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commission-stats", headers=auth_headers)
        data = response.json()
        assert "pending_amount" in data, "Missing 'pending_amount' field"
        assert isinstance(data["pending_amount"], (int, float)), "pending_amount should be numeric"
        print(f"Pending amount: {data['pending_amount']}")
    
    def test_commission_stats_has_paid_amount(self, auth_headers):
        """Stats should include paid_amount"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commission-stats", headers=auth_headers)
        data = response.json()
        assert "paid_amount" in data, "Missing 'paid_amount' field"
        assert isinstance(data["paid_amount"], (int, float)), "paid_amount should be numeric"
        print(f"Paid amount: {data['paid_amount']}")
    
    def test_commission_stats_has_beneficiary_count(self, auth_headers):
        """Stats should include beneficiary_count"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/commission-stats", headers=auth_headers)
        data = response.json()
        assert "beneficiary_count" in data, "Missing 'beneficiary_count' field"
        assert isinstance(data["beneficiary_count"], int), "beneficiary_count should be integer"
        print(f"Beneficiary count: {data['beneficiary_count']}")


class TestFinanceCashFlow:
    """Tests for GET /api/admin/finance/cash-flow"""
    
    def test_cash_flow_requires_auth(self):
        """Cash flow endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/cash-flow")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_cash_flow_returns_200_with_auth(self, auth_headers):
        """Cash flow endpoint should return 200 with valid auth"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/cash-flow", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_cash_flow_has_total_revenue(self, auth_headers):
        """Cash flow should include total_revenue"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/cash-flow", headers=auth_headers)
        data = response.json()
        assert "total_revenue" in data, "Missing 'total_revenue' field"
        assert isinstance(data["total_revenue"], (int, float)), "total_revenue should be numeric"
        print(f"Total revenue: {data['total_revenue']}")
    
    def test_cash_flow_has_by_status(self, auth_headers):
        """Cash flow should include by_status breakdown"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/cash-flow", headers=auth_headers)
        data = response.json()
        assert "by_status" in data, "Missing 'by_status' field"
        assert isinstance(data["by_status"], dict), "by_status should be dict"
        print(f"Payment statuses: {list(data['by_status'].keys())}")
    
    def test_cash_flow_has_pending_approved_rejected(self, auth_headers):
        """Cash flow should include pending, approved, rejected summaries"""
        response = requests.get(f"{BASE_URL}/api/admin/finance/cash-flow", headers=auth_headers)
        data = response.json()
        for field in ["pending", "approved", "rejected"]:
            assert field in data, f"Missing '{field}' field"
            assert isinstance(data[field], dict), f"{field} should be dict"
            assert "total" in data[field], f"{field} missing 'total'"
            assert "count" in data[field], f"{field} missing 'count'"
        print(f"Pending: {data['pending']}, Approved: {data['approved']}, Rejected: {data['rejected']}")


# ═══════════════════════════════════════════════════════════════════════════════
# VENDOR OPS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestVendorOpsVendors:
    """Tests for VendorOps vendors endpoint"""
    
    def test_vendors_endpoint_returns_200(self, auth_headers):
        """Vendors endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/vendor-ops/vendors", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_vendors_returns_list(self, auth_headers):
        """Vendors endpoint should return vendors array"""
        response = requests.get(f"{BASE_URL}/api/vendor-ops/vendors", headers=auth_headers)
        data = response.json()
        assert "vendors" in data, "Missing 'vendors' field"
        assert isinstance(data["vendors"], list), "vendors should be list"
        print(f"Total vendors: {len(data['vendors'])}")
    
    def test_vendor_has_required_fields(self, auth_headers):
        """Vendor records should have expected fields for drawer display"""
        response = requests.get(f"{BASE_URL}/api/vendor-ops/vendors", headers=auth_headers)
        data = response.json()
        vendors = data.get("vendors", [])
        if len(vendors) == 0:
            pytest.skip("No vendors to test")
        
        v = vendors[0]
        # Fields needed for VendorsTab drawer
        print(f"Sample vendor: {v}")
        # At minimum should have name/company_name and status
        assert any(k in v for k in ["name", "company_name", "full_name"]), "Vendor missing name field"


class TestVendorOpsDashboardStats:
    """Tests for VendorOps dashboard stats"""
    
    def test_dashboard_stats_returns_200(self, auth_headers):
        """Dashboard stats endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_dashboard_stats_has_vendor_count(self, auth_headers):
        """Dashboard stats should include total_vendors"""
        response = requests.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats", headers=auth_headers)
        data = response.json()
        assert "total_vendors" in data, "Missing 'total_vendors' field"
        print(f"Total vendors from stats: {data['total_vendors']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
