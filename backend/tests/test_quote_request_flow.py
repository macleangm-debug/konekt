"""
Test Quote Request Flow
Tests the complete quote request flow:
1. Guest lead creation via /api/guest-leads
2. Sales opportunity auto-creation
3. Sales queue listing
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQuoteRequestFlow:
    """Test the complete quote request flow from form submission to sales queue"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.unique_id = str(int(time.time()))
        self.test_email = f"test.quote.flow.{self.unique_id}@example.com"
        self.test_name = f"TEST_QuoteFlow_{self.unique_id}"
        self.test_company = f"TEST Company Flow {self.unique_id}"
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
    
    def test_create_guest_lead_quote_request(self):
        """Test creating a guest lead with quote_request intent"""
        payload = {
            "full_name": self.test_name,
            "email": self.test_email,
            "phone": "+255 700 111 222",
            "company_name": self.test_company,
            "country": "Tanzania",
            "region": "Dar es Salaam",
            "source": "website_quote_form",
            "intent_type": "quote_request",
            "intent_payload": {
                "service_category": "printing_branding",
                "service_details": "Need 500 business cards for new office",
                "urgency": "within_week",
                "budget_range": "TZS 200,000 - 500,000",
                "additional_notes": "Prefer matte finish"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "guest_lead_id" in data
        
        self.guest_lead_id = data["guest_lead_id"]
        print(f"✓ Guest lead created with ID: {self.guest_lead_id}")
        
        return self.guest_lead_id
    
    def test_verify_guest_lead_stored(self):
        """Verify guest lead was stored correctly in database"""
        # First create the lead
        guest_lead_id = self.test_create_guest_lead_quote_request()
        
        # Then fetch it
        response = requests.get(f"{BASE_URL}/api/guest-leads/{guest_lead_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data is not None
        assert data.get("full_name") == self.test_name
        assert data.get("email") == self.test_email
        assert data.get("company_name") == self.test_company
        assert data.get("intent_type") == "quote_request"
        assert data.get("source") == "website_quote_form"
        
        # Verify intent_payload
        intent = data.get("intent_payload", {})
        assert intent.get("service_category") == "printing_branding"
        assert intent.get("urgency") == "within_week"
        
        print(f"✓ Guest lead verified in database")
    
    def test_sales_opportunity_created(self):
        """Verify sales opportunity was auto-created from guest lead"""
        # Create a guest lead first
        guest_lead_id = self.test_create_guest_lead_quote_request()
        
        # Check sales queue for the opportunity
        response = requests.get(f"{BASE_URL}/api/sales-queue")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our opportunity
        matching = [opp for opp in data if opp.get("guest_lead_id") == guest_lead_id]
        assert len(matching) > 0, f"No sales opportunity found for guest_lead_id: {guest_lead_id}"
        
        opp = matching[0]
        assert opp.get("customer_email") == self.test_email
        assert opp.get("customer_name") == self.test_name
        assert opp.get("company_name") == self.test_company
        assert opp.get("opportunity_type") == "guest_lead"
        assert opp.get("source") == "website_quote_form"
        assert opp.get("stage") == "new"
        assert "Quote Request" in opp.get("title", "")
        
        print(f"✓ Sales opportunity auto-created and verified")
    
    def test_list_guest_leads(self):
        """Test listing guest leads"""
        response = requests.get(f"{BASE_URL}/api/guest-leads")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one guest lead"
        
        # Verify structure of first lead
        lead = data[0]
        assert "id" in lead
        assert "full_name" in lead
        assert "email" in lead
        assert "intent_type" in lead
        
        print(f"✓ Listed {len(data)} guest leads")
    
    def test_list_sales_queue(self):
        """Test listing sales queue"""
        response = requests.get(f"{BASE_URL}/api/sales-queue")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ Listed {len(data)} sales opportunities")
    
    def test_sales_queue_stats(self):
        """Test sales queue stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/sales-queue/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "new" in data
        assert "contacted" in data
        
        print(f"✓ Sales queue stats: total={data.get('total')}, new={data.get('new')}")
    
    def test_filter_guest_leads_by_status(self):
        """Test filtering guest leads by status"""
        response = requests.get(f"{BASE_URL}/api/guest-leads?status=new")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned leads should have status=new
        for lead in data:
            assert lead.get("status") == "new", f"Expected status=new, got {lead.get('status')}"
        
        print(f"✓ Filtered guest leads by status=new: {len(data)} results")
    
    def test_filter_sales_queue_by_stage(self):
        """Test filtering sales queue by stage"""
        response = requests.get(f"{BASE_URL}/api/sales-queue?stage=new")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned opportunities should have stage=new
        for opp in data:
            assert opp.get("stage") == "new", f"Expected stage=new, got {opp.get('stage')}"
        
        print(f"✓ Filtered sales queue by stage=new: {len(data)} results")


class TestQuoteRequestValidation:
    """Test validation and edge cases for quote request"""
    
    def test_create_guest_lead_minimal_fields(self):
        """Test creating guest lead with minimal required fields"""
        unique_id = str(int(time.time()))
        payload = {
            "full_name": f"TEST_Minimal_{unique_id}",
            "email": f"test.minimal.{unique_id}@example.com",
            "phone": "+255 700 000 000",
            "intent_type": "quote_request"
        }
        
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        
        print("✓ Guest lead created with minimal fields")
    
    def test_create_guest_lead_different_intent_types(self):
        """Test creating guest leads with different intent types"""
        intent_types = ["quote_request", "service_interest", "business_pricing"]
        
        for intent_type in intent_types:
            unique_id = str(int(time.time()))
            payload = {
                "full_name": f"TEST_Intent_{intent_type}_{unique_id}",
                "email": f"test.intent.{intent_type}.{unique_id}@example.com",
                "phone": "+255 700 000 001",
                "intent_type": intent_type,
                "intent_payload": {"test": "data"}
            }
            
            response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
            assert response.status_code == 200, f"Failed for intent_type: {intent_type}"
            
            print(f"✓ Guest lead created with intent_type: {intent_type}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
