"""
Test UI & Document Polish Pass - Iteration 117
Focus areas:
1. Contact details (email, phone, address) in Invoice Branding settings
2. Multi-page PDF layout support (@page CSS, page-break-inside)
3. Logo embedding in generated SVG stamps (clipPath, image element with base64)
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"

# Test invoice ID from context
TEST_INVOICE_ID = "69c25f9451b9095b5b27a029"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Admin login should return 200 with token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"Admin login successful, token received")


class TestCustomerAuth:
    """Customer authentication tests"""
    
    def test_customer_login_success(self):
        """Customer login should return 200 with token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"Customer login successful")


class TestContactDetailsInBranding:
    """Test contact details (email, phone, address) in Invoice Branding settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_get_branding_returns_contact_fields_with_defaults(self):
        """GET /api/admin/settings/invoice-branding should return contact_email, contact_phone, contact_address with defaults"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert response.status_code == 200, f"GET failed: {response.status_code}"
        
        data = response.json()
        
        # Verify contact fields exist
        assert "contact_email" in data, "Missing contact_email field"
        assert "contact_phone" in data, "Missing contact_phone field"
        assert "contact_address" in data, "Missing contact_address field"
        
        # Verify defaults are applied if empty
        assert data["contact_email"], "contact_email should have a default value"
        assert data["contact_phone"], "contact_phone should have a default value"
        assert data["contact_address"], "contact_address should have a default value"
        
        print(f"Contact fields: email={data['contact_email']}, phone={data['contact_phone']}, address={data['contact_address']}")
    
    def test_post_branding_saves_contact_fields(self):
        """POST /api/admin/settings/invoice-branding should save and return contact details"""
        payload = {
            "contact_email": "test-accounts@konekt.co.tz",
            "contact_phone": "+255 123 456 789",
            "contact_address": "Test Address, Dar es Salaam"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=payload)
        assert response.status_code == 200, f"POST failed: {response.status_code}"
        
        data = response.json()
        assert data.get("contact_email") == payload["contact_email"], f"contact_email not saved: {data.get('contact_email')}"
        assert data.get("contact_phone") == payload["contact_phone"], f"contact_phone not saved: {data.get('contact_phone')}"
        assert data.get("contact_address") == payload["contact_address"], f"contact_address not saved: {data.get('contact_address')}"
        
        print(f"Contact fields saved successfully")
    
    def test_contact_fields_persist_via_get(self):
        """Verify contact fields persist after save"""
        # Save custom values
        payload = {
            "contact_email": "persist-test@konekt.co.tz",
            "contact_phone": "+255 999 888 777",
            "contact_address": "Persistence Test Address"
        }
        save_response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=payload)
        assert save_response.status_code == 200
        
        # Verify via GET
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("contact_email") == payload["contact_email"], "contact_email not persisted"
        assert data.get("contact_phone") == payload["contact_phone"], "contact_phone not persisted"
        assert data.get("contact_address") == payload["contact_address"], "contact_address not persisted"
        
        print("Contact fields persistence verified")
    
    def test_restore_default_contact_fields(self):
        """Restore default contact values after tests"""
        payload = {
            "contact_email": "accounts@konekt.co.tz",
            "contact_phone": "+255 XXX XXX XXX",
            "contact_address": "Dar es Salaam, Tanzania"
        }
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=payload)
        assert response.status_code == 200
        print("Default contact fields restored")


