"""
PDF Export & Resend Notification Integration Tests
Tests for:
- Premium PDF export for invoices and quotes
- Notification status endpoint
- Quote creation with graceful notification failure
- Campaign performance summary
- Service request status updates with notification trigger
"""
import pytest
import requests
import os
from datetime import datetime
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNotificationStatus:
    """Notification system status endpoint tests"""
    
    def test_notification_status_endpoint(self):
        """GET /api/admin/notifications-test/status - should return resend_configured status"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications-test/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "resend_configured" in data
        assert isinstance(data["resend_configured"], bool)
        # Without RESEND_API_KEY, should be False
        assert data["resend_configured"] == False
        assert data.get("api_key_preview") is None
        print(f"✓ Notification status: resend_configured={data['resend_configured']}")


class TestPDFExport:
    """PDF export endpoint tests for quotes and invoices"""
    
    @pytest.fixture
    def quote_id(self):
        """Get an existing quote ID for testing"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", params={"limit": 1})
        if response.status_code == 200 and response.json():
            return response.json()[0].get("id")
        # Create a new quote if none exists
        quote_data = {
            "customer_name": "TEST PDF Quote Customer",
            "customer_email": f"test_pdf_{uuid4().hex[:6]}@test.com",
            "currency": "TZS",
            "line_items": [{"description": "PDF Test Item", "quantity": 1, "unit_price": 10000, "total": 10000}],
            "subtotal": 10000,
            "tax": 0,
            "discount": 0,
            "total": 10000,
            "status": "draft"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_data)
        if create_response.status_code in [200, 201]:
            return create_response.json().get("id")
        pytest.skip("Could not get or create a quote for PDF testing")
    
    @pytest.fixture
    def invoice_id(self):
        """Get an existing invoice ID for testing"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices-v2", params={"limit": 1})
        if response.status_code == 200 and response.json():
            return response.json()[0].get("id")
        pytest.skip("No invoices available for PDF testing")
    
    def test_quote_pdf_export(self, quote_id):
        """GET /api/documents/pdf/quote/{quote_id} - should return PDF with Content-Type: application/pdf"""
        response = requests.get(f"{BASE_URL}/api/documents/pdf/quote/{quote_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("Content-Type") == "application/pdf", "Content-Type should be application/pdf"
        
        # Check PDF signature
        content = response.content
        assert content[:5] == b"%PDF-", "Response should start with PDF signature"
        assert len(content) > 500, "PDF content should have reasonable size"
        
        print(f"✓ Quote PDF export successful: {len(content)} bytes")
    
    def test_invoice_pdf_export(self, invoice_id):
        """GET /api/documents/pdf/invoice/{invoice_id} - should return PDF with Content-Type: application/pdf"""
        response = requests.get(f"{BASE_URL}/api/documents/pdf/invoice/{invoice_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("Content-Type") == "application/pdf", "Content-Type should be application/pdf"
        
        # Check PDF signature
        content = response.content
        assert content[:5] == b"%PDF-", "Response should start with PDF signature"
        assert len(content) > 500, "PDF content should have reasonable size"
        
        print(f"✓ Invoice PDF export successful: {len(content)} bytes")
    
    def test_quote_pdf_not_found(self):
        """GET /api/documents/pdf/quote/{invalid_id} - should return 404"""
        fake_id = "000000000000000000000000"
        response = requests.get(f"{BASE_URL}/api/documents/pdf/quote/{fake_id}")
        assert response.status_code == 404
        print("✓ Quote PDF returns 404 for invalid ID")
    
    def test_invoice_pdf_not_found(self):
        """GET /api/documents/pdf/invoice/{invalid_id} - should return 404"""
        fake_id = "000000000000000000000000"
        response = requests.get(f"{BASE_URL}/api/documents/pdf/invoice/{fake_id}")
        assert response.status_code == 404
        print("✓ Invoice PDF returns 404 for invalid ID")


class TestQuoteCreationWithNotification:
    """Quote creation tests - notification should fail gracefully without RESEND_API_KEY"""
    
    def test_create_quote_notification_graceful_failure(self):
        """POST /api/admin/quotes-v2 - should create quote (notification will fail gracefully)"""
        test_id = uuid4().hex[:8]
        quote_data = {
            "customer_name": f"TEST Notification {test_id}",
            "customer_email": f"test_notif_{test_id}@test.com",
            "currency": "TZS",
            "line_items": [
                {"description": "Notification Test Item", "quantity": 2, "unit_price": 25000, "total": 50000}
            ],
            "subtotal": 50000,
            "tax": 9000,
            "discount": 0,
            "total": 59000,
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_data)
        
        # Quote creation should succeed even if notification fails
        assert response.status_code in [200, 201], f"Quote creation failed: {response.text}"
        
        data = response.json()
        assert data.get("quote_number"), "Quote should have quote_number"
        assert data["quote_number"].startswith("QTN-"), "Quote number should start with QTN-"
        assert data.get("customer_name") == quote_data["customer_name"]
        assert data.get("customer_email") == quote_data["customer_email"]
        assert float(data.get("total", 0)) == quote_data["total"]
        
        print(f"✓ Quote created successfully: {data['quote_number']} (notification would fail gracefully without API key)")
        
        # Verify persistence via GET
        quote_id = data.get("id")
        get_response = requests.get(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched.get("quote_number") == data["quote_number"]
        print(f"✓ Quote persisted and verified via GET")


class TestCampaignPerformance:
    """Campaign performance summary endpoint tests"""
    
    def test_campaign_performance_summary(self):
        """GET /api/admin/campaign-performance/summary - should return campaign metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/campaign-performance/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "campaigns" in data, "Response should have campaigns list"
        assert "totals" in data, "Response should have totals object"
        
        # Verify totals structure
        totals = data["totals"]
        assert "clicks" in totals
        assert "redemptions" in totals
        assert "revenue" in totals
        assert "discounts" in totals
        assert "commissions" in totals
        assert "conversion_rate" in totals
        
        # Verify campaigns list structure (if any campaigns exist)
        campaigns = data["campaigns"]
        if campaigns:
            campaign = campaigns[0]
            assert "campaign_id" in campaign
            assert "name" in campaign
            assert "clicks" in campaign
            assert "redemptions" in campaign
            assert "conversion_rate" in campaign
        
        print(f"✓ Campaign performance summary: {len(campaigns)} campaigns, totals: {totals}")


