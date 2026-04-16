"""
Test Quote Creation Simplification + Source-of-Truth Enforcement (v321)

Features tested:
1. POST /api/admin/quotes-v2 accepts line_items with pricing_status field (priced/waiting_for_pricing)
2. Quote created with waiting_for_pricing items gets status 'waiting_for_pricing'
3. PATCH status transitions: waiting_for_pricing → ready_to_send → sent → approved all work
4. Quote approval auto-generates Invoice + Order (from previous iteration)
5. GET /api/public-marketplace/products?q=... for catalog search
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("konekt_admin_token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def api_client(admin_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


class TestPublicMarketplaceProductSearch:
    """Test catalog search endpoint used by SystemItemSelector"""
    
    def test_search_products_returns_200(self):
        """GET /api/public-marketplace/products?q=... returns 200"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products?q=test&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Product search returns 200")
    
    def test_search_products_returns_array(self):
        """Search results are an array of products"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products?q=test&limit=5")
        assert response.status_code == 200
        data = response.json()
        # Response can be array or object with products key
        products = data if isinstance(data, list) else data.get("products", [])
        assert isinstance(products, list), "Products should be a list"
        print(f"✓ Search returned {len(products)} products")
    
    def test_search_products_have_required_fields(self):
        """Products have fields needed for SystemItemSelector"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products?q=test&limit=5")
        assert response.status_code == 200
        data = response.json()
        products = data if isinstance(data, list) else data.get("products", [])
        
        if len(products) > 0:
            product = products[0]
            # Check for fields used by SystemItemSelector
            assert "id" in product, "Product should have id"
            assert "name" in product, "Product should have name"
            # Price can be selling_price or price
            has_price = "selling_price" in product or "price" in product or "base_price" in product
            assert has_price, "Product should have a price field"
            print(f"✓ Product has required fields: id={product.get('id')}, name={product.get('name')}")
        else:
            print("⚠ No products found to verify fields")


class TestQuoteCreationWithPricingStatus:
    """Test quote creation with pricing_status field"""
    
    def test_create_quote_with_priced_items(self, api_client):
        """Create quote with all items priced - status should be 'draft'"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"TEST_PricedQuote_{unique_id}",
            "customer_email": f"test.priced.{unique_id}@example.com",
            "customer_company": "Test Company",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Test Product 1",
                    "name": "Test Product 1",
                    "product_id": f"prod_{unique_id}_1",
                    "quantity": 2,
                    "unit_price": 50000,
                    "total": 100000,
                    "pricing_status": "priced",
                    "vendor_cost": 40000
                },
                {
                    "description": "Test Product 2",
                    "name": "Test Product 2",
                    "product_id": f"prod_{unique_id}_2",
                    "quantity": 1,
                    "unit_price": 75000,
                    "total": 75000,
                    "pricing_status": "priced",
                    "vendor_cost": 60000
                }
            ],
            "subtotal": 175000,
            "tax": 31500,
            "discount": 0,
            "total": 206500,
            "status": "draft"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data or "quote_number" in data, "Response should have id or quote_number"
        # Status should be draft since all items are priced
        assert data.get("status") == "draft", f"Expected status 'draft', got '{data.get('status')}'"
        print(f"✓ Created quote with priced items: {data.get('quote_number')}, status={data.get('status')}")
        return data
    
    def test_create_quote_with_waiting_for_pricing_items(self, api_client):
        """Create quote with items waiting for pricing - status should be 'waiting_for_pricing'"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"TEST_WaitingQuote_{unique_id}",
            "customer_email": f"test.waiting.{unique_id}@example.com",
            "customer_company": "Test Company",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Test Product Priced",
                    "name": "Test Product Priced",
                    "product_id": f"prod_{unique_id}_1",
                    "quantity": 1,
                    "unit_price": 50000,
                    "total": 50000,
                    "pricing_status": "priced",
                    "vendor_cost": 40000
                },
                {
                    "description": "Test Product Waiting",
                    "name": "Test Product Waiting",
                    "product_id": f"prod_{unique_id}_2",
                    "quantity": 2,
                    "unit_price": 0,
                    "total": 0,
                    "pricing_status": "waiting_for_pricing",
                    "vendor_cost": 0
                }
            ],
            "subtotal": 50000,
            "tax": 9000,
            "discount": 0,
            "total": 59000,
            "status": "waiting_for_pricing"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data or "quote_number" in data, "Response should have id or quote_number"
        # Status should be waiting_for_pricing since some items have no price
        assert data.get("status") == "waiting_for_pricing", f"Expected status 'waiting_for_pricing', got '{data.get('status')}'"
        print(f"✓ Created quote with waiting items: {data.get('quote_number')}, status={data.get('status')}")
        return data


