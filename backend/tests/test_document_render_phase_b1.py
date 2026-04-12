"""
Phase B-1: Document Rendering Hardening Tests
Tests for CanonicalDocumentRenderer backend support:
- GET /api/documents/render-settings (unified settings endpoint)
- GET /api/admin/quotes-v2/{id} (quote detail)
- GET /api/admin/invoices/{id} (invoice detail)
- GET /api/admin/delivery-notes (list)
- GET /api/admin/delivery-notes/{id} (detail)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDocumentRenderSettings:
    """Tests for unified document render settings endpoint"""
    
    def test_render_settings_returns_200(self):
        """GET /api/documents/render-settings should return 200"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: render-settings returns 200")
    
    def test_render_settings_has_company_info(self):
        """Render settings should include company info fields"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        data = response.json()
        
        # Company info fields
        assert "company_name" in data, "Missing company_name"
        assert "address" in data, "Missing address"
        assert "phone" in data, "Missing phone"
        assert "email" in data, "Missing email"
        assert "tin" in data, "Missing tin"
        assert "city" in data, "Missing city"
        assert "country" in data, "Missing country"
        print(f"PASS: Company info present - {data.get('company_name')}")
    
    def test_render_settings_has_bank_details(self):
        """Render settings should include bank transfer details"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        data = response.json()
        
        assert "bank_name" in data, "Missing bank_name"
        assert "bank_account_name" in data, "Missing bank_account_name"
        assert "bank_account_number" in data, "Missing bank_account_number"
        assert "bank_branch" in data, "Missing bank_branch"
        assert "swift_code" in data, "Missing swift_code"
        print(f"PASS: Bank details present - {data.get('bank_name')}")
    
    def test_render_settings_has_branding(self):
        """Render settings should include branding assets"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        data = response.json()
        
        assert "logo_url" in data, "Missing logo_url"
        assert "show_signature" in data, "Missing show_signature"
        assert "cfo_name" in data, "Missing cfo_name"
        assert "cfo_title" in data, "Missing cfo_title"
        assert "cfo_signature_url" in data, "Missing cfo_signature_url"
        assert "show_stamp" in data, "Missing show_stamp"
        print(f"PASS: Branding present - show_signature={data.get('show_signature')}, show_stamp={data.get('show_stamp')}")
    
    def test_render_settings_has_doc_footer(self):
        """Render settings should include doc_footer configuration"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        data = response.json()
        
        assert "doc_footer" in data, "Missing doc_footer"
        footer = data["doc_footer"]
        assert "show_address" in footer, "Missing show_address in doc_footer"
        assert "show_email" in footer, "Missing show_email in doc_footer"
        assert "show_phone" in footer, "Missing show_phone in doc_footer"
        assert "show_registration" in footer, "Missing show_registration in doc_footer"
        print(f"PASS: doc_footer present with toggles")
    
    def test_render_settings_has_doc_numbering(self):
        """Render settings should include doc_numbering configuration"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        data = response.json()
        
        assert "doc_numbering" in data, "Missing doc_numbering"
        numbering = data["doc_numbering"]
        # Check for quote numbering
        assert "quote_prefix" in numbering, "Missing quote_prefix"
        # Check for invoice numbering
        assert "invoice_prefix" in numbering, "Missing invoice_prefix"
        print(f"PASS: doc_numbering present - quote_prefix={numbering.get('quote_prefix')}")
    
    def test_render_settings_has_doc_template(self):
        """Render settings should include doc_template configuration"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        data = response.json()
        
        assert "doc_template" in data, "Missing doc_template"
        template = data["doc_template"]
        assert "selected_template" in template, "Missing selected_template"
        print(f"PASS: doc_template present - selected={template.get('selected_template')}")


