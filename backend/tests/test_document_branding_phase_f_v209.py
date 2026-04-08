"""
Phase F: Document Branding Unification Tests
Tests for delivery note PDF, statement PDF, and unified branding settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"


class TestPDFPreviewEndpoints:
    """Test PDF preview endpoints return 404 for nonexistent and valid HTML for existing"""

    def test_invoice_preview_nonexistent_returns_404(self):
        """GET /api/pdf/invoices/{id}/preview returns 404 for nonexistent"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/nonexistent123/preview")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invoice preview returns 404 for nonexistent ID")

    def test_quote_preview_nonexistent_returns_404(self):
        """GET /api/pdf/quotes/{id}/preview returns 404 for nonexistent"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/nonexistent123/preview")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Quote preview returns 404 for nonexistent ID")

    def test_order_preview_nonexistent_returns_404(self):
        """GET /api/pdf/orders/{id}/preview returns 404 for nonexistent"""
        response = requests.get(f"{BASE_URL}/api/pdf/orders/nonexistent123/preview")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Order preview returns 404 for nonexistent ID")

    def test_delivery_note_preview_nonexistent_returns_404(self):
        """GET /api/pdf/delivery-notes/{id}/preview returns 404 for nonexistent"""
        response = requests.get(f"{BASE_URL}/api/pdf/delivery-notes/nonexistent123/preview")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Delivery note preview returns 404 for nonexistent ID")


class TestStatementPDFEndpoints:
    """Test statement PDF endpoints for demo customer"""

    def test_statement_preview_returns_html(self):
        """GET /api/pdf/statements/{email}/preview returns valid HTML for demo.customer@konekt.com"""
        response = requests.get(f"{BASE_URL}/api/pdf/statements/{CUSTOMER_EMAIL}/preview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Expected HTML content type"
        content = response.text
        assert "<!DOCTYPE html>" in content or "<html" in content, "Expected HTML document"
        assert "STATEMENT" in content.upper(), "Expected STATEMENT in content"
        print(f"PASS: Statement preview returns valid HTML for {CUSTOMER_EMAIL}")

    def test_statement_pdf_download(self):
        """GET /api/pdf/statements/{email} returns PDF download for demo.customer@konekt.com"""
        response = requests.get(f"{BASE_URL}/api/pdf/statements/{CUSTOMER_EMAIL}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Expected attachment disposition"
        assert "Statement" in content_disposition, "Expected Statement in filename"
        print(f"PASS: Statement PDF download works for {CUSTOMER_EMAIL}")


class TestInvoiceBrandingAPI:
    """Test invoice branding settings API"""

    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        token = login_response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    def test_get_invoice_branding_returns_defaults(self, admin_session):
        """GET /api/admin/settings/invoice-branding returns branding defaults including company_logo_url"""
        response = admin_session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required fields exist
        required_fields = [
            "show_signature", "show_stamp", "cfo_name", "cfo_title",
            "contact_email", "contact_phone", "contact_address", "company_logo_url"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: Invoice branding returns all required fields including company_logo_url")
        print(f"  - company_logo_url: {data.get('company_logo_url', '')}")
        print(f"  - show_signature: {data.get('show_signature')}")
        print(f"  - show_stamp: {data.get('show_stamp')}")

    def test_save_invoice_branding_persists(self, admin_session):
        """POST /api/admin/settings/invoice-branding saves and persists branding settings"""
        # First get current settings
        get_response = admin_session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert get_response.status_code == 200
        original = get_response.json()
        
        # Update with test values
        test_payload = {
            "contact_email": "test-branding@konekt.co.tz",
            "contact_phone": "+255 123 456 789",
            "contact_address": "Test Address, Tanzania",
            "cfo_name": "Test CFO Name",
            "cfo_title": "Test CFO Title",
            "show_signature": True,
            "show_stamp": True,
        }
        
        save_response = admin_session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=test_payload)
        assert save_response.status_code == 200, f"Expected 200, got {save_response.status_code}"
        saved_data = save_response.json()
        
        # Verify saved values
        assert saved_data.get("contact_email") == test_payload["contact_email"]
        assert saved_data.get("cfo_name") == test_payload["cfo_name"]
        assert saved_data.get("show_signature") == True
        
        # Verify persistence by re-fetching
        verify_response = admin_session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("contact_email") == test_payload["contact_email"]
        
        # Restore original settings
        restore_payload = {
            "contact_email": original.get("contact_email", "accounts@konekt.co.tz"),
            "contact_phone": original.get("contact_phone", "+255 XXX XXX XXX"),
            "contact_address": original.get("contact_address", "Dar es Salaam, Tanzania"),
            "cfo_name": original.get("cfo_name", ""),
            "cfo_title": original.get("cfo_title", "Chief Finance Officer"),
            "show_signature": original.get("show_signature", False),
            "show_stamp": original.get("show_stamp", False),
        }
        admin_session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=restore_payload)
        
        print("PASS: Invoice branding saves and persists correctly")

    def test_generate_stamp_returns_svg(self, admin_session):
        """POST /api/admin/settings/invoice-branding/generate-stamp generates SVG stamp preview"""
        payload = {
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "Test Company Ltd",
            "stamp_text_secondary": "Test Location",
            "stamp_registration_number": "REG-12345",
            "stamp_tax_number": "TIN-67890",
            "stamp_phrase": "Official Stamp"
        }
        
        response = admin_session.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "stamp_preview_url" in data, "Missing stamp_preview_url in response"
        assert "svg" in data, "Missing svg in response"
        assert data["svg"].startswith("<svg"), "SVG content should start with <svg"
        assert "Test Company Ltd" in data["svg"].upper() or "TEST COMPANY LTD" in data["svg"], "Company name should be in SVG"
        
        print(f"PASS: Generate stamp returns SVG preview")
        print(f"  - stamp_preview_url: {data.get('stamp_preview_url')}")


class TestDeliveryNotePDFIntegration:
    """Test delivery note PDF generation with existing notes"""

    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        token = login_response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    def test_delivery_notes_list_and_pdf(self, admin_session):
        """Test delivery notes list and PDF download for existing notes"""
        # Get list of delivery notes
        list_response = admin_session.get(f"{BASE_URL}/api/admin/delivery-notes")
        assert list_response.status_code == 200, f"Expected 200, got {list_response.status_code}"
        notes = list_response.json()
        
        if not notes or len(notes) == 0:
            print("SKIP: No delivery notes exist to test PDF download")
            return
        
        # Test PDF preview for first note
        first_note = notes[0]
        note_id = first_note.get("id")
        
        preview_response = requests.get(f"{BASE_URL}/api/pdf/delivery-notes/{note_id}/preview")
        assert preview_response.status_code == 200, f"Expected 200 for preview, got {preview_response.status_code}"
        assert "text/html" in preview_response.headers.get("content-type", "")
        assert "DELIVERY NOTE" in preview_response.text.upper()
        
        # Test PDF download
        pdf_response = requests.get(f"{BASE_URL}/api/pdf/delivery-notes/{note_id}")
        assert pdf_response.status_code == 200, f"Expected 200 for PDF, got {pdf_response.status_code}"
        assert "application/pdf" in pdf_response.headers.get("content-type", "")
        
        print(f"PASS: Delivery note PDF works for note {note_id}")
        print(f"  - Note number: {first_note.get('note_number')}")
        print(f"  - Status: {first_note.get('status')}")


class TestExistingDocumentPDFs:
    """Test PDF generation for existing invoices and quotes"""

    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        token = login_response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    def test_existing_invoice_preview(self, admin_session):
        """Test invoice preview for existing invoices"""
        # Get list of invoices
        list_response = admin_session.get(f"{BASE_URL}/api/admin/invoices")
        assert list_response.status_code == 200
        invoices = list_response.json()
        
        if not invoices or len(invoices) == 0:
            print("SKIP: No invoices exist to test PDF preview")
            return
        
        # Test preview for first invoice
        first_invoice = invoices[0]
        invoice_id = first_invoice.get("id")
        
        preview_response = requests.get(f"{BASE_URL}/api/pdf/invoices/{invoice_id}/preview")
        assert preview_response.status_code == 200, f"Expected 200, got {preview_response.status_code}"
        assert "text/html" in preview_response.headers.get("content-type", "")
        assert "INVOICE" in preview_response.text.upper()
        
        print(f"PASS: Invoice preview works for invoice {invoice_id}")

    def test_existing_quote_preview(self, admin_session):
        """Test quote preview for existing quotes"""
        # Get list of quotes
        list_response = admin_session.get(f"{BASE_URL}/api/admin/quotes-v2")
        assert list_response.status_code == 200
        quotes = list_response.json()
        
        if not quotes or len(quotes) == 0:
            print("SKIP: No quotes exist to test PDF preview")
            return
        
        # Test preview for first quote
        first_quote = quotes[0]
        quote_id = first_quote.get("id")
        
        preview_response = requests.get(f"{BASE_URL}/api/pdf/quotes/{quote_id}/preview")
        assert preview_response.status_code == 200, f"Expected 200, got {preview_response.status_code}"
        assert "text/html" in preview_response.headers.get("content-type", "")
        assert "QUOTE" in preview_response.text.upper()
        
        print(f"PASS: Quote preview works for quote {quote_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
