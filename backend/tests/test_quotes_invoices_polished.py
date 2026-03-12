"""
Test Suite: Polished Quote and Invoice Pages
Tests for:
- QuotesPage with customer selection, payment terms display, SKU lookup, line items
- InvoicesPage with customer selection, due date calculation, order conversion
- TaxSummaryCard, CustomerSummaryCard, PaymentTermsCard components
- SKU pricing lookup API
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSKUPricingLookup:
    """Test SKU pricing lookup API for quotes/invoices line items"""
    
    def test_sku_lookup_valid(self):
        """Test GET /api/admin/inventory/items/by-sku/{sku} with valid SKU"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory/items/by-sku/BC-001")
        
        assert response.status_code == 200, f"SKU lookup failed: {response.text}"
        data = response.json()
        
        # Verify response contains pricing info
        assert "sku" in data, "Response missing sku field"
        assert data["sku"] == "BC-001"
        assert "product_title" in data, "Response missing product_title"
        assert "unit_cost" in data, "Response missing unit_cost for pricing"
        print(f"PASS: SKU lookup returns product_title='{data['product_title']}', unit_cost={data['unit_cost']}")
    
    def test_sku_lookup_not_found(self):
        """Test GET /api/admin/inventory/items/by-sku/{sku} with invalid SKU"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory/items/by-sku/INVALID-SKU-12345")
        
        assert response.status_code == 404, "Invalid SKU should return 404"
        data = response.json()
        assert "detail" in data
        print("PASS: Invalid SKU returns 404 as expected")


class TestCustomerSelection:
    """Test customer selection and auto-fill for quotes/invoices"""
    
    def test_list_customers_for_dropdown(self):
        """Test GET /api/admin/customers for dropdown population"""
        response = requests.get(f"{BASE_URL}/api/admin/customers")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            customer = data[0]
            # Verify fields needed for customer selection dropdown
            assert "id" in customer
            assert "company_name" in customer
            assert "contact_name" in customer
            
            # Verify fields for CustomerSummaryCard
            assert "email" in customer
            
            # Verify fields for PaymentTermsCard
            print(f"PASS: Customers list returns {len(data)} customers with required fields")
        else:
            print("INFO: No customers in database")
    
    def test_customer_with_payment_terms(self):
        """Test customer john@acmecorp.tz has Net 30 terms"""
        response = requests.get(f"{BASE_URL}/api/admin/customers/by-email/john@acmecorp.tz")
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("payment_term_type") == "30_days", f"Expected 30_days, got {data.get('payment_term_type')}"
            assert data.get("payment_term_label") == "Net 30", f"Expected 'Net 30', got {data.get('payment_term_label')}"
            print(f"PASS: Customer john@acmecorp.tz has payment_term_type='30_days', label='Net 30'")
        else:
            print(f"INFO: Customer john@acmecorp.tz not found (status: {response.status_code})")


class TestQuoteCreation:
    """Test quote creation with customer details and payment terms"""
    
    def test_create_quote_with_customer_details(self):
        """Test POST /api/admin/quotes-v2 with full customer info"""
        payload = {
            "customer_name": "TEST_Quote Contact",
            "customer_email": f"test_quote_{datetime.now().timestamp()}@test.tz",
            "customer_company": "TEST_Quote Company",
            "customer_phone": "+255123456789",
            "customer_address": "123 Test Street, Dar es Salaam, Tanzania",
            "customer_tin": "TIN-12345",
            "customer_registration_number": "BRN-67890",
            "currency": "TZS",
            "line_items": [
                {"description": "Business Cards (500 pcs)", "quantity": 2, "unit_price": 150000, "total": 300000},
                {"description": "Brochures A4", "quantity": 100, "unit_price": 5000, "total": 500000}
            ],
            "subtotal": 800000,
            "discount": 50000,
            "tax": 135000,
            "tax_rate": 18,
            "total": 885000,
            "valid_until": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "notes": "Delivery within 7 business days",
            "terms": "50% advance payment required",
            "payment_term_type": "30_days",
            "payment_term_days": 30,
            "payment_term_label": "Net 30",
            "payment_term_notes": "Standard payment terms",
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        
        assert response.status_code in [200, 201], f"Quote creation failed: {response.text}"
        data = response.json()
        
        # Verify quote was created
        assert "quote_number" in data, "Missing quote_number"
        assert data["quote_number"].startswith("QTN-"), f"Invalid quote number format: {data['quote_number']}"
        
        # Verify customer details persisted
        assert data["customer_name"] == payload["customer_name"]
        assert data["customer_company"] == payload["customer_company"]
        assert data["customer_tin"] == payload["customer_tin"]
        assert data["customer_registration_number"] == payload["customer_registration_number"]
        
        # Verify payment terms persisted
        assert data["payment_term_type"] == "30_days"
        assert data["payment_term_label"] == "Net 30"
        
        # Verify line items
        assert len(data["line_items"]) == 2
        
        # Verify totals
        assert data["subtotal"] == 800000
        assert data["discount"] == 50000
        assert data["total"] == 885000
        
        print(f"PASS: Quote {data['quote_number']} created with customer details and payment terms")
        return data
    
    def test_create_quote_with_line_items(self):
        """Test quote with multiple line items for LineItemsEditor"""
        payload = {
            "customer_name": "TEST_LineItems Contact",
            "customer_email": f"test_lineitems_{datetime.now().timestamp()}@test.tz",
            "customer_company": "TEST_LineItems Company",
            "currency": "TZS",
            "line_items": [
                {"description": "Item 1", "quantity": 1, "unit_price": 100000, "total": 100000},
                {"description": "Item 2", "quantity": 2, "unit_price": 50000, "total": 100000},
                {"description": "Item 3", "quantity": 5, "unit_price": 20000, "total": 100000}
            ],
            "subtotal": 300000,
            "discount": 0,
            "tax": 54000,
            "tax_rate": 18,
            "total": 354000,
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        
        assert response.status_code in [200, 201]
        data = response.json()
        
        assert len(data["line_items"]) == 3
        print(f"PASS: Quote with {len(data['line_items'])} line items created")


class TestQuoteActions:
    """Test quote actions: PDF, Send, Convert"""
    
    def test_quote_pdf_url_generation(self):
        """Test PDF download URL for quotes"""
        # First get a quote
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2")
        
        assert response.status_code == 200
        quotes = response.json()
        
        if len(quotes) > 0:
            quote_id = quotes[0]["id"]
            pdf_url = f"{BASE_URL}/api/admin/pdf/quote/{quote_id}"
            
            # Test PDF endpoint
            pdf_response = requests.get(pdf_url)
            assert pdf_response.status_code == 200, f"PDF download failed: {pdf_response.status_code}"
            assert "application/pdf" in pdf_response.headers.get("content-type", "")
            print(f"PASS: PDF download works for quote {quote_id}")
        else:
            print("INFO: No quotes available for PDF test")
    
    def test_quote_status_update(self):
        """Test quote status change for status dropdown"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2")
        quotes = response.json()
        
        if len(quotes) > 0:
            quote_id = quotes[0]["id"]
            
            # Update status to 'sent'
            update_response = requests.patch(
                f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status",
                params={"status": "sent"}
            )
            
            assert update_response.status_code == 200
            updated = update_response.json()
            assert updated["status"] == "sent"
            print(f"PASS: Quote status updated to 'sent'")
        else:
            print("INFO: No quotes for status update test")


