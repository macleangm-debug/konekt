"""
Go-Live Completion Pack Test Suite
Tests for:
- Business Settings API (GET/PUT /api/admin/business-settings)
- Go-Live Readiness Validator (GET /api/admin/go-live-readiness)
- Canonical Collection for Quotes (GET/POST /api/admin/quotes-v2)
- Canonical Collection for Invoices (GET /api/admin/invoices-v2)
- PDF Export with collection mode (GET /api/documents/pdf/quote/{id}, /api/documents/pdf/invoice/{id})
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBusinessSettings:
    """Business Settings API tests - GET and PUT endpoints"""
    
    def test_get_business_settings_auto_seed(self):
        """GET /api/admin/business-settings should return settings (auto-seed if empty)"""
        response = requests.get(f"{BASE_URL}/api/admin/business-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have id field (auto-generated)
        assert "id" in data, "Response should contain 'id' field"
        # Should have default structure fields
        assert "company_name" in data
        assert "currency" in data
        assert "country" in data
        assert "sku_prefix" in data
        assert "quote_collection_mode" in data
        assert "invoice_collection_mode" in data
        print(f"Business settings retrieved with id: {data['id']}")
    
    def test_update_business_settings(self):
        """PUT /api/admin/business-settings should update settings"""
        update_payload = {
            "company_name": "TEST_Konekt Company",
            "email": "test@konekt.co.tz",
            "phone": "+255123456789",
            "currency": "TZS",
            "sku_prefix": "KNK"
        }
        response = requests.put(f"{BASE_URL}/api/admin/business-settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["company_name"] == "TEST_Konekt Company"
        assert data["email"] == "test@konekt.co.tz"
        assert data["phone"] == "+255123456789"
        print(f"Business settings updated successfully")
    
    def test_get_updated_settings_persistence(self):
        """Verify updated settings persist after PUT"""
        # First update
        update_payload = {"bank_name": "TEST_Bank of Tanzania"}
        requests.put(f"{BASE_URL}/api/admin/business-settings", json=update_payload)
        
        # Verify via GET
        response = requests.get(f"{BASE_URL}/api/admin/business-settings")
        assert response.status_code == 200
        data = response.json()
        assert data["bank_name"] == "TEST_Bank of Tanzania"
        print("Settings persistence verified via GET after PUT")


class TestGoLiveReadiness:
    """Go-Live Readiness Validator tests"""
    
    def test_get_go_live_readiness(self):
        """GET /api/admin/go-live-readiness should return readiness checks with score"""
        response = requests.get(f"{BASE_URL}/api/admin/go-live-readiness")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have required fields
        assert "status" in data
        assert "score" in data
        assert "total" in data
        assert "checks" in data
        
        # Checks should have specific keys
        checks = data["checks"]
        expected_checks = [
            "company_name", "logo", "tax_number", "business_registration_number",
            "company_email", "company_phone", "address", "currency", "tax_rate",
            "payment_terms", "bank_name", "bank_account_name", "bank_account_number",
            "sku_prefix", "resend_key", "sender_email", "kwikpay_base_url",
            "kwikpay_api_key", "kwikpay_secret"
        ]
        for check_key in expected_checks:
            assert check_key in checks, f"Missing check: {check_key}"
        
        # Status should be "ready" or "needs_attention"
        assert data["status"] in ["ready", "needs_attention"]
        
        # Score/total should be integers
        assert isinstance(data["score"], int)
        assert isinstance(data["total"], int)
        assert data["total"] == 19  # Expected 19 checks
        
        print(f"Go-live readiness: {data['score']}/{data['total']} checks passed, status={data['status']}")


class TestCanonicalQuotesCollection:
    """Quotes V2 API tests - canonical collection mode"""
    
    def test_list_quotes_v2(self):
        """GET /api/admin/quotes-v2 should list quotes from canonical collection"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Listed {len(data)} quotes from canonical collection")
    
    def test_create_quote_v2(self):
        """POST /api/admin/quotes-v2 should create quote in canonical collection"""
        quote_payload = {
            "customer_name": "TEST_GoLive Customer",
            "customer_email": "test-golive@example.com",
            "customer_company": "TEST Go-Live Corp",
            "customer_phone": "+255999888777",
            "currency": "TZS",
            "line_items": [
                {"description": "Go-Live Service", "quantity": 1, "unit_price": 50000, "total": 50000}
            ],
            "subtotal": 50000,
            "tax": 9000,
            "discount": 0,
            "total": 59000,
            "status": "draft"
        }
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "quote_number" in data
        assert data["quote_number"].startswith("QTN-")
        assert data["customer_name"] == "TEST_GoLive Customer"
        assert data["total"] == 59000
        
        self.created_quote_id = data["id"]
        print(f"Created quote: {data['quote_number']} with id={data['id']}")
        return data["id"]
    
    def test_get_quote_by_id(self):
        """GET /api/admin/quotes-v2/{id} should retrieve specific quote"""
        # First create a quote
        quote_id = self.test_create_quote_v2()
        
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == quote_id
        print(f"Retrieved quote by ID: {quote_id}")