class TestQuoteStatusTransitions:
    """Test quote status transitions"""
    
    @pytest.fixture
    def test_quote(self, api_client):
        """Create a test quote for status transition tests"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"TEST_StatusTransition_{unique_id}",
            "customer_email": f"test.status.{unique_id}@example.com",
            "customer_company": "Test Company",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Test Product",
                    "name": "Test Product",
                    "product_id": f"prod_{unique_id}",
                    "quantity": 1,
                    "unit_price": 100000,
                    "total": 100000,
                    "pricing_status": "priced",
                    "vendor_cost": 80000
                }
            ],
            "subtotal": 100000,
            "tax": 18000,
            "discount": 0,
            "total": 118000,
            "status": "draft"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert response.status_code == 200, f"Failed to create test quote: {response.text}"
        return response.json()
    
    def test_transition_draft_to_ready_to_send(self, api_client, test_quote):
        """Transition from draft to ready_to_send"""
        quote_id = test_quote.get("id")
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=ready_to_send")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ready_to_send", f"Expected 'ready_to_send', got '{data.get('status')}'"
        print(f"✓ Transitioned to ready_to_send: {test_quote.get('quote_number')}")
    
    def test_transition_ready_to_send_to_sent(self, api_client, test_quote):
        """Transition from ready_to_send to sent"""
        quote_id = test_quote.get("id")
        
        # First transition to ready_to_send
        api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=ready_to_send")
        
        # Then transition to sent
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=sent")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "sent", f"Expected 'sent', got '{data.get('status')}'"
        print(f"✓ Transitioned to sent: {test_quote.get('quote_number')}")
    
    def test_transition_sent_to_approved_generates_invoice_order(self, api_client, test_quote):
        """Transition from sent to approved - should auto-generate Invoice + Order"""
        quote_id = test_quote.get("id")
        
        # Transition through the workflow
        api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=ready_to_send")
        api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=sent")
        
        # Approve the quote
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=approved")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "approved", f"Expected 'approved', got '{data.get('status')}'"
        
        # Check for auto-generated Invoice and Order
        has_invoice = "generated_invoice" in data or "converted_invoice_number" in data
        has_order = "generated_order" in data or "converted_order_number" in data
        
        assert has_invoice, f"Expected generated_invoice in response: {data.keys()}"
        assert has_order, f"Expected generated_order in response: {data.keys()}"
        
        invoice_num = data.get("generated_invoice") or data.get("converted_invoice_number")
        order_num = data.get("generated_order") or data.get("converted_order_number")
        print(f"✓ Approved quote auto-generated Invoice: {invoice_num}, Order: {order_num}")
    
    def test_transition_waiting_for_pricing_to_ready_to_send(self, api_client):
        """Transition from waiting_for_pricing to ready_to_send"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create quote with waiting_for_pricing status
        payload = {
            "customer_name": f"TEST_WaitingTransition_{unique_id}",
            "customer_email": f"test.waiting.trans.{unique_id}@example.com",
            "customer_company": "Test Company",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Test Product",
                    "name": "Test Product",
                    "product_id": f"prod_{unique_id}",
                    "quantity": 1,
                    "unit_price": 0,
                    "total": 0,
                    "pricing_status": "waiting_for_pricing",
                    "vendor_cost": 0
                }
            ],
            "subtotal": 0,
            "tax": 0,
            "discount": 0,
            "total": 0,
            "status": "waiting_for_pricing"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert create_response.status_code == 200
        quote = create_response.json()
        quote_id = quote.get("id")
        
        # Transition to ready_to_send (simulating pricing being completed)
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=ready_to_send")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ready_to_send", f"Expected 'ready_to_send', got '{data.get('status')}'"
        print(f"✓ Transitioned from waiting_for_pricing to ready_to_send: {quote.get('quote_number')}")


