"""
Test Suite for Taxonomy Restructure + Category Enhancements (Iteration 332)

Tests:
1. GET /api/marketplace/taxonomy returns exactly 2 groups: Products and Services
2. No TEST_ entries in taxonomy groups or categories
3. Categories are properly nested under Products or Services group based on category_type
4. POST /api/admin/catalog/sync-from-settings cleans up old standalone groups
5. PUT /api/admin/catalog-workspace/categories/{name} accepts fulfillment_type field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestTaxonomyStructure:
    """Test taxonomy hierarchy: Products and Services as top-level groups"""
    
    def test_taxonomy_returns_exactly_two_groups(self):
        """GET /api/marketplace/taxonomy should return exactly 2 groups: Products and Services"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        groups = data.get("groups", [])
        
        # Verify exactly 2 groups
        assert len(groups) == 2, f"Expected 2 groups, got {len(groups)}: {[g.get('name') for g in groups]}"
        
        # Verify group names
        group_names = [g.get("name") for g in groups]
        assert "Products" in group_names, f"'Products' group not found. Groups: {group_names}"
        assert "Services" in group_names, f"'Services' group not found. Groups: {group_names}"
    
    def test_no_test_entries_in_groups(self):
        """No TEST_ entries should exist in taxonomy groups"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        groups = data.get("groups", [])
        
        test_groups = [g.get("name") for g in groups if "TEST_" in g.get("name", "")]
        assert len(test_groups) == 0, f"Found TEST_ entries in groups: {test_groups}"
    
    def test_no_test_entries_in_categories(self):
        """No TEST_ entries should exist in taxonomy categories"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        categories = data.get("categories", [])
        
        test_categories = [c.get("name") for c in categories if "TEST_" in c.get("name", "")]
        assert len(test_categories) == 0, f"Found TEST_ entries in categories: {test_categories}"
    
    def test_categories_have_group_ids(self):
        """All categories should have a group_id linking to Products or Services"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        groups = data.get("groups", [])
        categories = data.get("categories", [])
        
        # Get valid group IDs
        valid_group_ids = {g.get("id") for g in groups}
        
        # Check all categories have valid group_id
        for cat in categories:
            cat_name = cat.get("name", "unknown")
            group_id = cat.get("group_id")
            assert group_id is not None, f"Category '{cat_name}' has no group_id"
            assert group_id in valid_group_ids, f"Category '{cat_name}' has invalid group_id: {group_id}"
    
    def test_products_group_has_product_type(self):
        """Products group should have type='product'"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        groups = data.get("groups", [])
        
        products_group = next((g for g in groups if g.get("name") == "Products"), None)
        assert products_group is not None, "Products group not found"
        assert products_group.get("type") == "product", f"Products group type is '{products_group.get('type')}', expected 'product'"
    
    def test_services_group_has_service_type(self):
        """Services group should have type='service'"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        groups = data.get("groups", [])
        
        services_group = next((g for g in groups if g.get("name") == "Services"), None)
        assert services_group is not None, "Services group not found"
        assert services_group.get("type") == "service", f"Services group type is '{services_group.get('type')}', expected 'service'"


class TestCategoryConfigAPI:
    """Test category configuration API with fulfillment_type"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")
    
    def test_category_update_accepts_fulfillment_type(self, admin_token):
        """PUT /api/admin/catalog-workspace/categories/{name} should accept fulfillment_type"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a category name from settings
        settings_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        if settings_response.status_code != 200:
            pytest.skip("Could not get settings")
        
        settings = settings_response.json()
        categories = settings.get("catalog", {}).get("product_categories", [])
        if not categories:
            pytest.skip("No categories found in settings")
        
        # Get first category name
        first_cat = categories[0]
        cat_name = first_cat if isinstance(first_cat, str) else first_cat.get("name", "")
        if not cat_name:
            pytest.skip("No valid category name found")
        
        # Test updating with fulfillment_type
        update_payload = {
            "fulfillment_type": "delivery_only"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json=update_payload,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        assert "fulfillment_type" in data.get("updated_fields", []), f"fulfillment_type not in updated_fields: {data}"
    
    def test_fulfillment_type_options(self, admin_token):
        """Test all valid fulfillment_type options"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a category name
        settings_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        if settings_response.status_code != 200:
            pytest.skip("Could not get settings")
        
        settings = settings_response.json()
        categories = settings.get("catalog", {}).get("product_categories", [])
        if not categories:
            pytest.skip("No categories found")
        
        first_cat = categories[0]
        cat_name = first_cat if isinstance(first_cat, str) else first_cat.get("name", "")
        
        # Test each valid fulfillment_type
        valid_types = ["delivery_pickup", "delivery_only", "pickup_only", "digital", "on_site"]
        
        for ft in valid_types:
            response = requests.put(
                f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
                json={"fulfillment_type": ft},
                headers=headers
            )
            assert response.status_code == 200, f"Failed for fulfillment_type={ft}: {response.text}"
    
    def test_category_update_accepts_related_services(self, admin_token):
        """PUT should accept related_services array"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        settings_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        if settings_response.status_code != 200:
            pytest.skip("Could not get settings")
        
        settings = settings_response.json()
        categories = settings.get("catalog", {}).get("product_categories", [])
        if not categories:
            pytest.skip("No categories found")
        
        first_cat = categories[0]
        cat_name = first_cat if isinstance(first_cat, str) else first_cat.get("name", "")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json={"related_services": ["Installation", "Maintenance"]},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "related_services" in data.get("updated_fields", [])
    
    def test_category_update_accepts_subcategories(self, admin_token):
        """PUT should accept subcategories array"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        settings_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        if settings_response.status_code != 200:
            pytest.skip("Could not get settings")
        
        settings = settings_response.json()
        categories = settings.get("catalog", {}).get("product_categories", [])
        if not categories:
            pytest.skip("No categories found")
        
        first_cat = categories[0]
        cat_name = first_cat if isinstance(first_cat, str) else first_cat.get("name", "")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/catalog-workspace/categories/{cat_name}",
            json={"subcategories": ["Sub A", "Sub B"]},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "subcategories" in data.get("updated_fields", [])


