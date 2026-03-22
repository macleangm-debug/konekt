"""
Phase 2 E2E Testing: Staff & Sales Flows
Tests sales queue, intelligence, opportunities, quotes, and staff performance
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestAdminAuth:
    """Test admin authentication for staff flows"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Admin login successful, token received")


class TestSalesQueue:
    """Test Sales Queue endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_sales_queue_list(self, admin_token):
        """Test listing sales queue items"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/sales-queue", headers=headers)
        assert response.status_code == 200, f"Sales queue list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Sales queue returned {len(data)} items")
        return data
    
    def test_sales_queue_stats(self, admin_token):
        """Test sales queue statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/sales-queue/stats", headers=headers)
        assert response.status_code == 200, f"Sales queue stats failed: {response.text}"
        data = response.json()
        assert "total" in data, "Stats should include total"
        assert "new" in data, "Stats should include new count"
        print(f"✓ Sales queue stats: total={data.get('total')}, new={data.get('new')}")
    
    def test_sales_queue_filter_by_stage(self, admin_token):
        """Test filtering sales queue by stage"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/sales-queue?stage=new", headers=headers)
        assert response.status_code == 200, f"Sales queue filter failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Verify all items have stage=new
        for item in data:
            assert item.get("stage") == "new", f"Item has wrong stage: {item.get('stage')}"
        print(f"✓ Sales queue filtered by stage=new: {len(data)} items")


class TestGuestLeads:
    """Test Guest Leads endpoints - these should appear in Sales Queue"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_list_guest_leads(self, admin_token):
        """Test listing guest leads"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/guest-leads", headers=headers)
        assert response.status_code == 200, f"Guest leads list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Guest leads returned {len(data)} items")
        if data:
            lead = data[0]
            print(f"  Sample lead: {lead.get('full_name')} - {lead.get('intent_type')}")
    
    def test_create_guest_lead(self, admin_token):
        """Test creating a guest lead (simulates quote request form)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {
            "full_name": "TEST_Phase2_Lead",
            "email": "test.phase2@example.com",
            "phone": "+255712345678",
            "company_name": "Test Company Ltd",
            "country": "Tanzania",
            "region": "Dar es Salaam",
            "source": "website",
            "intent_type": "quote_request",
            "intent_payload": {
                "service_category": "Office Supplies",
                "details": "Need bulk office supplies for new office",
                "urgency": "standard",
                "budget_range": "5M-10M TZS"
            }
        }
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload, headers=headers)
        assert response.status_code == 200, f"Create guest lead failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "guest_lead_id" in data, "Response should have guest_lead_id"
        print(f"✓ Created guest lead: {data.get('guest_lead_id')}")
        return data.get("guest_lead_id")


class TestSalesIntelligence:
    """Test Sales Intelligence endpoints - leaderboard and smart assignment"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_sales_leaderboard(self, admin_token):
        """Test sales intelligence leaderboard"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/sales-intelligence/leaderboard", headers=headers)
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Sales leaderboard returned {len(data)} staff members")
        if data:
            top = data[0]
            print(f"  Top performer: {top.get('sales_name')} - efficiency: {top.get('efficiency_score')}")
            # Verify efficiency score structure
            assert "efficiency_score" in top, "Should have efficiency_score"
            assert "close_rate" in top, "Should have close_rate"
            assert "response_speed_score" in top, "Should have response_speed_score"
            assert "customer_rating_score" in top, "Should have customer_rating_score"
    
    def test_smart_assignment_preview(self, admin_token):
        """Test smart assignment preview"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {
            "category": "Office Supplies",
            "source": "website",
            "lead_type": "quote_request"
        }
        response = requests.post(f"{BASE_URL}/api/sales-intelligence/assign-preview", 
                                json=payload, headers=headers)
        assert response.status_code == 200, f"Assignment preview failed: {response.text}"
        data = response.json()
        print(f"✓ Smart assignment preview:")
        print(f"  Assigned to: {data.get('assigned_sales_name')}")
        print(f"  Score: {data.get('assignment_score')}")
        print(f"  Reason: {data.get('assignment_reason')}")


class TestStaffPerformance:
    """Test Staff Performance endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_staff_sales_performance(self, admin_token):
        """Test staff sales performance endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/staff-performance/sales", headers=headers)
        assert response.status_code == 200, f"Staff performance failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Staff performance returned {len(data)} staff members")
        if data:
            for staff in data[:3]:
                print(f"  - {staff.get('sales_name')}: efficiency={staff.get('efficiency_score')}, workload={staff.get('open_workload')}")
    
    def test_supervisor_overview(self, admin_token):
        """Test supervisor overview endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/staff-performance/supervisor-overview", headers=headers)
        assert response.status_code == 200, f"Supervisor overview failed: {response.text}"
        data = response.json()
        assert "team_size" in data, "Should have team_size"
        assert "average_efficiency" in data, "Should have average_efficiency"
        print(f"✓ Supervisor overview:")
        print(f"  Team size: {data.get('team_size')}")
        print(f"  Avg efficiency: {data.get('average_efficiency')}")
        print(f"  At-risk count: {data.get('at_risk_count')}")
        print(f"  Overloaded count: {data.get('overloaded_count')}")


class TestSupervisorDashboard:
    """Test Supervisor Dashboard endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_supervisor_team_summary(self, admin_token):
        """Test supervisor team summary"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/supervisor/team-summary", headers=headers)
        assert response.status_code == 200, f"Team summary failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Supervisor team summary: {len(data)} members")
        if data:
            for member in data[:3]:
                print(f"  - {member.get('name')}: role={member.get('role')}, score={member.get('score')}")
    
    def test_supervisor_leaderboard(self, admin_token):
        """Test supervisor leaderboard"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/supervisor/leaderboard", headers=headers)
        assert response.status_code == 200, f"Supervisor leaderboard failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Supervisor leaderboard: {len(data)} top performers")