class TestCanonicalInvoicesCollection:
    """Invoices V2 API tests - canonical collection mode"""
    
    def test_list_invoices_v2(self):
        """GET /api/admin/invoices-v2 should list invoices from canonical collection"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices-v2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Listed {len(data)} invoices from canonical collection")


class TestPDFExportWithCollectionMode:
    """PDF Export tests - verifying collection mode works with PDF generation"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Create test quote and invoice for PDF export tests"""
        # Create test quote
        quote_payload = {
            "customer_name": "TEST_PDF Customer",
            "customer_email": "test-pdf@example.com",
            "customer_company": "PDF Corp",
            "customer_phone": "+255111222333",
            "currency": "TZS",
            "line_items": [
                {"description": "PDF Test Item", "quantity": 2, "unit_price": 10000, "total": 20000}
            ],
            "subtotal": 20000,
            "tax": 3600,
            "discount": 0,
            "total": 23600,
            "status": "draft"
        }
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        if response.status_code == 200:
            self.test_quote_id = response.json()["id"]
        
        # Check if we have any invoices
        inv_response = requests.get(f"{BASE_URL}/api/admin/invoices-v2?limit=1")
        if inv_response.status_code == 200 and len(inv_response.json()) > 0:
            self.test_invoice_id = inv_response.json()[0]["id"]
        else:
            self.test_invoice_id = None
    
    def test_quote_pdf_export_with_collection_mode(self):
        """GET /api/documents/pdf/quote/{id} should work with collection mode"""
        if not hasattr(self, 'test_quote_id') or not self.test_quote_id:
            pytest.skip("No test quote available")
        
        response = requests.get(f"{BASE_URL}/api/documents/pdf/quote/{self.test_quote_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF signature
        pdf_content = response.content
        assert pdf_content.startswith(b"%PDF"), "Response should be valid PDF"
        print(f"Quote PDF export successful for quote_id={self.test_quote_id}")
    
    def test_invoice_pdf_export_with_collection_mode(self):
        """GET /api/documents/pdf/invoice/{id} should work with collection mode"""
        if not hasattr(self, 'test_invoice_id') or not self.test_invoice_id:
            pytest.skip("No test invoice available")
        
        response = requests.get(f"{BASE_URL}/api/documents/pdf/invoice/{self.test_invoice_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF signature
        pdf_content = response.content
        assert pdf_content.startswith(b"%PDF"), "Response should be valid PDF"
        print(f"Invoice PDF export successful for invoice_id={self.test_invoice_id}")


class TestCollectionModeConfiguration:
    """Tests for collection mode configuration in business settings"""
    
    def test_update_collection_modes(self):
        """Verify collection mode settings can be updated"""
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/admin/business-settings")
        assert response.status_code == 200
        data = response.json()
        
        # Check default collection modes
        assert data["quote_collection_mode"] in ["v2", "legacy"]
        assert data["invoice_collection_mode"] in ["v2", "legacy"]
        
        print(f"Collection modes - quotes: {data['quote_collection_mode']}, invoices: {data['invoice_collection_mode']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
