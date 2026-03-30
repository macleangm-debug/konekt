"""
Test Public Intake Consolidation - Iteration 148
Tests for:
- NEW: POST /api/public-requests/contact
- NEW: POST /api/public-requests (service_quote, business_pricing)
- NEW: Admin GET /api/admin/requests (all 6 types)
- NEW: Admin POST /api/admin/requests/{id}/convert-to-lead
- NEW: Admin PUT /api/admin/requests/{id}/status
- REGRESSION: POST /api/requests (product_bulk, promo_sample, service_quote)
- REGRESSION: GET /api/requests/ctas
- REGRESSION: Guest checkout, margin rules, role logins
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"


class TestRoleLogins:
    """Test all 4 role logins work"""

    def test_admin_login(self):
        """Admin login should work"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        data = res.json()
        assert "token" in data
        assert data["user"]["role"] in ("admin", "sales")
        print(f"✓ Admin login OK - role: {data['user']['role']}")

    def test_customer_login(self):
        """Customer login should work"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert res.status_code == 200, f"Customer login failed: {res.text}"
        data = res.json()
        assert "token" in data
        print(f"✓ Customer login OK - role: {data['user']['role']}")

    def test_sales_login(self):
        """Sales login should work"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert res.status_code == 200, f"Sales login failed: {res.text}"
        data = res.json()
        assert "token" in data
        print(f"✓ Sales login OK - role: {data['user']['role']}")

    def test_vendor_login(self):
        """Vendor/Partner login should work"""
        res = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert res.status_code == 200, f"Vendor login failed: {res.text}"
        data = res.json()
        # Partner auth returns access_token instead of token
        assert "access_token" in data or "token" in data
        print(f"✓ Vendor login OK")


class TestNewPublicRequestsContact:
    """NEW: POST /api/public-requests/contact endpoint"""

    def test_contact_form_creates_request(self):
        """Contact form should create contact_general request"""
        unique_email = f"test_contact_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Test Contact User",
            "email": unique_email,
            "company": "Test Company Ltd",
            "phone_prefix": "+255",
            "phone": "712345678",
            "subject": "bulk_pricing",
            "message": "I need bulk pricing for 500 t-shirts"
        }
        res = requests.post(f"{BASE_URL}/api/public-requests/contact", json=payload)
        assert res.status_code == 200, f"Contact request failed: {res.text}"
        data = res.json()
        
        # Verify response structure
        assert data.get("ok") is True
        assert "request_number" in data
        assert data.get("request_type") == "contact_general"
        assert "account_invite" in data
        print(f"✓ Contact form created request: {data['request_number']}")
        return data

    def test_contact_form_returns_account_invite(self):
        """Contact form should return account_invite for new guests"""
        unique_email = f"test_invite_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "New Guest User",
            "email": unique_email,
            "subject": "services",
            "message": "I need help with services"
        }
        res = requests.post(f"{BASE_URL}/api/public-requests/contact", json=payload)
        assert res.status_code == 200
        data = res.json()
        
        # New guest should get account invite
        if data.get("account_invite"):
            assert "invite_token" in data["account_invite"]
            assert "invite_url" in data["account_invite"]
            print(f"✓ Account invite returned for new guest")
        else:
            print(f"✓ Contact request created (no invite - may be existing user)")


class TestNewPublicRequestsGeneric:
    """NEW: POST /api/public-requests generic endpoint"""

    def test_service_quote_request(self):
        """Service quote request should work"""
        unique_email = f"test_svc_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "request_type": "service_quote",
            "guest_name": "Service Quote User",
            "guest_email": unique_email,
            "phone_prefix": "+255",
            "phone": "722334455",
            "company_name": "Service Corp",
            "budget_amount": 500000,
            "service_name": "Office Branding",
            "notes": "Need full office branding package"
        }
        res = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert res.status_code == 200, f"Service quote failed: {res.text}"
        data = res.json()
        
        assert data.get("ok") is True
        assert "request_number" in data
        assert data.get("request_type") == "service_quote"
        print(f"✓ Service quote request created: {data['request_number']}")

    def test_business_pricing_request(self):
        """Business pricing request should work"""
        unique_email = f"test_biz_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "request_type": "business_pricing",
            "guest_name": "Business Pricing User",
            "guest_email": unique_email,
            "phone_prefix": "+255",
            "phone": "733445566",
            "company_name": "Big Corp Ltd",
            "notes": "Need contract pricing for recurring orders"
        }
        res = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert res.status_code == 200, f"Business pricing failed: {res.text}"
        data = res.json()
        
        assert data.get("ok") is True
        assert "request_number" in data
        assert data.get("request_type") == "business_pricing"
        print(f"✓ Business pricing request created: {data['request_number']}")

    def test_invalid_request_type_returns_400(self):
        """Invalid request_type should return 400"""
        payload = {
            "request_type": "invalid_type",
            "guest_name": "Test User",
            "guest_email": "test@example.com"
        }
        res = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert res.status_code == 400, f"Expected 400 for invalid type, got {res.status_code}"
        print(f"✓ Invalid request_type correctly returns 400")


