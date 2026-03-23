"""
Test Suite for Sales Rating + Feedback Pack and Branding + Enterprise PDF Pack
Tests:
- Sales Rating APIs: leaderboard, pending tasks, summary, submit rating
- Branding Settings APIs: GET and PUT
- Enterprise PDF APIs: quote, invoice, order PDF generation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSalesRatingAPIs:
    """Sales Rating endpoint tests"""
    
    def test_leaderboard_returns_list(self):
        """GET /api/sales-ratings/leaderboard - returns list of top rated sales advisors"""
        response = requests.get(f"{BASE_URL}/api/sales-ratings/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # If there are ratings, verify structure
        if len(data) > 0:
            assert "sales_owner_id" in data[0]
            assert "sales_owner_name" in data[0]
            assert "ratings_count" in data[0]
            assert "average_rating" in data[0]
    
    def test_pending_for_customer_returns_list(self):
        """GET /api/sales-ratings/pending-for-customer - returns pending rating tasks"""
        response = requests.get(f"{BASE_URL}/api/sales-ratings/pending-for-customer?customer_id=demo-customer")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # If there are pending tasks, verify structure
        if len(data) > 0:
            assert "order_id" in data[0]
            assert "order_number" in data[0]
            assert "sales_owner_id" in data[0]
            assert "sales_owner_name" in data[0]
    
    def test_summary_returns_rating_stats(self):
        """GET /api/sales-ratings/summary - returns rating summary for sales advisor"""
        response = requests.get(f"{BASE_URL}/api/sales-ratings/summary?sales_owner_id=demo-sales")
        assert response.status_code == 200
        data = response.json()
        assert "sales_owner_id" in data
        assert "ratings_count" in data
        assert "average_rating" in data
        assert "five_star_count" in data
        assert "recent_feedback" in data
        assert isinstance(data["recent_feedback"], list)
    
    def test_submit_rating_success(self):
        """POST /api/sales-ratings/submit - submits a new rating"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "customer_id": f"TEST_customer_{unique_id}",
            "order_id": f"TEST_order_{unique_id}",
            "sales_owner_id": f"TEST_sales_{unique_id}",
            "sales_owner_name": "Test Sales Advisor",
            "stars": 4,
            "feedback": "Good service!"
        }
        response = requests.post(f"{BASE_URL}/api/sales-ratings/submit", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
    
    def test_submit_rating_missing_fields(self):
        """POST /api/sales-ratings/submit - fails with missing required fields"""
        payload = {
            "customer_id": "test",
            "stars": 5
        }
        response = requests.post(f"{BASE_URL}/api/sales-ratings/submit", json=payload)
        assert response.status_code == 400
    
    def test_submit_rating_invalid_stars(self):
        """POST /api/sales-ratings/submit - fails with invalid star rating"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "customer_id": f"TEST_customer_{unique_id}",
            "order_id": f"TEST_order_{unique_id}",
            "sales_owner_id": f"TEST_sales_{unique_id}",
            "stars": 6  # Invalid - must be 1-5
        }
        response = requests.post(f"{BASE_URL}/api/sales-ratings/submit", json=payload)
        assert response.status_code == 400
    
    def test_submit_rating_duplicate_rejected(self):
        """POST /api/sales-ratings/submit - rejects duplicate rating for same order"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "customer_id": f"TEST_dup_customer_{unique_id}",
            "order_id": f"TEST_dup_order_{unique_id}",
            "sales_owner_id": f"TEST_dup_sales_{unique_id}",
            "sales_owner_name": "Test Sales Advisor",
            "stars": 5,
            "feedback": "First rating"
        }
        # First submission should succeed
        response1 = requests.post(f"{BASE_URL}/api/sales-ratings/submit", json=payload)
        assert response1.status_code == 200
        
        # Second submission should fail with 409 Conflict
        payload["feedback"] = "Duplicate rating"
        response2 = requests.post(f"{BASE_URL}/api/sales-ratings/submit", json=payload)
        assert response2.status_code == 409
    
    def test_leaderboard_includes_submitted_rating(self):
        """Verify submitted rating appears in leaderboard"""
        unique_id = str(uuid.uuid4())[:8]
        sales_owner_id = f"TEST_leaderboard_sales_{unique_id}"
        
        # Submit a rating
        payload = {
            "customer_id": f"TEST_leaderboard_customer_{unique_id}",
            "order_id": f"TEST_leaderboard_order_{unique_id}",
            "sales_owner_id": sales_owner_id,
            "sales_owner_name": "Leaderboard Test Advisor",
            "stars": 5,
            "feedback": "Perfect!"
        }
        submit_response = requests.post(f"{BASE_URL}/api/sales-ratings/submit", json=payload)
        assert submit_response.status_code == 200
        
        # Check leaderboard
        leaderboard_response = requests.get(f"{BASE_URL}/api/sales-ratings/leaderboard")
        assert leaderboard_response.status_code == 200
        leaderboard = leaderboard_response.json()
        
        # Find our sales advisor in leaderboard
        found = False
        for entry in leaderboard:
            if entry.get("sales_owner_id") == sales_owner_id:
                found = True
                assert entry["ratings_count"] >= 1
                assert entry["average_rating"] == 5.0
                break
        assert found, f"Sales advisor {sales_owner_id} not found in leaderboard"
    
    def test_summary_reflects_submitted_rating(self):
        """Verify submitted rating appears in summary"""
        unique_id = str(uuid.uuid4())[:8]
        sales_owner_id = f"TEST_summary_sales_{unique_id}"
        
        # Submit a rating
        payload = {
            "customer_id": f"TEST_summary_customer_{unique_id}",
            "order_id": f"TEST_summary_order_{unique_id}",
            "sales_owner_id": sales_owner_id,
            "sales_owner_name": "Summary Test Advisor",
            "stars": 4,
            "feedback": "Great work!"
        }
        submit_response = requests.post(f"{BASE_URL}/api/sales-ratings/submit", json=payload)
        assert submit_response.status_code == 200
        
        # Check summary
        summary_response = requests.get(f"{BASE_URL}/api/sales-ratings/summary?sales_owner_id={sales_owner_id}")
        assert summary_response.status_code == 200
        summary = summary_response.json()
        
        assert summary["sales_owner_id"] == sales_owner_id
        assert summary["ratings_count"] >= 1
        assert summary["average_rating"] == 4.0


