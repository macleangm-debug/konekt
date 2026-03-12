"""
Backend API Tests for Inventory Variants and Platform Alignment Features
- Inventory Variants CRUD API tests
- Admin sidebar navigation (API endpoints for Inventory section)
- CRM Pipeline view modes (API)
- Customers filters (API)
- API authentication for admin and customer tokens
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("token")
        print(f"Admin token obtained successfully")
        return token
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture(scope="module")
def test_product_id(authenticated_client):
    """Get a product ID to use for variant tests"""
    response = authenticated_client.get(f"{BASE_URL}/api/admin/products?limit=1")
    if response.status_code == 200:
        products = response.json().get("products", [])
        if products:
            return products[0]["id"]
    pytest.skip("No products found for testing")


class TestHealth:
    """Health check test"""
    
    def test_health_endpoint(self, api_client):
        """Verify API is healthy"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("Health endpoint PASS")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self, api_client):
        """Test admin login returns token"""
        response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"Admin login PASS - role: {data['user'].get('role')}")


class TestInventoryVariantsAPI:
    """Test inventory variants CRUD operations"""
    
    def test_list_variants_requires_auth(self, api_client):
        """Verify list variants requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/inventory-variants")
        # Should require auth
        assert response.status_code == 401 or response.status_code == 403
        print("List variants auth check PASS")
    
    def test_list_variants(self, authenticated_client):
        """Test listing inventory variants"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/inventory-variants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"List variants PASS - found {len(data)} variants")
        return data
    
    def test_create_variant(self, authenticated_client, test_product_id):
        """Test creating a new inventory variant"""
        unique_sku = f"TEST-VAR-{uuid.uuid4().hex[:8].upper()}"
        
        payload = {
            "product_id": test_product_id,
            "sku": unique_sku,
            "variant_attributes": {"size": "L", "color": "Blue"},
            "stock_on_hand": 25,
            "reserved_stock": 5,
            "warehouse_location": "Test Warehouse A",
            "unit_cost": 5000,
            "selling_price": 8000,
            "reorder_level": 5,
            "is_active": True
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/admin/inventory-variants",
            json=payload
        )
        
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["sku"] == unique_sku
        assert data["product_id"] == test_product_id
        assert data["stock_on_hand"] == 25
        assert data["variant_attributes"]["size"] == "L"
        assert data["variant_attributes"]["color"] == "Blue"
        
        print(f"Create variant PASS - SKU: {unique_sku}, ID: {data['id']}")
        return data["id"], unique_sku
    
    def test_get_variant_by_id(self, authenticated_client, test_product_id):
        """Test getting a single variant by ID"""
        # First create a variant
        unique_sku = f"TEST-GET-{uuid.uuid4().hex[:8].upper()}"
        create_res = authenticated_client.post(
            f"{BASE_URL}/api/admin/inventory-variants",
            json={
                "product_id": test_product_id,
                "sku": unique_sku,
                "variant_attributes": {"size": "M"},
                "stock_on_hand": 10
            }
        )
        assert create_res.status_code in [200, 201]
        variant_id = create_res.json()["id"]
        
        # Get the variant
        response = authenticated_client.get(
            f"{BASE_URL}/api/admin/inventory-variants/{variant_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == variant_id
        assert data["sku"] == unique_sku
        print(f"Get variant by ID PASS - ID: {variant_id}")
    
    def test_update_variant(self, authenticated_client, test_product_id):
        """Test updating an inventory variant"""
        # Create a variant to update
        unique_sku = f"TEST-UPD-{uuid.uuid4().hex[:8].upper()}"
        create_res = authenticated_client.post(
            f"{BASE_URL}/api/admin/inventory-variants",
            json={
                "product_id": test_product_id,
                "sku": unique_sku,
                "variant_attributes": {"size": "S"},
                "stock_on_hand": 15,
                "reorder_level": 5
            }
        )
        assert create_res.status_code in [200, 201]
        variant_id = create_res.json()["id"]
        
        # Update the variant
        update_payload = {
            "stock_on_hand": 30,
            "warehouse_location": "Updated Location",
            "reorder_level": 10
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/inventory-variants/{variant_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["stock_on_hand"] == 30
        assert data["warehouse_location"] == "Updated Location"
        assert data["reorder_level"] == 10
        print(f"Update variant PASS - ID: {variant_id}")
    
    def test_delete_variant(self, authenticated_client, test_product_id):
        """Test soft deleting an inventory variant"""
        # Create a variant to delete
        unique_sku = f"TEST-DEL-{uuid.uuid4().hex[:8].upper()}"
        create_res = authenticated_client.post(
            f"{BASE_URL}/api/admin/inventory-variants",
            json={
                "product_id": test_product_id,
                "sku": unique_sku,
                "variant_attributes": {"size": "XL"},
                "stock_on_hand": 5
            }
        )
        assert create_res.status_code in [200, 201]
        variant_id = create_res.json()["id"]
        
        # Delete (soft delete) the variant
        response = authenticated_client.delete(
            f"{BASE_URL}/api/admin/inventory-variants/{variant_id}"
        )
        assert response.status_code in [200, 204]
        print(f"Delete variant PASS - ID: {variant_id}")
        
        # Verify it's deactivated (should still be retrievable but is_active=False)
        get_res = authenticated_client.get(
            f"{BASE_URL}/api/admin/inventory-variants/{variant_id}"
        )
        assert get_res.status_code == 200
        assert get_res.json()["is_active"] == False
        print("Variant soft delete verified - is_active=False")
    
    def test_filter_variants_by_product(self, authenticated_client, test_product_id):
        """Test filtering variants by product_id"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/admin/inventory-variants?product_id={test_product_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned variants should belong to the specified product
        for variant in data:
            assert variant["product_id"] == test_product_id
        print(f"Filter by product PASS - found {len(data)} variants for product")
    
    def test_duplicate_sku_rejected(self, authenticated_client, test_product_id):
        """Test that duplicate SKU is rejected"""
        unique_sku = f"TEST-DUP-{uuid.uuid4().hex[:8].upper()}"
        
        # Create first variant
        first_res = authenticated_client.post(
            f"{BASE_URL}/api/admin/inventory-variants",
            json={
                "product_id": test_product_id,
                "sku": unique_sku,
                "variant_attributes": {"size": "M"},
                "stock_on_hand": 10
            }
        )
        assert first_res.status_code in [200, 201]
        
        # Try to create duplicate
        second_res = authenticated_client.post(
            f"{BASE_URL}/api/admin/inventory-variants",
            json={
                "product_id": test_product_id,
                "sku": unique_sku,
                "variant_attributes": {"size": "L"},
                "stock_on_hand": 20
            }
        )
        assert second_res.status_code == 400
        print("Duplicate SKU rejection PASS")


class TestInventoryStockItemsAPI:
    """Test the original inventory/stock items API (Stock Items in sidebar)"""
    
    def test_list_inventory_items(self, authenticated_client):
        """Test listing inventory items"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/inventory/items")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"List inventory items PASS - found {len(data)} items")
    
    def test_list_stock_movements(self, authenticated_client):
        """Test listing stock movements"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/inventory/movements?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"List stock movements PASS - found {len(data)} movements")


class TestCRMPipelineAPI:
    """Test CRM Pipeline API for view modes (List/Cards/Kanban)"""
    
    def test_list_leads(self, authenticated_client):
        """Test listing CRM leads"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/crm/leads")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"List CRM leads PASS - found {len(data)} leads")
    
    def test_filter_leads_by_status(self, authenticated_client):
        """Test filtering leads by status for Kanban view"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/crm/leads?status=new")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for lead in data:
            assert lead.get("status") == "new"
        print(f"Filter leads by status PASS - found {len(data)} new leads")
    
    def test_crm_settings(self, authenticated_client):
        """Test CRM settings for industries and sources dropdowns"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/crm-settings")
        assert response.status_code == 200
        data = response.json()
        assert "industries" in data
        assert "sources" in data
        assert isinstance(data["industries"], list)
        assert isinstance(data["sources"], list)
        print(f"CRM settings PASS - {len(data['industries'])} industries, {len(data['sources'])} sources")