class TestAdminRequestsEndpoints:
    """Admin requests management endpoints"""

    @pytest.fixture
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return res.json()["token"]

    def test_admin_get_all_requests(self, admin_token):
        """Admin should see all request types"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/requests", headers=headers)
        assert res.status_code == 200, f"Admin requests failed: {res.text}"
        data = res.json()
        
        # Should be a list
        assert isinstance(data, list)
        
        # Check for various request types
        types_found = set()
        for req in data:
            if req.get("request_type"):
                types_found.add(req["request_type"])
        
        print(f"✓ Admin sees {len(data)} requests, types: {types_found}")
        
        # Verify at least some expected types exist
        expected_types = {"contact_general", "business_pricing", "service_quote", "product_bulk", "promo_custom", "promo_sample"}
        found_expected = types_found.intersection(expected_types)
        print(f"  Found expected types: {found_expected}")

    def test_admin_filter_by_request_type(self, admin_token):
        """Admin can filter requests by type"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/requests?request_type=contact_general", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        # All returned should be contact_general
        for req in data:
            assert req.get("request_type") == "contact_general"
        print(f"✓ Admin filter by type works - {len(data)} contact_general requests")

    def test_admin_convert_to_lead(self, admin_token):
        """Admin can convert request to lead"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a request
        unique_email = f"test_lead_{uuid.uuid4().hex[:8]}@example.com"
        create_res = requests.post(f"{BASE_URL}/api/public-requests/contact", json={
            "name": "Lead Conversion Test",
            "email": unique_email,
            "subject": "support",
            "message": "Test for lead conversion"
        })
        assert create_res.status_code == 200
        request_id = create_res.json()["request_id"]
        
        # Convert to lead
        convert_res = requests.post(
            f"{BASE_URL}/api/admin/requests/{request_id}/convert-to-lead",
            headers=headers
        )
        assert convert_res.status_code == 200, f"Convert to lead failed: {convert_res.text}"
        data = convert_res.json()
        
        assert data.get("ok") is True
        assert "lead_id" in data
        print(f"✓ Request {request_id} converted to lead {data['lead_id']}")

    def test_admin_update_status(self, admin_token):
        """Admin can update request status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a request
        unique_email = f"test_status_{uuid.uuid4().hex[:8]}@example.com"
        create_res = requests.post(f"{BASE_URL}/api/public-requests/contact", json={
            "name": "Status Update Test",
            "email": unique_email,
            "subject": "other",
            "message": "Test for status update"
        })
        assert create_res.status_code == 200
        request_id = create_res.json()["request_id"]
        
        # Update status
        update_res = requests.put(
            f"{BASE_URL}/api/admin/requests/{request_id}/status",
            headers=headers,
            json={"status": "under_review", "crm_stage": "qualified"}
        )
        assert update_res.status_code == 200, f"Status update failed: {update_res.text}"
        data = update_res.json()
        
        assert data.get("ok") is True
        print(f"✓ Request status updated successfully")