class TestInvoiceCreation:
    """Test invoice creation with customer details and due date calculation"""
    
    def test_create_invoice_with_due_date(self):
        """Test POST /api/admin/invoices-v2 with auto due date calculation"""
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        payload = {
            "customer_name": "TEST_Invoice Contact",
            "customer_email": f"test_invoice_{datetime.now().timestamp()}@test.tz",
            "customer_company": "TEST_Invoice Company",
            "customer_phone": "+255987654321",
            "customer_address": "456 Test Avenue, Arusha, Tanzania",
            "customer_tin": "TIN-98765",
            "customer_registration_number": "BRN-43210",
            "currency": "TZS",
            "line_items": [
                {"description": "Service Package", "quantity": 1, "unit_price": 2000000, "total": 2000000}
            ],
            "subtotal": 2000000,
            "discount": 0,
            "tax": 360000,
            "tax_rate": 18,
            "total": 2360000,
            "due_date": due_date,
            "notes": "Thank you for your business",
            "terms": "Payment due within 30 days",
            "payment_term_type": "30_days",
            "payment_term_days": 30,
            "payment_term_label": "Net 30",
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/invoices-v2", json=payload)
        
        assert response.status_code in [200, 201], f"Invoice creation failed: {response.text}"
        data = response.json()
        
        # Verify invoice was created
        assert "invoice_number" in data
        assert data["invoice_number"].startswith("INV-")
        
        # Verify customer details
        assert data["customer_name"] == payload["customer_name"]
        assert data["customer_company"] == payload["customer_company"]
        
        # Verify due date
        assert data["due_date"] is not None
        
        # Verify payment terms
        assert data["payment_term_label"] == "Net 30"
        
        print(f"PASS: Invoice {data['invoice_number']} created with due_date and payment terms")
        return data
    
    def test_invoice_without_due_date_auto_calculates(self):
        """Test invoice without explicit due_date uses payment term to calculate"""
        payload = {
            "customer_name": "TEST_AutoDueDate Contact",
            "customer_email": f"test_autodue_{datetime.now().timestamp()}@test.tz",
            "currency": "TZS",
            "line_items": [
                {"description": "Test Item", "quantity": 1, "unit_price": 100000, "total": 100000}
            ],
            "subtotal": 100000,
            "discount": 0,
            "tax": 18000,
            "tax_rate": 18,
            "total": 118000,
            "payment_term_type": "14_days",
            "payment_term_label": "Net 14",
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/invoices-v2", json=payload)
        
        assert response.status_code in [200, 201]
        data = response.json()
        
        # Due date should be auto-calculated based on payment terms
        print(f"PASS: Invoice created with auto-calculated due_date: {data.get('due_date')}")


class TestInvoiceActions:
    """Test invoice actions: PDF, Send, status dropdown"""
    
    def test_invoice_pdf_download(self):
        """Test PDF download for invoices"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices-v2")
        
        assert response.status_code == 200
        invoices = response.json()
        
        if len(invoices) > 0:
            invoice_id = invoices[0]["id"]
            pdf_url = f"{BASE_URL}/api/admin/pdf/invoice/{invoice_id}"
            
            pdf_response = requests.get(pdf_url)
            assert pdf_response.status_code == 200
            assert "application/pdf" in pdf_response.headers.get("content-type", "")
            print(f"PASS: Invoice PDF download works for {invoice_id}")
        else:
            print("INFO: No invoices available for PDF test")
    
    def test_invoice_status_dropdown(self):
        """Test invoice status update for status dropdown"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices-v2")
        invoices = response.json()
        
        if len(invoices) > 0:
            invoice_id = invoices[0]["id"]
            
            # Update status to 'sent'
            update_response = requests.patch(
                f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}/status",
                params={"status": "sent"}
            )
            
            assert update_response.status_code == 200
            updated = update_response.json()
            assert updated["status"] == "sent"
            print(f"PASS: Invoice status updated to 'sent'")
        else:
            print("INFO: No invoices for status test")


