"""
Test Customer Experience Simplification Pack
- Service catalog tree API
- Customer authentication
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestServiceCatalogTree:
    """Service Catalog Tree API tests"""
    
    def test_service_catalog_tree_endpoint_returns_200(self):
        """GET /api/service-catalog/tree should return 200"""
        response = requests.get(f"{BASE_URL}/api/service-catalog/tree")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_service_catalog_tree_returns_list(self):
        """GET /api/service-catalog/tree should return a list"""
        response = requests.get(f"{BASE_URL}/api/service-catalog/tree")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
    def test_service_catalog_tree_structure(self):
        """Service catalog tree should have proper structure if data exists"""
        response = requests.get(f"{BASE_URL}/api/service-catalog/tree")
        assert response.status_code == 200
        data = response.json()
        
        # If there's data, verify structure
        if len(data) > 0:
            group = data[0]
            assert "id" in group, "Group should have 'id' field"
            assert "name" in group, "Group should have 'name' field"
            assert "children" in group, "Group should have 'children' field"
            assert isinstance(group["children"], list), "Children should be a list"
            
            # If there are services, verify their structure
            if len(group["children"]) > 0:
                service = group["children"][0]
                assert "id" in service, "Service should have 'id' field"
                assert "name" in service, "Service should have 'name' field"
                assert "children" in service, "Service should have 'children' field for sub-services"


class TestCustomerAuth:
    """Customer authentication tests"""
    
    def test_customer_login_success(self):
        """Customer login with valid credentials should succeed"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo.customer@konekt.com", "password": "Demo123!"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "customer", "User role should be customer"
        
    def test_customer_login_invalid_credentials(self):
        """Customer login with invalid credentials should fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@example.com", "password": "wrongpassword"}
        )
        assert response.status_code in [401, 400], f"Expected 401 or 400, got {response.status_code}"


class TestCustomerAuthenticatedEndpoints:
    """Tests requiring customer authentication"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo.customer@konekt.com", "password": "Demo123!"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Customer authentication failed")
        
    def test_auth_me_endpoint(self, customer_token):
        """GET /api/auth/me should return current user"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "email" in data, "Response should contain email"
        assert data["email"] == "demo.customer@konekt.com"
        
    def test_notifications_endpoint(self, customer_token):
        """GET /api/notifications should work for authenticated customer"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?unread_only=true",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
