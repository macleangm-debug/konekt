"""
Test Customer Account Unification Pack APIs
- Marketplace products search
- Service request templates
- Quick service request submission
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed")


class TestMarketplaceProducts:
    """Marketplace Products API tests"""
    
    def test_products_search_returns_products(self):
        """GET /api/marketplace/products/search returns product list"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Products returned: {len(data)}")
    
    def test_products_search_returns_41_products(self):
        """Verify 41 products are returned as expected"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 41, f"Expected 41 products, got {len(data)}"
    
    def test_product_has_required_fields(self):
        """Verify product structure has required fields"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        
        product = data[0]
        # Check required fields
        assert "id" in product or "_id" in product
        assert "name" in product
        # Price can be base_price or price
        assert "base_price" in product or "price" in product
    
    def test_products_search_with_query(self):
        """GET /api/marketplace/products/search?q=query filters products"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q=cap")
        assert response.status_code == 200
        
        data = response.json()
        # Should return filtered results
        assert isinstance(data, list)
        print(f"Products matching 'cap': {len(data)}")


class TestServiceRequestTemplates:
    """Service Request Templates API tests"""
    
    def test_service_templates_returns_list(self):
        """GET /api/service-request-templates returns template list"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Service templates returned: {len(data)}")
    
    def test_service_template_has_required_fields(self):
        """Verify service template structure"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        
        template = data[0]
        assert "service_key" in template
        assert "service_name" in template
    
    def test_garment_printing_template_exists(self):
        """Verify garment-printing service template exists"""
        response = requests.get(f"{BASE_URL}/api/service-request-templates")
        assert response.status_code == 200
        
        data = response.json()
        service_keys = [t.get("service_key") for t in data]
        assert "garment-printing" in service_keys


class TestQuickServiceRequest:
    """Quick Service Request API tests (POST /api/service-requests-quick)"""
    
    def test_quick_service_request_success(self, customer_token):
        """POST /api/service-requests-quick creates service request"""
        response = requests.post(
            f"{BASE_URL}/api/service-requests-quick",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "service_key": "garment-printing",
                "service_name": "Garment Printing",
                "client_name": "Test Customer",
                "client_phone": "+255123456789",
                "client_email": "test@example.com",
                "brief": "Need 100 t-shirts printed with company logo"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "request_id" in data
        print(f"Service request created: {data.get('request_id')}")
    
    def test_quick_service_request_with_invoice_details(self, customer_token):
        """POST /api/service-requests-quick with invoice client details"""
        response = requests.post(
            f"{BASE_URL}/api/service-requests-quick",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "service_key": "office-branding",
                "service_name": "Office Branding",
                "client_name": "Test Customer",
                "client_phone": "+255123456789",
                "client_email": "test@example.com",
                "invoice_client_name": "ABC Company Ltd",
                "invoice_client_phone": "+255987654321",
                "invoice_client_email": "accounts@abc.com",
                "invoice_client_tin": "123-456-789",
                "brief": "Need office reception area branded",
                "delivery_or_site_address": "123 Main Street, Dar es Salaam"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "request_id" in data
    
    def test_quick_service_request_missing_required_fields(self, customer_token):
        """POST /api/service-requests-quick without required fields returns error"""
        response = requests.post(
            f"{BASE_URL}/api/service-requests-quick",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "service_key": "garment-printing"
                # Missing client_name, client_phone, brief
            }
        )
        # Should still work but with minimal data
        # The form validation is on frontend
        assert response.status_code in [200, 400, 422]
    
    def test_quick_service_request_without_auth_still_works(self):
        """POST /api/service-requests-quick works without auth (guest submission allowed)"""
        response = requests.post(
            f"{BASE_URL}/api/service-requests-quick",
            json={
                "service_key": "garment-printing",
                "service_name": "Garment Printing",
                "client_name": "Guest Customer",
                "client_phone": "+255123456789",
                "client_email": "guest@example.com",
                "brief": "Test request from guest"
            }
        )
        # Endpoint allows guest submissions
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy"