class TestServiceRequestStatusWithNotification:
    """Service request status update tests - notification should fail gracefully"""
    
    @pytest.fixture
    def service_request_id(self):
        """Get or create a service request for testing"""
        response = requests.get(f"{BASE_URL}/api/admin/service-requests", params={"limit": 1})
        if response.status_code == 200 and response.json():
            return response.json()[0].get("id")
        pytest.skip("No service requests available for testing")
    
    def test_service_request_status_update_graceful_notification(self, service_request_id):
        """POST /api/admin/service-requests/{id}/status - should update status (notification fails gracefully)"""
        # Get current status first
        get_response = requests.get(f"{BASE_URL}/api/admin/service-requests/{service_request_id}")
        if get_response.status_code != 200:
            pytest.skip("Could not fetch service request")
        
        original_status = get_response.json().get("status", "submitted")
        
        # Update to a different status
        new_status = "in_progress" if original_status != "in_progress" else "pending_review"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/service-requests/{service_request_id}/status",
            json={"status": new_status, "note": "TEST status update via pytest"}
        )
        
        # Status update should succeed even if notification fails
        assert response.status_code == 200, f"Status update failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == new_status, f"Status should be {new_status}"
        assert data.get("id") == service_request_id
        
        # Check timeline entry was added
        timeline = data.get("timeline", [])
        if timeline:
            latest = timeline[-1]
            assert "status_change" in latest.get("type", "")
        
        print(f"✓ Service request status updated to '{new_status}' (notification would fail gracefully)")


class TestNotificationSendEndpoint:
    """Test the notification send endpoint directly"""
    
    def test_send_test_email_without_api_key(self):
        """POST /api/admin/notifications-test/send - should return ok:false without API key"""
        payload = {
            "to": "test@example.com",
            "subject": "Test Email",
            "html": "<p>Test content</p>"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/notifications-test/send", json=payload)
        
        # Should return 200 but with ok:false
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == False, "Email should fail without RESEND_API_KEY"
        assert "error" in data, "Should have error message"
        assert "RESEND_API_KEY" in data.get("error", ""), "Error should mention missing API key"
        
        print(f"✓ Notification send gracefully fails: {data.get('error')}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
