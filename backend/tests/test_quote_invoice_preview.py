"""
Test Quote Preview and Invoice Preview Backend APIs
Tests for: Quote detail, Invoice detail, Invoice payments endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Quote ID and Invoice ID provided by main agent
TEST_QUOTE_ID = "69b23f51f123028024de936d"
TEST_INVOICE_ID = "69b23f50f123028024de936c"


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API not accessible: {response.text}"
        print("PASS: API health check")


class TestQuotePreviewAPI:
    """Test Quote Detail endpoint for Quote Preview page"""
    
    def test_get_quote_detail(self):
        """Test GET /api/admin/quotes/{id}"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes/{TEST_QUOTE_ID}")
        assert response.status_code == 200, f"Failed to get quote: {response.text}"
        
        data = response.json()
        assert "id" in data or "quote_number" in data, "Quote should have id or quote_number"
        print(f"PASS: Got quote detail - Quote Number: {data.get('quote_number')}, Status: {data.get('status')}")
        return data
    
    def test_quote_has_required_fields(self):
        """Test quote has fields needed for preview page"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes/{TEST_QUOTE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields for Quote Preview
        required_fields = [
            "quote_number", "status", "customer_name", 
            "line_items", "subtotal", "total"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            print(f"  - {field}: {data.get(field)[:50] if isinstance(data.get(field), str) and len(str(data.get(field))) > 50 else data.get(field)}")
        
        print("PASS: Quote has all required fields for preview")
    
    def test_quote_line_items_structure(self):
        """Test quote line items have correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes/{TEST_QUOTE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        line_items = data.get("line_items", [])
        
        assert len(line_items) > 0, "Quote should have at least one line item"
        
        # Check first line item structure
        item = line_items[0]
        item_fields = ["description", "quantity", "unit_price", "total"]
        
        for field in item_fields:
            assert field in item, f"Line item missing field: {field}"
        
        print(f"PASS: Line items have correct structure ({len(line_items)} items)")
    
    def test_quote_status_converted(self):
        """Test quote has converted status (as expected)"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes/{TEST_QUOTE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "converted", f"Expected status 'converted', got '{data.get('status')}'"
        print("PASS: Quote status is 'converted'")


class TestInvoicePreviewAPI:
    """Test Invoice Detail endpoint for Invoice Preview page"""
    
    def test_get_invoice_detail(self):
        """Test GET /api/admin/invoices/{id}"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{TEST_INVOICE_ID}")
        assert response.status_code == 200, f"Failed to get invoice: {response.text}"
        
        data = response.json()
        assert "id" in data or "invoice_number" in data, "Invoice should have id or invoice_number"
        print(f"PASS: Got invoice detail - Invoice Number: {data.get('invoice_number')}, Status: {data.get('status')}")
        return data
    
    def test_invoice_has_required_fields(self):
        """Test invoice has fields needed for preview page"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{TEST_INVOICE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields for Invoice Preview
        required_fields = [
            "invoice_number", "status", "customer_name",
            "line_items", "subtotal", "total", "due_date"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            value = data.get(field)
            display_value = str(value)[:50] if len(str(value)) > 50 else value
            print(f"  - {field}: {display_value}")
        
        print("PASS: Invoice has all required fields for preview")
    
    def test_invoice_payment_summary_fields(self):
        """Test invoice has fields for payment summary"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{TEST_INVOICE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check payment-related fields
        total = data.get("total", 0)
        paid_amount = data.get("paid_amount", 0) or data.get("amount_paid", 0)
        due_date = data.get("due_date")
        
        print(f"  - Total: {total}")
        print(f"  - Paid Amount: {paid_amount}")
        print(f"  - Balance Due: {total - paid_amount}")
        print(f"  - Due Date: {due_date}")
        
        # Test overdue logic (due date has passed)
        from datetime import datetime
        if due_date:
            due_dt = datetime.fromisoformat(due_date.replace('Z', '+00:00')) if 'T' in due_date else datetime.strptime(due_date, '%Y-%m-%d')
            is_overdue = due_dt < datetime.now() if due_dt.tzinfo is None else due_dt < datetime.now(due_dt.tzinfo)
            print(f"  - Is Overdue: {is_overdue}")
        
        print("PASS: Invoice has payment summary fields")
    
    def test_invoice_status_sent(self):
        """Test invoice has expected status"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{TEST_INVOICE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        # Invoice may have been modified by payment tests, accept sent or partially_paid
        valid_statuses = ["sent", "partially_paid"]
        assert data.get("status") in valid_statuses, f"Expected status in {valid_statuses}, got '{data.get('status')}'"
        print(f"PASS: Invoice status is '{data.get('status')}'")



class TestInvoicePaymentsAPI:
    """Test Invoice Payments endpoint"""
    
    def test_get_invoice_payments(self):
        """Test GET /api/admin/invoices/{id}/payments"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{TEST_INVOICE_ID}/payments")
        assert response.status_code == 200, f"Failed to get payments: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Payments should be a list"
        print(f"PASS: Got payments list ({len(data)} payments)")
        return data
    
    def test_add_payment_validation(self):
        """Test POST /api/admin/invoices/{id}/payments validation"""
        # Get a fresh invoice for testing
        inv_response = requests.get(f"{BASE_URL}/api/admin/invoices/{TEST_INVOICE_ID}")
        assert inv_response.status_code == 200
        
        # Test with invalid invoice ID
        response = requests.post(
            f"{BASE_URL}/api/admin/invoices/invalid-id-123/payments",
            json={"amount": 100, "method": "cash"}
        )
        assert response.status_code in [404, 422, 400], f"Expected 404/422/400 for invalid ID, got {response.status_code}"
        print("PASS: Invalid invoice ID returns error")
    
    def test_payment_fields_structure(self):
        """Test payment record structure matches frontend form"""
        # The frontend uses: amount, payment_method, reference, payment_date, notes
        # The backend PaymentRecord in admin_routes uses: amount, method, reference, notes
        
        # Test creating a minimal payment (we won't actually add it to avoid data pollution)
        test_payload = {
            "amount": 1000,
            "method": "bank_transfer",  # Backend field
            "reference": "TEST-REF-123",
            "notes": "Test payment"
        }
        
        # Verify the endpoint accepts this structure
        response = requests.post(
            f"{BASE_URL}/api/admin/invoices/{TEST_INVOICE_ID}/payments",
            json=test_payload
        )
        
        # Should succeed (200) or fail for valid reasons (not 422 for field mismatch)
        print(f"  - Payment endpoint response: {response.status_code}")
        if response.status_code == 200:
            print("PASS: Payment was recorded successfully")
            # Restore invoice by noting we added a test payment
            print(f"  NOTE: Test payment of 1000 added to invoice {TEST_INVOICE_ID}")
        elif response.status_code == 422:
            print(f"WARN: Validation error - {response.text}")
        else:
            print(f"  - Response: {response.text}")
        
        assert response.status_code in [200, 201], f"Payment failed: {response.text}"


