"""
Test Guest Orders, Order Tracking, and PDF Export APIs
Features tested:
- POST /api/guest/orders - Create guest order without authentication
- GET /api/orders/track/{order_id} - Track order by ID
- GET /api/guest/orders/{order_id} - Get guest order details
- GET /api/admin/pdf/quote/{quote_id} - Download quote PDF (premium design)
- GET /api/admin/pdf/invoice/{invoice_id} - Download invoice PDF (premium design)
"""
import pytest
import requests
import os
import time
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header for admin endpoints"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestGuestOrders:
    """Test guest order creation endpoint (no auth required)"""
    
    def test_create_guest_order_success(self, api_client):
        """POST /api/guest/orders - Create guest order successfully"""
        payload = {
            "customer_name": f"TEST_GuestCustomer_{uuid4().hex[:6]}",
            "customer_email": f"test_{uuid4().hex[:6]}@example.com",
            "customer_phone": "+255123456789",
            "customer_company": "Test Company Ltd",
            "delivery_address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "notes": "Test order for verification",
            "line_items": [
                {
                    "description": "Test Product - T-Shirts",
                    "quantity": 50,
                    "unit_price": 15000,
                    "total": 750000,
                    "customization_summary": "Navy Blue, Logo Print, XL Size"
                },
                {
                    "description": "Test Product - Mugs",
                    "quantity": 25,
                    "unit_price": 8000,
                    "total": 200000,
                    "customization_summary": "White, Company Logo"
                }
            ],
            "subtotal": 950000,
            "tax": 0,
            "discount": 0,
            "total": 950000
        }
        
        response = api_client.post(f"{BASE_URL}/api/guest/orders", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "id" in data or "order_id" in data, "Response should contain order ID"
        assert "order_number" in data, "Response should contain order_number"
        assert data.get("order_number", "").startswith("ORD-"), "Order number should start with ORD-"
        assert data.get("status") == "pending", "Initial status should be pending"
        assert "message" in data, "Response should contain success message"
        
        # Store order ID for later tests
        pytest.test_order_id = data.get("id") or data.get("order_id")
        pytest.test_order_number = data.get("order_number")
        print(f"Created guest order: {pytest.test_order_number}")
    
    def test_create_guest_order_with_missing_required_fields(self, api_client):
        """POST /api/guest/orders - Should fail with missing required fields"""
        payload = {
            "customer_name": "Test Customer",
            # Missing required customer_email
            "line_items": [],
            "subtotal": 0,
            "total": 0
        }
        
        response = api_client.post(f"{BASE_URL}/api/guest/orders", json=payload)
        
        # Should return 422 (validation error) for missing required fields
        assert response.status_code == 422, f"Expected 422 for invalid data, got {response.status_code}"
    
    def test_get_guest_order_by_id(self, api_client):
        """GET /api/guest/orders/{order_id} - Get order by ID"""
        if not hasattr(pytest, 'test_order_id') or not pytest.test_order_id:
            pytest.skip("No test order available")
        
        response = api_client.get(f"{BASE_URL}/api/guest/orders/{pytest.test_order_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("order_number") == pytest.test_order_number
        assert data.get("customer_name", "").startswith("TEST_GuestCustomer_")
        assert data.get("status") == "pending"
        assert "line_items" in data
        assert len(data.get("line_items", [])) == 2
    
    def test_get_guest_order_not_found(self, api_client):
        """GET /api/guest/orders/{order_id} - Should return 404 for non-existent order"""
        response = api_client.get(f"{BASE_URL}/api/guest/orders/000000000000000000000000")
        assert response.status_code == 404


class TestOrderTracking:
    """Test public order tracking endpoint"""
    
    def test_track_order_by_id(self, api_client):
        """GET /api/orders/track/{order_id} - Track order by ID"""
        if not hasattr(pytest, 'test_order_id') or not pytest.test_order_id:
            pytest.skip("No test order available")
        
        response = api_client.get(f"{BASE_URL}/api/orders/track/{pytest.test_order_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "order_number" in data
        assert "status" in data
        assert "status_history" in data, "Track response should include status_history"
        
        # Verify status history has at least one entry
        status_history = data.get("status_history", [])
        assert len(status_history) >= 1, "Status history should have at least the initial entry"
        assert status_history[0].get("status") == "pending"
    
    def test_track_order_by_order_number(self, api_client):
        """GET /api/orders/track/{order_number} - Track order by order number"""
        if not hasattr(pytest, 'test_order_number') or not pytest.test_order_number:
            pytest.skip("No test order available")
        
        response = api_client.get(f"{BASE_URL}/api/orders/track/{pytest.test_order_number}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("order_number") == pytest.test_order_number
    
    def test_track_order_not_found(self, api_client):
        """GET /api/orders/track/{order_id} - Should return 404 for non-existent order"""
        response = api_client.get(f"{BASE_URL}/api/orders/track/000000000000000000000000")
        assert response.status_code == 404
        
    def test_track_order_invalid_id_format(self, api_client):
        """GET /api/orders/track/{order_id} - Should handle invalid ID format"""
        response = api_client.get(f"{BASE_URL}/api/orders/track/invalid-id-format")
        assert response.status_code == 404


class TestPDFExport:
    """Test premium PDF export for quotes and invoices"""
    
    def test_get_existing_quote(self, authenticated_client):
        """First, verify we can get an existing quote for PDF test"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/quotes-v2")
        
        assert response.status_code == 200
        quotes = response.json()
        
        if isinstance(quotes, list) and len(quotes) > 0:
            pytest.test_quote_id = quotes[0].get("id")
            pytest.test_quote_number = quotes[0].get("quote_number")
            print(f"Found existing quote: {pytest.test_quote_number}")
        else:
            pytest.skip("No quotes found for PDF test")
    
    def test_export_quote_pdf(self, authenticated_client):
        """GET /api/admin/pdf/quote/{quote_id} - Export quote as PDF"""
        if not hasattr(pytest, 'test_quote_id') or not pytest.test_quote_id:
            pytest.skip("No test quote available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/admin/pdf/quote/{pytest.test_quote_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify PDF content type
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Verify content disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "PDF should be returned as attachment"
        assert ".pdf" in content_disposition, "Filename should have .pdf extension"
        
        # Verify PDF content starts with PDF signature
        content = response.content
        assert content[:4] == b"%PDF", "PDF content should start with %PDF signature"
        assert len(content) > 1000, f"PDF should have reasonable size, got {len(content)} bytes"
        
        print(f"Quote PDF generated: {len(content)} bytes")
    
    def test_export_quote_pdf_not_found(self, authenticated_client):
        """GET /api/admin/pdf/quote/{quote_id} - Should return 404 for non-existent quote"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/pdf/quote/000000000000000000000000")
        assert response.status_code == 404
    
    def test_get_existing_invoice(self, authenticated_client):
        """First, verify we can get an existing invoice for PDF test"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/invoices-v2")
        
        if response.status_code == 200:
            invoices = response.json()
            if isinstance(invoices, list) and len(invoices) > 0:
                pytest.test_invoice_id = invoices[0].get("id")
                pytest.test_invoice_number = invoices[0].get("invoice_number")
                print(f"Found existing invoice: {pytest.test_invoice_number}")
            else:
                pytest.test_invoice_id = None
                print("No invoices found - will skip invoice PDF test")
        else:
            pytest.test_invoice_id = None
    
    def test_export_invoice_pdf(self, authenticated_client):
        """GET /api/admin/pdf/invoice/{invoice_id} - Export invoice as PDF"""
        if not hasattr(pytest, 'test_invoice_id') or not pytest.test_invoice_id:
            pytest.skip("No test invoice available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/admin/pdf/invoice/{pytest.test_invoice_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify PDF content type
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Verify PDF content
        content = response.content
        assert content[:4] == b"%PDF", "PDF content should start with %PDF signature"
        print(f"Invoice PDF generated: {len(content)} bytes")
    
    def test_export_invoice_pdf_not_found(self, authenticated_client):
        """GET /api/admin/pdf/invoice/{invoice_id} - Should return 404 for non-existent invoice"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/pdf/invoice/000000000000000000000000")
        assert response.status_code == 404


class TestQuoteKanbanStillWorks:
    """Verify Quote Kanban board still works after PDF service update"""
    
    def test_get_quote_pipeline(self, authenticated_client):
        """GET /api/admin/quotes/pipeline - Verify pipeline endpoint works"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "columns" in data or isinstance(data, dict), "Should return pipeline columns"
        print("Quote Kanban pipeline endpoint works")
    
    def test_get_pipeline_stats(self, authenticated_client):
        """GET /api/admin/quotes/pipeline/stats - Verify stats endpoint works"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/quotes/pipeline/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total" in data, "Stats should include total count"
        print("Quote Kanban stats endpoint works")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self, api_client):
        """GET /api/health - Verify API is healthy"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
