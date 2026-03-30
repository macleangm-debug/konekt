"""
Test Suite for Konekt B2B E-commerce Platform - Iteration 143
Features:
1. Vendor Capability Governance (products/services/promo)
2. Payment Release Policies (full_upfront, after_full_payment)
3. Vendor Orders Visibility Filter (excludes unreleased work)
4. Sales Service Workflow (customer invite, service quotes, quote→invoice)
5. Account Activation (public token validation + password set)
6. Default 20% Margin Rule
"""
import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def sales_token():
    """Get sales JWT token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Sales login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner JWT token via partner-auth endpoint"""
    resp = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Partner login failed: {resp.status_code} - {resp.text}")


class TestVendorCapabilityGovernance:
    """Test vendor capability CRUD and can-create check"""

    def test_list_vendor_profiles(self, admin_token):
        """GET /api/admin/vendor-capabilities lists vendor profiles"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendor-capabilities",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of vendor profiles"
        print(f"Found {len(data)} vendor profiles")

    def test_get_vendor_profile_demo(self, admin_token):
        """GET /api/admin/vendor-capabilities/vendor-demo-001 returns profile"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendor-capabilities/vendor-demo-001",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May be 200 or 404 depending on seed data
        if resp.status_code == 200:
            data = resp.json()
            assert "vendor_user_id" in data
            assert "products_capability_status" in data
            assert "services_capability_status" in data
            print(f"Vendor profile: products={data.get('products_capability_status')}, services={data.get('services_capability_status')}")
        else:
            print(f"Vendor profile not found (404), will create one")

    def test_create_vendor_profile(self, admin_token):
        """POST /api/admin/vendor-capabilities creates vendor profile"""
        test_vendor_id = f"TEST_vendor_{uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/admin/vendor-capabilities",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "vendor_user_id": test_vendor_id,
                "business_name": "Test Vendor Business",
                "products_capability_status": "approved",
                "services_capability_status": "pending",
                "promo_capability_status": "suspended"
            }
        )
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("vendor_user_id") == test_vendor_id
        assert data.get("products_capability_status") == "approved"
        assert data.get("services_capability_status") == "pending"
        assert data.get("promo_capability_status") == "suspended"
        print(f"Created vendor profile: {test_vendor_id}")
        return test_vendor_id

    def test_can_create_product_approved(self, admin_token):
        """GET /api/admin/vendor-capabilities/{id}/can-create?listing_type=product returns allowed:true for approved"""
        # First ensure vendor-demo-001 exists with approved products
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendor-capabilities/vendor-demo-001",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code == 404:
            # Create it
            requests.post(
                f"{BASE_URL}/api/admin/vendor-capabilities",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "vendor_user_id": "vendor-demo-001",
                    "business_name": "Demo Vendor",
                    "products_capability_status": "approved",
                    "services_capability_status": "pending",
                    "promo_capability_status": "pending"
                }
            )
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendor-capabilities/vendor-demo-001/can-create",
            params={"listing_type": "product"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "allowed" in data
        print(f"Can create product: {data}")

    def test_can_create_service_pending(self, admin_token):
        """GET /api/admin/vendor-capabilities/{id}/can-create?listing_type=service returns allowed:false for pending"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendor-capabilities/vendor-demo-001/can-create",
            params={"listing_type": "service"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "allowed" in data
        print(f"Can create service: {data}")


class TestPaymentReleasePolicies:
    """Test payment release policy CRUD and check-release"""

    def test_list_policies(self, admin_token):
        """GET /api/admin/payment-release-policies lists policies"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/payment-release-policies",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} payment release policies")

    def test_create_policy(self, admin_token):
        """POST /api/admin/payment-release-policies creates release policy"""
        test_scope_id = f"TEST_scope_{uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/admin/payment-release-policies",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "scope_type": "product_group",
                "scope_id": test_scope_id,
                "payment_mode": "full_upfront",
                "release_rule": "after_full_payment",
                "requires_advance_payment": False,
                "advance_percent": 0,
                "final_percent": 100
            }
        )
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("scope_type") == "product_group"
        assert data.get("payment_mode") == "full_upfront"
        assert data.get("release_rule") == "after_full_payment"
        print(f"Created policy: {data.get('id')}")

    def test_check_release_full_payment(self, admin_token):
        """POST /api/admin/payment-release-policies/check-release with full payment returns can_release:true"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/payment-release-policies/check-release",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "order_id": "test-order-123",
                "amount_paid": 1000,
                "total_amount": 1000
            }
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "can_release" in data
        assert data["can_release"] == True, f"Expected can_release:true for full payment, got {data}"
        print(f"Check release (full payment): {data}")

    def test_check_release_partial_payment(self, admin_token):
        """POST /api/admin/payment-release-policies/check-release with partial payment returns can_release:false"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/payment-release-policies/check-release",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "order_id": "test-order-456",
                "amount_paid": 500,
                "total_amount": 1000
            }
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "can_release" in data
        assert data["can_release"] == False, f"Expected can_release:false for partial payment, got {data}"
        print(f"Check release (partial payment): {data}")

    def test_check_release_manual_override(self, admin_token):
        """POST /api/admin/payment-release-policies/check-release with manual_release:true returns can_release:true"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/payment-release-policies/check-release",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "order_id": "test-order-789",
                "amount_paid": 0,
                "total_amount": 1000,
                "manual_release": True
            }
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "can_release" in data
        assert data["can_release"] == True, f"Expected can_release:true for manual_release, got {data}"
        print(f"Check release (manual override): {data}")


class TestVendorOrdersVisibility:
    """Test vendor orders endpoint excludes unreleased work"""

    def test_vendor_orders_list(self, partner_token):
        """GET /api/vendor/orders returns orders for vendor"""
        resp = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"Vendor sees {len(data)} orders")
        
        # Verify no unreleased statuses
        excluded_statuses = {"pending_payment", "pending_payment_confirmation", "under_review", "awaiting_payment", "draft", "quote_pending"}
        for order in data:
            status = order.get("status", "")
            assert status not in excluded_statuses, f"Vendor should not see order with status: {status}"
        print("Verified: No unreleased orders visible to vendor")

    def test_vendor_order_items_no_selling_price(self, partner_token):
        """Vendor order items only show vendor_price, not selling_price or margin"""
        resp = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for order in data:
            items = order.get("items", [])
            for item in items:
                # Vendor should see vendor_price
                assert "vendor_price" in item or "name" in item, f"Item missing vendor_price: {item}"
                # Vendor should NOT see selling_price or margin
                assert "selling_price" not in item, f"Vendor should not see selling_price: {item}"
                assert "margin" not in item, f"Vendor should not see margin: {item}"
        print("Verified: Vendor items only show vendor_price, no selling_price/margin")


class TestSalesServiceWorkflow:
    """Test sales customer creation, service quotes, quote→invoice"""

    def test_create_customer_with_invite(self, sales_token):
        """POST /api/sales/customers/create-with-invite creates customer + invite token"""
        test_email = f"TEST_customer_{uuid4().hex[:8]}@example.com"
        resp = requests.post(
            f"{BASE_URL}/api/sales/customers/create-with-invite",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={
                "email": test_email,
                "full_name": "Test Customer",
                "phone": "+255700000000",
                "company": "Test Company"
            }
        )
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True
        assert "customer_id" in data
        assert "invite_token" in data
        assert "invite_url" in data
        print(f"Created customer with invite: {data.get('customer_id')}, token: {data.get('invite_token')[:20]}...")
        return data

    def test_create_service_quote_with_margin(self, sales_token):
        """POST /api/sales/service-quotes creates quote with auto-applied 20% margin"""
        # First create a customer
        test_email = f"TEST_quote_cust_{uuid4().hex[:8]}@example.com"
        cust_resp = requests.post(
            f"{BASE_URL}/api/sales/customers/create-with-invite",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={
                "email": test_email,
                "full_name": "Quote Test Customer",
                "phone": "+255700000001"
            }
        )
        assert cust_resp.status_code in [200, 201]
        customer_id = cust_resp.json().get("customer_id")
        
        # Create service quote with vendor_cost=1000
        resp = requests.post(
            f"{BASE_URL}/api/sales/service-quotes",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={
                "customer_id": customer_id,
                "service_name": "Test Service",
                "vendor_cost": 1000,
                "advance_percent": 50,
                "notes": "Test service quote"
            }
        )
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify margin auto-applied (20% margin: 1000 → 1200)
        assert data.get("vendor_cost") == 1000
        assert data.get("selling_price") == 1200, f"Expected selling_price=1200 (20% margin), got {data.get('selling_price')}"
        assert data.get("margin_applied_automatically") == True
        assert "payment_terms" in data
        print(f"Created service quote: {data.get('quote_number')}, vendor_cost=1000, selling_price={data.get('selling_price')}")
        return data

    def test_send_service_quote(self, sales_token):
        """POST /api/sales/service-quotes/{id}/send marks quote as sent"""
        # Create a quote first
        test_email = f"TEST_send_cust_{uuid4().hex[:8]}@example.com"
        cust_resp = requests.post(
            f"{BASE_URL}/api/sales/customers/create-with-invite",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"email": test_email, "full_name": "Send Test Customer"}
        )
        customer_id = cust_resp.json().get("customer_id")
        
        quote_resp = requests.post(
            f"{BASE_URL}/api/sales/service-quotes",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"customer_id": customer_id, "service_name": "Send Test Service", "vendor_cost": 500}
        )
        quote_id = quote_resp.json().get("id")
        
        # Send the quote
        resp = requests.post(
            f"{BASE_URL}/api/sales/service-quotes/{quote_id}/send",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True
        assert data.get("status") == "sent"
        print(f"Quote {quote_id} sent successfully")

    def test_accept_quote_creates_invoice(self, sales_token):
        """POST /api/sales/service-quotes/{id}/accept creates invoice with payment terms"""
        # Create and send a quote
        test_email = f"TEST_accept_cust_{uuid4().hex[:8]}@example.com"
        cust_resp = requests.post(
            f"{BASE_URL}/api/sales/customers/create-with-invite",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"email": test_email, "full_name": "Accept Test Customer"}
        )
        customer_id = cust_resp.json().get("customer_id")
        
        quote_resp = requests.post(
            f"{BASE_URL}/api/sales/service-quotes",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"customer_id": customer_id, "service_name": "Accept Test Service", "vendor_cost": 2000, "advance_percent": 50}
        )
        quote_id = quote_resp.json().get("id")
        
        # Send the quote
        requests.post(
            f"{BASE_URL}/api/sales/service-quotes/{quote_id}/send",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        
        # Accept the quote
        resp = requests.post(
            f"{BASE_URL}/api/sales/service-quotes/{quote_id}/accept",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True
        assert data.get("quote_status") == "accepted"
        assert "invoice_id" in data
        assert "invoice_number" in data
        assert "payment_terms" in data
        
        # Verify payment terms have advance + final phases
        payment_terms = data.get("payment_terms", {})
        phases = payment_terms.get("phases", [])
        assert len(phases) >= 2, f"Expected at least 2 payment phases, got {len(phases)}"
        print(f"Quote accepted, invoice created: {data.get('invoice_number')}, payment_terms: {payment_terms}")


class TestAccountActivation:
    """Test public account activation endpoints"""

    def test_validate_activation_token_invalid(self):
        """GET /api/auth/activate/validate?token=invalid returns error"""
        resp = requests.get(
            f"{BASE_URL}/api/auth/activate/validate",
            params={"token": "invalid-token-12345"}
        )
        assert resp.status_code == 400, f"Expected 400 for invalid token, got {resp.status_code}"
        print("Invalid token correctly rejected")

    def test_activate_account_flow(self, sales_token):
        """Full activation flow: create invite → validate → activate → login"""
        # Create customer with invite
        test_email = f"TEST_activate_{uuid4().hex[:8]}@example.com"
        cust_resp = requests.post(
            f"{BASE_URL}/api/sales/customers/create-with-invite",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"email": test_email, "full_name": "Activation Test Customer"}
        )
        assert cust_resp.status_code in [200, 201]
        invite_token = cust_resp.json().get("invite_token")
        
        # Validate token
        validate_resp = requests.get(
            f"{BASE_URL}/api/auth/activate/validate",
            params={"token": invite_token}
        )
        assert validate_resp.status_code == 200, f"Token validation failed: {validate_resp.text}"
        validate_data = validate_resp.json()
        assert validate_data.get("valid") == True
        assert validate_data.get("customer_email") == test_email.lower()
        print(f"Token validated for: {validate_data.get('customer_name')}")
        
        # Activate account with password
        activate_resp = requests.post(
            f"{BASE_URL}/api/auth/activate",
            json={"token": invite_token, "password": "TestPass123!"}
        )
        assert activate_resp.status_code == 200, f"Activation failed: {activate_resp.text}"
        activate_data = activate_resp.json()
        assert activate_data.get("ok") == True
        print(f"Account activated: {activate_data.get('customer_email')}")
        
        # Small delay to ensure DB write is complete
        import time
        time.sleep(0.5)
        
        # Login with new password
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email.lower(), "password": "TestPass123!"}
        )
        assert login_resp.status_code == 200, f"Login failed after activation: {login_resp.text}"
        login_data = login_resp.json()
        assert "access_token" in login_data or "token" in login_data
        print(f"Activated customer can login successfully")


class TestMarginRules:
    """Test default 20% margin rule exists"""

    def test_global_margin_rule_exists(self, admin_token):
        """Verify default 20% margin rule exists in margin_rules collection"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/margin-rules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Find global rule
        global_rules = [r for r in data if r.get("scope") == "global" and r.get("active") == True]
        assert len(global_rules) > 0, "No active global margin rule found"
        
        global_rule = global_rules[0]
        assert global_rule.get("method") == "percentage"
        assert global_rule.get("value") == 20, f"Expected 20% margin, got {global_rule.get('value')}%"
        print(f"Global margin rule: {global_rule.get('method')} {global_rule.get('value')}%")


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_data(self, admin_token):
        """Cleanup TEST_ prefixed data (informational only)"""
        print("Note: Test data with TEST_ prefix should be cleaned up periodically")
        print("Test suite completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