class TestBrandingSettingsAPIs:
    """Branding Settings endpoint tests"""
    
    def test_get_branding_settings_returns_defaults(self):
        """GET /api/admin/branding-settings - returns branding configuration"""
        response = requests.get(f"{BASE_URL}/api/admin/branding-settings")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        assert "company_name" in data
        assert "logo_url" in data
        assert "icon_url" in data
        assert "company_email" in data
        assert "company_phone" in data
        assert "company_address" in data
        assert "company_tin" in data
        assert "company_vat_number" in data
        assert "quote_footer_note" in data
        assert "invoice_footer_note" in data
        assert "order_footer_note" in data
    
    def test_update_branding_settings(self):
        """PUT /api/admin/branding-settings - updates branding configuration"""
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/branding-settings")
        original_settings = get_response.json()
        
        # Update settings
        update_payload = {
            "company_name": "TEST_Updated Company",
            "company_tin": "TEST_TIN_12345",
            "company_vat_number": "TEST_VAT_67890"
        }
        put_response = requests.put(f"{BASE_URL}/api/admin/branding-settings", json=update_payload)
        assert put_response.status_code == 200
        put_data = put_response.json()
        assert put_data.get("ok") == True
        assert put_data["value"]["company_name"] == "TEST_Updated Company"
        assert put_data["value"]["company_tin"] == "TEST_TIN_12345"
        assert put_data["value"]["company_vat_number"] == "TEST_VAT_67890"
        
        # Verify GET returns updated values
        verify_response = requests.get(f"{BASE_URL}/api/admin/branding-settings")
        verify_data = verify_response.json()
        assert verify_data["company_name"] == "TEST_Updated Company"
        assert verify_data["company_tin"] == "TEST_TIN_12345"
        
        # Restore original settings
        restore_payload = {
            "company_name": original_settings.get("company_name", "Konekt"),
            "company_tin": original_settings.get("company_tin", ""),
            "company_vat_number": original_settings.get("company_vat_number", "")
        }
        requests.put(f"{BASE_URL}/api/admin/branding-settings", json=restore_payload)
    
    def test_update_footer_notes(self):
        """PUT /api/admin/branding-settings - updates PDF footer notes"""
        update_payload = {
            "quote_footer_note": "TEST_Quote footer note",
            "invoice_footer_note": "TEST_Invoice footer note",
            "order_footer_note": "TEST_Order footer note"
        }
        put_response = requests.put(f"{BASE_URL}/api/admin/branding-settings", json=update_payload)
        assert put_response.status_code == 200
        put_data = put_response.json()
        assert put_data["value"]["quote_footer_note"] == "TEST_Quote footer note"
        assert put_data["value"]["invoice_footer_note"] == "TEST_Invoice footer note"
        assert put_data["value"]["order_footer_note"] == "TEST_Order footer note"
        
        # Restore defaults
        restore_payload = {
            "quote_footer_note": "Thank you for choosing Konekt.",
            "invoice_footer_note": "Payment terms apply as stated on this document.",
            "order_footer_note": "Order updates will be shared through your account and WhatsApp when enabled."
        }
        requests.put(f"{BASE_URL}/api/admin/branding-settings", json=restore_payload)


class TestEnterprisePDFAPIs:
    """Enterprise PDF generation endpoint tests"""
    
    def test_quote_pdf_generation(self):
        """GET /api/enterprise-docs/quote/{id}/pdf - generates enterprise branded PDF"""
        quote_id = "QT-20260323-D1B15F"
        response = requests.get(f"{BASE_URL}/api/enterprise-docs/quote/{quote_id}/pdf")
        assert response.status_code == 200
        
        # Verify PDF content type
        assert "application/pdf" in response.headers.get("Content-Type", "")
        
        # Verify Content-Disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert ".pdf" in content_disposition
        
        # Verify PDF content starts with PDF magic bytes
        assert response.content[:4] == b'%PDF'
        
        # Verify reasonable file size (should be > 1KB)
        assert len(response.content) > 1000
    
    def test_quote_pdf_not_found(self):
        """GET /api/enterprise-docs/quote/{id}/pdf - returns 404 for non-existent quote"""
        response = requests.get(f"{BASE_URL}/api/enterprise-docs/quote/NONEXISTENT-QUOTE/pdf")
        assert response.status_code == 404
    
    def test_invoice_pdf_not_found(self):
        """GET /api/enterprise-docs/invoice/{id}/pdf - returns 404 for non-existent invoice"""
        response = requests.get(f"{BASE_URL}/api/enterprise-docs/invoice/NONEXISTENT-INVOICE/pdf")
        assert response.status_code == 404
    
    def test_order_pdf_not_found(self):
        """GET /api/enterprise-docs/order/{id}/pdf - returns 404 for non-existent order"""
        response = requests.get(f"{BASE_URL}/api/enterprise-docs/order/NONEXISTENT-ORDER/pdf")
        assert response.status_code == 404


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_ratings(self):
        """Cleanup TEST_ prefixed ratings from database"""
        # This is a placeholder - actual cleanup would require direct DB access
        # The test data uses TEST_ prefix for easy identification
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