class TestQuoteDetail:
    """Tests for quote detail endpoint"""
    
    QUOTE_ID = "69d8ea175572c5cf0210281e"
    
    def test_quote_detail_returns_200(self):
        """GET /api/admin/quotes-v2/{id} should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2/{self.QUOTE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Quote detail returns 200")
    
    def test_quote_has_required_fields(self):
        """Quote should have all fields needed by CanonicalDocumentRenderer"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2/{self.QUOTE_ID}")
        data = response.json()
        
        # Document identification
        assert "quote_number" in data, "Missing quote_number"
        assert "status" in data, "Missing status"
        assert "created_at" in data, "Missing created_at"
        
        # Customer info
        assert "customer_name" in data, "Missing customer_name"
        assert "customer_email" in data, "Missing customer_email"
        
        # Line items and totals
        assert "line_items" in data, "Missing line_items"
        assert "subtotal" in data, "Missing subtotal"
        assert "total" in data, "Missing total"
        assert "currency" in data, "Missing currency"
        
        print(f"PASS: Quote has required fields - {data.get('quote_number')}")
    
    def test_quote_line_items_structure(self):
        """Quote line items should have proper structure"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2/{self.QUOTE_ID}")
        data = response.json()
        
        line_items = data.get("line_items", [])
        assert len(line_items) > 0, "Quote should have at least one line item"
        
        item = line_items[0]
        # Check for description/name
        assert "name" in item or "description" in item, "Line item missing name/description"
        # Check for quantity
        assert "quantity" in item, "Line item missing quantity"
        # Check for unit_price
        assert "unit_price" in item, "Line item missing unit_price"
        
        print(f"PASS: Quote line items have proper structure - {len(line_items)} items")


class TestInvoiceDetail:
    """Tests for invoice detail endpoint"""
    
    INVOICE_ID = "71c2fa9c-1eff-4cf2-a481-95df7f0b764e"
    
    def test_invoice_detail_returns_200(self):
        """GET /api/admin/invoices/{id} should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{self.INVOICE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Invoice detail returns 200")
    
    def test_invoice_has_required_fields(self):
        """Invoice should have all fields needed by CanonicalDocumentRenderer"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{self.INVOICE_ID}")
        data = response.json()
        
        # Document identification
        assert "invoice_number" in data, "Missing invoice_number"
        assert "status" in data, "Missing status"
        assert "created_at" in data, "Missing created_at"
        
        # Line items and totals
        assert "items" in data or "line_items" in data, "Missing items/line_items"
        assert "total_amount" in data or "total" in data, "Missing total_amount/total"
        
        print(f"PASS: Invoice has required fields - {data.get('invoice_number')}")


class TestDeliveryNotes:
    """Tests for delivery notes endpoints"""
    
    def test_delivery_notes_list_returns_200(self):
        """GET /api/admin/delivery-notes should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery-notes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Delivery notes list returns 200")
    
    def test_delivery_notes_list_is_array(self):
        """Delivery notes list should return an array"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery-notes")
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"PASS: Delivery notes list returns array with {len(data)} items")
    
    def test_delivery_note_detail_returns_200(self):
        """GET /api/admin/delivery-notes/{id} should return 200"""
        # First get a delivery note ID from the list
        list_response = requests.get(f"{BASE_URL}/api/admin/delivery-notes")
        notes = list_response.json()
        
        if len(notes) == 0:
            pytest.skip("No delivery notes available for testing")
        
        note_id = notes[0].get("id")
        response = requests.get(f"{BASE_URL}/api/admin/delivery-notes/{note_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Delivery note detail returns 200 for {note_id}")
    
    def test_delivery_note_has_required_fields(self):
        """Delivery note should have all fields needed by CanonicalDocumentRenderer"""
        list_response = requests.get(f"{BASE_URL}/api/admin/delivery-notes")
        notes = list_response.json()
        
        if len(notes) == 0:
            pytest.skip("No delivery notes available for testing")
        
        note_id = notes[0].get("id")
        response = requests.get(f"{BASE_URL}/api/admin/delivery-notes/{note_id}")
        data = response.json()
        
        # Document identification
        assert "note_number" in data, "Missing note_number"
        assert "status" in data, "Missing status"
        assert "created_at" in data, "Missing created_at"
        
        # Delivery info
        assert "delivered_by" in data, "Missing delivered_by"
        assert "delivered_to" in data, "Missing delivered_to"
        
        # Line items
        assert "line_items" in data, "Missing line_items"
        
        print(f"PASS: Delivery note has required fields - {data.get('note_number')}")
    
    def test_delivery_note_status_update(self):
        """PATCH /api/admin/delivery-notes/{id}/status should work"""
        # First get a delivery note ID
        list_response = requests.get(f"{BASE_URL}/api/admin/delivery-notes")
        notes = list_response.json()
        
        if len(notes) == 0:
            pytest.skip("No delivery notes available for testing")
        
        note_id = notes[0].get("id")
        current_status = notes[0].get("status")
        
        # Try to update status (just verify endpoint works, don't actually change)
        response = requests.patch(
            f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status",
            json={"status": current_status}  # Keep same status
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Delivery note status update works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
