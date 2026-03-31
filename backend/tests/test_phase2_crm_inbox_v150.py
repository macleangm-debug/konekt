"""
Phase 2 CRM/Inbox Fixes - Iteration 150
Tests for:
- Convert-to-lead flow writes to crm_leads collection
- CRM page shows converted leads (converted_from_request=true, source_request_id, source_request_type)
- CRM lead detail with timeline and related documents
- CRM intelligence routes: add note, schedule follow-up, update stage
- Idempotency: converting same request again returns existing lead
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestCRMLeadsAPI:
    """Test CRM leads list API returns leads including converted ones"""
    
    def test_get_crm_leads_returns_list(self, admin_headers):
        """GET /api/admin/crm/leads returns list of leads"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get leads: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} CRM leads")
    
    def test_crm_leads_have_required_fields(self, admin_headers):
        """Leads should have standard CRM fields"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=admin_headers)
        assert response.status_code == 200
        leads = response.json()
        
        if len(leads) > 0:
            lead = leads[0]
            # Check for standard fields
            assert "id" in lead, "Lead should have id"
            assert "created_at" in lead, "Lead should have created_at"
            print(f"Sample lead fields: {list(lead.keys())[:10]}")
    
    def test_crm_leads_include_converted_from_request(self, admin_headers):
        """Leads converted from requests should have traceability fields"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=admin_headers)
        assert response.status_code == 200
        leads = response.json()
        
        converted_leads = [l for l in leads if l.get("converted_from_request") == True]
        print(f"Found {len(converted_leads)} leads converted from requests")
        
        for lead in converted_leads:
            assert lead.get("source_request_id"), f"Converted lead {lead.get('id')} should have source_request_id"
            print(f"Converted lead: {lead.get('id')}, source_request_id: {lead.get('source_request_id')}, type: {lead.get('source_request_type')}")


