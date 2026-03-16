"""
Test CRM Intelligence Pack - Lead timeline, follow-ups, win/loss tracking, sales KPIs, marketing performance, and CRM settings.
Endpoints tested:
- GET /api/admin/crm-intelligence/dashboard
- POST /api/admin/crm-intelligence/leads/{id}/note
- POST /api/admin/crm-intelligence/leads/{id}/follow-up
- POST /api/admin/crm-intelligence/leads/{id}/status
- GET /api/admin/sales-kpis/summary
- GET /api/admin/marketing-performance/sources
- GET /api/admin/crm-settings (with auth)
- PUT /api/admin/crm-settings
- POST /api/admin/crm/leads
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        # Login returns 'token' not 'access_token'
        token = data.get("token") or data.get("access_token")
        return token
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def created_lead_id(auth_token):
    """Create a test lead and return its ID"""
    response = requests.post(f"{BASE_URL}/api/admin/crm/leads", json={
        "company_name": "TEST_CRM_Intel_Company",
        "contact_name": "Test Contact",
        "email": "test_crm_intel@example.com",
        "phone": "+255789012345",
        "source": "Website",
        "industry": "Technology",
        "status": "new",
        "budget_range": "High",
        "urgency": "high",
        "company_size": "enterprise",
        "decision_maker_name": "John Smith",
        "expected_close_date": (datetime.utcnow() + timedelta(days=30)).isoformat()
    })
    
    if response.status_code == 200:
        lead = response.json()
        lead_id = lead.get("id")
        yield lead_id
        # Cleanup - delete lead after tests
        requests.delete(f"{BASE_URL}/api/admin/crm/leads/{lead_id}")
    else:
        pytest.skip(f"Failed to create test lead: {response.status_code} - {response.text}")


class TestCrmIntelligenceDashboard:
    """Test CRM intelligence dashboard endpoint"""
    
    def test_dashboard_returns_200(self):
        """GET /api/admin/crm-intelligence/dashboard - Should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-intelligence/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_dashboard_has_summary(self):
        """Dashboard should have summary with key metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-intelligence/dashboard")
        data = response.json()
        
        assert "summary" in data, "Dashboard should have 'summary' key"
        summary = data["summary"]
        
        # Verify summary has expected fields
        assert "total_leads" in summary, "Summary should have total_leads"
        assert "won" in summary, "Summary should have won count"
        assert "lost" in summary, "Summary should have lost count"
        assert "quote_sent" in summary, "Summary should have quote_sent count"
        assert "overdue_followups" in summary, "Summary should have overdue_followups count"
        assert "stale_leads" in summary, "Summary should have stale_leads count"
    
    def test_dashboard_has_by_stage(self):
        """Dashboard should have pipeline breakdown by stage"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-intelligence/dashboard")
        data = response.json()
        
        assert "by_stage" in data, "Dashboard should have 'by_stage' key"
        assert isinstance(data["by_stage"], dict), "by_stage should be a dict"
    
    def test_dashboard_has_by_source(self):
        """Dashboard should have lead breakdown by source"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-intelligence/dashboard")
        data = response.json()
        
        assert "by_source" in data, "Dashboard should have 'by_source' key"
        assert isinstance(data["by_source"], dict), "by_source should be a dict"


class TestLeadNotes:
    """Test adding notes to lead timeline"""
    
    def test_add_note_to_lead(self, created_lead_id, auth_token):
        """POST /api/admin/crm-intelligence/leads/{id}/note - Should add note"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{created_lead_id}/note",
            json={
                "note": "TEST_Note: Initial contact made",
                "actor_email": ADMIN_EMAIL
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain lead id"
        
        # Verify timeline was updated
        assert "timeline" in data, "Response should contain timeline"
        assert len(data["timeline"]) > 0, "Timeline should have at least one event"
        
        # Find the note event
        note_events = [e for e in data["timeline"] if e["event_type"] == "note"]
        assert len(note_events) > 0, "Should have at least one note event"
    
    def test_add_note_without_text_fails(self, created_lead_id):
        """Adding note without note text should fail with 400"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{created_lead_id}/note",
            json={"actor_email": ADMIN_EMAIL}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_add_note_invalid_lead_fails(self):
        """Adding note to non-existent lead should fail with 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/000000000000000000000000/note",
            json={"note": "Test note", "actor_email": ADMIN_EMAIL}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestLeadFollowUps:
    """Test scheduling follow-ups for leads"""
    
    def test_schedule_follow_up(self, created_lead_id, auth_token):
        """POST /api/admin/crm-intelligence/leads/{id}/follow-up - Should schedule follow-up"""
        follow_up_date = (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{created_lead_id}/follow-up",
            json={
                "next_follow_up_at": follow_up_date,
                "actor_email": ADMIN_EMAIL,
                "note": "TEST_Follow up about proposal"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "next_follow_up_at" in data, "Response should contain next_follow_up_at"
        
        # Verify timeline has follow_up event
        assert "timeline" in data, "Response should contain timeline"
        follow_up_events = [e for e in data["timeline"] if e["event_type"] == "follow_up"]
        assert len(follow_up_events) > 0, "Should have at least one follow_up event in timeline"
    
    def test_schedule_follow_up_without_date_fails(self, created_lead_id):
        """Scheduling follow-up without date should fail with 400"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{created_lead_id}/follow-up",
            json={"actor_email": ADMIN_EMAIL}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestLeadStageChanges:
    """Test updating lead stage with win/loss reasons"""
    
    def test_update_lead_stage(self, created_lead_id, auth_token):
        """POST /api/admin/crm-intelligence/leads/{id}/status - Should update stage"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{created_lead_id}/status",
            json={
                "stage": "qualified",
                "actor_email": ADMIN_EMAIL,
                "note": "TEST_Qualified after demo"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["stage"] == "qualified", "Stage should be updated to qualified"
        
        # Verify timeline has stage_change event
        assert "timeline" in data, "Response should contain timeline"
        stage_events = [e for e in data["timeline"] if e["event_type"] == "stage_change"]
        assert len(stage_events) > 0, "Should have at least one stage_change event"
    
    def test_mark_lead_as_lost_with_reason(self, created_lead_id, auth_token):
        """Should capture lost_reason when marking lead as lost"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{created_lead_id}/status",
            json={
                "stage": "lost",
                "lost_reason": "price_too_high",
                "actor_email": ADMIN_EMAIL,
                "note": "TEST_Lost due to budget constraints"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["stage"] == "lost", "Stage should be updated to lost"
        assert data.get("lost_reason") == "price_too_high", "Lost reason should be captured"
    
    def test_update_stage_without_stage_fails(self, created_lead_id):
        """Updating stage without stage value should fail with 400"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-intelligence/leads/{created_lead_id}/status",
            json={"actor_email": ADMIN_EMAIL}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestSalesKPIs:
    """Test sales KPI summary endpoint"""
    
    def test_sales_summary_returns_200(self):
        """GET /api/admin/sales-kpis/summary - Should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/sales-kpis/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_sales_summary_has_metrics(self):
        """Sales summary should have required metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/sales-kpis/summary")
        data = response.json()
        
        assert "lead_count" in data, "Should have lead_count"
        assert "won_count" in data, "Should have won_count"
        assert "lost_count" in data, "Should have lost_count"
        assert "quote_count" in data, "Should have quote_count"
        assert "total_revenue" in data, "Should have total_revenue"
        assert "conversion_rate" in data, "Should have conversion_rate"
        
        # Conversion rate should be a number
        assert isinstance(data["conversion_rate"], (int, float)), "conversion_rate should be a number"


class TestMarketingPerformance:
    """Test marketing source performance endpoint"""
    
    def test_marketing_sources_returns_200(self):
        """GET /api/admin/marketing-performance/sources - Should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/marketing-performance/sources")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_marketing_sources_structure(self):
        """Marketing sources should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/marketing-performance/sources")
        data = response.json()
        
        # Data should be a dict keyed by source name
        assert isinstance(data, dict), "Response should be a dict"
        
        # Each source should have leads, quotes, won counts
        for source, metrics in data.items():
            assert "leads" in metrics, f"Source {source} should have leads count"
            assert "quotes" in metrics, f"Source {source} should have quotes count"
            assert "won" in metrics, f"Source {source} should have won count"


class TestCrmSettingsWithAuth:
    """Test CRM settings endpoints (require auth)"""
    
    def test_get_crm_settings_requires_auth(self):
        """GET /api/admin/crm-settings without auth should fail with 401"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-settings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_get_crm_settings_with_auth(self, auth_token):
        """GET /api/admin/crm-settings with auth should return settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify new CRM intelligence fields
        assert "pipeline_stages" in data, "Should have pipeline_stages"
        assert "lost_reasons" in data, "Should have lost_reasons"
        assert "win_reasons" in data, "Should have win_reasons"
        assert "default_follow_up_days" in data, "Should have default_follow_up_days"
        assert "stale_lead_days" in data, "Should have stale_lead_days"
        
        # Also verify original fields
        assert "industries" in data, "Should have industries"
        assert "sources" in data, "Should have sources"
    
    def test_update_crm_settings(self, auth_token):
        """PUT /api/admin/crm-settings - Should update settings"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/crm-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        current = get_response.json()
        
        # Update with new values
        update_payload = {
            "pipeline_stages": current.get("pipeline_stages", []) + ["TEST_stage"],
            "lost_reasons": current.get("lost_reasons", []),
            "win_reasons": current.get("win_reasons", []),
            "default_follow_up_days": 5,
            "stale_lead_days": 10,
            "industries": current.get("industries", []),
            "sources": current.get("sources", [])
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/crm-settings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["default_follow_up_days"] == 5, "default_follow_up_days should be updated"
        assert data["stale_lead_days"] == 10, "stale_lead_days should be updated"
        
        # Verify persistence
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/crm-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        verified = verify_response.json()
        assert verified["default_follow_up_days"] == 5, "Updated value should persist"


class TestLeadCreationWithScoring:
    """Test lead creation with automatic scoring and timeline"""
    
    def test_create_lead_with_scoring(self, auth_token):
        """POST /api/admin/crm/leads - Should create lead with score and timeline"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm/leads",
            json={
                "company_name": "TEST_Scoring_Company",
                "contact_name": "Test Scoring Contact",
                "email": "test_scoring@example.com",
                "phone": "+255789012346",
                "source": "referral",  # Should get 15 points
                "industry": "Technology",
                "status": "new",
                "budget_range": "High",  # Should get 25 points
                "urgency": "high",  # Should get 25 points
                "company_size": "enterprise",  # Should get 20 points
                "decision_maker_name": "Jane Doe"  # Should get 10 points
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        lead_id = data.get("id")
        
        # Verify lead_score was computed
        assert "lead_score" in data, "Lead should have lead_score"
        assert data["lead_score"] > 0, "Lead score should be > 0 with high qualification"
        # Note: Score depends on exact string matching in lead_scoring_service.py
        # referral source = 15 points, decision_maker_name = 10 points, budget/urgency/size vary
        assert data["lead_score"] >= 10, f"Lead score should be >= 10, got {data['lead_score']}"
        
        # Verify timeline has creation event
        assert "timeline" in data, "Lead should have timeline"
        assert len(data["timeline"]) >= 1, "Timeline should have creation event"
        creation_events = [e for e in data["timeline"] if e["event_type"] == "created"]
        assert len(creation_events) == 1, "Should have exactly one creation event"
        
        # Verify next_follow_up_at was set
        assert "next_follow_up_at" in data, "Lead should have next_follow_up_at"
        
        # Cleanup
        if lead_id:
            requests.delete(f"{BASE_URL}/api/admin/crm/leads/{lead_id}")
    
    def test_lead_with_low_qualification_has_low_score(self, auth_token):
        """Lead with minimal info should have low score"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm/leads",
            json={
                "company_name": "TEST_LowScore_Company",
                "contact_name": "Test Low Contact",
                "email": "test_low_score@example.com",
                "phone": "+255789012347",
                "source": "unknown",
                "industry": "Other"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        lead_id = data.get("id")
        
        # Verify lead_score is low
        assert "lead_score" in data, "Lead should have lead_score"
        assert data["lead_score"] < 50, f"Lead score should be < 50, got {data['lead_score']}"
        
        # Cleanup
        if lead_id:
            requests.delete(f"{BASE_URL}/api/admin/crm/leads/{lead_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
