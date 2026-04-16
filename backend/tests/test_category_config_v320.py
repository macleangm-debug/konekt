"""
Test Category Config API - Catalog Workspace
Tests for GET /api/admin/catalog-workspace/stats and PUT /api/admin/catalog-workspace/categories/{cat_name}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token via admin/auth/login endpoint"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


class TestCatalogWorkspaceStats:
    """Tests for GET /api/admin/catalog-workspace/stats"""
    
    def test_stats_returns_200(self, api_client):
        """Stats endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_stats_contains_categories(self, api_client):
        """Stats response contains categories array"""
        response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data, "Response missing 'categories' field"
        assert isinstance(data["categories"], list), "categories should be a list"
    
    def test_stats_categories_have_mode_fields(self, api_client):
        """Each category has display_mode, commercial_mode, sourcing_mode"""
        response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert response.status_code == 200
        data = response.json()
        categories = data.get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories found in settings")
        
        for cat in categories:
            assert "name" in cat, f"Category missing 'name': {cat}"
            assert "display_mode" in cat, f"Category {cat.get('name')} missing 'display_mode'"
            assert "commercial_mode" in cat, f"Category {cat.get('name')} missing 'commercial_mode'"
            assert "sourcing_mode" in cat, f"Category {cat.get('name')} missing 'sourcing_mode'"
    
    def test_stats_categories_have_product_count(self, api_client):
        """Each category has product_count field"""
        response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert response.status_code == 200
        data = response.json()
        categories = data.get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories found")
        
        for cat in categories:
            assert "product_count" in cat, f"Category {cat.get('name')} missing 'product_count'"
            assert isinstance(cat["product_count"], int), f"product_count should be int"
    
    def test_stats_contains_kpi_fields(self, api_client):
        """Stats response contains KPI fields"""
        response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = ["products", "active_products", "category_count", "pricing_issues", "quote_items"]
        for field in expected_fields:
            assert field in data, f"Response missing '{field}' field"


class TestCategoryConfigUpdate:
    """Tests for PUT /api/admin/catalog-workspace/categories/{cat_name}"""
    
    def test_update_display_mode(self, api_client):
        """Update display_mode for a category"""
        # First get categories to find a valid one
        stats_response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert stats_response.status_code == 200
        categories = stats_response.json().get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        cat_name = categories[0]["name"]
        
        # Update display_mode
        response = api_client.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json={"display_mode": "list_quote"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response should have ok:true"
        assert "updated_fields" in data, "Response should have updated_fields"
        assert "display_mode" in data["updated_fields"], "display_mode should be in updated_fields"
    
    def test_update_commercial_mode(self, api_client):
        """Update commercial_mode for a category"""
        stats_response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        categories = stats_response.json().get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        cat_name = categories[0]["name"]
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json={"commercial_mode": "hybrid"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "commercial_mode" in data["updated_fields"]
    
    def test_update_sourcing_mode(self, api_client):
        """Update sourcing_mode for a category"""
        stats_response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        categories = stats_response.json().get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        cat_name = categories[0]["name"]
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json={"sourcing_mode": "competitive"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "sourcing_mode" in data["updated_fields"]
    
    def test_update_toggle_fields(self, api_client):
        """Update toggle fields (allow_custom_items, require_description, etc.)"""
        stats_response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        categories = stats_response.json().get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        cat_name = categories[0]["name"]
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json={
                "allow_custom_items": True,
                "require_description": True,
                "show_price_in_list": False,
                "multi_item_request": True,
                "search_first": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert len(data["updated_fields"]) == 5, f"Expected 5 updated fields, got {data['updated_fields']}"
    
    def test_update_persists_in_settings(self, api_client):
        """Verify update persists - GET after PUT shows new values"""
        stats_response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        categories = stats_response.json().get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        cat_name = categories[0]["name"]
        
        # Update to specific values
        api_client.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json={
                "display_mode": "visual",
                "commercial_mode": "fixed_price",
                "sourcing_mode": "preferred"
            }
        )
        
        # Verify by fetching stats again
        verify_response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        assert verify_response.status_code == 200
        updated_categories = verify_response.json().get("categories", [])
        
        target_cat = next((c for c in updated_categories if c["name"] == cat_name), None)
        assert target_cat is not None, f"Category {cat_name} not found after update"
        assert target_cat["display_mode"] == "visual", f"display_mode not persisted"
        assert target_cat["commercial_mode"] == "fixed_price", f"commercial_mode not persisted"
        assert target_cat["sourcing_mode"] == "preferred", f"sourcing_mode not persisted"
    
    def test_update_nonexistent_category_returns_404(self, api_client):
        """PUT to non-existent category returns 404"""
        response = api_client.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/NONEXISTENT_CATEGORY_XYZ",
            json={"display_mode": "visual"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_update_ignores_invalid_fields(self, api_client):
        """PUT ignores fields not in allowed_fields"""
        stats_response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        categories = stats_response.json().get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        cat_name = categories[0]["name"]
        
        # Try to update with invalid field
        response = api_client.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json={
                "display_mode": "visual",
                "invalid_field": "should_be_ignored",
                "name": "should_not_change_name"
            }
        )
        assert response.status_code == 200
        data = response.json()
        # Only display_mode should be in updated_fields (invalid_field and name should be ignored)
        assert "display_mode" in data["updated_fields"]
        # invalid_field should not appear
        assert "invalid_field" not in data["updated_fields"]
        assert "name" not in data["updated_fields"]


class TestCategoryConfigCaseInsensitive:
    """Test case-insensitive category name matching"""
    
    def test_update_with_lowercase_name(self, api_client):
        """Category name matching is case-insensitive"""
        stats_response = api_client.get(f"{BASE_URL}/api/admin/catalog-workspace/stats")
        categories = stats_response.json().get("categories", [])
        
        if len(categories) == 0:
            pytest.skip("No categories to test")
        
        cat_name = categories[0]["name"]
        lowercase_name = cat_name.lower()
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{lowercase_name}",
            json={"display_mode": "visual"}
        )
        # Should work with lowercase name
        assert response.status_code == 200, f"Case-insensitive match failed: {response.status_code}"