class TestConvertRequestToLead:
    """Test POST /api/admin/requests/{id}/convert-to-lead"""
    
    def test_create_request_then_convert_to_lead(self, admin_headers):
        """Create a request and convert it to a CRM lead"""
        # Step 1: Create a test request
        request_payload = {
            "request_type": "contact_general",
            "guest_name": f"TEST_CRM_Convert_{datetime.now().strftime('%H%M%S')}",
            "guest_email": f"test_crm_{datetime.now().strftime('%H%M%S')}@example.com",
            "company_name": "Test Company CRM",
            "phone": "+255712345678",
            "notes": "Test request for CRM conversion"
        }
        
        # Create request via public endpoint
        create_resp = requests.post(f"{BASE_URL}/api/public-requests/contact", json=request_payload)
        assert create_resp.status_code == 200, f"Failed to create request: {create_resp.text}"
        request_data = create_resp.json()
        request_id = request_data.get("request_id")
        request_number = request_data.get("request_number")
        assert request_id, "Request should have id"
        print(f"Created request: {request_id}, number: {request_number}")
        
        # Step 2: Convert request to lead
        convert_resp = requests.post(
            f"{BASE_URL}/api/admin/requests/{request_id}/convert-to-lead",
            headers=admin_headers
        )
        assert convert_resp.status_code == 200, f"Failed to convert request: {convert_resp.text}"
        convert_data = convert_resp.json()
        
        assert convert_data.get("ok") == True, "Convert response should have ok=True"
        assert convert_data.get("lead_id"), "Convert response should have lead_id"
        assert convert_data.get("request_id") == request_id, "Convert response should have matching request_id"
        
        lead_id = convert_data.get("lead_id")
        print(f"Converted to lead: {lead_id}")
        
        # Step 3: Verify lead exists in CRM leads list
        leads_resp = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=admin_headers)
        assert leads_resp.status_code == 200
        leads = leads_resp.json()
        
        matching_lead = next((l for l in leads if l.get("id") == lead_id), None)
        assert matching_lead, f"Lead {lead_id} should appear in CRM leads list"
        assert matching_lead.get("converted_from_request") == True, "Lead should have converted_from_request=True"
        assert matching_lead.get("source_request_id") == request_id, "Lead should have source_request_id"
        print(f"Verified lead in CRM list with source_request_id: {matching_lead.get('source_request_id')}")
        
        return lead_id, request_id
    
    def test_idempotency_convert_same_request_twice(self, admin_headers):
        """Converting the same request twice should return the existing lead"""
        # Create a request
        request_payload = {
            "request_type": "service_quote",
            "guest_name": f"TEST_Idempotent_{datetime.now().strftime('%H%M%S')}",
            "guest_email": f"test_idem_{datetime.now().strftime('%H%M%S')}@example.com",
            "company_name": "Idempotent Test Co",
            "notes": "Testing idempotency"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/public-requests/contact", json=request_payload)
        assert create_resp.status_code == 200
        request_id = create_resp.json().get("request_id")
        
        # First conversion
        convert1 = requests.post(
            f"{BASE_URL}/api/admin/requests/{request_id}/convert-to-lead",
            headers=admin_headers
        )
        assert convert1.status_code == 200
        lead_id_1 = convert1.json().get("lead_id")
        
        # Second conversion (should return same lead)
        convert2 = requests.post(
            f"{BASE_URL}/api/admin/requests/{request_id}/convert-to-lead",
            headers=admin_headers
        )
        assert convert2.status_code == 200
        lead_id_2 = convert2.json().get("lead_id")
        
        assert lead_id_1 == lead_id_2, f"Idempotency failed: first={lead_id_1}, second={lead_id_2}"
        print(f"Idempotency verified: both conversions returned lead_id={lead_id_1}")


class TestCRMLeadDetail:
    """Test GET /api/admin/crm-deals/leads/{id} for lead detail with timeline and related docs"""
    
    def test_get_lead_detail(self, admin_headers):
        """Get lead detail with timeline and related documents"""
        # First get a lead
        leads_resp = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=admin_headers)
        assert leads_resp.status_code == 200
        leads = leads_resp.json()
        
        if len(leads) == 0:
            pytest.skip("No leads available to test detail")
        
        lead_id = leads[0].get("id")
        
        # Get lead detail
        detail_resp = requests.get(f"{BASE_URL}/api/admin/crm-deals/leads/{lead_id}", headers=admin_headers)
        assert detail_resp.status_code == 200, f"Failed to get lead detail: {detail_resp.text}"
        
        data = detail_resp.json()
        assert "lead" in data, "Response should have 'lead' key"
        assert "related" in data, "Response should have 'related' key"
        
        lead = data["lead"]
        related = data["related"]
        
        assert lead.get("id") == lead_id, "Lead id should match"
        print(f"Lead detail: {lead.get('contact_name') or lead.get('name')}, timeline items: {len(lead.get('timeline', []))}")
        print(f"Related docs: quotes={len(related.get('quotes', []))}, invoices={len(related.get('invoices', []))}, tasks={len(related.get('tasks', []))}")