class TestQuoteWorkflow:
    """Test Quote creation and workflow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_list_quotes(self, admin_token):
        """Test listing quotes"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", headers=headers)
        assert response.status_code == 200, f"List quotes failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Quotes list returned {len(data)} quotes")
        if data:
            quote = data[0]
            print(f"  Sample quote: {quote.get('quote_number')} - status: {quote.get('status')}")
    
    def test_create_quote(self, admin_token):
        """Test creating a quote"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {
            "customer_name": "TEST_Phase2_Customer",
            "customer_email": "test.phase2.customer@example.com",
            "customer_company": "Test Phase2 Company",
            "customer_phone": "+255712345678",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Office Supplies Bundle",
                    "quantity": 10,
                    "unit_price": 50000,
                    "total": 500000
                }
            ],
            "subtotal": 500000,
            "tax": 90000,
            "discount": 0,
            "total": 590000,
            "status": "draft",
            "notes": "Test quote for Phase 2 E2E testing"
        }
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload, headers=headers)
        assert response.status_code == 200, f"Create quote failed: {response.text}"
        data = response.json()
        assert "quote_number" in data, "Response should have quote_number"
        print(f"✓ Created quote: {data.get('quote_number')}")
        return data.get("id")
    
    def test_update_quote_status_to_sent(self, admin_token):
        """Test updating quote status to sent (quote ready)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a quote
        payload = {
            "customer_name": "TEST_QuoteStatus_Customer",
            "customer_email": "test.quotestatus@example.com",
            "customer_company": "Test QuoteStatus Company",
            "currency": "TZS",
            "line_items": [{"description": "Test Item", "quantity": 1, "unit_price": 100000, "total": 100000}],
            "subtotal": 100000,
            "tax": 18000,
            "total": 118000,
            "status": "draft"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=payload, headers=headers)
        assert create_response.status_code == 200, f"Create quote failed: {create_response.text}"
        quote_id = create_response.json().get("id")
        
        # Update status to sent
        response = requests.patch(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=sent", headers=headers)
        assert response.status_code == 200, f"Update quote status failed: {response.text}"
        data = response.json()
        assert data.get("status") == "sent", f"Status should be 'sent', got: {data.get('status')}"
        print(f"✓ Quote status updated to 'sent' (quote ready)")


class TestNotifications:
    """Test Notifications for staff"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_list_notifications(self, admin_token):
        """Test listing notifications"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200, f"List notifications failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Notifications returned {len(data)} items")
    
    def test_unread_count(self, admin_token):
        """Test unread notifications count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200, f"Unread count failed: {response.text}"
        data = response.json()
        assert "count" in data, "Response should have count"
        print(f"✓ Unread notifications count: {data.get('count')}")


class TestOpportunityStageUpdate:
    """Test opportunity stage updates"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_update_opportunity_stage(self, admin_token):
        """Test updating opportunity stage"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get an opportunity from the queue
        queue_response = requests.get(f"{BASE_URL}/api/sales-queue", headers=headers)
        if queue_response.status_code != 200:
            pytest.skip("Could not get sales queue")
        
        queue = queue_response.json()
        if not queue:
            pytest.skip("No opportunities in queue to test")
        
        opportunity_id = queue[0].get("id")
        original_stage = queue[0].get("stage")
        
        # Update to contacted stage
        new_stage = "contacted" if original_stage != "contacted" else "quote_in_progress"
        payload = {
            "stage": new_stage,
            "note": "Test stage update from Phase 2 E2E testing"
        }
        response = requests.put(f"{BASE_URL}/api/sales-queue/{opportunity_id}/stage", 
                               json=payload, headers=headers)
        assert response.status_code == 200, f"Update stage failed: {response.text}"
        data = response.json()
        assert data.get("stage") == new_stage, f"Stage should be '{new_stage}', got: {data.get('stage')}"
        print(f"✓ Opportunity stage updated from '{original_stage}' to '{new_stage}'")
        
        # Restore original stage
        restore_payload = {"stage": original_stage, "note": "Restored after test"}
        requests.put(f"{BASE_URL}/api/sales-queue/{opportunity_id}/stage", 
                    json=restore_payload, headers=headers)


class TestStaffAlerts:
    """Test Staff Alerts endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_staff_alerts(self, admin_token):
        """Test staff alerts endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/staff-alerts", headers=headers)
        assert response.status_code == 200, f"Staff alerts failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Staff alerts returned {len(data)} alerts")
    
    def test_staff_alerts_summary(self, admin_token):
        """Test staff alerts summary"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/staff-alerts/summary", headers=headers)
        assert response.status_code == 200, f"Staff alerts summary failed: {response.text}"
        data = response.json()
        print(f"✓ Staff alerts summary: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
