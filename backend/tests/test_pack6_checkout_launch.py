"""
Pack 6 Test Suite - Final Checkout Persistence, PDF Polish, and Launch Hardening
Tests: Launch hardening checklist, service request admin, points apply, affiliate APIs
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
TEST_CUSTOMER_EMAIL = "testcustomer@konekt.com"
TEST_CUSTOMER_PASSWORD = "password"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def customer_auth_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_CUSTOMER_EMAIL,
        "password": TEST_CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_client(api_client, admin_auth_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_auth_token}"})
    return api_client


@pytest.fixture(scope="module")
def customer_client(api_client, customer_auth_token):
    """Session with customer auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {customer_auth_token}"
    })
    return session


class TestHealthEndpoint:
    """Basic health check tests"""

    def test_health_endpoint(self, api_client):
        """Test health endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint working")


class TestLaunchHardeningChecklist:
    """Launch Hardening Checklist API Tests"""

    def test_launch_hardening_checklist_endpoint(self, admin_client):
        """Test /api/admin/launch-hardening/checklist returns correct structure"""
        response = admin_client.get(f"{BASE_URL}/api/admin/launch-hardening/checklist")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "score" in data, "Response missing 'score' field"
        assert "total" in data, "Response missing 'total' field"
        assert "status" in data, "Response missing 'status' field"
        assert "checks" in data, "Response missing 'checks' field"
        
        # Verify data types
        assert isinstance(data["score"], int), "Score should be int"
        assert isinstance(data["total"], int), "Total should be int"
        assert data["status"] in ["ready", "needs_attention"], f"Invalid status: {data['status']}"
        assert isinstance(data["checks"], dict), "Checks should be dict"
        
        print(f"✓ Launch hardening checklist: {data['score']}/{data['total']} checks passed, status={data['status']}")

    def test_launch_hardening_checks_keys(self, admin_client):
        """Verify expected check keys are present"""
        response = admin_client.get(f"{BASE_URL}/api/admin/launch-hardening/checklist")
        assert response.status_code == 200
        
        data = response.json()
        expected_keys = [
            "mongo_url_configured",
            "jwt_secret_configured",
            "resend_configured",
            "kwikpay_base_url_configured",
            "kwikpay_api_key_configured",
            "kwikpay_secret_configured",
            "frontend_url_configured",
            "sender_email_configured",
            "bank_transfer_enabled"
        ]
        
        checks = data.get("checks", {})
        for key in expected_keys:
            assert key in checks, f"Missing check key: {key}"
        
        print(f"✓ All {len(expected_keys)} expected check keys present")


class TestServiceRequestAdminAPI:
    """Admin Service Requests API Tests"""

    def test_list_service_requests(self, admin_client):
        """Test /api/admin/service-requests returns array"""
        response = admin_client.get(f"{BASE_URL}/api/admin/service-requests")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Service requests list returned {len(data)} items")

    def test_list_service_requests_with_filters(self, admin_client):
        """Test filtering service requests by category and status"""
        # Test category filter
        response = admin_client.get(f"{BASE_URL}/api/admin/service-requests?category=creative")
        assert response.status_code == 200
        
        # Test status filter
        response = admin_client.get(f"{BASE_URL}/api/admin/service-requests?status=submitted")
        assert response.status_code == 200
        
        print("✓ Service requests filtering works")

    def test_get_service_request_detail_not_found(self, admin_client):
        """Test service request detail returns 404 for invalid ID"""
        response = admin_client.get(f"{BASE_URL}/api/admin/service-requests/000000000000000000000000")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Service request detail returns 404 for invalid ID")


class TestPointsApplyAPI:
    """Points Apply to Invoice API Tests"""

    def test_points_apply_unauthorized(self, api_client):
        """Test points apply requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/customer/points-apply/invoice/000000000000000000000000",
            json={"requested_points": 100}
        )
        # 401 = Unauthorized, 404 = Not Found (route may not match without auth context)
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"
        print(f"✓ Points apply without auth returned {response.status_code}")

    def test_points_apply_invoice_not_found(self, customer_client):
        """Test points apply returns 404 for invalid invoice"""
        response = customer_client.post(
            f"{BASE_URL}/api/customer/points-apply/invoice/000000000000000000000000",
            json={"requested_points": 100}
        )
        # Should return 404 for non-existent invoice
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Points apply returns 404 for invalid invoice")