class TestSyncFromSettings:
    """Test sync-from-settings endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")
    
    def test_sync_from_settings_endpoint_exists(self, admin_token):
        """POST /api/admin/catalog/sync-from-settings should exist and work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/catalog/sync-from-settings",
            headers=headers
        )
        
        # Should return 200 or 201
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have synced count
        assert "synced" in data, f"Response missing 'synced' field: {data}"
    
    def test_sync_maintains_two_groups_only(self, admin_token):
        """After sync, taxonomy should still have exactly 2 groups"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Run sync
        requests.post(f"{BASE_URL}/api/admin/catalog/sync-from-settings", headers=headers)
        
        # Check taxonomy
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        groups = data.get("groups", [])
        
        assert len(groups) == 2, f"Expected 2 groups after sync, got {len(groups)}"
        group_names = [g.get("name") for g in groups]
        assert "Products" in group_names
        assert "Services" in group_names


class TestNoOldStandaloneGroups:
    """Verify old standalone groups are removed"""
    
    def test_no_office_supplies_group(self):
        """Old 'Office Supplies' standalone group should not exist"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        groups = data.get("groups", [])
        group_names = [g.get("name") for g in groups]
        
        assert "Office Supplies" not in group_names, f"Old 'Office Supplies' group still exists"
    
    def test_no_printing_stationery_group(self):
        """Old 'Printing & Stationery' standalone group should not exist"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        groups = data.get("groups", [])
        group_names = [g.get("name") for g in groups]
        
        assert "Printing & Stationery" not in group_names
    
    def test_no_promotional_items_group(self):
        """Old 'Promotional Items' standalone group should not exist"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        
        data = response.json()
        groups = data.get("groups", [])
        group_names = [g.get("name") for g in groups]
        
        assert "Promotional Items" not in group_names


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
