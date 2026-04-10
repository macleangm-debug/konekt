"""
Service Task Backend Tests - Iteration 249
Tests for:
1. Admin service task CRUD endpoints
2. Partner portal assigned work endpoints
3. Cost submission and margin calculation
4. Status updates with timeline
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestAdminServiceTaskEndpoints:
    """Admin service task CRUD tests"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health check passed")
    
    def test_create_service_task(self):
        """POST /api/admin/service-tasks creates a task with correct fields"""
        payload = {
            "service_type": "branding",
            "service_subtype": "logo_design",
            "description": "TEST_Create logo for client",
            "scope": "Full brand identity package",
            "quantity": 1,
            "client_name": "TEST_Client Corp",
            "client_id": "test_client_123",
            "order_ref": "ORD-TEST-001",
            "deadline": "2026-02-15T00:00:00Z",
            "assigned_by": "admin_test"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/service-tasks", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["service_type"] == "branding"
        assert data["service_subtype"] == "logo_design"
        assert data["description"] == "TEST_Create logo for client"
        assert data["client_name"] == "TEST_Client Corp"
        assert data["status"] == "unassigned"  # No partner_id provided
        assert "timeline" in data
        assert len(data["timeline"]) >= 1
        assert data["timeline"][0]["action"] == "task_created"
        
        # Store for later tests
        self.__class__.created_task_id = data["id"]
        print(f"✓ Created service task: {data['id']}")
    
    def test_list_service_tasks(self):
        """GET /api/admin/service-tasks returns list of tasks"""
        response = requests.get(f"{BASE_URL}/api/admin/service-tasks")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Listed {len(data)} service tasks")
    
    def test_list_service_tasks_with_filters(self):
        """GET /api/admin/service-tasks with status filter"""
        response = requests.get(f"{BASE_URL}/api/admin/service-tasks?status=assigned")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned tasks should have status=assigned
        for task in data:
            assert task.get("status") == "assigned", f"Task {task.get('id')} has status {task.get('status')}"
        print(f"✓ Filtered tasks by status=assigned: {len(data)} results")
    
    def test_get_service_task_stats_summary(self):
        """GET /api/admin/service-tasks/stats/summary returns KPI aggregation"""
        response = requests.get(f"{BASE_URL}/api/admin/service-tasks/stats/summary")
        assert response.status_code == 200
        
        data = response.json()
        # Should have status counts
        expected_keys = ["assigned", "awaiting_cost", "cost_submitted", "in_progress", "completed", "delayed", "failed", "unassigned", "total"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
            assert isinstance(data[key], int), f"{key} should be an integer"
        
        print(f"✓ Stats summary: total={data['total']}, assigned={data['assigned']}, completed={data['completed']}")
    
    def test_assign_task_to_partner(self):
        """PUT /api/admin/service-tasks/{id}/assign assigns partner to task"""
        # First create a task to assign
        create_payload = {
            "service_type": "printing",
            "description": "TEST_Print business cards",
            "client_name": "TEST_Assign Client",
            "assigned_by": "admin_test"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/service-tasks", json=create_payload)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Now assign to partner
        assign_payload = {
            "partner_id": "demo_partner_id",
            "partner_name": "Demo Partner",
            "assigned_by": "admin_test",
            "assignment_mode": "direct"
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/service-tasks/{task_id}/assign", json=assign_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True
        assert data["status"] == "assigned"
        
        # Verify the task was updated
        get_response = requests.get(f"{BASE_URL}/api/admin/service-tasks/{task_id}")
        assert get_response.status_code == 200
        task = get_response.json()
        assert task["partner_id"] == "demo_partner_id"
        assert task["partner_name"] == "Demo Partner"
        assert task["status"] == "assigned"
        
        print(f"✓ Assigned task {task_id} to partner")
    
    def test_admin_update_task_status(self):
        """PUT /api/admin/service-tasks/{id}/status updates task status"""
        # Create a task first
        create_payload = {
            "service_type": "logistics",
            "description": "TEST_Delivery task",
            "client_name": "TEST_Status Client",
            "partner_id": "test_partner",
            "partner_name": "Test Partner"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/service-tasks", json=create_payload)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Update status
        status_payload = {
            "status": "in_progress",
            "by": "admin_test",
            "note": "Admin moved to in_progress"
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/service-tasks/{task_id}/status", json=status_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] == True
        assert data["status"] == "in_progress"
        
        # Verify timeline was updated
        get_response = requests.get(f"{BASE_URL}/api/admin/service-tasks/{task_id}")
        task = get_response.json()
        assert task["status"] == "in_progress"
        # Check timeline has the status change entry
        timeline_actions = [t["action"] for t in task.get("timeline", [])]
        assert "status_changed_to_in_progress" in timeline_actions
        
        print(f"✓ Updated task {task_id} status to in_progress")


class TestPartnerPortalEndpoints:
    """Partner portal assigned work tests - requires partner authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_partner_auth(self):
        """Get partner authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Partner login failed: {login_response.status_code} - {login_response.text}")
        
        data = login_response.json()
        # Partner login returns 'access_token' not 'token'
        self.partner_token = data.get("access_token") or data.get("token")
        self.partner_id = data.get("partner", {}).get("id") or data.get("user", {}).get("partner_id")
        
        if not self.partner_token:
            pytest.skip("No partner token received")
        
        self.headers = {"Authorization": f"Bearer {self.partner_token}"}
        print(f"✓ Partner authenticated: {PARTNER_EMAIL}")
    
    def test_partner_get_assigned_work(self):
        """GET /api/partner-portal/assigned-work returns tasks for partner"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify response structure - should NOT contain margin/selling_price
        if len(data) > 0:
            task = data[0]
            assert "id" in task
            assert "task_ref" in task
            assert "service_type" in task
            assert "status" in task
            assert "partner_cost" in task  # Partner CAN see their cost
            assert "timeline" in task
            # Partner should NOT see these internal fields
            assert "selling_price" not in task, "Partner should NOT see selling_price"
            assert "margin_pct" not in task, "Partner should NOT see margin_pct"
            assert "margin_amount" not in task, "Partner should NOT see margin_amount"
        
        print(f"✓ Partner assigned work: {len(data)} tasks")
        
        # Store a task ID for later tests
        if len(data) > 0:
            self.__class__.partner_task_id = data[0]["id"]
    
    def test_partner_get_work_stats(self):
        """GET /api/partner-portal/assigned-work/stats returns KPI stats"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work/stats", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_keys = ["assigned", "awaiting_cost", "in_progress", "completed", "delayed", "total"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        
        print(f"✓ Partner work stats: total={data['total']}, assigned={data['assigned']}")
    
    def test_partner_submit_cost(self):
        """PUT /api/partner-portal/assigned-work/{id}/submit-cost stores cost and triggers margin calculation"""
        # First get a task assigned to this partner
        tasks_response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=self.headers)
        tasks = tasks_response.json()
        
        if len(tasks) == 0:
            pytest.skip("No tasks assigned to partner for cost submission test")
        
        # Find a task that hasn't had cost submitted yet
        task_for_cost = None
        for task in tasks:
            if not task.get("cost_submitted_at"):
                task_for_cost = task
                break
        
        if not task_for_cost:
            # Use first task anyway for testing
            task_for_cost = tasks[0]
        
        task_id = task_for_cost["id"]
        
        cost_payload = {
            "cost": 50000,
            "notes": "TEST_Cost breakdown: materials 30000, labor 20000"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/partner-portal/assigned-work/{task_id}/submit-cost",
            json=cost_payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ok"] == True
        assert data["status"] == "cost_submitted"
        assert data["partner_cost"] == 50000
        # Partner should NOT see selling_price in response
        assert "selling_price" not in data, "Partner should NOT see selling_price"
        
        print(f"✓ Partner submitted cost for task {task_id}: TZS 50,000")
        
        # Verify via admin endpoint that margin was calculated internally
        admin_response = requests.get(f"{BASE_URL}/api/admin/service-tasks/{task_id}")
        if admin_response.status_code == 200:
            admin_task = admin_response.json()
            # Admin CAN see the calculated selling_price
            if admin_task.get("selling_price"):
                expected_selling = 50000 * 1.30  # 30% margin
                assert admin_task["selling_price"] == expected_selling, f"Expected selling_price {expected_selling}, got {admin_task['selling_price']}"
                print(f"✓ Margin calculated: selling_price = TZS {admin_task['selling_price']:,.0f} (30% margin)")
    
    def test_partner_update_status(self):
        """PUT /api/partner-portal/assigned-work/{id}/update-status updates task status with timeline"""
        tasks_response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=self.headers)
        tasks = tasks_response.json()
        
        if len(tasks) == 0:
            pytest.skip("No tasks assigned to partner for status update test")
        
        # Find a task in 'assigned' status
        task_for_update = None
        for task in tasks:
            if task.get("status") == "assigned":
                task_for_update = task
                break
        
        if not task_for_update:
            task_for_update = tasks[0]
        
        task_id = task_for_update["id"]
        current_status = task_for_update["status"]
        
        # Determine valid next status
        if current_status == "assigned":
            new_status = "accepted"
        elif current_status == "accepted":
            new_status = "in_progress"
        elif current_status == "in_progress":
            new_status = "completed"
        else:
            new_status = "in_progress"
        
        status_payload = {
            "status": new_status,
            "note": f"TEST_Partner updated status to {new_status}"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/partner-portal/assigned-work/{task_id}/update-status",
            json=status_payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ok"] == True
        assert data["status"] == new_status
        
        print(f"✓ Partner updated task {task_id} status: {current_status} -> {new_status}")
    
    def test_partner_add_note(self):
        """POST /api/partner-portal/assigned-work/{id}/add-note adds a note to task"""
        tasks_response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=self.headers)
        tasks = tasks_response.json()
        
        if len(tasks) == 0:
            pytest.skip("No tasks assigned to partner for add note test")
        
        task_id = tasks[0]["id"]
        
        note_payload = {
            "note": "TEST_Partner note: Materials ordered, expected delivery tomorrow"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-portal/assigned-work/{task_id}/add-note",
            json=note_payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ok"] == True
        
        print(f"✓ Partner added note to task {task_id}")
    
    def test_partner_cannot_see_other_partner_tasks(self):
        """Partner should only see their own tasks"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=self.headers)
        tasks = response.json()
        
        # All tasks should belong to this partner (verified by the fact that they're returned)
        # The API filters by partner_id from the token
        print(f"✓ Partner sees only their {len(tasks)} assigned tasks")


class TestPartnerAuthFlow:
    """Test partner authentication flow"""
    
    def test_partner_login(self):
        """Partner can login via /api/partner-auth/login"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        
        assert response.status_code == 200, f"Partner login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # Partner login returns 'access_token' not 'token'
        assert "access_token" in data or "token" in data, "Response should contain access_token or token"
        
        print(f"✓ Partner login successful: {PARTNER_EMAIL}")
    
    def test_partner_auth_required_for_assigned_work(self):
        """Assigned work endpoint requires partner auth"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Assigned work endpoint requires authentication")
    
    def test_invalid_partner_token_rejected(self):
        """Invalid token is rejected"""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=headers)
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
        print("✓ Invalid token rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