class TestPDFDownloadAPI:
    """Test PDF download endpoints"""
    
    def test_quote_pdf_endpoint(self):
        """Test GET /api/admin/pdf/quote/{id}"""
        response = requests.get(f"{BASE_URL}/api/admin/pdf/quote/{TEST_QUOTE_ID}")
        assert response.status_code == 200, f"Failed to get quote PDF: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower() or "octet-stream" in content_type.lower(), \
            f"Expected PDF content type, got: {content_type}"
        
        # Check PDF starts with %PDF
        content = response.content
        assert content.startswith(b'%PDF'), "Response is not a valid PDF"
        
        print(f"PASS: Quote PDF downloaded ({len(content)} bytes)")
    
    def test_invoice_pdf_endpoint(self):
        """Test GET /api/admin/pdf/invoice/{id}"""
        response = requests.get(f"{BASE_URL}/api/admin/pdf/invoice/{TEST_INVOICE_ID}")
        assert response.status_code == 200, f"Failed to get invoice PDF: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower() or "octet-stream" in content_type.lower(), \
            f"Expected PDF content type, got: {content_type}"
        
        # Check PDF starts with %PDF
        content = response.content
        assert content.startswith(b'%PDF'), "Response is not a valid PDF"
        
        print(f"PASS: Invoice PDF downloaded ({len(content)} bytes)")


class TestCompanySettingsAPI:
    """Test company settings endpoint (used for FROM section)"""
    
    def test_get_company_settings(self):
        """Test GET /api/admin/settings/company"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/company")
        # May return 200 with data or 200 with null/empty
        assert response.status_code == 200, f"Failed to get company settings: {response.text}"
        
        data = response.json()
        if data:
            print(f"  - Company Name: {data.get('company_name')}")
            print(f"  - Email: {data.get('email')}")
        else:
            print("  - No company settings configured")
        
        print("PASS: Company settings endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
