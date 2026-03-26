"""
Service Orchestration Pack - Backend API Tests
Tests service catalog, blank products, and public service endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://quotes-orders-sync.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Authenticate as admin and return token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def api_client():
    """Basic requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestPublicServiceGroups:
    """Test public service groups endpoints - no auth required"""

    def test_list_service_groups(self, api_client):
        """GET /api/public-services/groups - List active service groups"""
        response = api_client.get(f"{BASE_URL}/api/public-services/groups")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected seeded service groups"
        
        # Verify structure of first group
        group = data[0]
        assert "key" in group
        assert "name" in group
        assert "is_active" in group
        assert group["is_active"] == True  # Public endpoint only returns active
        print(f"Found {len(data)} active service groups")

    def test_service_groups_have_required_fields(self, api_client):
        """Verify service groups have all expected fields"""
        response = api_client.get(f"{BASE_URL}/api/public-services/groups")
        assert response.status_code == 200
        
        for group in response.json():
            assert "id" in group, "Missing id field"
            assert "key" in group, "Missing key field"
            assert "name" in group, "Missing name field"
            assert "description" in group, "Missing description field"
            assert "sort_order" in group, "Missing sort_order field"


class TestPublicServiceTypes:
    """Test public service types endpoints - no auth required"""

    def test_list_all_service_types(self, api_client):
        """GET /api/public-services/types - List all active service types"""
        response = api_client.get(f"{BASE_URL}/api/public-services/types")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected seeded service types"
        print(f"Found {len(data)} active service types")

    def test_filter_types_by_group(self, api_client):
        """GET /api/public-services/types?group_key=printing - Filter by group"""
        response = api_client.get(f"{BASE_URL}/api/public-services/types?group_key=printing")
        assert response.status_code == 200
        
        data = response.json()
        for service_type in data:
            assert service_type["group_key"] == "printing", f"Expected printing group, got {service_type['group_key']}"

    def test_service_types_have_required_fields(self, api_client):
        """Verify service types have all expected fields"""
        response = api_client.get(f"{BASE_URL}/api/public-services/types")
        assert response.status_code == 200
        
        for stype in response.json():
            assert "id" in stype
            assert "key" in stype
            assert "name" in stype
            assert "group_key" in stype
            assert "service_mode" in stype
            assert "pricing_mode" in stype

    def test_get_service_detail_by_key(self, api_client):
        """GET /api/public-services/types/{service_key} - Get service details"""
        # First get a valid service key
        types_response = api_client.get(f"{BASE_URL}/api/public-services/types")
        assert types_response.status_code == 200
        
        if len(types_response.json()) > 0:
            service_key = types_response.json()[0]["key"]
            response = api_client.get(f"{BASE_URL}/api/public-services/types/{service_key}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["key"] == service_key
            assert "form_template" in data, "Service detail should include form_template"

    def test_get_service_by_slug(self, api_client):
        """GET /api/public-services/by-slug/{slug} - Get service by slug"""
        response = api_client.get(f"{BASE_URL}/api/public-services/by-slug/business-cards")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "business-cards"
        assert "form_template" in data

    def test_nonexistent_service_returns_404(self, api_client):
        """GET /api/public-services/types/{invalid} - Returns 404"""
        response = api_client.get(f"{BASE_URL}/api/public-services/types/nonexistent_service_xyz")
        assert response.status_code == 404


class TestPublicBlankProducts:
    """Test public blank products endpoints"""

    def test_list_public_blank_products(self, api_client):
        """GET /api/public-services/blank-products - List public products"""
        response = api_client.get(f"{BASE_URL}/api/public-services/blank-products")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify no cost info exposed publicly
        for product in data:
            assert "base_cost" not in product, "base_cost should not be exposed publicly"

    def test_get_blank_product_categories(self, api_client):
        """GET /api/public-services/blank-products/categories - Get categories"""
        response = api_client.get(f"{BASE_URL}/api/public-services/blank-products/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestAdminServiceGroups:
    """Test admin service group CRUD operations"""

    def test_admin_list_all_groups(self, admin_client):
        """GET /api/admin/service-catalog/groups - Admin can see all groups"""
        response = admin_client.get(f"{BASE_URL}/api/admin/service-catalog/groups")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} service groups (including inactive)")

    def test_create_service_group(self, admin_client):
        """POST /api/admin/service-catalog/groups - Create new group"""
        payload = {
            "key": "TEST_testing_group",
            "name": "TEST Testing Services",
            "description": "Test service group for automated testing",
            "icon": "package",
            "sort_order": 99,
            "is_active": True
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/groups",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["key"] == "TEST_testing_group"
        assert data["name"] == "TEST Testing Services"
        assert "id" in data
        
        # Cleanup - delete the test group
        admin_client.delete(f"{BASE_URL}/api/admin/service-catalog/groups/{data['id']}")

    def test_update_service_group(self, admin_client):
        """PUT /api/admin/service-catalog/groups/{id} - Update group"""
        # Create a test group first
        create_payload = {
            "key": "TEST_update_group",
            "name": "TEST Update Group",
            "description": "Original description",
            "sort_order": 98,
            "is_active": True
        }
        create_response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/groups",
            json=create_payload
        )
        assert create_response.status_code == 200
        group_id = create_response.json()["id"]
        
        # Update the group
        update_payload = {
            "name": "TEST Updated Name",
            "description": "Updated description"
        }
        update_response = admin_client.put(
            f"{BASE_URL}/api/admin/service-catalog/groups/{group_id}",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Verify update
        updated_data = update_response.json()
        assert updated_data["name"] == "TEST Updated Name"
        assert updated_data["description"] == "Updated description"
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/service-catalog/groups/{group_id}")

    def test_delete_service_group(self, admin_client):
        """DELETE /api/admin/service-catalog/groups/{id} - Delete group"""
        # Create a test group
        create_payload = {
            "key": "TEST_delete_group",
            "name": "TEST Delete Group",
            "is_active": True
        }
        create_response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/groups",
            json=create_payload
        )
        assert create_response.status_code == 200
        group_id = create_response.json()["id"]
        
        # Delete the group
        delete_response = admin_client.delete(
            f"{BASE_URL}/api/admin/service-catalog/groups/{group_id}"
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["deleted"] == True
        
        # Verify deletion
        get_response = admin_client.get(f"{BASE_URL}/api/admin/service-catalog/groups")
        groups = [g for g in get_response.json() if g["id"] == group_id]
        assert len(groups) == 0, "Group should be deleted"


class TestAdminServiceTypes:
    """Test admin service type CRUD operations"""

    def test_admin_list_all_types(self, admin_client):
        """GET /api/admin/service-catalog/types - Admin can see all types"""
        response = admin_client.get(f"{BASE_URL}/api/admin/service-catalog/types")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} service types")

    def test_create_service_type(self, admin_client):
        """POST /api/admin/service-catalog/types - Create new service type"""
        # Use existing group key
        payload = {
            "group_key": "printing",
            "key": "TEST_test_printing_service",
            "slug": "test-printing-service",
            "name": "TEST Test Printing Service",
            "short_description": "A test printing service",
            "description": "Detailed description for testing",
            "service_mode": "quote_request",
            "pricing_mode": "quote",
            "is_active": True,
            "site_visit_required": False,
            "has_product_blanks": False
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/types",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["key"] == "TEST_test_printing_service"
        assert data["group_key"] == "printing"
        assert "id" in data
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/service-catalog/types/{data['id']}")

    def test_create_service_type_invalid_group(self, admin_client):
        """POST with invalid group_key should fail"""
        payload = {
            "group_key": "nonexistent_group",
            "key": "test_invalid",
            "name": "Test Invalid"
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/types",
            json=payload
        )
        assert response.status_code == 404

    def test_update_service_type(self, admin_client):
        """PUT /api/admin/service-catalog/types/{id} - Update service type"""
        # Create test service type
        create_payload = {
            "group_key": "printing",
            "key": "TEST_update_service",
            "slug": "test-update-service",
            "name": "TEST Update Service",
            "service_mode": "quote_request",
            "is_active": True
        }
        create_response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/types",
            json=create_payload
        )
        assert create_response.status_code == 200
        type_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "name": "TEST Updated Service Name",
            "short_description": "Updated description",
            "site_visit_required": True
        }
        update_response = admin_client.put(
            f"{BASE_URL}/api/admin/service-catalog/types/{type_id}",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Verify
        updated_data = update_response.json()
        assert updated_data["name"] == "TEST Updated Service Name"
        assert updated_data["site_visit_required"] == True
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/service-catalog/types/{type_id}")

    def test_delete_service_type(self, admin_client):
        """DELETE /api/admin/service-catalog/types/{id} - Delete service type"""
        # Create
        create_payload = {
            "group_key": "printing",
            "key": "TEST_delete_service",
            "name": "TEST Delete Service",
            "is_active": True
        }
        create_response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/types",
            json=create_payload
        )
        assert create_response.status_code == 200
        type_id = create_response.json()["id"]
        
        # Delete
        delete_response = admin_client.delete(
            f"{BASE_URL}/api/admin/service-catalog/types/{type_id}"
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["deleted"] == True


class TestAdminBlankProducts:
    """Test admin blank products CRUD operations"""

    def test_admin_list_blank_products(self, admin_client):
        """GET /api/admin/blank-products - Admin can see all products with costs"""
        response = admin_client.get(f"{BASE_URL}/api/admin/blank-products")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} blank products")

    def test_create_blank_product(self, admin_client):
        """POST /api/admin/blank-products - Create new blank product"""
        payload = {
            "name": "TEST Test T-Shirt",
            "sku": "TEST-TSH-001",
            "category": "apparel",
            "subcategory": "t-shirts",
            "description": "Test t-shirt for automated testing",
            "sizes": ["S", "M", "L", "XL"],
            "colors": ["White", "Black", "Navy"],
            "materials": ["100% Cotton"],
            "branding_methods": ["Screen Print", "Embroidery"],
            "base_cost": 5000,
            "min_order_qty": 10,
            "lead_time_days": 5,
            "is_active": True
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/blank-products",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST Test T-Shirt"
        assert data["sku"] == "TEST-TSH-001"
        assert data["base_cost"] == 5000
        assert "id" in data
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/blank-products/{data['id']}")

    def test_get_blank_product_by_id(self, admin_client):
        """GET /api/admin/blank-products/{id} - Get specific product"""
        # Create a product first
        create_payload = {
            "name": "TEST Get Product",
            "category": "apparel",
            "base_cost": 3000,
            "is_active": True
        }
        create_response = admin_client.post(
            f"{BASE_URL}/api/admin/blank-products",
            json=create_payload
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Get by ID
        get_response = admin_client.get(
            f"{BASE_URL}/api/admin/blank-products/{product_id}"
        )
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["id"] == product_id
        assert data["name"] == "TEST Get Product"
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/blank-products/{product_id}")

    def test_update_blank_product(self, admin_client):
        """PUT /api/admin/blank-products/{id} - Update product"""
        # Create
        create_payload = {
            "name": "TEST Update Product",
            "category": "apparel",
            "base_cost": 4000,
            "is_active": True
        }
        create_response = admin_client.post(
            f"{BASE_URL}/api/admin/blank-products",
            json=create_payload
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "name": "TEST Updated Product Name",
            "base_cost": 4500,
            "sizes": ["XS", "S", "M", "L"]
        }
        update_response = admin_client.put(
            f"{BASE_URL}/api/admin/blank-products/{product_id}",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Verify
        updated_data = update_response.json()
        assert updated_data["name"] == "TEST Updated Product Name"
        assert updated_data["base_cost"] == 4500
        assert "XS" in updated_data["sizes"]
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/blank-products/{product_id}")

    def test_delete_blank_product(self, admin_client):
        """DELETE /api/admin/blank-products/{id} - Delete product"""
        # Create
        create_payload = {
            "name": "TEST Delete Product",
            "category": "apparel",
            "is_active": True
        }
        create_response = admin_client.post(
            f"{BASE_URL}/api/admin/blank-products",
            json=create_payload
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Delete
        delete_response = admin_client.delete(
            f"{BASE_URL}/api/admin/blank-products/{product_id}"
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["deleted"] == True
        
        # Verify deletion
        get_response = admin_client.get(
            f"{BASE_URL}/api/admin/blank-products/{product_id}"
        )
        assert get_response.status_code == 404

    def test_filter_blank_products_by_category(self, admin_client):
        """GET /api/admin/blank-products?category=apparel - Filter by category"""
        response = admin_client.get(
            f"{BASE_URL}/api/admin/blank-products?category=apparel"
        )
        assert response.status_code == 200
        
        data = response.json()
        for product in data:
            assert product["category"] == "apparel"

    def test_get_blank_product_categories_admin(self, admin_client):
        """GET /api/admin/blank-products/categories - Get all categories"""
        response = admin_client.get(
            f"{BASE_URL}/api/admin/blank-products/categories"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestServiceIntegration:
    """Integration tests for service orchestration flow"""

    def test_full_service_catalog_flow(self, api_client, admin_client):
        """Test complete flow: create group -> create type -> public visibility"""
        # 1. Admin creates a new service group
        group_payload = {
            "key": "TEST_integration_group",
            "name": "TEST Integration Services",
            "description": "Integration test group",
            "is_active": True,
            "sort_order": 100
        }
        group_response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/groups",
            json=group_payload
        )
        assert group_response.status_code == 200
        group_id = group_response.json()["id"]
        
        # 2. Admin creates a service type in that group
        type_payload = {
            "group_key": "TEST_integration_group",
            "key": "TEST_integration_service",
            "slug": "integration-test-service",
            "name": "TEST Integration Service",
            "short_description": "Test service for integration testing",
            "service_mode": "quote_request",
            "is_active": True
        }
        type_response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/types",
            json=type_payload
        )
        assert type_response.status_code == 200
        type_id = type_response.json()["id"]
        
        # 3. Verify public can see the group
        public_groups = api_client.get(f"{BASE_URL}/api/public-services/groups")
        assert public_groups.status_code == 200
        integration_groups = [g for g in public_groups.json() if g["key"] == "TEST_integration_group"]
        assert len(integration_groups) == 1, "New group should be visible publicly"
        
        # 4. Verify public can see the service type
        public_types = api_client.get(
            f"{BASE_URL}/api/public-services/types?group_key=TEST_integration_group"
        )
        assert public_types.status_code == 200
        assert len(public_types.json()) == 1
        
        # 5. Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/service-catalog/types/{type_id}")
        admin_client.delete(f"{BASE_URL}/api/admin/service-catalog/groups/{group_id}")

    def test_inactive_items_not_public(self, admin_client, api_client):
        """Inactive groups/types should not appear in public endpoints"""
        # Create inactive group
        group_payload = {
            "key": "TEST_inactive_group",
            "name": "TEST Inactive Group",
            "is_active": False,
            "sort_order": 101
        }
        group_response = admin_client.post(
            f"{BASE_URL}/api/admin/service-catalog/groups",
            json=group_payload
        )
        assert group_response.status_code == 200
        group_id = group_response.json()["id"]
        
        # Verify NOT visible publicly
        public_groups = api_client.get(f"{BASE_URL}/api/public-services/groups")
        inactive_groups = [g for g in public_groups.json() if g["key"] == "TEST_inactive_group"]
        assert len(inactive_groups) == 0, "Inactive group should not be visible publicly"
        
        # But admin can still see it
        admin_groups = admin_client.get(f"{BASE_URL}/api/admin/service-catalog/groups")
        admin_inactive = [g for g in admin_groups.json() if g["key"] == "TEST_inactive_group"]
        assert len(admin_inactive) == 1, "Admin should see inactive groups"
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/service-catalog/groups/{group_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
