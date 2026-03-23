"""
Test Checkout Quote Flow - Stripe-level checkout for Konekt B2B platform
Tests: POST /api/customer/checkout-quote endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestCheckoutQuoteAPI:
    """Tests for the checkout quote creation API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get customer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_checkout_quote_success(self, auth_headers):
        """Test successful quote creation with all required fields"""
        payload = {
            "items": [
                {
                    "name": "Test Product A",
                    "sku": "TEST-SKU-001",
                    "quantity": 2,
                    "unit_price": 50000,
                    "subtotal": 100000
                },
                {
                    "name": "Test Product B",
                    "sku": "TEST-SKU-002",
                    "quantity": 1,
                    "unit_price": 75000,
                    "subtotal": 75000
                }
            ],
            "subtotal": 175000,
            "vat_percent": 18,
            "vat_amount": 31500,
            "total": 206500,
            "delivery_address": {
                "street": "123 Test Street",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam",
                "country": "Tanzania",
                "contact_phone": "+255712345678"
            },
            "delivery_notes": "Test delivery notes",
            "source": "checkout_panel"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/checkout-quote",
            json=payload,
            headers=auth_headers
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "quote_number" in data, "Response should contain quote_number"
        assert "id" in data, "Response should contain id"
        assert "status" in data, "Response should contain status"
        assert data["status"] == "pending", f"Status should be 'pending', got {data['status']}"
        assert data["quote_number"].startswith("QT-"), f"Quote number should start with 'QT-', got {data['quote_number']}"
        assert data["total"] == 206500, f"Total should be 206500, got {data['total']}"
        
        print(f"SUCCESS: Quote created with number {data['quote_number']}")
    
    def test_checkout_quote_minimal_fields(self, auth_headers):
        """Test quote creation with minimal required fields"""
        payload = {
            "items": [
                {
                    "name": "Minimal Test Item",
                    "quantity": 1,
                    "unit_price": 10000,
                    "subtotal": 10000
                }
            ],
            "subtotal": 10000,
            "vat_percent": 18,
            "vat_amount": 1800,
            "total": 11800,
            "delivery_address": {
                "street": "456 Minimal Street",
                "city": "Arusha",
                "region": "Arusha",
                "country": "Tanzania",
                "contact_phone": "+255700000000"
            },
            "source": "checkout_panel"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/checkout-quote",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "quote_number" in data
        assert data["status"] == "pending"
        print(f"SUCCESS: Minimal quote created with number {data['quote_number']}")
    
    def test_checkout_quote_without_auth(self):
        """Test that quote creation requires authentication"""
        payload = {
            "items": [{"name": "Test", "quantity": 1, "unit_price": 1000, "subtotal": 1000}],
            "subtotal": 1000,
            "vat_percent": 18,
            "vat_amount": 180,
            "total": 1180,
            "delivery_address": {
                "street": "Test Street",
                "city": "Test City",
                "region": "Test Region",
                "country": "Tanzania",
                "contact_phone": "+255700000000"
            },
            "source": "checkout_panel"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/checkout-quote",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("SUCCESS: Unauthenticated request correctly rejected with 401")
    
    def test_checkout_quote_missing_items(self, auth_headers):
        """Test validation - missing items field"""
        payload = {
            "subtotal": 1000,
            "vat_percent": 18,
            "vat_amount": 180,
            "total": 1180,
            "delivery_address": {
                "street": "Test Street",
                "city": "Test City",
                "region": "Test Region",
                "country": "Tanzania",
                "contact_phone": "+255700000000"
            },
            "source": "checkout_panel"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/checkout-quote",
            json=payload,
            headers=auth_headers
        )
        
        # Should return 422 Validation Error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("SUCCESS: Missing items correctly rejected with 422")
    
    def test_checkout_quote_missing_delivery_address(self, auth_headers):
        """Test validation - missing delivery_address field"""
        payload = {
            "items": [{"name": "Test", "quantity": 1, "unit_price": 1000, "subtotal": 1000}],
            "subtotal": 1000,
            "vat_percent": 18,
            "vat_amount": 180,
            "total": 1180,
            "source": "checkout_panel"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/customer/checkout-quote",
            json=payload,
            headers=auth_headers
        )
        
        # Should return 422 Validation Error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("SUCCESS: Missing delivery_address correctly rejected with 422")


class TestCustomerLogin:
    """Test customer login flow"""
    
    def test_customer_login_success(self):
        """Test customer can login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data or "access_token" in data, "Response should contain token"
        
        # Check user info if available
        if "user" in data:
            assert data["user"]["email"] == CUSTOMER_EMAIL
        
        print(f"SUCCESS: Customer login successful")
    
    def test_customer_login_invalid_password(self):
        """Test login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": "WrongPassword123!"
        })
        
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("SUCCESS: Invalid password correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
