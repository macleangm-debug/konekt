"""
Konekt Quote → Order → Invoice → PDF Export Workflow Tests
Tests for the new v2 routes for quotes and invoices with PDF export functionality.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

# ============== COMPANY SETTINGS TESTS ==============

class TestCompanySettings:
    """Company settings endpoint tests for branding"""
    
    def test_get_company_settings(self, api_client):
        """GET /api/admin/settings/company returns settings"""
        response = api_client.get(f"{BASE_URL}/api/admin/settings/company")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "company_name" in data
        assert "currency" in data
        print(f"✓ Company settings retrieved: {data.get('company_name')}")
    
    def test_update_company_settings(self, api_client):
        """PUT /api/admin/settings/company saves branding details"""
        test_suffix = uuid.uuid4().hex[:6]
        payload = {
            "company_name": f"TEST Company {test_suffix}",
            "logo_url": "https://example.com/logo.png",
            "email": f"test_{test_suffix}@example.com",
            "phone": "+255 123 456 789",
            "website": "www.testcompany.com",
            "address_line_1": "123 Test Street",
            "address_line_2": "Suite 100",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "tax_number": "TIN-TEST-123",
            "currency": "TZS",
            "bank_name": "Test Bank",
            "bank_account_name": "Test Account",
            "bank_account_number": "1234567890",
            "bank_branch": "Main Branch",
            "swift_code": "TESTBANK",
            "payment_instructions": "Pay via bank transfer",
            "invoice_terms": "Payment due in 30 days",
            "quote_terms": "Valid for 14 days"
        }
        
        response = api_client.put(f"{BASE_URL}/api/admin/settings/company", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["company_name"] == payload["company_name"]
        assert data["email"] == payload["email"]
        assert data["currency"] == payload["currency"]
        print(f"✓ Company settings updated: {data.get('company_name')}")
        
        # Restore original settings
        restore_payload = {
            "company_name": "Konekt Limited",
            "logo_url": "",
            "email": "info@konekt.co.tz",
            "phone": "+255 (0) 22 123 4567",
            "website": "www.konekt.co.tz",
            "address_line_1": "Plot 123, Ali Hassan Mwinyi Road",
            "address_line_2": "Upanga",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "tax_number": "TIN-123456789",
            "currency": "TZS",
            "bank_name": "CRDB Bank",
            "bank_account_name": "Konekt Limited",
            "bank_account_number": "0150123456789",
            "bank_branch": "Samora Branch",
            "swift_code": "",
            "payment_instructions": "Bank Transfer to CRDB Bank or Mobile Money via M-Pesa: +255 123 456 789",
            "invoice_terms": "Payment due within 14 days. Late payments subject to 2% monthly interest.",
            "quote_terms": "Quote valid for 30 days. Prices subject to change without notice."
        }
        api_client.put(f"{BASE_URL}/api/admin/settings/company", json=restore_payload)


# ============== QUOTES V2 TESTS ==============

class TestQuotesV2:
    """Quotes V2 API tests (/api/admin/quotes-v2)"""
    
    def test_create_quote(self, api_client):
        """POST /api/admin/quotes-v2 creates new quote with line items"""
        test_suffix = uuid.uuid4().hex[:6]
        payload = {
            "customer_name": f"TEST Quote Customer {test_suffix}",
            "customer_email": f"quote_{test_suffix}@example.com",
            "customer_company": "TEST Quote Corp",
            "customer_phone": "+255 111 222 333",
            "currency": "TZS",
            "line_items": [
                {"description": "Design Service A", "quantity": 2, "unit_price": 50000.0, "total": 100000.0},
                {"description": "Design Service B", "quantity": 1, "unit_price": 75000.0, "total": 75000.0}
            ],
            "subtotal": 175000.0,
            "tax": 31500.0,
            "discount": 5000.0,
            "total": 201500.0,
            "notes": "Test quote for workflow",
            "terms": "Payment within 14 days",
            "status": "draft"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "quote_number" in data
        assert data["quote_number"].startswith("QTN-")
        assert data["customer_name"] == payload["customer_name"]
        assert len(data["line_items"]) == 2
        assert data["total"] == payload["total"]
        print(f"✓ Quote created: {data['quote_number']}")
        
        return data["id"]
    
    def test_list_quotes(self, api_client):
        """GET /api/admin/quotes-v2 lists all quotes"""
        response = api_client.get(f"{BASE_URL}/api/admin/quotes-v2")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} quotes")
    
    def test_get_quote_by_id(self, api_client):
        """GET /api/admin/quotes-v2/{id} returns specific quote"""
        # First create a quote
        test_suffix = uuid.uuid4().hex[:6]
        create_payload = {
            "customer_name": f"TEST GetQuote {test_suffix}",
            "customer_email": f"getquote_{test_suffix}@example.com",
            "currency": "TZS",
            "line_items": [{"description": "Test Item", "quantity": 1, "unit_price": 10000.0, "total": 10000.0}],
            "subtotal": 10000.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 10000.0,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=create_payload)
        assert create_response.status_code == 200
        quote_id = create_response.json()["id"]
        
        # Get by ID
        response = api_client.get(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == quote_id
        print(f"✓ Retrieved quote: {data['quote_number']}")
    
    def test_update_quote_status(self, api_client):
        """PATCH /api/admin/quotes-v2/{id}/status updates quote status"""
        # First create a quote
        test_suffix = uuid.uuid4().hex[:6]
        create_payload = {
            "customer_name": f"TEST StatusQuote {test_suffix}",
            "customer_email": f"statusquote_{test_suffix}@example.com",
            "currency": "TZS",
            "line_items": [{"description": "Test Item", "quantity": 1, "unit_price": 10000.0, "total": 10000.0}],
            "subtotal": 10000.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 10000.0,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=create_payload)
        assert create_response.status_code == 200
        quote_id = create_response.json()["id"]
        
        # Update status to 'sent'
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status", params={"status": "sent"})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "sent"
        print(f"✓ Quote status updated to: {data['status']}")
        
        # Update to 'approved'
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status", params={"status": "approved"})
        assert response.status_code == 200
        assert response.json()["status"] == "approved"
        print("✓ Quote status updated to: approved")
    
    def test_filter_quotes_by_status(self, api_client):
        """GET /api/admin/quotes-v2?status=draft filters quotes"""
        response = api_client.get(f"{BASE_URL}/api/admin/quotes-v2", params={"status": "draft"})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        for quote in data:
            assert quote["status"] == "draft", f"Expected draft status, got {quote['status']}"
        print(f"✓ Filtered {len(data)} draft quotes")


# ============== QUOTE TO ORDER CONVERSION TEST ==============

class TestQuoteToOrderConversion:
    """Quote to Order conversion tests"""
    
    def test_convert_quote_to_order(self, api_client):
        """POST /api/admin/quotes-v2/convert-to-order converts quote to order"""
        # Create a quote
        test_suffix = uuid.uuid4().hex[:6]
        quote_payload = {
            "customer_name": f"TEST ConvertOrder {test_suffix}",
            "customer_email": f"convertorder_{test_suffix}@example.com",
            "customer_company": "Test Order Corp",
            "currency": "TZS",
            "line_items": [
                {"description": "Product A", "quantity": 3, "unit_price": 25000.0, "total": 75000.0}
            ],
            "subtotal": 75000.0,
            "tax": 13500.0,
            "discount": 0.0,
            "total": 88500.0,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        assert create_response.status_code == 200
        quote_id = create_response.json()["id"]
        quote_number = create_response.json()["quote_number"]
        
        # Convert to order
        convert_payload = {"quote_id": quote_id}
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2/convert-to-order", json=convert_payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        order_data = response.json()
        assert "id" in order_data
        assert "order_number" in order_data
        assert order_data["order_number"].startswith("ORD-")
        assert order_data["quote_id"] == quote_id
        assert order_data["customer_name"] == quote_payload["customer_name"]
        print(f"✓ Quote {quote_number} converted to Order: {order_data['order_number']}")
        
        # Verify quote status changed to 'converted'
        quote_response = api_client.get(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}")
        assert quote_response.status_code == 200
        assert quote_response.json()["status"] == "converted"
        print("✓ Quote status updated to 'converted'")
        
        return order_data["id"]
    
    def test_cannot_convert_already_converted_quote(self, api_client):
        """Convert attempt on already converted quote returns 400"""
        # Create and convert a quote
        test_suffix = uuid.uuid4().hex[:6]
        quote_payload = {
            "customer_name": f"TEST DupeConvert {test_suffix}",
            "customer_email": f"dupeconvert_{test_suffix}@example.com",
            "currency": "TZS",
            "line_items": [{"description": "Item", "quantity": 1, "unit_price": 1000.0, "total": 1000.0}],
            "subtotal": 1000.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 1000.0,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        quote_id = create_response.json()["id"]
        
        # First conversion - should succeed
        api_client.post(f"{BASE_URL}/api/admin/quotes-v2/convert-to-order", json={"quote_id": quote_id})
        
        # Second conversion - should fail
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2/convert-to-order", json={"quote_id": quote_id})
        assert response.status_code == 400
        assert "already converted" in response.json().get("detail", "").lower()
        print("✓ Duplicate conversion correctly rejected")


# ============== QUOTE TO INVOICE DIRECT CONVERSION TEST ==============

class TestQuoteToInvoiceConversion:
    """Quote to Invoice direct conversion tests"""
    
    def test_convert_quote_to_invoice_direct(self, api_client):
        """POST /api/admin/quotes-v2/{id}/convert-to-invoice converts quote directly to invoice"""
        # Create a quote
        test_suffix = uuid.uuid4().hex[:6]
        quote_payload = {
            "customer_name": f"TEST ConvertInvoice {test_suffix}",
            "customer_email": f"convertinv_{test_suffix}@example.com",
            "customer_company": "Test Invoice Corp",
            "currency": "TZS",
            "line_items": [
                {"description": "Service Package", "quantity": 1, "unit_price": 150000.0, "total": 150000.0}
            ],
            "subtotal": 150000.0,
            "tax": 27000.0,
            "discount": 0.0,
            "total": 177000.0,
            "notes": "Direct invoice conversion",
            "terms": "Net 30",
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        assert create_response.status_code == 200
        quote_id = create_response.json()["id"]
        quote_number = create_response.json()["quote_number"]
        
        # Convert directly to invoice
        response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/convert-to-invoice")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        invoice_data = response.json()
        assert "id" in invoice_data
        assert "invoice_number" in invoice_data
        assert invoice_data["invoice_number"].startswith("INV-")
        assert invoice_data["quote_id"] == quote_id
        assert invoice_data["customer_name"] == quote_payload["customer_name"]
        assert invoice_data["total"] == quote_payload["total"]
        print(f"✓ Quote {quote_number} converted directly to Invoice: {invoice_data['invoice_number']}")
        
        # Verify quote status changed to 'converted'
        quote_response = api_client.get(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}")
        assert quote_response.status_code == 200
        assert quote_response.json()["status"] == "converted"
        print("✓ Quote status updated to 'converted'")
        
        return invoice_data["id"]


# ============== INVOICES V2 TESTS ==============

class TestInvoicesV2:
    """Invoices V2 API tests (/api/admin/invoices-v2)"""
    
    def test_create_invoice(self, api_client):
        """POST /api/admin/invoices-v2 creates new invoice"""
        test_suffix = uuid.uuid4().hex[:6]
        payload = {
            "customer_name": f"TEST Invoice Customer {test_suffix}",
            "customer_email": f"invoice_{test_suffix}@example.com",
            "customer_company": "TEST Invoice Corp",
            "customer_phone": "+255 444 555 666",
            "currency": "TZS",
            "line_items": [
                {"description": "Logo Design", "quantity": 1, "unit_price": 300000.0, "total": 300000.0},
                {"description": "Business Cards (500 pcs)", "quantity": 1, "unit_price": 100000.0, "total": 100000.0}
            ],
            "subtotal": 400000.0,
            "tax": 72000.0,
            "discount": 20000.0,
            "total": 452000.0,
            "notes": "Priority order",
            "terms": "Payment due in 14 days",
            "status": "draft"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "invoice_number" in data
        assert data["invoice_number"].startswith("INV-")
        assert data["customer_name"] == payload["customer_name"]
        assert len(data["line_items"]) == 2
        assert data["total"] == payload["total"]
        assert data["amount_paid"] == 0
        assert data["payments"] == []
        print(f"✓ Invoice created: {data['invoice_number']}")
        
        return data["id"]
    
    def test_list_invoices(self, api_client):
        """GET /api/admin/invoices-v2 lists all invoices"""
        response = api_client.get(f"{BASE_URL}/api/admin/invoices-v2")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} invoices")
    
    def test_get_invoice_by_id(self, api_client):
        """GET /api/admin/invoices-v2/{id} returns specific invoice"""
        # First create an invoice
        test_suffix = uuid.uuid4().hex[:6]
        create_payload = {
            "customer_name": f"TEST GetInvoice {test_suffix}",
            "customer_email": f"getinv_{test_suffix}@example.com",
            "currency": "TZS",
            "line_items": [{"description": "Test Item", "quantity": 1, "unit_price": 10000.0, "total": 10000.0}],
            "subtotal": 10000.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 10000.0,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2", json=create_payload)
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Get by ID
        response = api_client.get(f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == invoice_id
        print(f"✓ Retrieved invoice: {data['invoice_number']}")
    
    def test_update_invoice_status(self, api_client):
        """PATCH /api/admin/invoices-v2/{id}/status updates invoice status"""
        # First create an invoice
        test_suffix = uuid.uuid4().hex[:6]
        create_payload = {
            "customer_name": f"TEST StatusInvoice {test_suffix}",
            "customer_email": f"statusinv_{test_suffix}@example.com",
            "currency": "TZS",
            "line_items": [{"description": "Test Item", "quantity": 1, "unit_price": 10000.0, "total": 10000.0}],
            "subtotal": 10000.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 10000.0,
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2", json=create_payload)
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Update status to 'sent'
        response = api_client.patch(f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}/status", params={"status": "sent"})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "sent"
        print(f"✓ Invoice status updated to: {data['status']}")
    
    def test_add_payment_to_invoice(self, api_client):
        """POST /api/admin/invoices-v2/{id}/payments adds payment to invoice"""
        # Create an invoice
        test_suffix = uuid.uuid4().hex[:6]
        create_payload = {
            "customer_name": f"TEST PaymentInvoice {test_suffix}",
            "customer_email": f"payinv_{test_suffix}@example.com",
            "currency": "TZS",
            "line_items": [{"description": "Service", "quantity": 1, "unit_price": 100000.0, "total": 100000.0}],
            "subtotal": 100000.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 100000.0,
            "status": "sent"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2", json=create_payload)
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Add partial payment
        payment_payload = {
            "amount": 50000.0,
            "method": "bank_transfer",
            "reference": "TXN-123456",
            "notes": "Partial payment"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}/payments", json=payment_payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["amount_paid"] == 50000.0
        assert len(data["payments"]) == 1
        assert data["status"] == "partially_paid"
        print(f"✓ Payment added: {payment_payload['amount']} - Status: {data['status']}")
    
    def test_full_payment_marks_invoice_paid(self, api_client):
        """Full payment automatically changes invoice status to 'paid'"""
        # Create an invoice
        test_suffix = uuid.uuid4().hex[:6]
        create_payload = {
            "customer_name": f"TEST FullPayInvoice {test_suffix}",
            "customer_email": f"fullpay_{test_suffix}@example.com",
            "currency": "TZS",
            "line_items": [{"description": "Service", "quantity": 1, "unit_price": 50000.0, "total": 50000.0}],
            "subtotal": 50000.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 50000.0,
            "status": "sent"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2", json=create_payload)
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        
        # Add full payment
        payment_payload = {
            "amount": 50000.0,
            "method": "mpesa",
            "reference": "MPESA-123",
            "notes": "Full payment"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}/payments", json=payment_payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["amount_paid"] == 50000.0
        assert data["status"] == "paid"
        print(f"✓ Full payment recorded - Status automatically updated to: {data['status']}")


# ============== ORDER TO INVOICE CONVERSION TEST ==============

class TestOrderToInvoiceConversion:
    """Order to Invoice conversion tests"""
    
    def test_convert_order_to_invoice(self, api_client):
        """POST /api/admin/invoices-v2/convert-from-order converts order to invoice"""
        # First create a quote and convert to order
        test_suffix = uuid.uuid4().hex[:6]
        quote_payload = {
            "customer_name": f"TEST OrderToInv {test_suffix}",
            "customer_email": f"ordertoinv_{test_suffix}@example.com",
            "customer_company": "Test Corp",
            "currency": "TZS",
            "line_items": [
                {"description": "Product X", "quantity": 2, "unit_price": 40000.0, "total": 80000.0}
            ],
            "subtotal": 80000.0,
            "tax": 14400.0,
            "discount": 0.0,
            "total": 94400.0,
            "status": "draft"
        }
        
        create_quote = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        assert create_quote.status_code == 200
        quote_id = create_quote.json()["id"]
        
        # Convert quote to order
        order_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2/convert-to-order", json={"quote_id": quote_id})
        assert order_response.status_code == 200
        order_id = order_response.json()["id"]
        order_number = order_response.json()["order_number"]
        
        # Convert order to invoice
        convert_payload = {"order_id": order_id}
        response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2/convert-from-order", json=convert_payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        invoice_data = response.json()
        assert "id" in invoice_data
        assert "invoice_number" in invoice_data
        assert invoice_data["invoice_number"].startswith("INV-")
        assert invoice_data["order_id"] == order_id
        assert invoice_data["customer_name"] == quote_payload["customer_name"]
        print(f"✓ Order {order_number} converted to Invoice: {invoice_data['invoice_number']}")
        
        return invoice_data["id"]


# ============== PDF EXPORT TESTS ==============

class TestPDFExport:
    """PDF Export tests"""
    
    def test_export_quote_pdf(self, api_client):
        """GET /api/admin/pdf/quote/{id} exports quote as PDF"""
        # First create a quote
        test_suffix = uuid.uuid4().hex[:6]
        quote_payload = {
            "customer_name": f"TEST PDF Quote {test_suffix}",
            "customer_email": f"pdfquote_{test_suffix}@example.com",
            "customer_company": "PDF Test Corp",
            "currency": "TZS",
            "line_items": [
                {"description": "Design Service", "quantity": 1, "unit_price": 200000.0, "total": 200000.0}
            ],
            "subtotal": 200000.0,
            "tax": 36000.0,
            "discount": 0.0,
            "total": 236000.0,
            "notes": "PDF export test",
            "terms": "Valid for 30 days",
            "status": "draft"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        assert create_response.status_code == 200
        quote_id = create_response.json()["id"]
        quote_number = create_response.json()["quote_number"]
        
        # Export as PDF
        response = api_client.get(f"{BASE_URL}/api/admin/pdf/quote/{quote_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
        print(f"✓ Quote PDF exported: {quote_number} (Size: {len(response.content)} bytes)")
    
    def test_export_invoice_pdf(self, api_client):
        """GET /api/admin/pdf/invoice/{id} exports invoice as PDF"""
        # First create an invoice
        test_suffix = uuid.uuid4().hex[:6]
        invoice_payload = {
            "customer_name": f"TEST PDF Invoice {test_suffix}",
            "customer_email": f"pdfinv_{test_suffix}@example.com",
            "customer_company": "PDF Test Corp",
            "currency": "TZS",
            "line_items": [
                {"description": "Completed Project", "quantity": 1, "unit_price": 500000.0, "total": 500000.0}
            ],
            "subtotal": 500000.0,
            "tax": 90000.0,
            "discount": 0.0,
            "total": 590000.0,
            "notes": "Invoice PDF export test",
            "terms": "Payment due in 14 days",
            "status": "sent"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2", json=invoice_payload)
        assert create_response.status_code == 200
        invoice_id = create_response.json()["id"]
        invoice_number = create_response.json()["invoice_number"]
        
        # Export as PDF
        response = api_client.get(f"{BASE_URL}/api/admin/pdf/invoice/{invoice_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
        print(f"✓ Invoice PDF exported: {invoice_number} (Size: {len(response.content)} bytes)")
    
    def test_pdf_export_not_found(self, api_client):
        """PDF export returns 404 for non-existent document"""
        fake_id = "000000000000000000000000"
        
        quote_response = api_client.get(f"{BASE_URL}/api/admin/pdf/quote/{fake_id}")
        assert quote_response.status_code == 404
        
        invoice_response = api_client.get(f"{BASE_URL}/api/admin/pdf/invoice/{fake_id}")
        assert invoice_response.status_code == 404
        print("✓ PDF export correctly returns 404 for non-existent documents")


# ============== FULL WORKFLOW E2E TEST ==============

class TestFullWorkflow:
    """End-to-end workflow test: Quote → Order → Invoice → PDF"""
    
    def test_complete_workflow(self, api_client):
        """Test complete Quote → Order → Invoice → PDF workflow"""
        test_suffix = uuid.uuid4().hex[:6]
        
        # Step 1: Create a Quote
        print("\n=== Step 1: Create Quote ===")
        quote_payload = {
            "customer_name": f"TEST E2E Workflow {test_suffix}",
            "customer_email": f"e2e_{test_suffix}@example.com",
            "customer_company": "E2E Test Corporation",
            "customer_phone": "+255 777 888 999",
            "currency": "TZS",
            "line_items": [
                {"description": "Branding Package", "quantity": 1, "unit_price": 500000.0, "total": 500000.0},
                {"description": "Website Design", "quantity": 1, "unit_price": 800000.0, "total": 800000.0}
            ],
            "subtotal": 1300000.0,
            "tax": 234000.0,
            "discount": 50000.0,
            "total": 1484000.0,
            "notes": "Complete branding and web solution",
            "terms": "50% upfront, 50% on completion",
            "status": "draft"
        }
        
        quote_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        assert quote_response.status_code == 200
        quote_data = quote_response.json()
        quote_id = quote_data["id"]
        print(f"✓ Quote created: {quote_data['quote_number']}")
        
        # Step 2: Update quote status to approved
        print("\n=== Step 2: Approve Quote ===")
        status_response = api_client.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status", params={"status": "approved"})
        assert status_response.status_code == 200
        print("✓ Quote status updated to: approved")
        
        # Step 3: Export Quote PDF
        print("\n=== Step 3: Export Quote PDF ===")
        pdf_response = api_client.get(f"{BASE_URL}/api/admin/pdf/quote/{quote_id}")
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        print(f"✓ Quote PDF generated ({len(pdf_response.content)} bytes)")
        
        # Step 4: Convert Quote to Order
        print("\n=== Step 4: Convert Quote to Order ===")
        order_response = api_client.post(f"{BASE_URL}/api/admin/quotes-v2/convert-to-order", json={"quote_id": quote_id})
        assert order_response.status_code == 200
        order_data = order_response.json()
        order_id = order_data["id"]
        print(f"✓ Order created: {order_data['order_number']}")
        
        # Verify quote status is now 'converted'
        quote_check = api_client.get(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}")
        assert quote_check.json()["status"] == "converted"
        print("✓ Quote status verified as 'converted'")
        
        # Step 5: Convert Order to Invoice
        print("\n=== Step 5: Convert Order to Invoice ===")
        invoice_response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2/convert-from-order", json={"order_id": order_id})
        assert invoice_response.status_code == 200
        invoice_data = invoice_response.json()
        invoice_id = invoice_data["id"]
        print(f"✓ Invoice created: {invoice_data['invoice_number']}")
        
        # Step 6: Export Invoice PDF
        print("\n=== Step 6: Export Invoice PDF ===")
        invoice_pdf_response = api_client.get(f"{BASE_URL}/api/admin/pdf/invoice/{invoice_id}")
        assert invoice_pdf_response.status_code == 200
        assert invoice_pdf_response.headers.get("content-type") == "application/pdf"
        print(f"✓ Invoice PDF generated ({len(invoice_pdf_response.content)} bytes)")
        
        # Step 7: Add payment to invoice
        print("\n=== Step 7: Record Payment ===")
        payment_payload = {
            "amount": 742000.0,  # 50% upfront
            "method": "bank_transfer",
            "reference": f"PAY-{test_suffix}",
            "notes": "50% upfront payment"
        }
        payment_response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}/payments", json=payment_payload)
        assert payment_response.status_code == 200
        payment_data = payment_response.json()
        assert payment_data["status"] == "partially_paid"
        print(f"✓ Payment recorded: TZS {payment_payload['amount']:,.0f} - Status: {payment_data['status']}")
        
        # Step 8: Final payment
        print("\n=== Step 8: Final Payment ===")
        final_payment = {
            "amount": 742000.0,  # Remaining 50%
            "method": "bank_transfer",
            "reference": f"PAY-FINAL-{test_suffix}",
            "notes": "Final payment on completion"
        }
        final_response = api_client.post(f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}/payments", json=final_payment)
        assert final_response.status_code == 200
        final_data = final_response.json()
        assert final_data["status"] == "paid"
        print(f"✓ Final payment recorded - Invoice Status: {final_data['status']}")
        
        print("\n=== WORKFLOW COMPLETE ===")
        print(f"Quote: {quote_data['quote_number']} → Order: {order_data['order_number']} → Invoice: {invoice_data['invoice_number']} (PAID)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
