"""
Test Suite for Iteration 189: Register Page V2 + Auth + Boundary Fixes
Tests:
- Registration API (POST /api/auth/register)
- Login API (POST /api/auth/login)
- Auth validation (GET /api/auth/me)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRegistrationAPI:
    """Registration endpoint tests"""
    
    def test_register_success_with_all_fields(self):
        """Test registration with full_name, email, password, phone, company"""
        unique_email = f"test_register_{int(time.time())}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test User Full",
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+255123456789",
            "company": "Test Company Ltd"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == unique_email
        assert user["full_name"] == "Test User Full"
        assert user["phone"] == "+255123456789"
        assert user["company"] == "Test Company Ltd"
        assert user["role"] == "customer"
        assert "id" in user
        assert "referral_code" in user
        assert user["points"] == 100  # Welcome bonus
        
    def test_register_success_minimal_fields(self):
        """Test registration with only required fields (full_name, email, password)"""
        unique_email = f"test_minimal_{int(time.time())}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Minimal User",
            "email": unique_email,
            "password": "MinPass123!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["full_name"] == "Minimal User"
        
    def test_register_duplicate_email_fails(self):
        """Test that registering with existing email returns 400"""
        # First registration
        unique_email = f"test_dup_{int(time.time())}@example.com"
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "First User",
            "email": unique_email,
            "password": "FirstPass123!"
        })
        assert response1.status_code == 200
        
        # Second registration with same email
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Second User",
            "email": unique_email,
            "password": "SecondPass123!"
        })
        
        assert response2.status_code == 400, f"Expected 400 for duplicate email, got {response2.status_code}"
        assert "already registered" in response2.json().get("detail", "").lower()


class TestLoginAPI:
    """Login endpoint tests"""
    
    def test_login_success_customer(self):
        """Test login with valid customer credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.customer@konekt.com",
            "password": "Demo123!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo.customer@konekt.com"
        
    def test_login_success_admin(self):
        """Test login with valid admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAuthValidation:
    """Auth token validation tests"""
    
    def test_auth_me_with_valid_token(self):
        """Test /api/auth/me returns user data with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.customer@konekt.com",
            "password": "Demo123!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Call /api/auth/me
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200, f"Expected 200, got {me_response.status_code}"
        data = me_response.json()
        assert data["email"] == "demo.customer@konekt.com"
        
    def test_auth_me_without_token(self):
        """Test /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401


class TestPublicEndpoints:
    """Test public endpoints don't require auth"""
    
    def test_public_marketplace_listing(self):
        """Test public marketplace listing endpoint (single item)"""
        # First get a product ID from products endpoint
        products_response = requests.get(f"{BASE_URL}/api/products")
        if products_response.status_code == 200:
            data = products_response.json()
            products = data.get("products", []) if isinstance(data, dict) else data
            if products and len(products) > 0:
                product_id = products[0].get("id") or str(products[0].get("_id"))
                # Test the public listing endpoint
                response = requests.get(f"{BASE_URL}/api/public-marketplace/listing/{product_id}")
                assert response.status_code == 200, f"Expected 200, got {response.status_code}"
                return
        # If no products, just verify the endpoint exists (404 for missing item is acceptable)
        response = requests.get(f"{BASE_URL}/api/public-marketplace/listing/test-slug")
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200


class TestSalesAssistAPI:
    """Test Sales Assist API (verified in iteration 188)"""
    
    def test_sales_assist_create_request(self):
        """Test creating a sales assist request"""
        response = requests.post(f"{BASE_URL}/api/public/sales-assist", json={
            "name": "Test Customer",
            "email": f"test_sales_{int(time.time())}@example.com",
            "phone": "+255123456789",
            "product_name": "Test Product",
            "message": "I need help with bulk ordering"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "request" in data
        assert data["request"]["status"] == "new"
