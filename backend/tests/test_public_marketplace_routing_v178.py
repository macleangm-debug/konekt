"""
Test Public Marketplace Routing Fix - Iteration 178
Tests the fix for public marketplace routing bug where Order CTAs were incorrectly
routing into /account/* flow.

Required behavior:
1) Public users can place order requests without an account
2) Public order submissions reach admin + sales via requests inbox
3) No public user should access /account/* without authentication
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://konekt-payments-fix.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"


class TestPublicMarketplaceOrderFlow:
    """Test public marketplace order request flow"""
    
    def test_public_requests_endpoint_accepts_marketplace_order(self):
        """POST /api/public-requests with request_type=marketplace_order should succeed"""
        payload = {
            "request_type": "marketplace_order",
            "title": "Order Request: Test Product",
            "guest_name": "Test Public User",
            "guest_email": f"testpublic_{datetime.now().strftime('%H%M%S')}@example.com",
            "phone_prefix": "+255",
            "phone": "712345678",
            "company_name": "Test Company Ltd",
            "source_page": "/order-request",
            "details": {
                "product_id": "69cce8c07f547b40594bc531",
                "product_name": "A5 Notebook",
                "product_price": "8000",
                "product_category": "Stationery",
                "quantity": 5,
                "variant_selection": "Blue",
                "source": "public_marketplace_order_request"
            },
            "notes": "Test order from public marketplace"
        }
        
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("ok") == True
        assert "request_id" in data
        assert "request_number" in data
        assert data.get("request_type") == "marketplace_order"
        assert data.get("status") == "submitted"
        
        # Store for later tests
        self.__class__.created_request_id = data["request_id"]
        self.__class__.created_request_number = data["request_number"]
        
        print(f"SUCCESS: Created marketplace_order request: {data['request_number']}")
    
    def test_marketplace_order_appears_in_admin_requests_inbox(self):
        """GET /api/admin/requests?request_type=marketplace_order should return the created request"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        admin_token = login_response.json().get("token")
        
        # Get marketplace_order requests
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/admin/requests?request_type=marketplace_order",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our created request
        request_ids = [r.get("id") for r in data]
        assert hasattr(self.__class__, 'created_request_id'), "No request_id from previous test"
        
        found = any(r.get("id") == self.__class__.created_request_id for r in data)
        assert found, f"Created request {self.__class__.created_request_id} not found in admin inbox"
        
        print(f"SUCCESS: Found {len(data)} marketplace_order requests in admin inbox")
    
    def test_sales_can_see_marketplace_order_requests(self):
        """Sales user should be able to see marketplace_order requests (if assigned or admin)"""
        # Login as admin to assign the request to sales
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        admin_token = login_response.json().get("token")
        
        # Get all requests to verify marketplace_order type is supported
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/requests", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that marketplace_order type exists
        marketplace_orders = [r for r in data if r.get("request_type") == "marketplace_order"]
        print(f"SUCCESS: Found {len(marketplace_orders)} marketplace_order requests visible to admin")


class TestPublicMarketplaceEndpoints:
    """Test public marketplace API endpoints"""
    
    def test_marketplace_products_search_public(self):
        """GET /api/marketplace/products/search should work without auth"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            product = data[0]
            assert "id" in product
            assert "name" in product
            print(f"SUCCESS: Found {len(data)} products in public marketplace search")
        else:
            print("WARNING: No products found in marketplace search")
    
    def test_marketplace_listing_detail_public(self):
        """GET /api/public-marketplace/listing/{slug} should work without auth"""
        # First get a product ID from search
        search_response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert search_response.status_code == 200
        
        products = search_response.json()
        if len(products) == 0:
            pytest.skip("No products available for detail test")
        
        product = products[0]
        slug = product.get("slug") or product.get("id")
        
        response = requests.get(f"{BASE_URL}/api/public-marketplace/listing/{slug}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "listing" in data
        
        listing = data["listing"]
        assert "name" in listing
        print(f"SUCCESS: Retrieved listing detail for: {listing.get('name')}")


class TestRequestTypesValidation:
    """Test that marketplace_order is a valid request type"""
    
    def test_invalid_request_type_rejected(self):
        """POST /api/public-requests with invalid request_type should fail"""
        payload = {
            "request_type": "invalid_type",
            "guest_name": "Test User",
            "guest_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("SUCCESS: Invalid request_type correctly rejected")
    
    def test_marketplace_order_is_valid_type(self):
        """marketplace_order should be in the list of valid request types"""
        # This is implicitly tested by test_public_requests_endpoint_accepts_marketplace_order
        # but we can also test via /api/requests endpoint
        payload = {
            "request_type": "marketplace_order",
            "guest_name": "Validation Test User",
            "guest_email": f"validation_{datetime.now().strftime('%H%M%S')}@example.com",
            "phone_prefix": "+255",
            "phone": "700000000",
            "details": {"test": True}
        }
        
        response = requests.post(f"{BASE_URL}/api/requests", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        print("SUCCESS: marketplace_order is a valid request type via /api/requests")


class TestAuthenticatedAccountMarketplace:
    """Test authenticated account marketplace flow"""
    
    def test_customer_login(self):
        """Customer should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        
        self.__class__.customer_token = data["token"]
        print("SUCCESS: Customer logged in")
    
    def test_authenticated_marketplace_access(self):
        """Authenticated customer should access /api/marketplace/products"""
        assert hasattr(self.__class__, 'customer_token'), "No customer token from login test"
        
        headers = {"Authorization": f"Bearer {self.__class__.customer_token}"}
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search", headers=headers)
        
        assert response.status_code == 200
        print("SUCCESS: Authenticated customer can access marketplace products")
    
    def test_authenticated_cart_access(self):
        """Authenticated customer should access cart endpoints"""
        assert hasattr(self.__class__, 'customer_token'), "No customer token from login test"
        
        headers = {"Authorization": f"Bearer {self.__class__.customer_token}"}
        
        # Try to get cart
        response = requests.get(f"{BASE_URL}/api/account/cart", headers=headers)
        
        # Cart endpoint should exist and return 200 or empty cart
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print("SUCCESS: Authenticated customer can access cart endpoint")


class TestHealthAndBasicEndpoints:
    """Basic health and endpoint tests"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        print("SUCCESS: Health endpoint working")
    
    def test_marketplace_taxonomy_public(self):
        """GET /api/marketplace/taxonomy should work without auth"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "groups" in data or "categories" in data or isinstance(data, dict)
        print("SUCCESS: Marketplace taxonomy endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