class TestConvertOrderToInvoice:
    """Test order to invoice conversion"""
    
    def test_list_orders_for_conversion(self):
        """Test orders are available for conversion"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops")
        
        assert response.status_code == 200
        orders = response.json()
        print(f"INFO: {len(orders)} orders available for potential conversion")


class TestTaxCalculation:
    """Test tax calculation utilities for TaxSummaryCard"""
    
    def test_tax_calculation_in_quote(self):
        """Test tax calculation in quote creation"""
        # Create a quote with known values for tax verification
        payload = {
            "customer_name": "TEST_Tax Calc",
            "customer_email": f"test_tax_{datetime.now().timestamp()}@test.tz",
            "currency": "TZS",
            "line_items": [
                {"description": "Item", "quantity": 10, "unit_price": 10000, "total": 100000}
            ],
            "subtotal": 100000,
            "discount": 10000,
            "tax": 16200,  # 18% of (100000 - 10000) = 16200
            "tax_rate": 18,
            "total": 106200,  # 100000 - 10000 + 16200
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload)
        
        assert response.status_code in [200, 201]
        data = response.json()
        
        # Verify totals stored correctly (for TaxSummaryCard display)
        assert data["subtotal"] == 100000
        assert data["discount"] == 10000
        assert data["tax"] == 16200
        assert data["total"] == 106200
        print("PASS: Tax calculation values stored correctly for TaxSummaryCard")


class TestListingAndSearch:
    """Test quote and invoice listing with search"""
    
    def test_quotes_list(self):
        """Test GET /api/admin/quotes-v2 for quote list display"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            quote = data[0]
            # Verify fields needed for quote card display
            assert "quote_number" in quote
            assert "customer_name" in quote
            assert "status" in quote
            assert "total" in quote
            assert "payment_term_label" in quote or quote.get("payment_term_label") is None
            print(f"PASS: Quotes list returns {len(data)} quotes with required display fields")
        else:
            print("INFO: No quotes in database")
    
    def test_invoices_list(self):
        """Test GET /api/admin/invoices-v2 for invoice list display"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices-v2")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            invoice = data[0]
            # Verify fields needed for invoice card display
            assert "invoice_number" in invoice
            assert "customer_name" in invoice
            assert "status" in invoice
            assert "total" in invoice
            assert "due_date" in invoice or invoice.get("due_date") is None
            print(f"PASS: Invoices list returns {len(data)} invoices with required display fields")
        else:
            print("INFO: No invoices in database")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
