"""
Test Unified Auth System - Iteration 123
Tests:
1. Customer login via /api/auth/login returns role=customer
2. Admin login via /api/auth/login returns role=admin
3. Partner login via /api/auth/login returns role=partner
4. Verify token structure for each role
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
CUSTOMER_CREDS = {"email": "demo.customer@konekt.com", "password": "Demo123!"}
ADMIN_CREDS = {"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
PARTNER_CREDS = {"email": "demo.partner@konekt.com", "password": "Partner123!"}


class TestUnifiedAuthLogin:
    """Test unified /api/auth/login endpoint for all user types"""

    def test_customer_login_returns_customer_role(self):
        """Customer login via /api/auth/login should return role=customer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        print(f"Customer login status: {response.status_code}")
        print(f"Customer login response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user.get("role") == "customer", f"Expected role=customer, got {user.get('role')}"
        assert user.get("email") == CUSTOMER_CREDS["email"], "Email should match"
        print(f"PASS: Customer login returns role={user.get('role')}")

    def test_admin_login_returns_admin_role(self):
        """Admin login via /api/auth/login should return role=admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        print(f"Admin login status: {response.status_code}")
        print(f"Admin login response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user.get("role") == "admin", f"Expected role=admin, got {user.get('role')}"
        assert user.get("email") == ADMIN_CREDS["email"], "Email should match"
        print(f"PASS: Admin login returns role={user.get('role')}")

    def test_partner_login_returns_partner_role(self):
        """Partner login via /api/auth/login should return role=partner"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PARTNER_CREDS)
        print(f"Partner login status: {response.status_code}")
        print(f"Partner login response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user.get("role") == "partner", f"Expected role=partner, got {user.get('role')}"
        assert user.get("email") == PARTNER_CREDS["email"], "Email should match"
        print(f"PASS: Partner login returns role={user.get('role')}")

    def test_invalid_credentials_returns_401(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        print(f"Invalid login status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid credentials return 401")


class TestTokenValidation:
    """Test that tokens work correctly for each role"""

    def test_customer_token_works_for_auth_me(self):
        """Customer token should work for /api/auth/me"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        token = login_resp.json()["token"]
        
        # Use token to get /api/auth/me
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        print(f"Customer /api/auth/me status: {me_resp.status_code}")
        
        assert me_resp.status_code == 200, f"Expected 200, got {me_resp.status_code}: {me_resp.text}"
        
        user = me_resp.json()
        assert user.get("role") == "customer", f"Expected role=customer, got {user.get('role')}"
        print("PASS: Customer token works for /api/auth/me")

    def test_admin_token_works_for_auth_me(self):
        """Admin token should work for /api/auth/me"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if login_resp.status_code != 200:
            pytest.skip(f"Admin login failed: {login_resp.text}")
        
        token = login_resp.json()["token"]
        
        # Use token to get /api/auth/me
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        print(f"Admin /api/auth/me status: {me_resp.status_code}")
        
        assert me_resp.status_code == 200, f"Expected 200, got {me_resp.status_code}: {me_resp.text}"
        
        user = me_resp.json()
        assert user.get("role") == "admin", f"Expected role=admin, got {user.get('role')}"
        print("PASS: Admin token works for /api/auth/me")


class TestAdminAuthEndpoint:
    """Test /api/admin/auth/login still works for admin users"""

    def test_admin_auth_login_endpoint(self):
        """Admin can also login via /api/admin/auth/login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=ADMIN_CREDS)
        print(f"Admin auth login status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user.get("role") == "admin", f"Expected role=admin, got {user.get('role')}"
        print("PASS: /api/admin/auth/login works for admin")

    def test_customer_cannot_use_admin_auth_login(self):
        """Customer should not be able to login via /api/admin/auth/login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=CUSTOMER_CREDS)
        print(f"Customer admin auth login status: {response.status_code}")
        
        # Should return 403 (forbidden) since customer is not admin
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Customer cannot use /api/admin/auth/login")


class TestPartnerAuthEndpoint:
    """Test /api/partner-auth/login still works for partner users"""

    def test_partner_auth_login_endpoint(self):
        """Partner can also login via /api/partner-auth/login"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json=PARTNER_CREDS)
        print(f"Partner auth login status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user"
        print("PASS: /api/partner-auth/login works for partner")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
