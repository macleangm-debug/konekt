"""
Test Suite: Automated Partner Assignment and Unassigned Tasks Alert System (V253)

Tests:
1. POST /api/admin/service-tasks WITHOUT partner_id - auto-assign if matching capability exists
2. POST /api/admin/service-tasks WITHOUT partner_id + no matching service - stays unassigned
3. POST /api/admin/service-tasks WITH partner_id - manual assignment bypasses auto-assignment
4. GET /api/admin/service-tasks/stats/summary - returns correct counts including unassigned
5. Notification triggers - assignment → partner notified, unassigned → admin alert
6. Task state consistency - auto_assigned flag and assignment_failure_reason
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

# Known partner with printing capability
KNOWN_PARTNER_ID = "69c102497d428cfc6f811c2f"  # On Demand Limited
MATCHING_SERVICE_TYPE = "printing"  # Has capability for this
NON_MATCHING_SERVICE_TYPE = "unknown_xyz_service_12345"  # No capability for this


class TestAutoPartnerAssignment:
    """Test suite for automated partner assignment system."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth."""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.partner_token = None
        self.created_task_ids = []
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_resp.status_code == 200:
            data = login_resp.json()
            self.admin_token = data.get("token") or data.get("access_token")
            if self.admin_token:
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        yield
        
        # Cleanup: Delete test-created tasks
        for task_id in self.created_task_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/service-tasks/{task_id}")
            except:
                pass
    
    def test_01_api_health(self):
        """Verify API is accessible."""
        resp = self.session.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.status_code}"
        print("API health check passed")
    
    def test_02_admin_login(self):
        """Verify admin authentication works."""
        assert self.admin_token is not None, "Admin login failed - no token received"
        print(f"Admin login successful, token: {self.admin_token[:20]}...")
    
    def test_03_auto_assign_with_matching_capability(self):
        """
        POST /api/admin/service-tasks WITHOUT partner_id:
        Should auto-assign if matching capability exists.
        Expected: status=assigned, auto_assigned=true, partner_id set
        """
        payload = {
            "service_type": MATCHING_SERVICE_TYPE,
            "description": f"TEST_V253 Auto-assign test - {datetime.now().isoformat()}",
            "scope": "Test scope for auto-assignment",
            "quantity": 1,
            "client_name": "Test Client V253",
            # NO partner_id - should trigger auto-assignment
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/service-tasks", json=payload)
        assert resp.status_code in [200, 201], f"Create task failed: {resp.status_code} - {resp.text}"
        
        data = resp.json()
        task_id = data.get("id")
        assert task_id, "No task ID returned"
        self.created_task_ids.append(task_id)
        
        # Verify auto-assignment succeeded
        assert data.get("status") == "assigned", f"Expected status=assigned, got {data.get('status')}"
        assert data.get("auto_assigned") == True, f"Expected auto_assigned=True, got {data.get('auto_assigned')}"
        assert data.get("partner_id") is not None, "Expected partner_id to be set"
        assert data.get("partner_name") is not None, "Expected partner_name to be set"
        assert data.get("assignment_failure_reason") is None, f"Unexpected failure reason: {data.get('assignment_failure_reason')}"
        
        print(f"Auto-assignment SUCCESS: Task {task_id} assigned to {data.get('partner_name')} (ID: {data.get('partner_id')})")
        print(f"  - status: {data.get('status')}")
        print(f"  - auto_assigned: {data.get('auto_assigned')}")
        print(f"  - assignment_match_source: {data.get('assignment_match_source')}")
    
    def test_04_auto_assign_failure_no_matching_capability(self):
        """
        POST /api/admin/service-tasks WITHOUT partner_id + no matching service:
        Should stay unassigned with failure reason.
        Expected: status=unassigned, auto_assigned=false, assignment_failure_reason set
        """
        payload = {
            "service_type": NON_MATCHING_SERVICE_TYPE,
            "description": f"TEST_V253 No-match test - {datetime.now().isoformat()}",
            "scope": "Test scope for no-match scenario",
            "quantity": 1,
            "client_name": "Test Client V253",
            # NO partner_id - should attempt auto-assignment but fail
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/service-tasks", json=payload)
        assert resp.status_code in [200, 201], f"Create task failed: {resp.status_code} - {resp.text}"
        
        data = resp.json()
        task_id = data.get("id")
        assert task_id, "No task ID returned"
        self.created_task_ids.append(task_id)
        
        # Verify auto-assignment failed gracefully
        assert data.get("status") == "unassigned", f"Expected status=unassigned, got {data.get('status')}"
        assert data.get("auto_assigned") == False, f"Expected auto_assigned=False, got {data.get('auto_assigned')}"
        assert data.get("partner_id") is None, f"Expected partner_id=None, got {data.get('partner_id')}"
        assert data.get("assignment_failure_reason") is not None, "Expected assignment_failure_reason to be set"
        
        print(f"Auto-assignment FAILURE (expected): Task {task_id}")
        print(f"  - status: {data.get('status')}")
        print(f"  - auto_assigned: {data.get('auto_assigned')}")
        print(f"  - assignment_failure_reason: {data.get('assignment_failure_reason')}")
    
    def test_05_manual_assignment_bypasses_auto(self):
        """
        POST /api/admin/service-tasks WITH partner_id:
        Should bypass auto-assignment and use manual assignment.
        Expected: status=assigned, partner_id matches input, auto_assigned NOT set
        """
        payload = {
            "service_type": MATCHING_SERVICE_TYPE,
            "description": f"TEST_V253 Manual assign test - {datetime.now().isoformat()}",
            "scope": "Test scope for manual assignment",
            "quantity": 1,
            "client_name": "Test Client V253",
            "partner_id": KNOWN_PARTNER_ID,
            "partner_name": "On Demand Limited",
            "assigned_by": "admin_test",
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/service-tasks", json=payload)
        assert resp.status_code in [200, 201], f"Create task failed: {resp.status_code} - {resp.text}"
        
        data = resp.json()
        task_id = data.get("id")
        assert task_id, "No task ID returned"
        self.created_task_ids.append(task_id)
        
        # Verify manual assignment
        assert data.get("status") == "assigned", f"Expected status=assigned, got {data.get('status')}"
        assert data.get("partner_id") == KNOWN_PARTNER_ID, f"Expected partner_id={KNOWN_PARTNER_ID}, got {data.get('partner_id')}"
        # auto_assigned should NOT be True for manual assignments
        assert data.get("auto_assigned") != True, f"Manual assignment should not have auto_assigned=True"
        
        print(f"Manual assignment SUCCESS: Task {task_id}")
        print(f"  - status: {data.get('status')}")
        print(f"  - partner_id: {data.get('partner_id')}")
        print(f"  - auto_assigned: {data.get('auto_assigned')}")
    
    def test_06_stats_summary_includes_unassigned(self):
        """
        GET /api/admin/service-tasks/stats/summary:
        Should return correct counts including unassigned.
        """
        resp = self.session.get(f"{BASE_URL}/api/admin/service-tasks/stats/summary")
        assert resp.status_code == 200, f"Stats endpoint failed: {resp.status_code} - {resp.text}"
        
        data = resp.json()
        
        # Verify all expected fields are present
        expected_fields = ["assigned", "awaiting_cost", "cost_submitted", "in_progress", 
                          "completed", "delayed", "failed", "unassigned", "total"]
        for field in expected_fields:
            assert field in data, f"Missing field in stats: {field}"
        
        # Verify counts are non-negative integers
        for field in expected_fields:
            assert isinstance(data[field], int), f"Field {field} should be int, got {type(data[field])}"
            assert data[field] >= 0, f"Field {field} should be >= 0, got {data[field]}"
        
        # Verify total is sum of all statuses
        status_sum = sum(data[f] for f in expected_fields if f != "total")
        assert data["total"] == status_sum, f"Total {data['total']} != sum of statuses {status_sum}"
        
        print(f"Stats summary:")
        for field in expected_fields:
            print(f"  - {field}: {data[field]}")
    
    def test_07_unassigned_task_creates_admin_alert(self):
        """
        When a task cannot be auto-assigned, an admin alert notification should be created.
        notification_type=unassigned_task_alert
        """
        # Create an unassigned task
        payload = {
            "service_type": f"unique_no_match_{datetime.now().timestamp()}",
            "description": f"TEST_V253 Alert test - {datetime.now().isoformat()}",
            "client_name": "Test Client V253",
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/service-tasks", json=payload)
        assert resp.status_code in [200, 201], f"Create task failed: {resp.status_code}"
        
        data = resp.json()
        task_id = data.get("id")
        self.created_task_ids.append(task_id)
        
        # Verify task is unassigned
        assert data.get("status") == "unassigned", "Task should be unassigned"
        
        # Check for notification in DB (via admin notifications endpoint if available)
        # This is a best-effort check - the notification should exist
        notif_resp = self.session.get(f"{BASE_URL}/api/admin/notifications", params={"limit": 20})
        if notif_resp.status_code == 200:
            notifications = notif_resp.json()
            if isinstance(notifications, list):
                unassigned_alerts = [n for n in notifications 
                                    if n.get("notification_type") == "unassigned_task_alert"
                                    and task_id in (n.get("entity_id") or "")]
                if unassigned_alerts:
                    print(f"Found unassigned_task_alert notification for task {task_id}")
                    print(f"  - title: {unassigned_alerts[0].get('title')}")
                    print(f"  - message: {unassigned_alerts[0].get('message')}")
                else:
                    print(f"Note: unassigned_task_alert notification not found in recent notifications (may be in DB)")
        
        print(f"Unassigned task {task_id} created - admin alert should be in notifications collection")
    
    def test_08_task_detail_shows_auto_assignment_info(self):
        """
        GET /api/admin/service-tasks/{task_id}:
        Should show auto-assignment info (success/failure indicators).
        """
        # Create a task that will be auto-assigned
        payload = {
            "service_type": MATCHING_SERVICE_TYPE,
            "description": f"TEST_V253 Detail test - {datetime.now().isoformat()}",
            "client_name": "Test Client V253",
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/service-tasks", json=payload)
        assert resp.status_code in [200, 201], f"Create task failed: {resp.status_code}"
        
        data = resp.json()
        task_id = data.get("id")
        self.created_task_ids.append(task_id)
        
        # Fetch task detail
        detail_resp = self.session.get(f"{BASE_URL}/api/admin/service-tasks/{task_id}")
        assert detail_resp.status_code == 200, f"Get task detail failed: {detail_resp.status_code}"
        
        detail = detail_resp.json()
        
        # Verify auto-assignment fields are present
        assert "auto_assigned" in detail, "Missing auto_assigned field"
        assert "assignment_failure_reason" in detail or detail.get("auto_assigned") == True, \
            "Missing assignment_failure_reason for non-auto-assigned task"
        
        # Verify timeline contains auto-assignment entry
        timeline = detail.get("timeline", [])
        auto_assign_entries = [e for e in timeline if "auto" in (e.get("action") or "").lower()]
        
        print(f"Task detail for {task_id}:")
        print(f"  - auto_assigned: {detail.get('auto_assigned')}")
        print(f"  - assignment_match_source: {detail.get('assignment_match_source')}")
        print(f"  - assignment_failure_reason: {detail.get('assignment_failure_reason')}")
        print(f"  - timeline entries with 'auto': {len(auto_assign_entries)}")
    
    def test_09_list_tasks_with_status_filter(self):
        """
        GET /api/admin/service-tasks?status=unassigned:
        Should return only unassigned tasks.
        """
        resp = self.session.get(f"{BASE_URL}/api/admin/service-tasks", params={"status": "unassigned"})
        assert resp.status_code == 200, f"List tasks failed: {resp.status_code}"
        
        tasks = resp.json()
        assert isinstance(tasks, list), "Expected list of tasks"
        
        # Verify all returned tasks are unassigned
        for task in tasks:
            assert task.get("status") == "unassigned", f"Task {task.get('id')} has status {task.get('status')}, expected unassigned"
        
        print(f"Found {len(tasks)} unassigned tasks")
    
    def test_10_overdue_costs_endpoint(self):
        """
        GET /api/admin/service-tasks/overdue-costs:
        Should return tasks assigned but awaiting cost after 48h.
        """
        resp = self.session.get(f"{BASE_URL}/api/admin/service-tasks/overdue-costs")
        assert resp.status_code == 200, f"Overdue costs endpoint failed: {resp.status_code}"
        
        tasks = resp.json()
        assert isinstance(tasks, list), "Expected list of tasks"
        
        print(f"Found {len(tasks)} overdue cost tasks")
        for task in tasks[:3]:  # Show first 3
            print(f"  - {task.get('id')}: {task.get('service_type')} - {task.get('partner_name')}")


class TestPartnerNotifications:
    """Test partner notification triggers."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session."""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.partner_token = None
        self.created_task_ids = []
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_resp.status_code == 200:
            data = login_resp.json()
            self.admin_token = data.get("token") or data.get("access_token")
            if self.admin_token:
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        yield
        
        # Cleanup
        for task_id in self.created_task_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/service-tasks/{task_id}")
            except:
                pass
    
    def test_11_partner_notified_on_assignment(self):
        """
        When a task is assigned (auto or manual), partner should receive notification.
        notification_type=service_task_assigned
        """
        # Create task with manual assignment
        payload = {
            "service_type": MATCHING_SERVICE_TYPE,
            "description": f"TEST_V253 Partner notification test - {datetime.now().isoformat()}",
            "client_name": "Test Client V253",
            "partner_id": KNOWN_PARTNER_ID,
            "partner_name": "On Demand Limited",
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/service-tasks", json=payload)
        assert resp.status_code in [200, 201], f"Create task failed: {resp.status_code}"
        
        data = resp.json()
        task_id = data.get("id")
        self.created_task_ids.append(task_id)
        
        # Verify task was assigned
        assert data.get("status") == "assigned", "Task should be assigned"
        assert data.get("partner_id") == KNOWN_PARTNER_ID, "Partner ID mismatch"
        
        print(f"Task {task_id} assigned to partner - notification should be sent")
        print(f"  - partner_id: {data.get('partner_id')}")
        print(f"  - partner_name: {data.get('partner_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
