"""
Test Suite for Checkout, Catalog Setup, and Deliveries Features
- Submit Request button on Customer Services page (POST /api/customer/in-account-service-requests)
- Checkout Quote creation with VAT (POST /api/customer/checkout-quote)
- Admin Catalog Setup CRUD (Services + Products)
- Admin Deliveries CRUD
- Admin Settings Hub VAT configuration
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestAuth:
    """Authentication tests for admin and customer"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful, role: {data['user']['role']}")
    
    def test_customer_login(self):
        """Test customer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Customer login successful, user: {data['user']['email']}")


class TestServiceRequestTemplates:
    """Test service request templates API"""
    
    def test_get_service_request_templates(self):
        """Test GET /api/service-request-templates"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Service request templates: {len(data)} templates found")
        if data:
            print(f"  Templates: {[t.get('service_name') for t in data]}")


class TestCustomerInAccountServiceRequests:
    """Test customer in-account service request submission"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        return response.json()["token"]
    
    def test_submit_service_request(self, customer_token):
        """Test POST /api/customer/in-account-service-requests - Submit Request button"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        payload = {
            "service_key": "general",
            "service_name": "General Service Request",
            "answers": {
                "description": "Test service request from automated testing",
                "quantity": "10",
                "deadline": "2 weeks"
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/customer/in-account-service-requests",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to submit service request: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        print(f"✓ Service request submitted successfully, ID: {data['id']}")
    
    def test_list_my_service_requests(self, customer_token):
        """Test GET /api/customer/in-account-service-requests"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(
            f"{BASE_URL}/api/customer/in-account-service-requests",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to list service requests: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} service requests")


class TestCheckoutQuote:
    """Test checkout quote creation with VAT"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        return response.json()["token"]
    
    def test_create_checkout_quote_with_vat(self, customer_token):
        """Test POST /api/customer/checkout-quote - Creates Quote with VAT"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Calculate VAT (18% default)
        subtotal = 100000
        vat_percent = 18
        vat_amount = int(subtotal * (vat_percent / 100))
        total = subtotal + vat_amount
        
        payload = {
            "items": [
                {
                    "name": "Test Product",
                    "sku": "TEST-001",
                    "quantity": 2,
                    "unit_price": 50000,
                    "subtotal": 100000
                }
            ],
            "subtotal": subtotal,
            "vat_percent": vat_percent,
            "vat_amount": vat_amount,
            "total": total,
            "delivery_address": {
                "street": "123 Test Street",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam",
                "postal_code": "12345",
                "country": "Tanzania",
                "landmark": "Near Test Building",
                "contact_phone": "+255712345678"
            },
            "delivery_notes": "Test delivery notes",
            "source": "in_account_checkout"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/checkout-quote",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to create checkout quote: {response.text}"
        data = response.json()
        assert "id" in data
        assert "quote_number" in data
        assert data["status"] == "pending"
        assert data["total"] == total
        print(f"✓ Checkout quote created: {data['quote_number']}, Total: {data['total']} (incl. VAT)")
        return data["id"]


class TestAdminSettingsHub:
    """Test Admin Settings Hub for VAT configuration"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_settings_hub(self, admin_token):
        """Test GET /api/admin/settings-hub - Check VAT setting"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        assert response.status_code == 200, f"Failed to get settings hub: {response.text}"
        data = response.json()
        
        # Check commercial.vat_percent exists
        assert "commercial" in data, "commercial section missing"
        assert "vat_percent" in data["commercial"], "vat_percent missing in commercial"
        vat = data["commercial"]["vat_percent"]
        print(f"✓ Settings Hub loaded, VAT: {vat}%")
    
    def test_update_vat_setting(self, admin_token):
        """Test PUT /api/admin/settings-hub - Update VAT"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        current = get_response.json()
        
        # Update VAT
        current["commercial"]["vat_percent"] = 18.0
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=current,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        data = response.json()
        assert data["commercial"]["vat_percent"] == 18.0
        print(f"✓ VAT setting updated to {data['commercial']['vat_percent']}%")


class TestAdminCatalogServices:
    """Test Admin Catalog Services CRUD"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_list_catalog_services(self, admin_token):
        """Test GET /api/admin/catalog/services"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/catalog/services", headers=headers)
        assert response.status_code == 200, f"Failed to list services: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} catalog services")
    
    def test_create_catalog_service(self, admin_token):
        """Test POST /api/admin/catalog/services"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {
            "name": f"TEST_Service_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "description": "Test service for automated testing",
            "sub_services": [
                {"name": "Sub-service A"},
                {"name": "Sub-service B"}
            ],
            "status": "active"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/catalog/services",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to create service: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Catalog service created: {data['id']}")
        return data["id"]
    
    def test_update_catalog_service(self, admin_token):
        """Test PUT /api/admin/catalog/services/{id}"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a service
        create_payload = {
            "name": f"TEST_UpdateService_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "description": "To be updated",
            "sub_services": [],
            "status": "active"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/catalog/services",
            json=create_payload,
            headers=headers
        )
        service_id = create_response.json()["id"]
        
        # Update it
        update_payload = {
            "name": create_payload["name"] + "_UPDATED",
            "category": "Updated Category",
            "description": "Updated description",
            "sub_services": [{"name": "New Sub-service"}],
            "status": "active"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/catalog/services/{service_id}",
            json=update_payload,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to update service: {response.text}"
        print(f"✓ Catalog service updated: {service_id}")
    
    def test_delete_catalog_service(self, admin_token):
        """Test DELETE /api/admin/catalog/services/{id}"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a service
        create_payload = {
            "name": f"TEST_DeleteService_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "description": "To be deleted",
            "sub_services": [],
            "status": "active"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/catalog/services",
            json=create_payload,
            headers=headers
        )
        service_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/admin/catalog/services/{service_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to delete service: {response.text}"
        print(f"✓ Catalog service deleted: {service_id}")


class TestAdminCatalogProducts:
    """Test Admin Catalog Products CRUD"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_list_catalog_products(self, admin_token):
        """Test GET /api/admin/catalog/products"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/catalog/products", headers=headers)
        assert response.status_code == 200, f"Failed to list products: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} catalog products")
    
    def test_create_catalog_product(self, admin_token):
        """Test POST /api/admin/catalog/products"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {
            "name": f"TEST_Product_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "description": "Test product for automated testing",
            "variants": [
                {"name": "Small"},
                {"name": "Medium"},
                {"name": "Large"}
            ],
            "status": "active"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/catalog/products",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to create product: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Catalog product created: {data['id']}")
        return data["id"]
    
    def test_update_catalog_product(self, admin_token):
        """Test PUT /api/admin/catalog/products/{id}"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a product
        create_payload = {
            "name": f"TEST_UpdateProduct_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "description": "To be updated",
            "variants": [],
            "status": "active"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/catalog/products",
            json=create_payload,
            headers=headers
        )
        product_id = create_response.json()["id"]
        
        # Update it
        update_payload = {
            "name": create_payload["name"] + "_UPDATED",
            "category": "Updated Category",
            "description": "Updated description",
            "variants": [{"name": "XL"}],
            "status": "active"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/catalog/products/{product_id}",
            json=update_payload,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to update product: {response.text}"
        print(f"✓ Catalog product updated: {product_id}")
    
    def test_delete_catalog_product(self, admin_token):
        """Test DELETE /api/admin/catalog/products/{id}"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a product
        create_payload = {
            "name": f"TEST_DeleteProduct_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "description": "To be deleted",
            "variants": [],
            "status": "active"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/catalog/products",
            json=create_payload,
            headers=headers
        )
        product_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/admin/catalog/products/{product_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to delete product: {response.text}"
        print(f"✓ Catalog product deleted: {product_id}")


class TestAdminDeliveries:
    """Test Admin Deliveries CRUD"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_list_deliveries(self, admin_token):
        """Test GET /api/admin/deliveries"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/deliveries", headers=headers)
        assert response.status_code == 200, f"Failed to list deliveries: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} deliveries")
    
    def test_list_deliveries_with_status_filter(self, admin_token):
        """Test GET /api/admin/deliveries?status=pending"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/admin/deliveries",
            params={"status": "pending"},
            headers=headers
        )
        assert response.status_code == 200, f"Failed to filter deliveries: {response.text}"
        data = response.json()
        print(f"✓ Listed {len(data)} pending deliveries")
    
    def test_create_manual_delivery(self, admin_token):
        """Test POST /api/admin/deliveries - Create manual delivery"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {
            "source_type": "manual",
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "+255712345678",
            "delivery_address": {
                "street": "123 Test Street",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam",
                "country": "Tanzania",
                "contact_phone": "+255712345678"
            },
            "delivery_notes": "Test delivery"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/deliveries",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to create delivery: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Manual delivery created: {data['id']}")
        return data["id"]
    
    def test_update_delivery_status(self, admin_token):
        """Test PATCH /api/admin/deliveries/{id}/status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a delivery
        create_payload = {
            "source_type": "manual",
            "customer_name": "Status Test Customer",
            "customer_email": "statustest@example.com",
            "customer_phone": "+255712345678",
            "delivery_address": {
                "street": "456 Status Street",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam",
                "country": "Tanzania",
                "contact_phone": "+255712345678"
            }
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/deliveries",
            json=create_payload,
            headers=headers
        )
        delivery_id = create_response.json()["id"]
        
        # Update status to ready_for_pickup
        response = requests.patch(
            f"{BASE_URL}/api/admin/deliveries/{delivery_id}/status",
            json={"status": "ready_for_pickup"},
            headers=headers
        )
        assert response.status_code == 200, f"Failed to update delivery status: {response.text}"
        data = response.json()
        assert data["status"] == "ready_for_pickup"
        print(f"✓ Delivery status updated to: {data['status']}")


class TestCatalogTree:
    """Test catalog tree endpoint for dropdowns"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_catalog_tree(self, admin_token):
        """Test GET /api/admin/catalog/tree"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/catalog/tree", headers=headers)
        assert response.status_code == 200, f"Failed to get catalog tree: {response.text}"
        data = response.json()
        assert "services" in data
        assert "products" in data
        print(f"✓ Catalog tree loaded: {len(data['services'])} service groups, {len(data['products'])} product groups")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
