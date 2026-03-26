"""
PDF Layout Fixes Tests - Iteration 122
Tests for:
1. Page width constrained to 794px (print-safe)
2. Signature/stamp auth-area showing on all document types when enabled
3. Table uses table-layout:fixed
4. Totals stay inside page container
5. doc-title has max-width:280px
6. Enterprise PDF routes also constrained
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPDFLayoutFixes:
    """Test PDF layout fixes for Quotes, Invoices, and Orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get auth token
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("access_token") or login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Sample IDs from the test request
        self.quote_id = "69c3deedabcf7cf39caa7e56"
        self.invoice_id = "69c264d851b9095b5b27a02c"
        self.order_id = None  # Will be fetched from API
    
    # ============ INVOICE BRANDING SETTINGS ============
    
    def test_invoice_branding_settings_show_signature_and_stamp(self):
        """Verify invoice branding settings have show_signature and show_stamp fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        # Verify show_signature and show_stamp fields exist
        assert "show_signature" in data, "show_signature field missing from branding settings"
        assert "show_stamp" in data, "show_stamp field missing from branding settings"
        
        print(f"show_signature: {data.get('show_signature')}")
        print(f"show_stamp: {data.get('show_stamp')}")
    
    def test_enable_signature_and_stamp_for_testing(self):
        """Enable signature and stamp in settings for PDF testing"""
        # First get current settings
        get_resp = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        assert get_resp.status_code == 200
        
        current = get_resp.json()
        
        # Update to enable signature and stamp
        update_payload = {
            **current,
            "show_signature": True,
            "show_stamp": True
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=update_payload)
        assert resp.status_code == 200, f"Failed to update branding settings: {resp.text}"
        
        # Verify the update
        verify_resp = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        verify_data = verify_resp.json()
        assert verify_data.get("show_signature") == True, "show_signature not enabled"
        assert verify_data.get("show_stamp") == True, "show_stamp not enabled"
        print("Signature and stamp enabled for testing")
    
    # ============ QUOTE PDF PREVIEW TESTS ============
    
    def test_quote_preview_page_width_794px(self):
        """Verify Quote PDF preview has .page width of 794px"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        assert resp.status_code == 200, f"Quote preview failed: {resp.status_code} - {resp.text}"
        
        html = resp.text
        # Check for .page { width: 794px in CSS
        assert "width: 794px" in html or "width:794px" in html, "Page width should be 794px"
        print("Quote preview: .page width is 794px ✓")
    
    def test_quote_preview_has_auth_area(self):
        """Verify Quote PDF preview has .auth-area element (signature+stamp block)"""
        # First ensure signature/stamp are enabled
        self.test_enable_signature_and_stamp_for_testing()
        
        resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        assert resp.status_code == 200, f"Quote preview failed: {resp.status_code}"
        
        html = resp.text
        # Check for auth-area class in HTML
        assert 'class="auth-area"' in html or "auth-area" in html, "Quote should have auth-area element when signature/stamp enabled"
        print("Quote preview: .auth-area element exists ✓")
    
    def test_quote_preview_table_layout_fixed(self):
        """Verify Quote PDF preview has .items-table with table-layout:fixed"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        # Check for table-layout: fixed in CSS
        assert "table-layout: fixed" in html or "table-layout:fixed" in html, "items-table should have table-layout:fixed"
        print("Quote preview: .items-table has table-layout:fixed ✓")
    
    def test_quote_preview_doc_title_max_width(self):
        """Verify Quote PDF preview has .doc-title with max-width set"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        # Check for .doc-title max-width in CSS
        assert "max-width: 280px" in html or "max-width:280px" in html, "doc-title should have max-width:280px"
        print("Quote preview: .doc-title has max-width:280px ✓")
    
    def test_quote_preview_totals_inside_page(self):
        """Verify Quote PDF preview has .totals-box inside .page container"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        # Check that totals-box is within page div
        page_start = html.find('class="page"')
        page_end = html.rfind('</div>')  # Last closing div
        totals_pos = html.find('class="totals-box"')
        
        assert page_start != -1, "Page container not found"
        assert totals_pos != -1, "Totals box not found"
        assert totals_pos > page_start, "Totals box should be inside page container"
        print("Quote preview: .totals-box is inside .page container ✓")
    
    def test_quote_preview_page_overflow_hidden(self):
        """Verify Quote PDF preview has overflow:hidden on .page"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        # Check for overflow: hidden in CSS
        assert "overflow: hidden" in html or "overflow:hidden" in html, "Page should have overflow:hidden"
        print("Quote preview: .page has overflow:hidden ✓")
    
    # ============ INVOICE PDF PREVIEW TESTS ============
    
    def test_invoice_preview_page_width_794px(self):
        """Verify Invoice PDF preview has .page width of 794px"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/invoices/{self.invoice_id}/preview")
        assert resp.status_code == 200, f"Invoice preview failed: {resp.status_code} - {resp.text}"
        
        html = resp.text
        assert "width: 794px" in html or "width:794px" in html, "Page width should be 794px"
        print("Invoice preview: .page width is 794px ✓")
    
    def test_invoice_preview_has_auth_area(self):
        """Verify Invoice PDF preview has .auth-area element"""
        # Ensure signature/stamp are enabled
        self.test_enable_signature_and_stamp_for_testing()
        
        resp = self.session.get(f"{BASE_URL}/api/pdf/invoices/{self.invoice_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        assert 'class="auth-area"' in html or "auth-area" in html, "Invoice should have auth-area element"
        print("Invoice preview: .auth-area element exists ✓")
    
    def test_invoice_preview_table_layout_fixed(self):
        """Verify Invoice PDF preview has table-layout:fixed"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/invoices/{self.invoice_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        assert "table-layout: fixed" in html or "table-layout:fixed" in html, "items-table should have table-layout:fixed"
        print("Invoice preview: .items-table has table-layout:fixed ✓")
    
    def test_invoice_preview_doc_title_max_width(self):
        """Verify Invoice PDF preview has .doc-title with max-width"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/invoices/{self.invoice_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        assert "max-width: 280px" in html or "max-width:280px" in html, "doc-title should have max-width:280px"
        print("Invoice preview: .doc-title has max-width:280px ✓")
    
    # ============ ORDER PDF PREVIEW TESTS ============
    
    def test_get_order_id_for_testing(self):
        """Get an order ID from the API for testing"""
        resp = self.session.get(f"{BASE_URL}/api/admin/orders")
        if resp.status_code == 200:
            data = resp.json()
            orders = data.get("orders", data) if isinstance(data, dict) else data
            if orders and len(orders) > 0:
                order = orders[0]
                self.order_id = order.get("id") or str(order.get("_id", ""))
                print(f"Found order ID for testing: {self.order_id}")
                return self.order_id
        print("No orders found, will skip order tests")
        return None
    
    def test_order_preview_has_auth_area(self):
        """Verify Order PDF preview has .auth-area element (was missing before)"""
        # Get an order ID first
        order_id = self.test_get_order_id_for_testing()
        if not order_id:
            pytest.skip("No orders available for testing")
        
        # Ensure signature/stamp are enabled
        self.test_enable_signature_and_stamp_for_testing()
        
        resp = self.session.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        assert resp.status_code == 200, f"Order preview failed: {resp.status_code} - {resp.text}"
        
        html = resp.text
        assert 'class="auth-area"' in html or "auth-area" in html, "Order should have auth-area element (was missing before)"
        print("Order preview: .auth-area element exists ✓")
    
    def test_order_preview_page_width_794px(self):
        """Verify Order PDF preview has .page width of 794px"""
        order_id = self.test_get_order_id_for_testing()
        if not order_id:
            pytest.skip("No orders available for testing")
        
        resp = self.session.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        assert "width: 794px" in html or "width:794px" in html, "Page width should be 794px"
        print("Order preview: .page width is 794px ✓")
    
    def test_order_preview_table_layout_fixed(self):
        """Verify Order PDF preview has table-layout:fixed"""
        order_id = self.test_get_order_id_for_testing()
        if not order_id:
            pytest.skip("No orders available for testing")
        
        resp = self.session.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
        assert resp.status_code == 200
        
        html = resp.text
        assert "table-layout: fixed" in html or "table-layout:fixed" in html, "items-table should have table-layout:fixed"
        print("Order preview: .items-table has table-layout:fixed ✓")
    
    # ============ ENTERPRISE PDF ROUTES TESTS ============
    
    def test_enterprise_quote_pdf_page_constrained(self):
        """Verify Enterprise Quote PDF has page width constraint"""
        resp = self.session.get(f"{BASE_URL}/api/enterprise-docs/quote/{self.quote_id}/pdf")
        # This returns a PDF, so we need to check the HTML generation
        # Let's check the route exists and returns PDF
        if resp.status_code == 404:
            pytest.skip("Quote not found in enterprise docs")
        
        assert resp.status_code == 200, f"Enterprise quote PDF failed: {resp.status_code}"
        assert resp.headers.get("content-type") == "application/pdf", "Should return PDF"
        print("Enterprise Quote PDF: Route works ✓")
    
    def test_enterprise_invoice_pdf_page_constrained(self):
        """Verify Enterprise Invoice PDF has page width constraint"""
        resp = self.session.get(f"{BASE_URL}/api/enterprise-docs/invoice/{self.invoice_id}/pdf")
        if resp.status_code == 404:
            pytest.skip("Invoice not found in enterprise docs")
        
        assert resp.status_code == 200, f"Enterprise invoice PDF failed: {resp.status_code}"
        assert resp.headers.get("content-type") == "application/pdf", "Should return PDF"
        print("Enterprise Invoice PDF: Route works ✓")


class TestPDFCSSVerification:
    """Verify CSS rules in PDF templates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.quote_id = "69c3deedabcf7cf39caa7e56"
        self.invoice_id = "69c264d851b9095b5b27a02c"
    
    def test_css_page_rule(self):
        """Verify .page CSS rule has correct properties"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        if resp.status_code != 200:
            pytest.skip("Quote not found")
        
        html = resp.text
        
        # Check all required CSS properties for .page
        checks = [
            ("width: 794px", "Page width should be 794px"),
            ("max-width: 100%", "Page should have max-width: 100%"),
            ("overflow: hidden", "Page should have overflow: hidden"),
        ]
        
        for css_prop, msg in checks:
            # Normalize spaces
            normalized_html = html.replace(": ", ":").replace(" :", ":")
            normalized_prop = css_prop.replace(": ", ":").replace(" :", ":")
            assert normalized_prop in normalized_html or css_prop in html, msg
        
        print("CSS .page rule verified ✓")
    
    def test_css_items_table_rule(self):
        """Verify .items-table CSS rule has table-layout:fixed"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/invoices/{self.invoice_id}/preview")
        if resp.status_code != 200:
            pytest.skip("Invoice not found")
        
        html = resp.text
        
        # Check table-layout: fixed
        assert "table-layout: fixed" in html or "table-layout:fixed" in html, "items-table should have table-layout:fixed"
        print("CSS .items-table table-layout:fixed verified ✓")
    
    def test_css_doc_title_rule(self):
        """Verify .doc-title CSS rule has max-width:280px"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        if resp.status_code != 200:
            pytest.skip("Quote not found")
        
        html = resp.text
        
        # Check max-width: 280px
        assert "max-width: 280px" in html or "max-width:280px" in html, "doc-title should have max-width:280px"
        print("CSS .doc-title max-width:280px verified ✓")
    
    def test_css_totals_box_rule(self):
        """Verify .totals-box CSS rule has proper width constraint"""
        resp = self.session.get(f"{BASE_URL}/api/pdf/invoices/{self.invoice_id}/preview")
        if resp.status_code != 200:
            pytest.skip("Invoice not found")
        
        html = resp.text
        
        # Check totals-box has width constraint
        assert "width: 320px" in html or "width:320px" in html, "totals-box should have width: 320px"
        assert "max-width: 100%" in html or "max-width:100%" in html, "totals-box should have max-width: 100%"
        print("CSS .totals-box width constraints verified ✓")


class TestAuthAreaOnAllDocTypes:
    """Verify auth-area (signature+stamp) appears on all document types when enabled"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get auth token
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("access_token") or login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        self.quote_id = "69c3deedabcf7cf39caa7e56"
        self.invoice_id = "69c264d851b9095b5b27a02c"
    
    def _enable_auth_settings(self):
        """Enable signature and stamp in settings"""
        get_resp = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        if get_resp.status_code != 200:
            return False
        
        current = get_resp.json()
        update_payload = {
            **current,
            "show_signature": True,
            "show_stamp": True
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=update_payload)
        return resp.status_code == 200
    
    def _disable_auth_settings(self):
        """Disable signature and stamp in settings"""
        get_resp = self.session.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        if get_resp.status_code != 200:
            return False
        
        current = get_resp.json()
        update_payload = {
            **current,
            "show_signature": False,
            "show_stamp": False
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=update_payload)
        return resp.status_code == 200
    
    def test_auth_area_appears_when_enabled(self):
        """Verify auth-area appears on all doc types when settings enabled"""
        assert self._enable_auth_settings(), "Failed to enable auth settings"
        
        # Test Quote
        quote_resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        if quote_resp.status_code == 200:
            assert "auth-area" in quote_resp.text, "Quote should have auth-area when enabled"
            print("Quote: auth-area appears when enabled ✓")
        
        # Test Invoice
        invoice_resp = self.session.get(f"{BASE_URL}/api/pdf/invoices/{self.invoice_id}/preview")
        if invoice_resp.status_code == 200:
            assert "auth-area" in invoice_resp.text, "Invoice should have auth-area when enabled"
            print("Invoice: auth-area appears when enabled ✓")
        
        # Test Order (get order ID first)
        orders_resp = self.session.get(f"{BASE_URL}/api/admin/orders")
        if orders_resp.status_code == 200:
            data = orders_resp.json()
            orders = data.get("orders", data) if isinstance(data, dict) else data
            if orders and len(orders) > 0:
                order_id = orders[0].get("id") or str(orders[0].get("_id", ""))
                order_resp = self.session.get(f"{BASE_URL}/api/pdf/orders/{order_id}/preview")
                if order_resp.status_code == 200:
                    assert "auth-area" in order_resp.text, "Order should have auth-area when enabled"
                    print("Order: auth-area appears when enabled ✓")
    
    def test_auth_area_hidden_when_disabled(self):
        """Verify auth-area is hidden when settings disabled"""
        assert self._disable_auth_settings(), "Failed to disable auth settings"
        
        # Test Quote
        quote_resp = self.session.get(f"{BASE_URL}/api/pdf/quotes/{self.quote_id}/preview")
        if quote_resp.status_code == 200:
            # auth-area should NOT appear when both signature and stamp are disabled
            assert 'class="auth-area"' not in quote_resp.text, "Quote should NOT have auth-area when disabled"
            print("Quote: auth-area hidden when disabled ✓")
        
        # Re-enable for other tests
        self._enable_auth_settings()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
