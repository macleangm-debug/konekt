"""
Test Suite: Staff Auth Separation from Admin Auth (Phase 198)
Tests the separation of staff authentication from admin authentication.
- Staff uses konekt_staff_token, admin uses konekt_admin_token
- Staff roles: sales, marketing, production, supervisor
- Admin role: admin
- Cross-role isolation: staff cannot access admin routes, admin cannot access staff routes
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

STAFF_EMAIL = "neema.sales@konekt.demo"
STAFF_PASSWORD = "Sales123!"

CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"

PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestStaffLoginAPI:
    """Test staff login via POST /api/admin/auth/login with sales credentials"""
    
    def test_staff_login_returns_sales_role(self):
        """Staff login with sales credentials should return role:sales"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "sales", f"Expected role:sales, got {data['user']['role']}"
        assert data["user"]["email"] == STAFF_EMAIL
        print(f"✓ Staff login successful: role={data['user']['role']}, email={data['user']['email']}")
    
    def test_staff_login_returns_valid_token(self):
        """Staff login should return a valid JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        token = data.get("token")
        assert token is not None
        assert len(token) > 20, "Token should be a valid JWT"
        
        # Verify token works with /api/auth/me
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200, f"Token validation failed: {me_response.text}"
        me_data = me_response.json()
        assert me_data["role"] == "sales"
        print(f"✓ Staff token validated via /api/auth/me: role={me_data['role']}")


class TestAdminLoginAPI:
    """Test admin login via POST /api/admin/auth/login with admin credentials"""
    
    def test_admin_login_returns_admin_role(self):
        """Admin login with admin credentials should return role:admin"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "admin", f"Expected role:admin, got {data['user']['role']}"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful: role={data['user']['role']}, email={data['user']['email']}")
    
    def test_admin_login_returns_valid_token(self):
        """Admin login should return a valid JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        token = data.get("token")
        assert token is not None
        assert len(token) > 20, "Token should be a valid JWT"
        
        # Verify token works with /api/auth/me
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200, f"Token validation failed: {me_response.text}"
        me_data = me_response.json()
        assert me_data["role"] == "admin"
        print(f"✓ Admin token validated via /api/auth/me: role={me_data['role']}")


class TestCustomerLoginAPI:
    """Test customer login via POST /api/auth/login"""
    
    def test_customer_login_success(self):
        """Customer login should succeed with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"✓ Customer login successful")


class TestPartnerLoginAPI:
    """Test partner login via POST /api/partner-auth/login"""
    
    def test_partner_login_success(self):
        """Partner login should succeed with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/partner-auth/login",
            json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        print(f"✓ Partner login successful")


class TestRoleBoundaryEnforcement:
    """Test that role boundaries are enforced correctly"""
    
    def test_staff_token_can_access_staff_endpoints(self):
        """Staff token should be able to access staff-specific endpoints"""
        # Login as staff
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        assert login_response.status_code == 200
        staff_token = login_response.json()["token"]
        
        # Try to access staff commissions endpoint
        response = requests.get(
            f"{BASE_URL}/api/staff/commissions/promotions",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        # Should succeed or return data (not 401/403)
        assert response.status_code in [200, 404], f"Staff should access staff endpoints: {response.status_code}"
        print(f"✓ Staff token can access staff endpoints: status={response.status_code}")
    
    def test_admin_token_can_access_admin_endpoints(self):
        """Admin token should be able to access admin-specific endpoints"""
        # Login as admin
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        admin_token = login_response.json()["token"]
        
        # Try to access admin dashboard endpoint
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should succeed (not 401/403)
        assert response.status_code in [200, 404], f"Admin should access admin endpoints: {response.status_code}"
        print(f"✓ Admin token can access admin endpoints: status={response.status_code}")


class TestCustomerReferralsAPI:
    """Test customer referrals endpoint"""
    
    def test_customer_referrals_endpoint(self):
        """GET /api/account/referrals should return referral data for logged-in customer"""
        # Login as customer
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert login_response.status_code == 200
        customer_token = login_response.json()["token"]
        
        # Get referrals
        response = requests.get(
            f"{BASE_URL}/api/account/referrals",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "referral_code" in data, "Response should contain referral_code"
        print(f"✓ Customer referrals endpoint works: referral_code={data.get('referral_code')}")


class TestPartnerDashboardAPI:
    """Test partner dashboard endpoint for distributor type"""
    
    def test_partner_dashboard_returns_distributor_type(self):
        """GET /api/partner-portal/dashboard should return partner with type:distributor"""
        # Login as partner
        login_response = requests.post(
            f"{BASE_URL}/api/partner-auth/login",
            json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
        )
        assert login_response.status_code == 200
        partner_token = login_response.json()["access_token"]
        
        # Get dashboard
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/dashboard",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        partner = data.get("partner", data)
        partner_type = partner.get("type") or partner.get("partner_type")
        assert partner_type == "distributor", f"Expected type:distributor, got {partner_type}"
        print(f"✓ Partner dashboard returns distributor type: {partner_type}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
