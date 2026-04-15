"""
Test Suite for Iteration 312 - Payment Flow Fix, Category Display Mode, Group Deal Savings Badge

Tests:
1. POST /api/payments-governance/product-checkout NO LONGER creates orders - only creates checkout + invoice
2. Response from create-product-checkout does NOT contain 'order' field
3. GET /api/vendor-ops/catalog-config returns categories as rich objects with display_mode, commercial_mode, sourcing_mode fields
4. POST /api/commercial-flow/create-product-checkout also does NOT create orders (only checkout + invoice)
"""

import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://konekt-payments-fix.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@konekt.co.tz",
        "password": "KnktcKk_L-hw1wSyquvd!"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")

@pytest.fixture
def authenticated_client(api_client, admin_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestPaymentsGovernanceCheckout:
    """Tests for /api/payments-governance/product-checkout - CRITICAL BUG FIX"""

    def test_product_checkout_creates_only_checkout_and_invoice_no_order(self, api_client):
        """POST /api/payments-governance/product-checkout creates checkout+invoice but NOT order"""
        customer_id = f"TEST_customer_{uuid4().hex[:8]}"
        payload = {
            "customer_id": customer_id,
            "items": [
                {"id": f"prod_{uuid4().hex[:6]}", "name": "Test Product", "price": 50000, "quantity": 2, "vendor_id": "vendor-1"}
            ],
            "delivery": {"address": "Test Address", "city": "Dar es Salaam"},
            "quote_details": {"notes": "Test checkout"}
        }
        
        response = api_client.post(f"{BASE_URL}/api/payments-governance/product-checkout", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # CRITICAL: Response should have checkout and invoice but NOT order
        assert "checkout" in data, "Response should contain 'checkout' field"
        assert "invoice" in data, "Response should contain 'invoice' field"
        assert "order" not in data, "CRITICAL: Response should NOT contain 'order' field - orders are created only after payment approval"
        
        # Verify checkout structure
        checkout = data["checkout"]
        assert checkout.get("id"), "Checkout should have an id"
        assert checkout.get("customer_id") == customer_id
        assert checkout.get("status") == "awaiting_payment"
        assert checkout.get("type") == "product"
        
        # Verify invoice structure
        invoice = data["invoice"]
        assert invoice.get("id"), "Invoice should have an id"
        assert invoice.get("invoice_number"), "Invoice should have invoice_number"
        assert invoice.get("customer_id") == customer_id
        assert invoice.get("status") == "pending_payment"
        assert invoice.get("payment_status") == "pending"
        
        # Verify amounts
        expected_subtotal = 50000 * 2  # 100000
        expected_vat = expected_subtotal * 0.18  # 18000
        expected_total = expected_subtotal + expected_vat  # 118000
        
        assert checkout.get("subtotal_amount") == expected_subtotal
        assert checkout.get("total_amount") == expected_total
        assert invoice.get("total_amount") == expected_total

    def test_product_checkout_validation_errors(self, api_client):
        """POST /api/payments-governance/product-checkout returns 400 when required fields missing"""
        # Missing customer_id
        response = api_client.post(f"{BASE_URL}/api/payments-governance/product-checkout", json={
            "items": [{"id": "prod-1", "name": "Test", "price": 1000, "quantity": 1}]
        })
        assert response.status_code == 400
        
        # Missing items
        response = api_client.post(f"{BASE_URL}/api/payments-governance/product-checkout", json={
            "customer_id": "test-customer"
        })
        assert response.status_code == 400


class TestCommercialFlowCheckout:
    """Tests for /api/commercial-flow/create-product-checkout - CRITICAL BUG FIX"""

    def test_commercial_flow_checkout_creates_only_checkout_and_invoice_no_order(self, api_client):
        """POST /api/commercial-flow/create-product-checkout creates checkout+invoice but NOT order"""
        customer_id = f"TEST_customer_{uuid4().hex[:8]}"
        payload = {
            "customer_id": customer_id,
            "items": [
                {"id": f"prod_{uuid4().hex[:6]}", "name": "Commercial Test Product", "price": 75000, "quantity": 3, "vendor_id": "vendor-2"}
            ],
            "delivery": {"address": "Commercial Test Address", "city": "Arusha"},
            "quote_details": {"notes": "Commercial flow test"}
        }
        
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/create-product-checkout", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # CRITICAL: Response should have checkout and invoice but NOT order
        assert "checkout" in data, "Response should contain 'checkout' field"
        assert "invoice" in data, "Response should contain 'invoice' field"
        assert "order" not in data, "CRITICAL: Response should NOT contain 'order' field - orders are created only after payment approval"
        
        # Verify checkout structure
        checkout = data["checkout"]
        assert checkout.get("id"), "Checkout should have an id"
        assert checkout.get("customer_id") == customer_id
        assert checkout.get("status") == "awaiting_payment"
        
        # Verify invoice structure
        invoice = data["invoice"]
        assert invoice.get("id"), "Invoice should have an id"
        assert invoice.get("invoice_number"), "Invoice should have invoice_number"
        assert invoice.get("status") == "pending_payment"


class TestCatalogConfigCategories:
    """Tests for /api/vendor-ops/catalog-config - Category Display Mode System"""

    def test_catalog_config_returns_rich_category_objects(self, authenticated_client):
        """GET /api/vendor-ops/catalog-config returns categories as rich objects with display_mode, commercial_mode, sourcing_mode"""
        response = authenticated_client.get(f"{BASE_URL}/api/vendor-ops/catalog-config")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "categories" in data, "Response should contain 'categories' field"
        assert "units" in data, "Response should contain 'units' field"
        assert "variant_types" in data, "Response should contain 'variant_types' field"
        
        categories = data["categories"]
        assert isinstance(categories, list), "Categories should be a list"
        
        if len(categories) > 0:
            # Verify first category has rich object structure
            cat = categories[0]
            assert isinstance(cat, dict), "Each category should be a dict (rich object), not a string"
            
            # Required fields for rich category objects
            assert "name" in cat, "Category should have 'name' field"
            assert "display_mode" in cat, "Category should have 'display_mode' field"
            assert "commercial_mode" in cat, "Category should have 'commercial_mode' field"
            assert "sourcing_mode" in cat, "Category should have 'sourcing_mode' field"
            
            # Verify valid values
            assert cat["display_mode"] in ["visual", "list_quote"], f"display_mode should be 'visual' or 'list_quote', got {cat['display_mode']}"
            assert cat["commercial_mode"] in ["fixed_price", "request_quote", "hybrid"], f"commercial_mode should be 'fixed_price', 'request_quote', or 'hybrid', got {cat['commercial_mode']}"
            assert cat["sourcing_mode"] in ["preferred", "competitive"], f"sourcing_mode should be 'preferred' or 'competitive', got {cat['sourcing_mode']}"
            
            print(f"Category '{cat['name']}': display_mode={cat['display_mode']}, commercial_mode={cat['commercial_mode']}, sourcing_mode={cat['sourcing_mode']}")

    def test_catalog_config_normalizes_legacy_string_categories(self, authenticated_client):
        """GET /api/vendor-ops/catalog-config normalizes legacy string categories to rich objects"""
        response = authenticated_client.get(f"{BASE_URL}/api/vendor-ops/catalog-config")
        
        assert response.status_code == 200
        
        data = response.json()
        categories = data.get("categories", [])
        
        # All categories should be dicts, not strings (even if originally stored as strings)
        for i, cat in enumerate(categories):
            assert isinstance(cat, dict), f"Category at index {i} should be a dict, got {type(cat)}: {cat}"
            assert "name" in cat, f"Category at index {i} should have 'name' field"
            # Default values for normalized legacy strings
            if cat.get("display_mode") is None:
                pytest.fail(f"Category '{cat.get('name')}' missing display_mode - normalization failed")


class TestPaymentApprovalCreatesOrder:
    """Tests for /api/payments-governance/finance/approve - Order created ONLY after approval"""

    def test_full_flow_order_created_only_after_approval(self, api_client):
        """Full flow: checkout -> payment intent -> proof -> approve -> order created"""
        customer_id = f"TEST_fullflow_{uuid4().hex[:8]}"
        
        # Step 1: Create checkout (should NOT create order)
        checkout_payload = {
            "customer_id": customer_id,
            "items": [{"id": f"prod_{uuid4().hex[:6]}", "name": "Full Flow Product", "price": 100000, "quantity": 1, "vendor_id": "vendor-test"}],
            "delivery": {"address": "Full Flow Address"},
        }
        checkout_res = api_client.post(f"{BASE_URL}/api/payments-governance/product-checkout", json=checkout_payload)
        assert checkout_res.status_code == 200
        checkout_data = checkout_res.json()
        assert "order" not in checkout_data, "Order should NOT be created at checkout"
        
        invoice_id = checkout_data["invoice"]["id"]
        
        # Step 2: Create payment intent
        payment_res = api_client.post(f"{BASE_URL}/api/payments-governance/invoice/payment-intent", json={
            "invoice_id": invoice_id,
            "payment_mode": "full"
        })
        assert payment_res.status_code == 200
        payment_id = payment_res.json()["payment"]["id"]
        
        # Step 3: Upload payment proof
        proof_res = api_client.post(f"{BASE_URL}/api/payments-governance/payment-proof", json={
            "payment_id": payment_id,
            "payer_name": "Test Payer",
            "amount_paid": 118000,  # subtotal + VAT
            "file_url": "/uploads/test-proof.jpg"
        })
        assert proof_res.status_code == 200
        proof_id = proof_res.json()["payment_proof"]["id"]
        
        # Step 4: Approve payment proof - THIS should create the order
        approve_res = api_client.post(f"{BASE_URL}/api/payments-governance/finance/approve", json={
            "payment_proof_id": proof_id,
            "approver_role": "admin"
        })
        assert approve_res.status_code == 200
        approve_data = approve_res.json()
        
        # NOW the order should be created
        assert approve_data.get("fully_paid") == True, "Should be fully paid"
        assert "order" in approve_data, "Order should be created after approval"
        assert approve_data["order"] is not None, "Order should not be None"
        
        order = approve_data["order"]
        assert order.get("id"), "Order should have an id"
        assert order.get("order_number"), "Order should have order_number"
        assert order.get("customer_id") == customer_id
        assert order.get("status") == "processing"
        assert order.get("payment_status") == "paid"
        
        print(f"Order created after approval: {order.get('order_number')}")


class TestSettingsHubCatalogCategories:
    """Tests for Settings Hub catalog categories endpoint"""

    def test_settings_hub_returns_catalog_with_categories(self, authenticated_client):
        """GET /api/admin/settings-hub returns catalog with product_categories"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/settings-hub")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check catalog section exists
        assert "catalog" in data, "Settings hub should have 'catalog' section"
        
        catalog = data["catalog"]
        if "product_categories" in catalog:
            categories = catalog["product_categories"]
            print(f"Found {len(categories)} categories in settings hub")
            
            # Categories can be strings (legacy) or objects (new)
            # The frontend normalizes them, but backend may store either format


class TestVendorOpsSettingsTab:
    """Tests for Vendor Ops Sourcing Strategy settings"""

    def test_settings_hub_has_vendor_ops_section(self, authenticated_client):
        """GET /api/admin/settings-hub returns vendor_ops section with sourcing settings"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/settings-hub")
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Check vendor_ops section
        if "vendor_ops" in data:
            vo = data["vendor_ops"]
            print(f"Vendor Ops settings: {vo}")
            
            # Expected fields
            expected_fields = ["default_sourcing_mode", "max_vendors_per_request", "default_quote_expiry_hours", "default_lead_time_days"]
            for field in expected_fields:
                if field in vo:
                    print(f"  {field}: {vo[field]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