class TestCRMIntelligenceRoutes:
    """Test CRM intelligence routes: add note, schedule follow-up, update stage"""
    
    @pytest.fixture
    def test_lead_id(self, admin_headers):
        """Get or create a test lead for intelligence tests"""
        leads_resp = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=admin_headers)
        assert leads_resp.status_code == 200
        leads = leads_resp.json()
        
        if len(leads) > 0:
            return leads[0].get("id")
        
        # Create a lead if none exist
        create_resp = requests.post(f"{BASE_URL}/api/admin/crm/leads", headers=admin_headers, json={
            "company_name": "Test Intelligence Co",
            "contact_name": "Test Contact",
            "email": f"test_intel_{datetime.now().strftime('%H%M%S')}@example.com",
            "status": "new"
        })
        assert create_resp.status_code == 200
        return create_resp.json().get("id")
    
    def test_add_note_to_lead(self, admin_headers, test_lead_id):
        """POST /api/admin/crm-intelligence/leads/{id}/note adds a note"""
        note_payload = {
            "note": f"Test note added at {datetime.now().isoformat()}",
            "actor_email": ADMIN_EMAIL
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{test_lead_id}/note",
            headers=admin_headers,
            json=note_payload
        )
        assert response.status_code == 200, f"Failed to add note: {response.text}"
        
        data = response.json()
        assert "timeline" in data, "Response should include timeline"
        
        # Verify note appears in timeline
        timeline = data.get("timeline", [])
        note_events = [t for t in timeline if t.get("event_type") == "note"]
        assert len(note_events) > 0, "Note should appear in timeline"
        print(f"Note added successfully, timeline now has {len(timeline)} events")
    
    def test_schedule_follow_up(self, admin_headers, test_lead_id):
        """POST /api/admin/crm-intelligence/leads/{id}/follow-up schedules follow-up"""
        follow_up_date = (datetime.now() + timedelta(days=3)).isoformat()
        
        payload = {
            "next_follow_up_at": follow_up_date,
            "actor_email": ADMIN_EMAIL,
            "note": "Follow-up scheduled via test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{test_lead_id}/follow-up",
            headers=admin_headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to schedule follow-up: {response.text}"
        
        data = response.json()
        assert data.get("next_follow_up_at"), "Response should have next_follow_up_at"
        print(f"Follow-up scheduled for: {data.get('next_follow_up_at')}")
    
    def test_update_lead_stage(self, admin_headers, test_lead_id):
        """POST /api/admin/crm-intelligence/leads/{id}/status updates lead stage"""
        payload = {
            "stage": "contacted",
            "actor_email": ADMIN_EMAIL,
            "note": "Stage updated via test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{test_lead_id}/status",
            headers=admin_headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to update stage: {response.text}"
        
        data = response.json()
        assert data.get("stage") == "contacted", f"Stage should be 'contacted', got: {data.get('stage')}"
        print(f"Stage updated to: {data.get('stage')}")


class TestRequestsInboxAPI:
    """Test requests inbox API still works correctly"""
    
    def test_get_admin_requests(self, admin_headers):
        """GET /api/admin/requests returns list of requests"""
        response = requests.get(f"{BASE_URL}/api/admin/requests", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get requests: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} requests in inbox")
        
        # Check for converted requests (those with linked_lead_id)
        converted = [r for r in data if r.get("linked_lead_id")]
        print(f"Converted requests (with linked_lead_id): {len(converted)}")
        
        for req in converted[:3]:  # Show first 3
            print(f"  - {req.get('request_number')}: linked_lead_id={req.get('linked_lead_id')}")
    
    def test_get_request_detail(self, admin_headers):
        """GET /api/admin/requests/{id} returns request detail"""
        # First get list
        list_resp = requests.get(f"{BASE_URL}/api/admin/requests", headers=admin_headers)
        assert list_resp.status_code == 200
        requests_list = list_resp.json()
        
        if len(requests_list) == 0:
            pytest.skip("No requests available")
        
        request_id = requests_list[0].get("id")
        
        detail_resp = requests.get(f"{BASE_URL}/api/admin/requests/{request_id}", headers=admin_headers)
        assert detail_resp.status_code == 200, f"Failed to get request detail: {detail_resp.text}"
        
        data = detail_resp.json()
        assert data.get("id") == request_id
        print(f"Request detail: {data.get('request_number')}, status: {data.get('status')}")


class TestCRMAddLeadForm:
    """Test CRM add lead form still works (regression)"""
    
    def test_create_lead_via_form(self, admin_headers):
        """POST /api/admin/crm/leads creates a new lead"""
        lead_payload = {
            "company_name": f"TEST_NewLead_{datetime.now().strftime('%H%M%S')}",
            "contact_name": "Test Contact Person",
            "email": f"test_newlead_{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "+255712345678",
            "source": "website",
            "industry": "Technology",
            "notes": "Created via test",
            "status": "new",
            "estimated_value": 50000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm/leads",
            headers=admin_headers,
            json=lead_payload
        )
        assert response.status_code == 200, f"Failed to create lead: {response.text}"
        
        data = response.json()
        assert data.get("id"), "Created lead should have id"
        assert data.get("company_name") == lead_payload["company_name"]
        print(f"Created lead: {data.get('id')}, company: {data.get('company_name')}")


class TestCRMDashboard:
    """Test CRM dashboard endpoint"""
    
    def test_crm_dashboard(self, admin_headers):
        """GET /api/admin/crm-intelligence/dashboard returns dashboard data"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-intelligence/dashboard", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get dashboard: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Dashboard should have summary"
        assert "by_stage" in data, "Dashboard should have by_stage"
        assert "by_source" in data, "Dashboard should have by_source"
        
        summary = data["summary"]
        print(f"CRM Dashboard: total_leads={summary.get('total_leads')}, won={summary.get('won')}, lost={summary.get('lost')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
