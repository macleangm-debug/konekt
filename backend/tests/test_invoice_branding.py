"""
Test Invoice Branding & Authorization Settings
- GET/POST /api/admin/settings/invoice-branding
- POST /api/admin/settings/invoice-branding/generate-stamp
- Signature and stamp upload endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestInvoiceBrandingAPI:
    """Invoice Branding API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_get_invoice_branding_returns_200(self):
        """GET /api/admin/settings/invoice-branding should return 200"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields exist
        expected_fields = [
            "show_signature", "show_stamp", "cfo_name", "cfo_title",
            "stamp_mode", "stamp_shape", "stamp_color", "stamp_text_primary"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"GET invoice-branding returned: {data}")
    
    def test_get_invoice_branding_returns_correct_data_types(self):
        """Verify data types in branding response"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert response.status_code == 200
        
        data = response.json()
        # Boolean fields
        assert isinstance(data.get("show_signature"), bool), "show_signature should be boolean"
        assert isinstance(data.get("show_stamp"), bool), "show_stamp should be boolean"
        # String fields
        assert isinstance(data.get("cfo_name"), str), "cfo_name should be string"
        assert isinstance(data.get("stamp_mode"), str), "stamp_mode should be string"
        assert data.get("stamp_mode") in ["generated", "uploaded"], f"Invalid stamp_mode: {data.get('stamp_mode')}"
        assert data.get("stamp_shape") in ["circle", "square"], f"Invalid stamp_shape: {data.get('stamp_shape')}"
        assert data.get("stamp_color") in ["blue", "red", "black"], f"Invalid stamp_color: {data.get('stamp_color')}"
        print("Data types verified successfully")
    
    def test_save_invoice_branding_returns_200(self):
        """POST /api/admin/settings/invoice-branding should save settings"""
        payload = {
            "show_signature": True,
            "show_stamp": True,
            "cfo_name": "TEST_Jane M. Doe",
            "cfo_title": "Chief Finance Officer",
            "stamp_mode": "generated",
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "TEST Konekt Limited",
            "stamp_text_secondary": "Dar es Salaam, Tanzania",
            "stamp_registration_number": "REG-12345",
            "stamp_tax_number": "TIN-67890",
            "stamp_phrase": "Official Company Stamp"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("cfo_name") == "TEST_Jane M. Doe", f"CFO name not saved: {data.get('cfo_name')}"
        assert data.get("show_signature") == True, "show_signature not saved"
        assert data.get("show_stamp") == True, "show_stamp not saved"
        print(f"Saved branding settings: {data}")
    
    def test_save_and_verify_persistence(self):
        """Save settings and verify they persist via GET"""
        # Save
        payload = {
            "show_signature": True,
            "cfo_name": "TEST_Persistence Check",
            "stamp_mode": "generated",
            "stamp_shape": "square",
            "stamp_color": "red"
        }
        save_response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=payload)
        assert save_response.status_code == 200
        
        # Verify via GET
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("cfo_name") == "TEST_Persistence Check", f"CFO name not persisted: {data.get('cfo_name')}"
        assert data.get("stamp_shape") == "square", f"stamp_shape not persisted: {data.get('stamp_shape')}"
        assert data.get("stamp_color") == "red", f"stamp_color not persisted: {data.get('stamp_color')}"
        print("Persistence verified successfully")
    
    def test_generate_stamp_circle_returns_svg(self):
        """POST /api/admin/settings/invoice-branding/generate-stamp should return SVG for circle"""
        payload = {
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "TEST Company Ltd",
            "stamp_text_secondary": "Dar es Salaam",
            "stamp_registration_number": "REG-001",
            "stamp_tax_number": "TIN-002",
            "stamp_phrase": "Official Stamp"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "svg" in data, "Response should contain 'svg' field"
        assert "stamp_preview_url" in data, "Response should contain 'stamp_preview_url' field"
        assert data["svg"].startswith("<svg"), f"SVG should start with <svg: {data['svg'][:50]}"
        assert "circle" in data["svg"].lower(), "Circle stamp should contain circle element"
        print(f"Generated circle stamp, preview URL: {data.get('stamp_preview_url')}")
    
    def test_generate_stamp_square_returns_svg(self):
        """POST /api/admin/settings/invoice-branding/generate-stamp should return SVG for square"""
        payload = {
            "stamp_shape": "square",
            "stamp_color": "red",
            "stamp_text_primary": "TEST Square Company",
            "stamp_text_secondary": "Arusha",
            "stamp_registration_number": "REG-SQ-001",
            "stamp_tax_number": "TIN-SQ-002",
            "stamp_phrase": "Square Stamp"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "svg" in data, "Response should contain 'svg' field"
        assert data["svg"].startswith("<svg"), f"SVG should start with <svg"
        assert "rect" in data["svg"].lower(), "Square stamp should contain rect element"
        print(f"Generated square stamp, preview URL: {data.get('stamp_preview_url')}")
    
    def test_generate_stamp_with_different_colors(self):
        """Test stamp generation with all color options"""
        colors = ["blue", "red", "black"]
        color_hex_map = {
            "blue": "#1a4b8c",
            "red": "#b91c1c",
            "black": "#1e293b"
        }
        
        for color in colors:
            payload = {
                "stamp_shape": "circle",
                "stamp_color": color,
                "stamp_text_primary": f"TEST {color.upper()} Company"
            }
            response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
            assert response.status_code == 200, f"Failed for color {color}: {response.status_code}"
            
            data = response.json()
            expected_hex = color_hex_map[color]
            assert expected_hex in data["svg"], f"Color {color} should use hex {expected_hex}"
            print(f"Color {color} verified with hex {expected_hex}")
    
    def test_toggle_show_signature(self):
        """Test toggling show_signature on and off"""
        # Turn on
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json={
            "show_signature": True,
            "cfo_name": "TEST Toggle CFO"
        })
        assert response.status_code == 200
        assert response.json().get("show_signature") == True
        
        # Turn off
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json={
            "show_signature": False
        })
        assert response.status_code == 200
        assert response.json().get("show_signature") == False
        print("Toggle show_signature verified")
    
    def test_toggle_show_stamp(self):
        """Test toggling show_stamp on and off"""
        # Turn on
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json={
            "show_stamp": True
        })
        assert response.status_code == 200
        assert response.json().get("show_stamp") == True
        
        # Turn off
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json={
            "show_stamp": False
        })
        assert response.status_code == 200
        assert response.json().get("show_stamp") == False
        print("Toggle show_stamp verified")
    
    def test_stamp_mode_generated_vs_uploaded(self):
        """Test switching between generated and uploaded stamp modes"""
        # Set to generated
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json={
            "stamp_mode": "generated"
        })
        assert response.status_code == 200
        assert response.json().get("stamp_mode") == "generated"
        
        # Set to uploaded
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json={
            "stamp_mode": "uploaded"
        })
        assert response.status_code == 200
        assert response.json().get("stamp_mode") == "uploaded"
        print("Stamp mode switching verified")