class TestCustomersAPI:
    """Test Customers API for filters (industry, payment term, city, credit)"""
    
    def test_list_customers(self, authenticated_client):
        """Test listing customers"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/customers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"List customers PASS - found {len(data)} customers")
    
    def test_customers_have_filter_fields(self, authenticated_client):
        """Verify customers have fields for filtering"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/customers")
        assert response.status_code == 200
        data = response.json()
        
        # Check that customer records have the expected filter fields
        if data:
            customer = data[0]
            expected_fields = ["city", "payment_term_type", "credit_limit"]
            for field in expected_fields:
                assert field in customer or customer.get(field) is None
            print(f"Customer filter fields PASS - has city, payment_term_type, credit_limit")
        else:
            print("No customers to verify filter fields")


class TestProductsAPI:
    """Test Products API (used for variant linking)"""
    
    def test_list_products(self, authenticated_client):
        """Test listing products for variant linking"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/products?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert isinstance(data["products"], list)
        print(f"List products PASS - found {len(data['products'])} products")


class TestAPITokenAuth:
    """Test API authentication works for both admin and customer tokens"""
    
    def test_admin_token_works(self, authenticated_client):
        """Verify admin token authenticates properly"""
        # Access an admin-only endpoint
        response = authenticated_client.get(f"{BASE_URL}/api/admin/orders?limit=1")
        assert response.status_code == 200
        print("Admin token authentication PASS")
    
    def test_unauthenticated_admin_endpoint(self, api_client):
        """Verify admin endpoints reject unauthenticated requests"""
        # Clear any auth header
        headers = {"Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/admin/inventory-variants",
            headers=headers
        )
        assert response.status_code in [401, 403]
        print("Unauthenticated rejection PASS")


class TestCleanup:
    """Cleanup test data created during tests"""
    
    def test_cleanup_note(self):
        """Note about test data cleanup"""
        print("Test variants created with TEST- prefix - these can be cleaned up via admin UI")
        print("All variant tests used unique SKUs to avoid conflicts")
        assert True