class TestQuoteStatusValidation:
    """Test quote status validation"""
    
    def test_valid_statuses_accepted(self, api_client):
        """All valid statuses should be accepted"""
        valid_statuses = ["draft", "waiting_for_pricing", "ready_to_send", "sent", "approved", "rejected", "expired", "converted"]
        
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"TEST_ValidStatus_{unique_id}",
            "customer_email": f"test.valid.{unique_id}@example.com",
            "customer_company": "Test Company",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Test Product",
                    "name": "Test Product",
                    "product_id": f"prod_{unique_id}",
                    "quantity": 1,
                    "unit_price": 50000,
                    "total": 50000,
                    "pricing_status": "priced"
                }
            ],
            "subtotal": 50000,
            "tax": 9000,
            "discount": 0,
            "total": 59000,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert create_response.status_code == 200
        quote = create_response.json()
        quote_id = quote.get("id")
        
        # Test a few valid status transitions
        for status in ["ready_to_send", "sent"]:
            response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status={status}")
            assert response.status_code == 200, f"Status '{status}' should be valid: {response.text}"
            print(f"✓ Status '{status}' accepted")
    
    def test_invalid_status_rejected(self, api_client):
        """Invalid status should be rejected with 400"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"TEST_InvalidStatus_{unique_id}",
            "customer_email": f"test.invalid.{unique_id}@example.com",
            "customer_company": "Test Company",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Test Product",
                    "name": "Test Product",
                    "product_id": f"prod_{unique_id}",
                    "quantity": 1,
                    "unit_price": 50000,
                    "total": 50000,
                    "pricing_status": "priced"
                }
            ],
            "subtotal": 50000,
            "tax": 9000,
            "discount": 0,
            "total": 59000,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert create_response.status_code == 200
        quote = create_response.json()
        quote_id = quote.get("id")
        
        # Try invalid status
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=invalid_status")
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print("✓ Invalid status rejected with 400")


class TestQuoteListAndGet:
    """Test quote listing and retrieval"""
    
    def test_list_quotes_returns_200(self, api_client):
        """GET /api/admin/quotes-v2 returns 200"""
        response = api_client.get(f"{BASE_URL}/api/admin/quotes-v2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Listed {len(data)} quotes")
    
    def test_get_quote_by_id(self, api_client):
        """GET /api/admin/quotes-v2/{id} returns quote details"""
        # First create a quote
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"TEST_GetQuote_{unique_id}",
            "customer_email": f"test.get.{unique_id}@example.com",
            "customer_company": "Test Company",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Test Product",
                    "name": "Test Product",
                    "product_id": f"prod_{unique_id}",
                    "quantity": 1,
                    "unit_price": 50000,
                    "total": 50000,
                    "pricing_status": "priced"
                }
            ],
            "subtotal": 50000,
            "tax": 9000,
            "discount": 0,
            "total": 59000,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert create_response.status_code == 200
        quote = create_response.json()
        quote_id = quote.get("id")
        
        # Get the quote
        response = api_client.get(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == quote_id, "Quote ID should match"
        assert data.get("customer_name") == payload["customer_name"], "Customer name should match"
        print(f"✓ Retrieved quote: {data.get('quote_number')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
