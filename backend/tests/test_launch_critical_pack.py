"""
Test Suite for Launch Critical Completion Pack
Tests WhatsApp Twilio integration endpoints and related features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWhatsAppTwilioIntegration:
    """WhatsApp Twilio Integration API Tests"""
    
    def test_whatsapp_status_endpoint(self):
        """GET /api/whatsapp/status - returns Twilio configuration status"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert "twilio_configured" in data
        assert "account_sid_set" in data
        assert "auth_token_set" in data
        assert "whatsapp_from_set" in data
        
        # Since Twilio is not configured, all should be False
        assert data["twilio_configured"] == False
        assert data["account_sid_set"] == False
        assert data["auth_token_set"] == False
        assert data["whatsapp_from_set"] == False
        print("PASS: WhatsApp status endpoint returns correct structure")
    
    def test_whatsapp_send_live_missing_params(self):
        """POST /api/whatsapp/send-live - returns 400 for missing params"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/send-live",
            json={}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("PASS: WhatsApp send-live returns 400 for missing params")
    
    def test_whatsapp_send_live_graceful_failure(self):
        """POST /api/whatsapp/send-live - handles message sending gracefully without Twilio"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/send-live",
            json={
                "to": "+255123456789",
                "message": "Test message from automated test"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should return graceful failure since Twilio is not configured
        assert "ok" in data
        assert data["ok"] == False
        assert "status" in data
        assert data["status"] == "missing_credentials"
        assert "message" in data
        print("PASS: WhatsApp send-live handles graceful failure without Twilio")
    
    def test_whatsapp_payment_approved_event_missing_to(self):
        """POST /api/whatsapp/event/payment-approved-live - returns 400 for missing 'to'"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/event/payment-approved-live",
            json={
                "customer_name": "Test Customer",
                "invoice_number": "INV-001"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("PASS: Payment approved event returns 400 for missing 'to'")
    
    def test_whatsapp_payment_approved_event_queues_notification(self):
        """POST /api/whatsapp/event/payment-approved-live - queues payment notification"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/event/payment-approved-live",
            json={
                "to": "+255123456789",
                "customer_name": "Test Customer",
                "invoice_number": "INV-TEST-001"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert data["ok"] == True
        assert "queued" in data
        assert data["queued"] == True
        assert "message" in data
        assert "Test Customer" in data["message"]
        assert "INV-TEST-001" in data["message"]
        print("PASS: Payment approved event queues notification correctly")
    
    def test_whatsapp_quote_ready_event_missing_to(self):
        """POST /api/whatsapp/event/quote-ready-live - returns 400 for missing 'to'"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/event/quote-ready-live",
            json={
                "customer_name": "Test Customer",
                "quote_number": "QT-001"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("PASS: Quote ready event returns 400 for missing 'to'")
    
    def test_whatsapp_quote_ready_event_queues_notification(self):
        """POST /api/whatsapp/event/quote-ready-live - queues quote notification"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/event/quote-ready-live",
            json={
                "to": "+255123456789",
                "customer_name": "Test Customer",
                "quote_number": "QT-TEST-001",
                "total": "150000"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert data["ok"] == True
        assert "queued" in data
        assert data["queued"] == True
        assert "message" in data
        assert "Test Customer" in data["message"]
        assert "QT-TEST-001" in data["message"]
        print("PASS: Quote ready event queues notification correctly")
    
    def test_whatsapp_order_shipped_event_missing_to(self):
        """POST /api/whatsapp/event/order-shipped-live - returns 400 for missing 'to'"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/event/order-shipped-live",
            json={
                "customer_name": "Test Customer",
                "order_number": "ORD-001"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("PASS: Order shipped event returns 400 for missing 'to'")
    
    def test_whatsapp_order_shipped_event_queues_notification(self):
        """POST /api/whatsapp/event/order-shipped-live - queues shipping notification"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/event/order-shipped-live",
            json={
                "to": "+255123456789",
                "customer_name": "Test Customer",
                "order_number": "ORD-TEST-001",
                "tracking_info": "TRACK-12345"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "ok" in data
        assert data["ok"] == True
        assert "queued" in data
        assert data["queued"] == True
        assert "message" in data
        assert "Test Customer" in data["message"]
        assert "ORD-TEST-001" in data["message"]
        assert "TRACK-12345" in data["message"]
        print("PASS: Order shipped event queues notification correctly")
    
    def test_whatsapp_logs_endpoint(self):
        """GET /api/whatsapp/logs - returns message logs"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/logs")
        assert response.status_code == 200
        
        data = response.json()
        # Should return a list
        assert isinstance(data, list)
        
        # If there are logs, verify structure
        if len(data) > 0:
            log = data[0]
            # Logs should have either 'to' or 'event' field
            assert "to" in log or "event" in log
            # Logs should have status and created_at
            assert "status" in log or "delivery_status" in log
            assert "created_at" in log
        print(f"PASS: WhatsApp logs endpoint returns {len(data)} logs")


class TestCustomerOrderEndpoint:
    """Test customer order detail endpoint for timeline integration"""
    
    def get_auth_token(self):
        """Get authentication token for customer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo.customer@konekt.com",
                "password": "Demo123!"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_customer_order_detail_endpoint_exists(self):
        """GET /api/customer/orders/:orderId - endpoint exists"""
        token = self.get_auth_token()
        if not token:
            pytest.skip("Could not authenticate - skipping authenticated tests")
        
        # Test with a non-existent order ID
        response = requests.get(
            f"{BASE_URL}/api/customer/orders/non-existent-order-id",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 404 for non-existent order, not 500
        assert response.status_code in [404, 200]
        print("PASS: Customer order detail endpoint exists and handles requests")
    
    def test_customer_orders_list(self):
        """GET /api/customer/orders - returns customer orders"""
        token = self.get_auth_token()
        if not token:
            pytest.skip("Could not authenticate - skipping authenticated tests")
        
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should return a list or object with orders
        assert isinstance(data, (list, dict))
        print("PASS: Customer orders list endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
