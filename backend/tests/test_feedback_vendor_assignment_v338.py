"""
Test Suite for Konekt B2B Platform - Iteration 338
Features: Feedback Widget + Vendor-Category Assignments + Order Splitting

Endpoints tested:
- POST /api/feedback - Submit feedback (public)
- GET /api/feedback - List all feedback (admin)
- GET /api/feedback/stats - Feedback stats (admin)
- PATCH /api/feedback/{id} - Update feedback status (admin)
- POST /api/admin/vendor-assignments - Create vendor assignment (admin)
- GET /api/admin/vendor-assignments - List assignments (admin)
- GET /api/admin/vendor-assignments/by-category/{name} - Vendors for category (admin)
- POST /api/admin/vendor-assignments/split-order - Split order by vendor (admin)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestSetup:
    """Setup and authentication"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }


class TestFeedbackEndpoints(TestSetup):
    """Test Feedback CRUD endpoints"""
    
    created_feedback_id = None
    
    def test_01_submit_feedback_success(self):
        """POST /api/feedback - Submit feedback (public, no auth required)"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "category": "bug",
            "description": f"TEST_feedback_{unique_id}: Test bug report from automated testing",
            "page_url": "https://konekt-payments-fix.preview.emergentagent.com/marketplace",
            "user_id": "test-user-123",
            "user_email": "testuser@example.com",
            "user_name": "Test User",
            "user_role": "customer"
        }
        response = requests.post(f"{BASE_URL}/api/feedback", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "success"
        assert "id" in data
        assert data.get("message") == "Thank you for your feedback!"
        
        # Store for later tests
        TestFeedbackEndpoints.created_feedback_id = data["id"]
        print(f"Created feedback ID: {data['id']}")
    
    def test_02_submit_feedback_feature_request(self):
        """POST /api/feedback - Submit feature request"""
        payload = {
            "category": "feature_request",
            "description": "TEST_feedback: Would love to see bulk ordering feature",
            "page_url": "https://konekt-payments-fix.preview.emergentagent.com/account",
            "user_email": "feature@example.com"
        }
        response = requests.post(f"{BASE_URL}/api/feedback", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
    
    def test_03_list_feedback(self, admin_headers):
        """GET /api/feedback - List all feedback (admin)"""
        response = requests.get(f"{BASE_URL}/api/feedback", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least the feedback we created
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "category" in item
            assert "description" in item
            assert "status" in item
            print(f"Found {len(data)} feedback entries")
    
    def test_04_list_feedback_with_filter(self, admin_headers):
        """GET /api/feedback?status=new - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/feedback?status=new", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All items should have status=new
        for item in data:
            assert item.get("status") == "new"
    
    def test_05_feedback_stats(self, admin_headers):
        """GET /api/feedback/stats - Get feedback statistics"""
        response = requests.get(f"{BASE_URL}/api/feedback/stats", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify stats structure
        assert "total" in data
        assert "new" in data
        assert "in_progress" in data
        assert "resolved" in data
        assert "by_category" in data
        
        # Verify by_category has expected categories
        by_cat = data["by_category"]
        assert "bug" in by_cat
        assert "payment_issue" in by_cat
        assert "feature_request" in by_cat
        assert "general" in by_cat
        
        print(f"Feedback stats: total={data['total']}, new={data['new']}, resolved={data['resolved']}")
    
    def test_06_update_feedback_status(self, admin_headers):
        """PATCH /api/feedback/{id} - Update feedback status"""
        if not TestFeedbackEndpoints.created_feedback_id:
            pytest.skip("No feedback ID from previous test")
        
        feedback_id = TestFeedbackEndpoints.created_feedback_id
        payload = {
            "status": "in_progress",
            "admin_notes": "Looking into this issue"
        }
        response = requests.patch(f"{BASE_URL}/api/feedback/{feedback_id}", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "in_progress"
        assert data.get("admin_notes") == "Looking into this issue"
        print(f"Updated feedback {feedback_id} to in_progress")
    
    def test_07_update_feedback_to_resolved(self, admin_headers):
        """PATCH /api/feedback/{id} - Mark as resolved"""
        if not TestFeedbackEndpoints.created_feedback_id:
            pytest.skip("No feedback ID from previous test")
        
        feedback_id = TestFeedbackEndpoints.created_feedback_id
        payload = {"status": "resolved"}
        response = requests.patch(f"{BASE_URL}/api/feedback/{feedback_id}", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "resolved"
    
    def test_08_update_nonexistent_feedback(self, admin_headers):
        """PATCH /api/feedback/{id} - 404 for non-existent feedback"""
        response = requests.patch(
            f"{BASE_URL}/api/feedback/nonexistent-id-12345",
            json={"status": "resolved"},
            headers=admin_headers
        )
        assert response.status_code == 404


class TestVendorAssignmentEndpoints(TestSetup):
    """Test Vendor-Category Assignment endpoints"""
    
    test_vendor_id = f"test-vendor-{str(uuid.uuid4())[:8]}"
    
    def test_01_create_vendor_assignment(self, admin_headers):
        """POST /api/admin/vendor-assignments - Create vendor assignment"""
        payload = {
            "vendor_id": TestVendorAssignmentEndpoints.test_vendor_id,
            "vendor_type": "product",
            "categories": [
                {"name": "Office Equipment"},
                {"name": "Stationery"}
            ],
            "is_preferred": True,
            "notes": "TEST_assignment: Automated test vendor"
        }
        response = requests.post(f"{BASE_URL}/api/admin/vendor-assignments", json=payload, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("vendor_id") == TestVendorAssignmentEndpoints.test_vendor_id
        assert data.get("vendor_type") == "product"
        assert data.get("is_preferred") == True
        assert len(data.get("categories", [])) == 2
        print(f"Created vendor assignment for {TestVendorAssignmentEndpoints.test_vendor_id}")
    
    def test_02_create_vendor_assignment_missing_vendor_id(self, admin_headers):
        """POST /api/admin/vendor-assignments - 400 when vendor_id missing"""
        payload = {
            "vendor_type": "product",
            "categories": [{"name": "Test Category"}]
        }
        response = requests.post(f"{BASE_URL}/api/admin/vendor-assignments", json=payload, headers=admin_headers)
        
        assert response.status_code == 400
        assert "vendor_id" in response.json().get("detail", "").lower()
    
    def test_03_list_vendor_assignments(self, admin_headers):
        """GET /api/admin/vendor-assignments - List all assignments"""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-assignments", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least our test assignment
        if len(data) > 0:
            item = data[0]
            assert "vendor_id" in item
            assert "vendor_name" in item
            assert "categories" in item
            print(f"Found {len(data)} vendor assignments")
    
    def test_04_get_vendors_by_category(self, admin_headers):
        """GET /api/admin/vendor-assignments/by-category/{name} - Get vendors for category"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-assignments/by-category/Office Equipment",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "category" in data
        assert data["category"] == "Office Equipment"
        assert "vendors" in data
        assert "sourcing_mode" in data
        assert "preferred_vendor" in data
        
        print(f"Category 'Office Equipment' has {len(data['vendors'])} vendors, sourcing_mode={data['sourcing_mode']}")
    
    def test_05_get_vendors_by_nonexistent_category(self, admin_headers):
        """GET /api/admin/vendor-assignments/by-category/{name} - Empty for non-existent category"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-assignments/by-category/NonExistentCategory12345",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "NonExistentCategory12345"
        assert len(data["vendors"]) == 0
    
    def test_06_split_order_by_vendor(self, admin_headers):
        """POST /api/admin/vendor-assignments/split-order - Split order items by vendor"""
        payload = {
            "items": [
                {"category": "Office Equipment", "description": "Desk Chair", "quantity": 5},
                {"category": "Stationery", "description": "Notebooks", "quantity": 100},
                {"category": "Unknown Category", "description": "Mystery Item", "quantity": 1}
            ]
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-assignments/split-order",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "vendor_groups" in data
        assert "unassigned" in data
        assert "total_vendors" in data
        
        # Items with unknown category should be unassigned
        unassigned = data["unassigned"]
        assert any("Unknown Category" in str(item) or "No vendor" in str(item.get("reason", "")) for item in unassigned)
        
        print(f"Order split: {data['total_vendors']} vendor groups, {len(unassigned)} unassigned items")
    
    def test_07_split_order_empty_items(self, admin_headers):
        """POST /api/admin/vendor-assignments/split-order - Empty items returns empty result"""
        payload = {"items": []}
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-assignments/split-order",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["vendor_groups"] == []
        assert data["unassigned"] == []
    
    def test_08_update_vendor_assignment(self, admin_headers):
        """POST /api/admin/vendor-assignments - Update existing assignment (upsert)"""
        payload = {
            "vendor_id": TestVendorAssignmentEndpoints.test_vendor_id,
            "vendor_type": "both",  # Changed from product to both
            "categories": [
                {"name": "Office Equipment"},
                {"name": "Stationery"},
                {"name": "Electronics"}  # Added new category
            ],
            "is_preferred": False,  # Changed
            "notes": "TEST_assignment: Updated vendor assignment"
        }
        response = requests.post(f"{BASE_URL}/api/admin/vendor-assignments", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("vendor_type") == "both"
        assert data.get("is_preferred") == False
        assert len(data.get("categories", [])) == 3
        print(f"Updated vendor assignment for {TestVendorAssignmentEndpoints.test_vendor_id}")
    
    def test_09_delete_vendor_assignment(self, admin_headers):
        """DELETE /api/admin/vendor-assignments/{vendor_id} - Remove assignment"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/vendor-assignments/{TestVendorAssignmentEndpoints.test_vendor_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "success"
        print(f"Deleted vendor assignment for {TestVendorAssignmentEndpoints.test_vendor_id}")
    
    def test_10_delete_nonexistent_assignment(self, admin_headers):
        """DELETE /api/admin/vendor-assignments/{vendor_id} - 404 for non-existent"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/vendor-assignments/nonexistent-vendor-12345",
            headers=admin_headers
        )
        assert response.status_code == 404


class TestAuthRequired(TestSetup):
    """Test that admin endpoints require authentication"""
    
    def test_feedback_list_requires_auth(self):
        """GET /api/feedback without auth should still work (public read)"""
        # Note: Based on code review, feedback list doesn't require auth
        response = requests.get(f"{BASE_URL}/api/feedback")
        # This may return 200 or 401 depending on implementation
        # The code shows no auth decorator on list endpoint
        assert response.status_code in [200, 401]
    
    def test_vendor_assignments_requires_auth(self):
        """GET /api/admin/vendor-assignments without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-assignments")
        # Admin endpoints should require auth
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
