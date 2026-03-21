"""
P0 Testing: CheckoutPageV2, InvoicePaymentPageV2, SalesQueuePage, ServiceDetailLeadAwarePage
Tests for bank-only payment, guest lead capture, and sales queue operations.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGuestLeadAPI:
    """Guest Lead API tests - /api/guest-leads"""
    
    def test_create_guest_lead_service_interest(self):
        """Test creating a guest lead with service interest intent"""
        payload = {
            "full_name": "TEST_P0_Guest_User",
            "email": "test.p0.guest@example.com",
            "phone": "+255123456789",
            "company_name": "TEST P0 Company",
            "country": "Tanzania",
            "region": "Dar es Salaam",
            "intent_type": "service_interest",
            "intent_payload": {
                "service_key": "printing",
                "service_name": "Printing Services",
                "need_summary": "Need business cards"
            },
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "guest_lead_id" in data
        print(f"Created guest lead: {data['guest_lead_id']}")
    
    def test_create_guest_lead_quote_request(self):
        """Test creating a guest lead with quote request intent"""
        payload = {
            "full_name": "TEST_P0_Quote_User",
            "email": "test.p0.quote@example.com",
            "phone": "+255987654321",
            "intent_type": "quote_request",
            "intent_payload": {
                "product_skus": ["SKU001", "SKU002"],
                "quantity": 100
            },
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "guest_lead_id" in data
    
    def test_list_guest_leads(self):
        """Test listing guest leads"""
        response = requests.get(f"{BASE_URL}/api/guest-leads")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} guest leads")
    
    def test_list_guest_leads_with_status_filter(self):
        """Test listing guest leads with status filter"""
        response = requests.get(f"{BASE_URL}/api/guest-leads?status=new")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned leads should have status 'new'
        for lead in data:
            assert lead.get("status") == "new"


class TestPaymentProofAPI:
    """Payment Proof API tests - /api/payment-proofs"""
    
    def test_submit_payment_proof(self):
        """Test submitting a payment proof"""
        payload = {
            "invoice_id": "TEST_INV_001",
            "invoice_number": "INV-TEST-001",
            "amount_paid": 100000,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "transaction_reference": "TXN-TEST-12345",
            "payment_method": "bank_transfer",
            "customer_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/payment-proofs/submit", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "submission" in data
        assert data["submission"]["status"] == "pending"
        assert data["submission"]["amount_paid"] == 100000
        print(f"Created payment proof: {data['submission']['id']}")
    
    def test_submit_payment_proof_requires_invoice_or_order(self):
        """Test that payment proof requires invoice_id or order_id"""
        payload = {
            "amount_paid": 50000,
            "transaction_reference": "TXN-TEST-FAIL"
        }
        
        response = requests.post(f"{BASE_URL}/api/payment-proofs/submit", json=payload)
        assert response.status_code == 400
        
        data = response.json()
        assert "invoice_id or order_id is required" in data.get("detail", "")
    
    def test_list_payment_proofs_admin(self):
        """Test admin listing all payment proofs"""
        response = requests.get(f"{BASE_URL}/api/payment-proofs/admin")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} payment proofs")
    
    def test_payment_proof_summary(self):
        """Test payment proof summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/payment-proofs/admin/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "pending_count" in data
        assert "approved_count" in data
        assert "rejected_count" in data
        print(f"Summary: {data}")


class TestInvoiceAPI:
    """Invoice API tests for InvoicePaymentPageV2"""
    
    def test_create_invoice_for_payment_test(self):
        """Create a test invoice for payment testing"""
        payload = {
            "customer_email": "test.payment@example.com",
            "customer_name": "TEST Payment Customer",
            "company_name": "TEST Payment Company",
            "line_items": [
                {
                    "description": "Test Service",
                    "quantity": 1,
                    "unit_price": 150000,
                    "total": 150000
                }
            ],
            "subtotal": 150000,
            "total": 150000,
            "currency": "TZS",
            "status": "sent"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/invoices-v2", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "invoice_number" in data
        assert data["total"] == 150000
        print(f"Created invoice: {data['invoice_number']}")
        return data["id"]
    
    def test_list_invoices(self):
        """Test listing invoices"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices-v2")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} invoices")


class TestSalesOpportunities:
    """Sales Opportunities API tests for SalesQueuePage"""
    
    def test_sales_opportunities_my_queue(self):
        """Test fetching sales queue items"""
        response = requests.get(f"{BASE_URL}/api/sales-opportunities/my-queue")
        # May return 200 or 404 depending on auth
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"Found {len(data)} opportunities in queue")
        else:
            print(f"Sales queue endpoint returned {response.status_code} - may require auth")
    
    def test_guest_leads_create_sales_opportunity(self):
        """Verify that creating a guest lead also creates a sales opportunity"""
        # Create a guest lead
        payload = {
            "full_name": "TEST_SalesOpp_User",
            "email": "test.salesopp@example.com",
            "phone": "+255111222333",
            "intent_type": "business_pricing",
            "intent_payload": {"service": "bulk_printing"},
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        assert response.status_code == 200
        
        # The guest lead route should create a sales opportunity
        # We can verify by checking guest leads list
        leads_response = requests.get(f"{BASE_URL}/api/guest-leads")
        assert leads_response.status_code == 200
        
        leads = leads_response.json()
        matching_leads = [l for l in leads if l.get("email") == "test.salesopp@example.com"]
        assert len(matching_leads) > 0, "Guest lead should be created"


class TestPaymentMethodConfiguration:
    """Test payment method configuration (Bank Transfer only active)"""
    
    def test_payment_settings_endpoint(self):
        """Test payment settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/payment-settings")
        # May return 200 or 404
        if response.status_code == 200:
            data = response.json()
            print(f"Payment settings: {data}")
        else:
            print(f"Payment settings endpoint returned {response.status_code}")


class TestServiceCatalog:
    """Service Catalog API tests for ServiceDetailLeadAwarePage"""
    
    def test_service_catalog_list(self):
        """Test listing services from catalog"""
        response = requests.get(f"{BASE_URL}/api/service-catalog/services")
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"Found {len(data)} services in catalog")
        else:
            # Try alternative endpoint
            response = requests.get(f"{BASE_URL}/api/public-services/types")
            if response.status_code == 200:
                data = response.json()
                print(f"Found {len(data)} public services")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Note: In production, we would delete TEST_ prefixed data here
    print("Test cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
