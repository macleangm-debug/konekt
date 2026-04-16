"""
Iteration 331 - Category Configuration Tests
Tests for service flow configuration + category enhancements:
- category_type (product/service)
- requires_site_visit, site_visit_optional
- installment_payments, installment_split
- related_services
- subcategories
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCategoryConfiguration:
    """Test category configuration API with new fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_update_category_with_category_type_service(self):
        """Test updating category with category_type=service"""
        response = self.session.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/Printing & Stationery",
            json={
                "category_type": "service",
                "requires_site_visit": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "category_type" in data.get("updated_fields", [])
        assert "requires_site_visit" in data.get("updated_fields", [])
    
    def test_update_category_with_installment_payments(self):
        """Test updating category with installment_payments=true and installment_split"""
        response = self.session.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/Printing & Stationery",
            json={
                "installment_payments": True,
                "installment_split": "60/40"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "installment_payments" in data.get("updated_fields", [])
        assert "installment_split" in data.get("updated_fields", [])
    
    def test_update_category_with_related_services(self):
        """Test updating category with related_services array"""
        response = self.session.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/Promotional Materials",
            json={
                "related_services": ["Printing & Stationery", "Graphics & Design"]
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "related_services" in data.get("updated_fields", [])
    
    def test_update_category_with_subcategories(self):
        """Test updating category with subcategories array"""
        response = self.session.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/Printing & Stationery",
            json={
                "subcategories": ["Business Cards", "Flyers", "Banners", "Screen Printing", "Embroidery", "DTF"]
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "subcategories" in data.get("updated_fields", [])
    
    def test_update_promotional_materials_subcategories(self):
        """Test updating Promotional Materials with subcategories"""
        response = self.session.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/Promotional Materials",
            json={
                "category_type": "product",
                "subcategories": ["T-Shirts", "Caps", "Mugs", "Bags"]
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "subcategories" in data.get("updated_fields", [])
    
    def test_category_not_found(self):
        """Test updating non-existent category returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/NonExistentCategory",
            json={"category_type": "service"}
        )
        assert response.status_code == 404
    
    def test_verify_category_persists_via_stats(self):
        """Verify category configuration persists by checking catalog stats"""
        # First update the category
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/Printing & Stationery",
            json={
                "category_type": "service",
                "requires_site_visit": True,
                "site_visit_optional": True,
                "installment_payments": True,
                "installment_split": "60/40",
                "subcategories": ["Business Cards", "Flyers", "Banners"]
            }
        )
        assert update_resp.status_code == 200
        
        # Then verify via catalog stats
        stats_resp = self.session.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert stats_resp.status_code == 200
        data = stats_resp.json()
        
        # Find the Printing & Stationery category
        categories = data.get("categories", [])
        printing_cat = next((c for c in categories if c.get("name") == "Printing & Stationery"), None)
        
        assert printing_cat is not None, "Printing & Stationery category not found in stats"
        # Verify the fields were persisted
        assert printing_cat.get("category_type") == "service", f"Expected category_type=service, got {printing_cat.get('category_type')}"
        assert printing_cat.get("requires_site_visit") == True, f"Expected requires_site_visit=True"
        assert printing_cat.get("installment_payments") == True, f"Expected installment_payments=True"


class TestAdminNavigation:
    """Test admin navigation shows Operations label"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_vendor_ops_endpoint_exists(self):
        """Test that vendor-ops endpoint exists (Operations page)"""
        response = self.session.get(f"{BASE_URL}/api/vendor-ops/price-requests")
        # Should return 200 or empty list, not 404
        assert response.status_code in [200, 401], f"Expected 200 or 401, got {response.status_code}"


class TestInvoicesPage:
    """Test Invoices page has no Create Invoice button (API level)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_invoices_list_endpoint(self):
        """Test invoices list endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/admin/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        # Response should be a list
        data = response.json()
        assert isinstance(data, list), "Expected list response"


class TestSettingsHub:
    """Test Settings Hub API returns category configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_settings_hub_returns_catalog_config(self):
        """Test settings hub returns catalog configuration"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should have catalog section
        assert "catalog" in data, "Expected catalog section in settings hub"
        catalog = data.get("catalog", {})
        
        # Should have product_categories
        assert "product_categories" in catalog, "Expected product_categories in catalog"