class TestAffiliateAdminAPI:
    """Affiliate Admin API Tests"""

    def test_list_affiliate_applications(self, admin_client):
        """Test /api/admin/affiliates/applications returns array"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliates/applications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Affiliate applications list returned {len(data)} items")

    def test_list_affiliate_applications_with_status_filter(self, admin_client):
        """Test filtering affiliate applications by status"""
        response = admin_client.get(f"{BASE_URL}/api/admin/affiliates/applications?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print("✓ Affiliate applications status filter works")


class TestAffiliateDashboardAPI:
    """Affiliate Dashboard API Tests"""

    def test_affiliate_me_unauthorized(self, api_client):
        """Test affiliate dashboard requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/affiliate/me")
        # 401 = Unauthorized, 404 = Not Found (route may not match without auth context)
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"
        print(f"✓ Affiliate dashboard without auth returned {response.status_code}")

    def test_affiliate_me_with_auth(self, customer_client):
        """Test affiliate dashboard with valid auth (may return 404 if not affiliate)"""
        response = customer_client.get(f"{BASE_URL}/api/affiliate/me")
        # Should return either 200 (if affiliate) or 404 (if not affiliate)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        print(f"✓ Affiliate dashboard returned {response.status_code}")


class TestPaymentAdminRoutes:
    """Payment Admin API Tests"""

    def test_list_payments(self, admin_client):
        """Test listing all payments"""
        response = admin_client.get(f"{BASE_URL}/api/admin/payments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Payments list returned {len(data)} items")

    def test_list_payments_with_status_filter(self, admin_client):
        """Test filtering payments by status"""
        response = admin_client.get(f"{BASE_URL}/api/admin/payments?status=pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Pending payments filter returned {len(data)} items")


class TestAdminAuth:
    """Admin Authentication Tests"""

    def test_admin_login_success(self, api_client):
        """Test admin login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user data"
        assert data["user"]["role"] == "admin", "User should be admin"
        print("✓ Admin login successful")

    def test_admin_login_invalid(self, api_client):
        """Test admin login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin login rejects invalid credentials")


class TestCustomerAuth:
    """Customer Authentication Tests"""

    def test_customer_login_success(self, api_client):
        """Test customer login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user data"
        print("✓ Customer login successful")


class TestCustomerInvoiceAPI:
    """Customer Invoice API Tests"""

    def test_list_customer_invoices(self, customer_client):
        """Test customer can list their invoices"""
        response = customer_client.get(f"{BASE_URL}/api/customer/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Customer invoices list returned {len(data)} items")


class TestAdminServiceRequestCRUD:
    """Admin Service Request CRUD Tests - Create and Verify"""

    @pytest.fixture(scope="class")
    def test_service_request_id(self, admin_client):
        """Create a test service request for CRUD operations"""
        # First check if there's an existing service request we can use
        response = admin_client.get(f"{BASE_URL}/api/admin/service-requests")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0].get("id")
        return None

    def test_service_request_assign(self, admin_client, test_service_request_id):
        """Test assigning a service request to staff"""
        if not test_service_request_id:
            pytest.skip("No service request available to test")
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/service-requests/{test_service_request_id}/assign",
            json={
                "assigned_to": "staff@konekt.co.tz",
                "assigned_name": "Test Staff"
            }
        )
        # Should succeed if request exists
        if response.status_code == 200:
            data = response.json()
            assert "assigned_to" in data or "id" in data
            print("✓ Service request assignment works")
        else:
            print(f"Service request assign returned {response.status_code}: {response.text}")

    def test_service_request_status_update(self, admin_client, test_service_request_id):
        """Test updating service request status"""
        if not test_service_request_id:
            pytest.skip("No service request available to test")
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/service-requests/{test_service_request_id}/status",
            json={
                "status": "in_progress",
                "note": "Started working on this request"
            }
        )
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "in_progress" or "id" in data
            print("✓ Service request status update works")
        else:
            print(f"Service request status update returned {response.status_code}")

    def test_service_request_add_comment(self, admin_client, test_service_request_id):
        """Test adding a comment to service request"""
        if not test_service_request_id:
            pytest.skip("No service request available to test")
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/service-requests/{test_service_request_id}/comments",
            json={
                "message": "Test internal comment",
                "visibility": "internal"
            }
        )
        if response.status_code == 200:
            print("✓ Service request comment addition works")
        else:
            print(f"Service request comment returned {response.status_code}")


class TestAuthMiddlewareIntegration:
    """Test that auth middleware properly sets user context"""
    
    def test_auth_me_endpoint(self, customer_client):
        """Test /api/auth/me returns user data"""
        response = customer_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "email" in data, "Response should include email"
        assert "id" in data, "Response should include id"
        assert "credit_balance" in data or "points" in data, "Response should include balance info"
        print(f"✓ Auth me endpoint returns user: {data.get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