class TestStampLogoEmbedding:
    """Test logo embedding in generated SVG stamps"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_circle_stamp_has_clippath_and_image(self):
        """Circle stamp SVG should have clipPath and image element with base64 data"""
        payload = {
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "Konekt Limited",
            "stamp_text_secondary": "Dar es Salaam, Tanzania"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
        assert response.status_code == 200, f"Generate stamp failed: {response.status_code}"
        
        data = response.json()
        svg = data.get("svg", "")
        
        # Check for clipPath element
        assert "clipPath" in svg, "Circle stamp should contain clipPath element"
        assert 'id="iconClip"' in svg, "Circle stamp should have iconClip clipPath"
        
        # Check for image element with base64 data
        assert "<image" in svg, "Circle stamp should contain image element"
        assert "data:image/jpeg;base64," in svg, "Circle stamp should have base64 image data"
        # Check for clip-path reference (may use single or double quotes)
        assert "clip-path=" in svg and "url(#iconClip)" in svg, "Image should reference iconClip"
        
        print("Circle stamp has clipPath and embedded logo image")
    
    def test_square_stamp_has_clippath_and_image(self):
        """Square stamp SVG should have clipPath and image element with base64 data"""
        payload = {
            "stamp_shape": "square",
            "stamp_color": "red",
            "stamp_text_primary": "Konekt Limited",
            "stamp_text_secondary": "Dar es Salaam"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
        assert response.status_code == 200, f"Generate stamp failed: {response.status_code}"
        
        data = response.json()
        svg = data.get("svg", "")
        
        # Check for clipPath element
        assert "clipPath" in svg, "Square stamp should contain clipPath element"
        assert 'id="sqClip"' in svg, "Square stamp should have sqClip clipPath"
        
        # Check for image element with base64 data
        assert "<image" in svg, "Square stamp should contain image element"
        assert "data:image/jpeg;base64," in svg, "Square stamp should have base64 image data"
        # Check for clip-path reference (may use single or double quotes)
        assert "clip-path=" in svg and "url(#sqClip)" in svg, "Image should reference sqClip"
        
        print("Square stamp has clipPath and embedded logo image")
    
    def test_stamp_svg_is_valid_xml(self):
        """Generated stamp SVG should be valid XML"""
        payload = {
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "Test Company"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
        assert response.status_code == 200
        
        svg = response.json().get("svg", "")
        assert svg.startswith("<svg"), "SVG should start with <svg tag"
        assert svg.endswith("</svg>"), "SVG should end with </svg> tag"
        assert 'xmlns="http://www.w3.org/2000/svg"' in svg, "SVG should have xmlns attribute"
        
        print("SVG is valid XML structure")


class TestMultiPagePDFSupport:
    """Test multi-page PDF layout support in invoice preview"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_invoice_preview_has_page_css_rule(self):
        """Invoice PDF preview should have @page CSS rule for multi-page support"""
        response = self.session.get(f"{BASE_URL}/api/pdf/invoices/{TEST_INVOICE_ID}/preview")
        
        if response.status_code == 404:
            pytest.skip(f"Invoice {TEST_INVOICE_ID} not found")
        
        assert response.status_code == 200, f"Preview failed: {response.status_code}"
        
        html = response.text
        
        # Check for @page CSS rule
        assert "@page" in html, "HTML should contain @page CSS rule"
        assert "size: A4" in html, "HTML should have A4 page size"
        
        print("Invoice preview has @page CSS rule for multi-page support")
    
    def test_invoice_preview_has_page_break_avoid(self):
        """Invoice PDF preview should have page-break-inside: avoid on table rows"""
        response = self.session.get(f"{BASE_URL}/api/pdf/invoices/{TEST_INVOICE_ID}/preview")
        
        if response.status_code == 404:
            pytest.skip(f"Invoice {TEST_INVOICE_ID} not found")
        
        assert response.status_code == 200
        
        html = response.text
        
        # Check for page-break-inside: avoid
        assert "page-break-inside" in html, "HTML should contain page-break-inside CSS"
        assert "page-break-inside: avoid" in html, "HTML should have page-break-inside: avoid"
        
        print("Invoice preview has page-break-inside: avoid for table rows")
    
    def test_invoice_preview_has_contact_bar(self):
        """Invoice PDF preview should have contact-bar section with dynamic contact info"""
        response = self.session.get(f"{BASE_URL}/api/pdf/invoices/{TEST_INVOICE_ID}/preview")
        
        if response.status_code == 404:
            pytest.skip(f"Invoice {TEST_INVOICE_ID} not found")
        
        assert response.status_code == 200
        
        html = response.text
        
        # Check for contact-bar class
        assert 'class="contact-bar"' in html, "HTML should contain contact-bar section"
        
        # Check for contact info (email, phone, address should be present)
        # The contact bar should have spans with contact info
        assert "<span>" in html, "Contact bar should have span elements"
        
        print("Invoice preview has contact-bar section")


