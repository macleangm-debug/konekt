"""
Phase 1 Stabilization Tests - Iteration 149
Tests for:
1. Login privacy (token validation via /api/auth/me)
2. Market settings backend (phone, email, currency TZS)
3. Service forms → Requests (POST /api/public-requests)
4. Contact form (POST /api/public-requests/contact)
5. Business pricing requests
6. Regression tests (guest checkout, margin rules, role logins, CTAs, admin requests)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"


class TestMarketSettings:
    """Market settings API tests - Tanzania defaults"""

    def test_market_settings_returns_correct_phone(self):
        """GET /api/market-settings returns phone='+255 759 110 453'"""
        response = requests.get(f"{BASE_URL}/api/market-settings")
        assert response.status_code == 200
        data = response.json()
        assert data.get("phone") == "+255 759 110 453", f"Expected phone '+255 759 110 453', got {data.get('phone')}"

    def test_market_settings_returns_correct_email(self):
        """GET /api/market-settings returns email='sales@konekt.co.tz'"""
        response = requests.get(f"{BASE_URL}/api/market-settings")
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == "sales@konekt.co.tz", f"Expected email 'sales@konekt.co.tz', got {data.get('email')}"

    def test_market_settings_returns_correct_currency(self):
        """GET /api/market-settings returns currency_code='TZS'"""
        response = requests.get(f"{BASE_URL}/api/market-settings")
        assert response.status_code == 200
        data = response.json()
        assert data.get("currency_code") == "TZS", f"Expected currency_code 'TZS', got {data.get('currency_code')}"

    def test_market_settings_returns_date_format(self):
        """GET /api/market-settings returns date_format='DD/MM/YYYY'"""
        response = requests.get(f"{BASE_URL}/api/market-settings")
        assert response.status_code == 200
        data = response.json()
        assert data.get("date_format") == "DD/MM/YYYY", f"Expected date_format 'DD/MM/YYYY', got {data.get('date_format')}"

    def test_market_settings_returns_default_phone_prefix(self):
        """GET /api/market-settings returns default_phone_prefix='+255'"""
        response = requests.get(f"{BASE_URL}/api/market-settings")
        assert response.status_code == 200
        data = response.json()
        assert data.get("default_phone_prefix") == "+255", f"Expected default_phone_prefix '+255', got {data.get('default_phone_prefix')}"


class TestLoginPrivacy:
    """Login privacy tests - token validation via /api/auth/me"""

    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403], f"Expected 401/403 without token, got {response.status_code}"

    def test_auth_me_with_invalid_token_returns_401(self):
        """GET /api/auth/me with invalid token returns 401/403"""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code in [401, 403], f"Expected 401/403 with invalid token, got {response.status_code}"

    def test_auth_me_with_valid_admin_token_returns_user(self):
        """GET /api/auth/me with valid admin token returns user role"""
        # First login to get token
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        token = login_res.json().get("token")
        assert token, "No token returned from login"

        # Now test /api/auth/me
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Expected 200 with valid token, got {response.status_code}"
        data = response.json()
        assert "role" in data, "Response should contain 'role'"
        assert data.get("role") == "admin", f"Expected role 'admin', got {data.get('role')}"


class TestPublicRequestsEndpoint:
    """Service forms → Requests tests via POST /api/public-requests"""

    def test_service_quote_request_creates_record(self):
        """POST /api/public-requests with request_type=service_quote creates request"""
        payload = {
            "request_type": "service_quote",
            "title": "Test Service Quote",
            "guest_name": "TEST_ServiceQuote User",
            "guest_email": f"test_service_{int(time.time())}@example.com",
            "phone_prefix": "+255",
            "phone": "712345678",
            "company_name": "Test Company",
            "service_slug": "office-branding",
            "service_name": "Office Branding",
            "source_page": "/services/office-branding",
            "details": {
                "service_category": "printing_branding",
                "urgency": "flexible",
                "scope_message": "Test service quote request"
            },
            "notes": "Test service quote request"
        }
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True or "request_number" in data, f"Expected ok=true or request_number, got {data}"
        assert "request_number" in data, f"Expected request_number in response, got {data}"

    def test_business_pricing_request_creates_record(self):
        """POST /api/public-requests with request_type=business_pricing creates request"""
        payload = {
            "request_type": "business_pricing",
            "title": "Request Business Pricing",
            "guest_name": "TEST_BusinessPricing User",
            "guest_email": f"test_biz_{int(time.time())}@example.com",
            "phone_prefix": "+255",
            "phone": "712345679",
            "company_name": "Test Business Corp",
            "source_page": "/request-quote?type=business_pricing",
            "details": {
                "service_category": "business_support",
                "urgency": "within_month"
            },
            "notes": "Test business pricing request"
        }
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "request_number" in data, f"Expected request_number in response, got {data}"


class TestContactEndpoint:
    """Contact form tests via POST /api/public-requests/contact"""

    def test_contact_form_creates_contact_general_request(self):
        """POST /api/public-requests/contact creates contact_general request"""
        payload = {
            "name": "TEST_Contact User",
            "email": f"test_contact_{int(time.time())}@example.com",
            "company": "Test Contact Company",
            "phone_prefix": "+255",
            "phone": "712345680",
            "subject": "bulk_pricing",
            "message": "Test contact form submission for bulk pricing inquiry"
        }
        response = requests.post(f"{BASE_URL}/api/public-requests/contact", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "request_number" in data, f"Expected request_number in response, got {data}"
        # For guests, should return account_invite
        if "account_invite" in data:
            assert "invite_url" in data["account_invite"], "account_invite should contain invite_url"


class TestRoleLogins:
    """All 4 role logins work"""

    def test_admin_login(self):
        """Admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "admin", f"Expected role 'admin', got {data.get('user', {}).get('role')}"

    def test_customer_login(self):
        """Customer login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "customer", f"Expected role 'customer', got {data.get('user', {}).get('role')}"

    def test_vendor_login(self):
        """Vendor/Partner login works via /api/partner-auth/login"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        # Partner auth returns access_token instead of token
        assert "access_token" in data or "token" in data, "No token in response"

    def test_sales_login(self):
        """Sales login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "sales", f"Expected role 'sales', got {data.get('user', {}).get('role')}"


class TestRegressionGuestCheckout:
    """Guest checkout POST /api/guest/orders still works with account_invite"""

    def test_guest_checkout_creates_order(self):
        """POST /api/guest/orders creates order with account_invite"""
        payload = {
            "customer_name": "TEST_GuestCheckout User",
            "customer_email": f"test_guest_{int(time.time())}@example.com",
            "customer_phone": "+255712345681",
            "company_name": "Test Guest Company",
            "delivery_address": "123 Test Street, Dar es Salaam",
            "line_items": [
                {
                    "product_id": "test_product_001",
                    "product_name": "Test Product",
                    "description": "Test product description",
                    "quantity": 2,
                    "unit_price": 5000,
                    "total": 10000
                }
            ],
            "subtotal": 10000,
            "total": 10000,
            "payment_method": "bank_transfer"
        }
        response = requests.post(f"{BASE_URL}/api/guest/orders", json=payload)
        assert response.status_code in [200, 201], f"Guest checkout failed: {response.status_code}: {response.text}"
        data = response.json()
        assert "order_number" in data or "order_id" in data, f"Expected order_number or order_id, got {data}"
        # Should return account_invite for guests
        if "account_invite" in data:
            assert "invite_url" in data["account_invite"], "account_invite should contain invite_url"


class TestRegressionAdminOrders:
    """Admin login + GET /api/admin/orders-ops still works"""

    def test_admin_orders_ops(self):
        """GET /api/admin/orders-ops works with admin token"""
        # Login as admin
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        token = login_res.json().get("token")

        # Get orders-ops
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers)
        assert response.status_code == 200, f"GET /api/admin/orders-ops failed: {response.status_code}: {response.text}"


class TestRegressionMarginRules:
    """POST /api/admin/margin-rules/calculate with base_cost=10000 returns selling_price=12000"""

    def test_margin_calculation_20_percent(self):
        """Margin calculation: base_cost=10000 → selling_price=12000 (20% margin)"""
        # Login as admin
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        token = login_res.json().get("token")

        headers = {"Authorization": f"Bearer {token}"}
        payload = {"base_cost": 10000}
        response = requests.post(f"{BASE_URL}/api/admin/margin-rules/calculate", json=payload, headers=headers)
        assert response.status_code == 200, f"Margin calculation failed: {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("selling_price") == 12000, f"Expected selling_price=12000, got {data.get('selling_price')}"


class TestRegressionRequestsCTAs:
    """GET /api/requests/ctas still returns CTA configs"""

    def test_requests_ctas_returns_configs(self):
        """GET /api/requests/ctas returns CTA configurations"""
        response = requests.get(f"{BASE_URL}/api/requests/ctas")
        assert response.status_code == 200, f"GET /api/requests/ctas failed: {response.status_code}: {response.text}"
        data = response.json()
        # Should return a list or dict of CTAs
        assert isinstance(data, (list, dict)), f"Expected list or dict, got {type(data)}"


class TestRegressionAdminRequests:
    """Admin GET /api/admin/requests shows all 6 request types"""

    def test_admin_requests_endpoint(self):
        """GET /api/admin/requests works and returns request types"""
        # Login as admin
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        token = login_res.json().get("token")

        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/requests", headers=headers)
        assert response.status_code == 200, f"GET /api/admin/requests failed: {response.status_code}: {response.text}"
        data = response.json()
        # Should return requests list
        assert isinstance(data, (list, dict)), f"Expected list or dict, got {type(data)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
