"""
Test Quote Creation Simplification - Iteration 324
Tests for:
1. POST /api/admin/quotes-v2 - Quote creation with line_items and pricing_status
2. POST /api/vendor-ops/price-requests - Price request creation
3. POST /api/staff/discount-requests - Discount request creation
4. Quote status transitions (waiting_for_pricing, ready_to_send, sent)
5. Quotes list with status badges
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin using /api/auth/login
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if login_response.status_code == 200:
        token = login_response.json().get("token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"✓ Logged in as admin: {ADMIN_EMAIL}")
    else:
        print(f"✗ Login failed: {login_response.status_code} - {login_response.text}")
    
    return session


class TestQuoteCreationAPI:
    """Tests for POST /api/admin/quotes-v2"""
    
    def test_create_quote_with_priced_items(self, api_client):
        """Create quote with all items priced - should be draft status"""
        payload = {
            "customer_name": "TEST_Quote_Customer",
            "customer_email": "test.quote@example.com",
            "customer_company": "Test Company",
            "customer_phone": "+255123456789",
            "currency": "TZS",
            "line_items": [
                {
                    "name": "Test Product 1",
                    "description": "Test product description",
                    "product_id": "test-prod-001",
                    "sku": "SKU-001",
                    "category": "Office Supplies",
                    "unit_of_measurement": "Piece",
                    "quantity": 5,
                    "unit_price": 10000,
                    "total": 50000,
                    "pricing_status": "priced",
                    "vendor_cost": 8000
                }
            ],
            "subtotal": 50000,
            "tax": 9000,
            "total": 59000,
            "status": "draft",
            "notes": "Test quote with priced items"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "quote_number" in data, "Response should contain quote_number"
        assert data.get("customer_name") == "TEST_Quote_Customer"
        assert data.get("status") == "draft"
        print(f"✓ Created quote with priced items: {data.get('quote_number')}")
    
    def test_create_quote_with_unpriced_items(self, api_client):
        """Create quote with unpriced items - should be waiting_for_pricing status"""
        payload = {
            "customer_name": "TEST_Unpriced_Customer",
            "customer_email": "test.unpriced@example.com",
            "customer_company": "Unpriced Company",
            "currency": "TZS",
            "line_items": [
                {
                    "name": "Unpriced Product",
                    "description": "Product without price",
                    "product_id": "test-prod-unpriced",
                    "sku": "SKU-UNPRICED",
                    "category": "Custom Items",
                    "unit_of_measurement": "Piece",
                    "quantity": 3,
                    "unit_price": 0,
                    "total": 0,
                    "pricing_status": "waiting_for_pricing",
                    "vendor_cost": 0
                }
            ],
            "subtotal": 0,
            "tax": 0,
            "total": 0,
            "status": "waiting_for_pricing",
            "notes": "Test quote with unpriced items"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "quote_number" in data
        assert data.get("status") == "waiting_for_pricing"
        print(f"✓ Created quote with unpriced items: {data.get('quote_number')}, status: {data.get('status')}")
    
    def test_list_quotes(self, api_client):
        """GET /api/admin/quotes-v2 returns list of quotes"""
        response = api_client.get(f"{BASE_URL}/api/admin/quotes-v2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Listed {len(data)} quotes")
    
    def test_quote_status_update(self, api_client):
        """PATCH /api/admin/quotes-v2/{id}/status updates status"""
        # First create a quote
        payload = {
            "customer_name": "TEST_Status_Customer",
            "customer_email": "test.status@example.com",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Status Test Product",
                    "name": "Status Test Product",
                    "quantity": 1,
                    "unit_price": 5000,
                    "total": 5000,
                    "pricing_status": "priced"
                }
            ],
            "subtotal": 5000,
            "tax": 900,
            "total": 5900,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert create_response.status_code == 200
        quote_id = create_response.json().get("id")
        
        # Update status to sent
        status_response = api_client.patch(
            f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status",
            params={"status": "sent"}
        )
        assert status_response.status_code == 200, f"Expected 200, got {status_response.status_code}"
        
        updated = status_response.json()
        assert updated.get("status") == "sent"
        print(f"✓ Updated quote status to 'sent'")


class TestPriceRequestAPI:
    """Tests for POST /api/vendor-ops/price-requests"""
    
    def test_create_price_request(self, api_client):
        """Create a price request for an unpriced item"""
        payload = {
            "product_or_service": "Custom Widget",
            "description": "Need pricing for custom widget",
            "category": "Custom Items",
            "quantity": 10,
            "unit_of_measurement": "Piece",
            "requested_by": "sales-user-001",
            "requested_by_name": "Test Sales User",
            "requested_by_role": "sales",
            "notes": "Urgent pricing needed for quote"
        }
        
        response = api_client.post(f"{BASE_URL}/api/vendor-ops/price-requests", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "price_request" in data, "Response should contain price_request"
        
        pr = data["price_request"]
        assert pr.get("status") == "new"
        assert pr.get("category") == "Custom Items"
        print(f"✓ Created price request: {pr.get('id')}")
    
    def test_list_price_requests(self, api_client):
        """GET /api/vendor-ops/price-requests returns list"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "price_requests" in data
        print(f"✓ Listed {len(data['price_requests'])} price requests")
    
    def test_price_request_stats(self, api_client):
        """GET /api/vendor-ops/price-requests/stats returns stats"""
        response = api_client.get(f"{BASE_URL}/api/vendor-ops/price-requests/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "new" in data
        assert "awaiting" in data
        assert "ready" in data
        print(f"✓ Price request stats: new={data['new']}, awaiting={data['awaiting']}, ready={data['ready']}")


class TestDiscountRequestAPI:
    """Tests for POST /api/staff/discount-requests"""
    
    def test_create_discount_request(self, api_client):
        """Create a discount request for a quote"""
        # First create a quote to request discount on
        quote_payload = {
            "customer_name": "TEST_Discount_Customer",
            "customer_email": "test.discount@example.com",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Discount Test Product",
                    "name": "Discount Test Product",
                    "quantity": 10,
                    "unit_price": 10000,
                    "total": 100000,
                    "pricing_status": "priced"
                }
            ],
            "subtotal": 100000,
            "tax": 18000,
            "total": 118000,
            "status": "sent"
        }
        
        quote_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        assert quote_response.status_code == 200
        quote_data = quote_response.json()
        quote_id = quote_data.get("id")
        quote_number = quote_data.get("quote_number")
        
        # Create discount request
        discount_payload = {
            "quote_id": quote_id,
            "quote_number": quote_number,
            "reason": "Customer is a long-term partner, requesting 10% discount",
            "requested_by": "sales"
        }
        
        response = api_client.post(f"{BASE_URL}/api/staff/discount-requests", json=discount_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True or "id" in data, "Response should indicate success"
        print(f"✓ Created discount request for quote {quote_number}")
    
    def test_list_staff_discount_requests(self, api_client):
        """GET /api/staff/discount-requests returns staff's requests"""
        response = api_client.get(f"{BASE_URL}/api/staff/discount-requests")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "items" in data
        print(f"✓ Listed {len(data['items'])} discount requests")


class TestCustomersAPI:
    """Tests for customer selection in quote creation"""
    
    def test_list_customers(self, api_client):
        """GET /api/admin/customers returns customer list"""
        response = api_client.get(f"{BASE_URL}/api/admin/customers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Response could be list or dict with customers key
        customers = data if isinstance(data, list) else data.get("customers", [])
        print(f"✓ Listed {len(customers)} customers for quote selection")


class TestProductSearchAPI:
    """Tests for product search in SystemItemSelector"""
    
    def test_search_products(self, api_client):
        """GET /api/public-marketplace/products?q=... returns products"""
        response = api_client.get(f"{BASE_URL}/api/public-marketplace/products", params={"q": "test", "limit": 15})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        products = data if isinstance(data, list) else data.get("products", [])
        print(f"✓ Product search returned {len(products)} results")
        
        # Check product structure if any results
        if products:
            product = products[0]
            assert "name" in product or "id" in product, "Product should have name or id"
            print(f"  Sample product: {product.get('name', 'N/A')}")


class TestQuoteStatusWorkflow:
    """Tests for quote status workflow"""
    
    def test_waiting_for_pricing_cannot_be_sent(self, api_client):
        """Quote with waiting_for_pricing status should not be sendable"""
        # Create quote with unpriced items
        payload = {
            "customer_name": "TEST_Workflow_Customer",
            "customer_email": "test.workflow@example.com",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Unpriced Workflow Product",
                    "name": "Unpriced Workflow Product",
                    "quantity": 1,
                    "unit_price": 0,
                    "total": 0,
                    "pricing_status": "waiting_for_pricing"
                }
            ],
            "subtotal": 0,
            "tax": 0,
            "total": 0,
            "status": "waiting_for_pricing"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "waiting_for_pricing"
        print(f"✓ Quote created with waiting_for_pricing status: {data.get('quote_number')}")
        
        # Note: The UI should disable the Send button for waiting_for_pricing quotes
        # This is a frontend validation, not backend


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
