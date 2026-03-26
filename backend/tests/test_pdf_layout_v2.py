"""
PDF Layout V2 Tests - Testing the new payment-auth-section grid layout
Tests for Quote, Invoice, and Order PDF previews and downloads
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# Test document IDs
QUOTE_ID = "69c3deedabcf7cf39caa7e56"
INVOICE_ID = "69c264d851b9095b5b27a02c"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def order_id(auth_token):
    """Get an order ID from the database"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
    if response.status_code == 200:
        orders = response.json()
        if isinstance(orders, list) and len(orders) > 0:
            return orders[0].get("id") or str(orders[0].get("_id"))
        elif isinstance(orders, dict) and orders.get("orders"):
            order_list = orders["orders"]
            if len(order_list) > 0:
                return order_list[0].get("id") or str(order_list[0].get("_id"))
    return None


class TestQuotePDFPreview:
    """Test Quote PDF preview layout"""
    
    def test_quote_preview_returns_html(self, auth_token):
        """Quote preview endpoint returns HTML"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        assert response.status_code == 200, f"Quote preview failed: {response.status_code}"
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Quote preview returns HTML (status: {response.status_code})")
    
    def test_quote_has_payment_auth_section(self, auth_token):
        """Quote preview has .payment-auth-section grid layout"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        html = response.text
        assert "payment-auth-section" in html, "Missing .payment-auth-section class"
        print("✓ Quote has .payment-auth-section grid layout")
    
    def test_quote_has_auth_column(self, auth_token):
        """Quote preview has .auth-column with signature and stamp blocks"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        html = response.text
        assert "auth-column" in html, "Missing .auth-column class"
        print("✓ Quote has .auth-column")
    
    def test_quote_has_signature_block(self, auth_token):
        """Quote preview has .signature-block"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        html = response.text
        assert "signature-block" in html, "Missing .signature-block class"
        print("✓ Quote has .signature-block")
    
    def test_quote_has_stamp_block(self, auth_token):
        """Quote preview has .stamp-block"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        html = response.text
        assert "stamp-block" in html, "Missing .stamp-block class"
        print("✓ Quote has .stamp-block")
    
    def test_quote_has_payment_box_with_terms(self, auth_token):
        """Quote preview has .payment-box with Terms & Conditions"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        html = response.text
        assert "payment-box" in html, "Missing .payment-box class"
        assert "Terms" in html, "Missing Terms & Conditions text"
        print("✓ Quote has .payment-box with Terms & Conditions")
    
    def test_quote_page_width_794px(self, auth_token):
        """Quote preview page width is 794px"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        html = response.text
        assert "width: 794px" in html or "width:794px" in html, "Page width not 794px"
        print("✓ Quote page width is 794px")
    
    def test_quote_stamp_size_88px(self, auth_token):
        """Quote stamp size is 88px (not 96px)"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        html = response.text
        # Check CSS for stamp-img dimensions
        assert "88px" in html, "Stamp size should be 88px"
        # Ensure old 96px is not present for stamp
        stamp_css_match = re.search(r'\.stamp-img\s*\{[^}]*\}', html)
        if stamp_css_match:
            stamp_css = stamp_css_match.group()
            assert "96px" not in stamp_css, "Stamp should not be 96px"
        print("✓ Quote stamp size is 88px")
    
    def test_quote_signature_dimensions(self, auth_token):
        """Quote signature max-width 110px, max-height 42px"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}/preview")
        html = response.text
        # Check for signature-img CSS
        assert "max-width: 110px" in html or "max-width:110px" in html, "Signature max-width should be 110px"
        assert "max-height: 42px" in html or "max-height:42px" in html, "Signature max-height should be 42px"
        print("✓ Quote signature dimensions: 110px x 42px")


class TestInvoicePDFPreview:
    """Test Invoice PDF preview layout"""
    
    def test_invoice_preview_returns_html(self, auth_token):
        """Invoice preview endpoint returns HTML"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        assert response.status_code == 200, f"Invoice preview failed: {response.status_code}"
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Invoice preview returns HTML (status: {response.status_code})")
    
    def test_invoice_has_payment_auth_section(self, auth_token):
        """Invoice preview has .payment-auth-section with bank details on left"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        assert "payment-auth-section" in html, "Missing .payment-auth-section class"
        print("✓ Invoice has .payment-auth-section")
    
    def test_invoice_bank_details_in_payment_box(self, auth_token):
        """Invoice bank details show in .payment-box (not old .bank-box)"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        # Should have payment-box, not bank-box
        assert "payment-box" in html, "Missing .payment-box class"
        # Check for bank transfer details text
        assert "Bank Transfer Details" in html or "Bank:" in html, "Missing bank details"
        print("✓ Invoice bank details in .payment-box")
    
    def test_invoice_has_auth_column(self, auth_token):
        """Invoice preview has .auth-column"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        assert "auth-column" in html, "Missing .auth-column class"
        print("✓ Invoice has .auth-column")
    
    def test_invoice_has_signature_and_stamp_blocks(self, auth_token):
        """Invoice preview has .signature-block and .stamp-block in auth-column"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        assert "signature-block" in html, "Missing .signature-block class"
        assert "stamp-block" in html, "Missing .stamp-block class"
        print("✓ Invoice has .signature-block and .stamp-block")
    
    def test_invoice_footer_margin(self, auth_token):
        """Invoice footer has reduced margin (18px not 36px)"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        # Check footer CSS - should have margin-top: 18px
        assert "margin-top: 18px" in html or "margin-top:18px" in html, "Footer margin should be 18px"
        print("✓ Invoice footer margin is 18px")
    
    def test_invoice_stamp_size_88px(self, auth_token):
        """Invoice stamp size is 88px"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        assert "88px" in html, "Stamp size should be 88px"
        print("✓ Invoice stamp size is 88px")
    
    def test_invoice_signature_dimensions(self, auth_token):
        """Invoice signature max-width 110px, max-height 42px"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        assert "max-width: 110px" in html or "max-width:110px" in html, "Signature max-width should be 110px"
        assert "max-height: 42px" in html or "max-height:42px" in html, "Signature max-height should be 42px"
        print("✓ Invoice signature dimensions: 110px x 42px")


class TestOrderPDFPreview:
    """Test Order PDF preview layout"""
    
    def test_order_preview_returns_html(self, auth_token, order_id):
        """Order preview endpoint returns HTML"""
        if not order_id:
            pytest.skip("No order found in database")
        response = requests.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        assert response.status_code == 200, f"Order preview failed: {response.status_code}"
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Order preview returns HTML (status: {response.status_code})")
    
    def test_order_has_payment_auth_section(self, auth_token, order_id):
        """Order preview has .payment-auth-section with sales contact on left"""
        if not order_id:
            pytest.skip("No order found in database")
        response = requests.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        html = response.text
        assert "payment-auth-section" in html, "Missing .payment-auth-section class"
        print("✓ Order has .payment-auth-section")
    
    def test_order_has_sales_contact_box(self, auth_token, order_id):
        """Order preview has sales contact in .payment-box"""
        if not order_id:
            pytest.skip("No order found in database")
        response = requests.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        html = response.text
        assert "payment-box" in html, "Missing .payment-box class"
        assert "Sales Contact" in html, "Missing Sales Contact text"
        print("✓ Order has sales contact in .payment-box")
    
    def test_order_has_auth_column(self, auth_token, order_id):
        """Order preview has .auth-column with signature+stamp"""
        if not order_id:
            pytest.skip("No order found in database")
        response = requests.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        html = response.text
        assert "auth-column" in html, "Missing .auth-column class"
        print("✓ Order has .auth-column")
    
    def test_order_stamp_size_88px(self, auth_token, order_id):
        """Order stamp size is 88px"""
        if not order_id:
            pytest.skip("No order found in database")
        response = requests.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        html = response.text
        assert "88px" in html, "Stamp size should be 88px"
        print("✓ Order stamp size is 88px")


class TestPDFDownloads:
    """Test PDF download endpoints"""
    
    def test_invoice_pdf_download(self, auth_token):
        """GET /api/pdf/invoices/{id} returns PDF bytes"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}")
        assert response.status_code == 200, f"Invoice PDF download failed: {response.status_code}"
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF, got {content_type}"
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"✓ Invoice PDF download works (size: {len(response.content)} bytes)")
    
    def test_quote_pdf_download(self, auth_token):
        """GET /api/pdf/quotes/{id} returns PDF bytes"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/{QUOTE_ID}")
        assert response.status_code == 200, f"Quote PDF download failed: {response.status_code}"
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF, got {content_type}"
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"✓ Quote PDF download works (size: {len(response.content)} bytes)")
    
    def test_order_pdf_download(self, auth_token, order_id):
        """GET /api/pdf/orders/{id} returns PDF bytes"""
        if not order_id:
            pytest.skip("No order found in database")
        response = requests.get(f"{BASE_URL}/api/pdf/orders/{order_id}")
        assert response.status_code == 200, f"Order PDF download failed: {response.status_code}"
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF, got {content_type}"
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"✓ Order PDF download works (size: {len(response.content)} bytes)")


class TestCSSGridLayout:
    """Test CSS grid layout specifics"""
    
    def test_payment_auth_section_grid_css(self, auth_token):
        """Verify .payment-auth-section uses CSS grid with correct columns"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        # Check for grid-template-columns: 1fr 260px
        assert "grid-template-columns" in html, "Missing grid-template-columns"
        assert "1fr 260px" in html or "1fr, 260px" in html, "Grid columns should be 1fr 260px"
        print("✓ .payment-auth-section has correct grid columns (1fr 260px)")
    
    def test_auth_column_grid_rows(self, auth_token):
        """Verify .auth-column uses grid-template-rows: auto auto"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        # Check for auth-column grid
        assert "grid-template-rows" in html, "Missing grid-template-rows"
        print("✓ .auth-column has grid-template-rows")
    
    def test_page_break_avoid(self, auth_token):
        """Verify page-break-inside: avoid on critical sections"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        assert "page-break-inside: avoid" in html or "break-inside: avoid" in html, "Missing page-break-inside: avoid"
        print("✓ Critical sections have page-break-inside: avoid")
    
    def test_no_horizontal_overflow(self, auth_token):
        """Verify page has overflow: hidden to prevent horizontal overflow"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/{INVOICE_ID}/preview")
        html = response.text
        # Check .page class has overflow: hidden
        assert "overflow: hidden" in html or "overflow:hidden" in html, "Missing overflow: hidden"
        print("✓ Page has overflow: hidden")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
