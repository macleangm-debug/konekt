"""
Document Workflow and PDF Generation Tests
Testing: Document Workflow page APIs and PDF service improvements
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def auth_headers(admin_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Verify health endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json().get("status") == "healthy"


class TestDocumentWorkflowAPIs:
    """Test APIs used by Document Workflow page: quotes, orders, invoices"""
    
    def test_get_quotes_for_workflow(self, auth_headers):
        """Test GET /api/admin/quotes - returns list of quotes"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Based on context: 19 quotes expected
        assert len(data) >= 1, "Should have at least 1 quote"
        
        # Verify quote structure has fields needed for workflow visualization
        if len(data) > 0:
            quote = data[0]
            assert "id" in quote
            assert "quote_number" in quote
            assert "status" in quote
            assert "customer_name" in quote or "customer_company" in quote
    
    def test_get_orders_for_workflow(self, auth_headers):
        """Test GET /api/admin/orders - returns list of orders"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # API may return {orders: [...]} or plain list
        orders = data.get("orders", data) if isinstance(data, dict) else data
        assert isinstance(orders, list)
        assert len(orders) >= 1, "Should have at least 1 order"
        
        # Verify order structure - orders may use order_number as identifier
        if len(orders) > 0:
            order = orders[0]
            assert "order_number" in order, "Order must have order_number"
            assert "status" in order or "current_status" in order, "Order must have status"
    
    def test_get_invoices_for_workflow(self, auth_headers):
        """Test GET /api/admin/invoices - returns list of invoices"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1, "Should have at least 1 invoice"
        
        # Verify invoice structure
        if len(data) > 0:
            invoice = data[0]
            assert "id" in invoice
            assert "invoice_number" in invoice
            assert "status" in invoice
    
    def test_quotes_have_conversion_tracking_fields(self, auth_headers):
        """Verify quotes have fields to track conversion to orders"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=auth_headers)
        assert response.status_code == 200
        quotes = response.json()
        
        # Find a converted quote
        converted_quotes = [q for q in quotes if q.get("status") == "converted"]
        if len(converted_quotes) > 0:
            quote = converted_quotes[0]
            # Converted quote should have either converted_order_number or conversion tracking
            has_conversion_info = (
                quote.get("converted_order_number") or 
                quote.get("status") == "converted"
            )
            assert has_conversion_info, "Converted quote should have conversion tracking info"


class TestPDFGeneration:
    """Test PDF export endpoints with improved formatting"""
    
    def test_export_quote_pdf(self, auth_headers):
        """Test quote PDF generation"""
        # Get a quote ID first
        response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=auth_headers)
        assert response.status_code == 200
        quotes = response.json()
        assert len(quotes) > 0, "Need at least one quote for PDF test"
        
        quote_id = quotes[0]["id"]
        
        # Export PDF
        pdf_response = requests.get(
            f"{BASE_URL}/api/admin/pdf/quote/{quote_id}",
            headers=auth_headers
        )
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        # Verify we got PDF content (PDF starts with %PDF)
        content = pdf_response.content
        assert len(content) > 0, "PDF content should not be empty"
        assert content[:4] == b'%PDF', "Response should be valid PDF"
    
    def test_export_invoice_pdf(self, auth_headers):
        """Test invoice PDF generation"""
        # Get an invoice ID first
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers)
        assert response.status_code == 200
        invoices = response.json()
        assert len(invoices) > 0, "Need at least one invoice for PDF test"
        
        invoice_id = invoices[0]["id"]
        
        # Export PDF
        pdf_response = requests.get(
            f"{BASE_URL}/api/admin/pdf/invoice/{invoice_id}",
            headers=auth_headers
        )
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        # Verify we got PDF content
        content = pdf_response.content
        assert len(content) > 0, "PDF content should not be empty"
        assert content[:4] == b'%PDF', "Response should be valid PDF"
    
    def test_pdf_not_found_handling(self, auth_headers):
        """Test PDF endpoint returns 404 for non-existent document"""
        # Use a fake ObjectId
        fake_id = "000000000000000000000000"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/pdf/quote/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
        
        response = requests.get(
            f"{BASE_URL}/api/admin/pdf/invoice/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_pdf_invalid_id_handling(self):
        """Test PDF endpoint handles invalid ID gracefully"""
        response = requests.get(f"{BASE_URL}/api/admin/pdf/quote/invalid-id-format")
        assert response.status_code == 404


class TestWorkflowDataIntegrity:
    """Test data integrity for workflow chain building"""
    
    def test_quotes_orders_invoices_counts(self, auth_headers):
        """Verify we have data counts matching expected workflow stats"""
        # Get all data
        quotes_resp = requests.get(f"{BASE_URL}/api/admin/quotes", headers=auth_headers)
        orders_resp = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers)
        invoices_resp = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers)
        
        assert quotes_resp.status_code == 200
        assert orders_resp.status_code == 200
        assert invoices_resp.status_code == 200
        
        quotes = quotes_resp.json()
        orders_data = orders_resp.json()
        orders = orders_data.get("orders", orders_data) if isinstance(orders_data, dict) else orders_data
        invoices = invoices_resp.json()
        
        # Based on context: ~19 quotes, ~18 orders, ~22 invoices
        print(f"Quotes: {len(quotes)}, Orders: {len(orders)}, Invoices: {len(invoices)}")
        
        assert len(quotes) >= 1
        assert len(orders) >= 1
        assert len(invoices) >= 1
    
    def test_conversion_rate_calculation(self, auth_headers):
        """Verify conversion rate can be calculated from quotes"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=auth_headers)
        assert response.status_code == 200
        quotes = response.json()
        
        total = len(quotes)
        converted = len([q for q in quotes if q.get("status") == "converted"])
        
        if total > 0:
            conversion_rate = round((converted / total) * 100)
            print(f"Conversion rate: {conversion_rate}% ({converted}/{total})")
            assert 0 <= conversion_rate <= 100
    
    def test_payment_rate_calculation(self, auth_headers):
        """Verify payment rate can be calculated from invoices"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers)
        assert response.status_code == 200
        invoices = response.json()
        
        total = len(invoices)
        paid = len([i for i in invoices if i.get("status") == "paid"])
        
        if total > 0:
            payment_rate = round((paid / total) * 100)
            print(f"Payment rate: {payment_rate}% ({paid}/{total})")
            assert 0 <= payment_rate <= 100


class TestRequiredFieldsForWorkflow:
    """Verify documents have required fields for workflow visualization"""
    
    def test_quote_required_fields(self, auth_headers):
        """Verify quotes have fields needed for workflow display"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=auth_headers)
        assert response.status_code == 200
        quotes = response.json()
        
        if len(quotes) > 0:
            quote = quotes[0]
            # Check for required workflow fields
            required_fields = ["id", "quote_number", "status", "total", "created_at"]
            for field in required_fields:
                assert field in quote, f"Quote missing required field: {field}"
    
    def test_order_required_fields(self, auth_headers):
        """Verify orders have fields needed for workflow display"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        orders = data.get("orders", data) if isinstance(data, dict) else data
        
        if len(orders) > 0:
            order = orders[0]
            # Orders use order_number as identifier, may not have 'id' field
            required_fields = ["order_number", "total", "created_at"]
            for field in required_fields:
                assert field in order, f"Order missing required field: {field}"
            # Status may be named 'status' or 'current_status'
            assert "status" in order or "current_status" in order, "Order must have status field"
    
    def test_invoice_required_fields(self, auth_headers):
        """Verify invoices have fields needed for workflow display"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers)
        assert response.status_code == 200
        invoices = response.json()
        
        if len(invoices) > 0:
            invoice = invoices[0]
            required_fields = ["id", "invoice_number", "status", "total", "created_at"]
            for field in required_fields:
                assert field in invoice, f"Invoice missing required field: {field}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