class TestInvoicePDFDownload:
    """Test invoice PDF download functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
    
    def test_invoice_pdf_download_returns_pdf(self):
        """GET /api/pdf/invoices/{id} should return PDF"""
        response = self.session.get(f"{BASE_URL}/api/pdf/invoices/{TEST_INVOICE_ID}")
        
        if response.status_code == 404:
            pytest.skip(f"Invoice {TEST_INVOICE_ID} not found")
        
        assert response.status_code == 200, f"PDF download failed: {response.status_code}"
        
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content-type, got: {content_type}"
        
        # Check Content-Disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert ".pdf" in content_disp, "Filename should have .pdf extension"
        
        print("Invoice PDF download works correctly")


class TestQuotePDFEndpoints:
    """Test quote PDF preview and download"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session to get quote IDs"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_quote_preview_endpoint_exists(self):
        """GET /api/pdf/quotes/{id}/preview should work"""
        # Get a quote ID
        quotes_response = self.session.get(f"{BASE_URL}/api/admin/quotes")
        if quotes_response.status_code != 200:
            pytest.skip("Could not fetch quotes")
        
        quotes = quotes_response.json()
        if not quotes or len(quotes) == 0:
            pytest.skip("No quotes available")
        
        quote_id = quotes[0].get("id") or quotes[0].get("quote_number") or str(quotes[0].get("_id", ""))
        if not quote_id:
            pytest.skip("Quote has no ID")
        
        preview_response = self.session.get(f"{BASE_URL}/api/pdf/quotes/{quote_id}/preview")
        if preview_response.status_code == 404:
            print(f"Quote {quote_id} not found for preview")
            return
        
        assert preview_response.status_code == 200, f"Quote preview failed: {preview_response.status_code}"
        assert "text/html" in preview_response.headers.get("content-type", "")
        print(f"Quote preview works for {quote_id}")


class TestOrderPDFEndpoints:
    """Test order PDF preview and download"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_order_preview_endpoint_exists(self):
        """GET /api/pdf/orders/{id}/preview should work"""
        # Get an order ID
        orders_response = self.session.get(f"{BASE_URL}/api/admin/orders")
        if orders_response.status_code != 200:
            pytest.skip("Could not fetch orders")
        
        orders_data = orders_response.json()
        # Handle both list and dict with 'orders' key
        if isinstance(orders_data, dict):
            orders = orders_data.get("orders", [])
        else:
            orders = orders_data
        
        if not orders or len(orders) == 0:
            pytest.skip("No orders available")
        
        order_id = orders[0].get("id") or orders[0].get("order_number") or str(orders[0].get("_id", ""))
        if not order_id:
            pytest.skip("Order has no ID")
        
        preview_response = self.session.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        if preview_response.status_code == 404:
            print(f"Order {order_id} not found for preview")
            return
        
        assert preview_response.status_code == 200, f"Order preview failed: {preview_response.status_code}"
        assert "text/html" in preview_response.headers.get("content-type", "")
        print(f"Order preview works for {order_id}")


class TestCustomerPortalAccess:
    """Test customer portal access to invoices, orders, quotes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup customer session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Customer login failed: {login_response.status_code}")
    
    def test_customer_can_view_invoices_list(self):
        """Customer should be able to view their invoices"""
        response = self.session.get(f"{BASE_URL}/api/customer/invoices")
        assert response.status_code == 200, f"Customer invoices failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Customer can view invoices list ({len(data)} invoices)")
    
    def test_customer_can_view_orders_list(self):
        """Customer should be able to view their orders"""
        response = self.session.get(f"{BASE_URL}/api/customer/orders")
        assert response.status_code == 200, f"Customer orders failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Customer can view orders list ({len(data)} orders)")
    
    def test_customer_can_view_quotes_list(self):
        """Customer should be able to view their quotes"""
        response = self.session.get(f"{BASE_URL}/api/customer/quotes")
        assert response.status_code == 200, f"Customer quotes failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Customer can view quotes list ({len(data)} quotes)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