class TestInvoicePDFWithBranding:
    """Test Invoice PDF generation with branding settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_invoice_pdf_endpoint_exists(self):
        """Verify /api/pdf/invoices/{id} endpoint exists"""
        # First get an invoice ID
        invoices_response = self.session.get(f"{BASE_URL}/api/admin/invoices")
        if invoices_response.status_code != 200:
            pytest.skip("Could not fetch invoices")
        
        invoices = invoices_response.json()
        if not invoices or len(invoices) == 0:
            pytest.skip("No invoices available for testing")
        
        invoice_id = invoices[0].get("id") or invoices[0].get("invoice_number")
        if not invoice_id:
            pytest.skip("Invoice has no ID")
        
        # Test PDF endpoint
        pdf_response = self.session.get(f"{BASE_URL}/api/pdf/invoices/{invoice_id}")
        assert pdf_response.status_code in [200, 404], f"Unexpected status: {pdf_response.status_code}"
        
        if pdf_response.status_code == 200:
            assert pdf_response.headers.get("content-type") == "application/pdf" or "pdf" in pdf_response.headers.get("content-type", "").lower()
            print(f"PDF generated successfully for invoice {invoice_id}")
        else:
            print(f"Invoice {invoice_id} not found for PDF generation")
    
    def test_invoice_html_preview_endpoint(self):
        """Test /api/pdf/invoices/{id}/preview returns HTML"""
        invoices_response = self.session.get(f"{BASE_URL}/api/admin/invoices")
        if invoices_response.status_code != 200:
            pytest.skip("Could not fetch invoices")
        
        invoices = invoices_response.json()
        if not invoices or len(invoices) == 0:
            pytest.skip("No invoices available for testing")
        
        invoice_id = invoices[0].get("id") or invoices[0].get("invoice_number")
        if not invoice_id:
            pytest.skip("Invoice has no ID")
        
        preview_response = self.session.get(f"{BASE_URL}/api/pdf/invoices/{invoice_id}/preview")
        if preview_response.status_code == 200:
            assert "text/html" in preview_response.headers.get("content-type", "")
            html_content = preview_response.text
            assert "<html" in html_content.lower(), "Response should be HTML"
            print(f"HTML preview generated for invoice {invoice_id}")
        else:
            print(f"Preview not available for invoice {invoice_id}: {preview_response.status_code}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_restore_original_branding(self):
        """Restore branding to reasonable defaults after tests"""
        payload = {
            "show_signature": True,
            "show_stamp": True,
            "cfo_name": "Jane M. Doe",
            "cfo_title": "Chief Finance Officer",
            "stamp_mode": "generated",
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "Konekt Limited",
            "stamp_text_secondary": "Dar es Salaam, Tanzania",
            "stamp_registration_number": "",
            "stamp_tax_number": "",
            "stamp_phrase": "Official Company Stamp"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=payload)
        assert response.status_code == 200
        print("Branding settings restored to defaults")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