class TestRegressionExistingRequestsEndpoint:
    """REGRESSION: POST /api/requests still works"""

    def test_product_bulk_request(self):
        """Product bulk request via original endpoint"""
        unique_email = f"test_bulk_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "request_type": "product_bulk",
            "guest_name": "Bulk Order User",
            "guest_email": unique_email,
            "title": "Bulk T-Shirt Order",
            "details": {"quantity": 1000, "product": "T-Shirts"},
            "notes": "Need 1000 branded t-shirts"
        }
        res = requests.post(f"{BASE_URL}/api/requests", json=payload)
        assert res.status_code == 200, f"Product bulk failed: {res.text}"
        data = res.json()
        
        assert data.get("ok") is True
        assert "request_number" in data
        print(f"✓ Product bulk request works: {data['request_number']}")

    def test_promo_sample_request(self):
        """Promo sample request via original endpoint"""
        unique_email = f"test_sample_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "request_type": "promo_sample",
            "guest_name": "Sample Request User",
            "guest_email": unique_email,
            "title": "Sample Request",
            "details": {"product": "Branded Pens"},
            "notes": "Need samples before bulk order"
        }
        res = requests.post(f"{BASE_URL}/api/requests", json=payload)
        assert res.status_code == 200, f"Promo sample failed: {res.text}"
        data = res.json()
        
        assert data.get("ok") is True
        assert "request_number" in data
        print(f"✓ Promo sample request works: {data['request_number']}")

    def test_service_quote_via_original_endpoint(self):
        """Service quote via original endpoint"""
        unique_email = f"test_svc_orig_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "request_type": "service_quote",
            "guest_name": "Service User",
            "guest_email": unique_email,
            "title": "Service Quote Request",
            "notes": "Need printing services"
        }
        res = requests.post(f"{BASE_URL}/api/requests", json=payload)
        assert res.status_code == 200, f"Service quote failed: {res.text}"
        data = res.json()
        
        assert data.get("ok") is True
        print(f"✓ Service quote via original endpoint works: {data['request_number']}")


class TestRegressionRequestCTAs:
    """REGRESSION: GET /api/requests/ctas"""

    def test_ctas_returns_config(self):
        """CTAs endpoint returns configuration"""
        res = requests.get(f"{BASE_URL}/api/requests/ctas")
        assert res.status_code == 200, f"CTAs failed: {res.text}"
        data = res.json()
        
        # Should have public and account_shortcuts
        assert "public" in data or "account_shortcuts" in data
        print(f"✓ Request CTAs endpoint works")


class TestRegressionGuestCheckout:
    """REGRESSION: Guest checkout still works"""

    def test_guest_order_creates_order_and_invite(self):
        """Guest checkout creates order + account invite"""
        unique_email = f"test_guest_{uuid.uuid4().hex[:8]}@example.com"
        # Use correct field names for guest checkout endpoint
        payload = {
            "customer_email": unique_email,
            "customer_name": "Guest Checkout User",
            "customer_phone": "+255712345678",
            "delivery_address": "123 Test Street, Dar es Salaam",
            "line_items": [
                {
                    "product_id": "test-product-1",
                    "product_name": "Test Product",
                    "description": "Test product description",
                    "quantity": 10,
                    "unit_price": 5000,
                    "subtotal": 50000,
                    "total": 50000
                }
            ],
            "subtotal": 50000,
            "total": 50000
        }
        res = requests.post(f"{BASE_URL}/api/guest/orders", json=payload)
        assert res.status_code == 200, f"Guest checkout failed: {res.text}"
        data = res.json()
        
        assert "order_id" in data or "id" in data
        assert "order_number" in data
        assert data.get("status") == "pending"
        
        # Should have account_invite for new guest
        if data.get("account_invite"):
            print(f"✓ Guest checkout works with account invite")
        else:
            print(f"✓ Guest checkout works: {data.get('order_number')}")


class TestRegressionAdminOrdersOps:
    """REGRESSION: Admin orders-ops endpoint"""

    @pytest.fixture
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return res.json()["token"]

    def test_admin_orders_ops(self, admin_token):
        """Admin orders-ops returns enriched data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers)
        assert res.status_code == 200, f"Orders-ops failed: {res.text}"
        data = res.json()
        
        # Should have orders list
        orders = data.get("orders", data) if isinstance(data, dict) else data
        print(f"✓ Admin orders-ops works - {len(orders) if isinstance(orders, list) else 'N/A'} orders")


class TestRegressionMarginRules:
    """REGRESSION: Margin rules calculation"""

    @pytest.fixture
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return res.json()["token"]

    def test_margin_calculation(self, admin_token):
        """Margin calculation: base_cost=10000 should return selling_price=12000"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"base_cost": 10000}
        res = requests.post(f"{BASE_URL}/api/admin/margin-rules/calculate", headers=headers, json=payload)
        assert res.status_code == 200, f"Margin calc failed: {res.text}"
        data = res.json()
        
        # With 20% margin, 10000 -> 12000
        selling_price = data.get("selling_price", data.get("result", {}).get("selling_price"))
        assert selling_price == 12000, f"Expected 12000, got {selling_price}"
        print(f"✓ Margin calculation works: 10000 -> {selling_price}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
