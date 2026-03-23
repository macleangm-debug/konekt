"""
Test Account Marketplace + Service Request Pack
Tests:
- GET /api/service-request-templates - Returns service templates with dynamic fields
- Customer authentication
- Marketplace products API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestServiceRequestTemplates:
    """Tests for service request templates API"""
    
    def test_get_service_request_templates_returns_200(self):
        """GET /api/service-request-templates should return 200"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/service-request-templates returns 200")
    
    def test_service_request_templates_returns_array(self):
        """GET /api/service-request-templates should return an array"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Returns array with {len(data)} templates")
    
    def test_service_request_templates_has_required_services(self):
        """Templates should include Garment Printing, Office Branding, General Service Request"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        data = response.json()
        
        service_names = [t.get("service_name") for t in data]
        
        assert "Garment Printing" in service_names, "Missing Garment Printing template"
        assert "Office Branding" in service_names, "Missing Office Branding template"
        assert "General Service Request" in service_names, "Missing General Service Request template"
        print("✓ All required service templates present: Garment Printing, Office Branding, General Service Request")
    
    def test_service_request_templates_have_fields(self):
        """Each template should have service_key, service_name, and fields array"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        data = response.json()
        
        for template in data:
            assert "service_key" in template, f"Template missing service_key"
            assert "service_name" in template, f"Template missing service_name"
            assert "fields" in template, f"Template {template.get('service_name')} missing fields"
            assert isinstance(template["fields"], list), f"Fields should be a list"
            print(f"✓ Template '{template['service_name']}' has {len(template['fields'])} fields")
    
    def test_garment_printing_template_fields(self):
        """Garment Printing template should have specific fields"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        data = response.json()
        
        garment_template = next((t for t in data if t.get("service_key") == "garment-printing"), None)
        assert garment_template is not None, "Garment Printing template not found"
        
        field_keys = [f.get("key") for f in garment_template.get("fields", [])]
        expected_fields = ["garment_type", "quantity", "print_locations", "timeline", "notes"]
        
        for field in expected_fields:
            assert field in field_keys, f"Garment Printing missing field: {field}"
        
        print(f"✓ Garment Printing template has all required fields: {expected_fields}")


class TestCustomerAuthentication:
    """Tests for customer authentication"""
    
    def test_customer_login_success(self):
        """Customer should be able to login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        print(f"✓ Customer login successful for {CUSTOMER_EMAIL}")
        return data["token"]
    
    def test_customer_login_returns_user_data(self):
        """Login should return user data with required fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        data = response.json()
        user = data.get("user", {})
        
        assert "id" in user, "User missing id"
        assert "email" in user, "User missing email"
        assert user["email"] == CUSTOMER_EMAIL, f"Email mismatch: {user['email']}"
        print(f"✓ User data returned with id: {user.get('id')}")


class TestMarketplaceProducts:
    """Tests for marketplace products API"""
    
    def test_get_products_returns_200(self):
        """GET /api/products should return 200"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/products returns 200")
    
    def test_get_products_returns_products_array(self):
        """GET /api/products should return products array"""
        response = requests.get(f"{BASE_URL}/api/products")
        data = response.json()
        
        assert "products" in data, "Response missing 'products' key"
        assert isinstance(data["products"], list), "Products should be a list"
        print(f"✓ Products API returns {len(data['products'])} products")


class TestAuthenticatedEndpoints:
    """Tests for authenticated customer endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for customer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        return response.json().get("token")
    
    def test_get_customer_orders(self, auth_token):
        """Authenticated customer should be able to get their orders"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/orders/me", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Orders should be a list"
        print(f"✓ Customer orders endpoint returns {len(data)} orders")
    
    def test_get_customer_profile(self, auth_token):
        """Authenticated customer should be able to get their profile"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "email" in data, "Profile missing email"
        print(f"✓ Customer profile endpoint works, email: {data.get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
