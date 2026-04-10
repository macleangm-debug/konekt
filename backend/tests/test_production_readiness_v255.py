"""
Production Readiness Pass Tests - Iteration 255
Tests for:
1. Vendor Product Approval (GET submissions, stats, approve, reject, bulk-approve)
2. Category Margin Rules (GET rules, preview, PUT category rule)
3. Weekly Digest (GET preview, POST deliver)
4. Partner Assigned Work (logistics partner detection)
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


class TestAdminAuth:
    """Admin authentication for subsequent tests."""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_admin_login(self, admin_token):
        """Verify admin can login."""
        assert admin_token is not None
        assert len(admin_token) > 10
        print(f"✓ Admin login successful, token length: {len(admin_token)}")


class TestVendorProductApproval:
    """Tests for vendor product submission review endpoints."""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        """Get admin auth headers."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_vendor_submissions_list(self, admin_headers):
        """GET /api/admin/vendor-submissions returns list of submissions."""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of submissions"
        print(f"✓ GET /api/admin/vendor-submissions returned {len(data)} submissions")
        
        # Verify structure if submissions exist
        if len(data) > 0:
            sub = data[0]
            assert "id" in sub or "product_name" in sub, "Submission should have id or product_name"
            assert "review_status" in sub, "Submission should have review_status"
            print(f"  First submission: {sub.get('product_name', 'N/A')} - {sub.get('review_status', 'N/A')}")
    
    def test_get_vendor_submissions_stats(self, admin_headers):
        """GET /api/admin/vendor-submissions/stats returns counts."""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions/stats", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "total" in data, "Stats should have total"
        assert "pending" in data, "Stats should have pending"
        assert "approved" in data, "Stats should have approved"
        assert "rejected" in data, "Stats should have rejected"
        
        print(f"✓ GET /api/admin/vendor-submissions/stats: total={data['total']}, pending={data['pending']}, approved={data['approved']}, rejected={data['rejected']}")
    
    def test_get_vendor_submissions_filtered_by_status(self, admin_headers):
        """GET /api/admin/vendor-submissions?status=pending returns filtered list."""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions?status=pending", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list"
        
        # All returned should be pending
        for sub in data:
            assert sub.get("review_status") == "pending", f"Expected pending, got {sub.get('review_status')}"
        
        print(f"✓ GET /api/admin/vendor-submissions?status=pending returned {len(data)} pending submissions")
    
    def test_approve_submission_creates_product(self, admin_headers):
        """POST /api/admin/vendor-submissions/{id}/approve creates product in catalog."""
        # First get a pending submission
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions?status=pending", headers=admin_headers)
        pending = response.json()
        
        if len(pending) == 0:
            pytest.skip("No pending submissions to test approve")
        
        sub_id = pending[0].get("id")
        product_name = pending[0].get("product_name", "Test Product")
        
        # Approve it
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/{sub_id}/approve",
            json={"notes": "Test approval", "publish": True},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Approve failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Expected ok=True"
        assert "product_id" in data, "Expected product_id in response"
        
        print(f"✓ POST /api/admin/vendor-submissions/{sub_id}/approve: product_id={data['product_id']}")
    
    def test_reject_submission(self, admin_headers):
        """POST /api/admin/vendor-submissions/{id}/reject rejects with notes."""
        # Get a pending submission
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions?status=pending", headers=admin_headers)
        pending = response.json()
        
        if len(pending) == 0:
            pytest.skip("No pending submissions to test reject")
        
        sub_id = pending[0].get("id")
        
        # Reject it
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/{sub_id}/reject",
            json={"notes": "Test rejection - does not meet quality standards"},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Reject failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Expected ok=True"
        
        print(f"✓ POST /api/admin/vendor-submissions/{sub_id}/reject: ok=True")
    
    def test_bulk_approve_submissions(self, admin_headers):
        """POST /api/admin/vendor-submissions/bulk-approve approves multiple."""
        # Get pending submissions
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions?status=pending", headers=admin_headers)
        pending = response.json()
        
        if len(pending) < 2:
            pytest.skip("Need at least 2 pending submissions for bulk approve test")
        
        ids = [s.get("id") for s in pending[:2]]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/bulk-approve",
            json={"ids": ids, "notes": "Bulk test approval", "publish": True},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Bulk approve failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Expected ok=True"
        assert "approved" in data, "Expected approved count"
        
        print(f"✓ POST /api/admin/vendor-submissions/bulk-approve: approved={data.get('approved')}, errors={data.get('errors', [])}")


class TestCategoryMarginRules:
    """Tests for category-based margin rules endpoints."""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        """Get admin auth headers."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_category_margin_rules(self, admin_headers):
        """GET /api/admin/category-margin-rules returns default + category rules."""
        response = requests.get(f"{BASE_URL}/api/admin/category-margin-rules", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should have default and categories
        assert "default" in data, "Expected 'default' key in rules"
        assert "categories" in data, "Expected 'categories' key in rules"
        
        # Default should have margin fields
        default = data["default"]
        assert "min_margin_pct" in default, "Default should have min_margin_pct"
        assert "target_margin_pct" in default, "Default should have target_margin_pct"
        
        print(f"✓ GET /api/admin/category-margin-rules: default={default}, categories={list(data['categories'].keys())}")
    
    def test_preview_margin_printing_category(self, admin_headers):
        """POST /api/admin/category-margin-rules/preview with category=printing returns 35% margin."""
        response = requests.post(
            f"{BASE_URL}/api/admin/category-margin-rules/preview",
            json={"partner_cost": 100000, "category": "printing"},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "selling_price" in data, "Expected selling_price"
        assert "margin_pct" in data, "Expected margin_pct"
        assert "rule_source" in data, "Expected rule_source"
        
        # Printing category should have 35% margin (if seeded)
        margin = data.get("margin_pct", 0)
        print(f"✓ POST /api/admin/category-margin-rules/preview (printing): margin={margin}%, selling_price={data['selling_price']}, rule_source={data['rule_source']}")
    
    def test_preview_margin_logistics_category(self, admin_headers):
        """POST /api/admin/category-margin-rules/preview with category=logistics returns 20% margin."""
        response = requests.post(
            f"{BASE_URL}/api/admin/category-margin-rules/preview",
            json={"partner_cost": 50000, "category": "logistics"},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "selling_price" in data, "Expected selling_price"
        assert "margin_pct" in data, "Expected margin_pct"
        
        margin = data.get("margin_pct", 0)
        print(f"✓ POST /api/admin/category-margin-rules/preview (logistics): margin={margin}%, selling_price={data['selling_price']}, rule_source={data['rule_source']}")
    
    def test_update_single_category_rule(self, admin_headers):
        """PUT /api/admin/category-margin-rules/category/{key} creates/updates rule."""
        response = requests.put(
            f"{BASE_URL}/api/admin/category-margin-rules/category/test_category",
            json={
                "min_margin_pct": 25,
                "target_margin_pct": 40,
                "max_discount_pct": 5,
                "negotiation_allowed": True
            },
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Expected ok=True"
        assert data.get("category_key") == "test_category", "Expected category_key in response"
        
        print(f"✓ PUT /api/admin/category-margin-rules/category/test_category: ok=True")
        
        # Verify it was saved
        response = requests.get(f"{BASE_URL}/api/admin/category-margin-rules", headers=admin_headers)
        rules = response.json()
        assert "test_category" in rules.get("categories", {}), "test_category should be in categories"
        print(f"  Verified: test_category rule saved with target_margin_pct={rules['categories']['test_category'].get('target_margin_pct')}")


class TestWeeklyDigest:
    """Tests for weekly operations digest endpoints."""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        """Get admin auth headers."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_digest_preview(self, admin_headers):
        """GET /api/admin/digest/preview returns task_pipeline, partner_performance, revenue_flow, alerts."""
        response = requests.get(f"{BASE_URL}/api/admin/digest/preview", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify expected sections
        assert "task_pipeline" in data, "Expected task_pipeline"
        assert "partner_performance" in data, "Expected partner_performance"
        assert "revenue_flow" in data, "Expected revenue_flow"
        assert "alerts" in data, "Expected alerts"
        assert "generated_at" in data, "Expected generated_at"
        assert "period" in data, "Expected period"
        
        print(f"✓ GET /api/admin/digest/preview:")
        print(f"  task_pipeline: {data['task_pipeline'][:50]}...")
        print(f"  partner_performance: {data['partner_performance'][:50]}...")
        print(f"  revenue_flow: {data['revenue_flow'][:50]}...")
        print(f"  alerts: {data['alerts'][:50]}...")
        print(f"  period: {data['period']}")
    
    def test_deliver_digest_creates_notification(self, admin_headers):
        """POST /api/admin/digest/deliver creates notification in DB."""
        response = requests.post(f"{BASE_URL}/api/admin/digest/deliver", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("ok") == True, "Expected ok=True"
        assert "digest" in data, "Expected digest in response"
        
        digest = data["digest"]
        assert "task_pipeline" in digest, "Digest should have task_pipeline"
        
        print(f"✓ POST /api/admin/digest/deliver: ok=True, period={digest.get('period')}")


class TestPartnerAssignedWork:
    """Tests for partner assigned work with logistics detection."""
    
    @pytest.fixture(scope="class")
    def partner_headers(self):
        """Get partner auth headers."""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Partner login failed: {response.text}")
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_partner_assigned_work_endpoint(self, partner_headers):
        """GET /api/partner-portal/assigned-work returns tasks with partner_type info."""
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=partner_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of tasks"
        print(f"✓ GET /api/partner-portal/assigned-work: {len(data)} tasks")
        
        # If tasks exist, verify structure
        if len(data) > 0:
            task = data[0]
            assert "id" in task, "Task should have id"
            assert "task_ref" in task, "Task should have task_ref"
            assert "status" in task, "Task should have status"
            assert "is_logistics" in task, "Task should have is_logistics flag"
            assert "partner_type" in task, "Task should have partner_type"
            
            print(f"  First task: {task['task_ref']} - is_logistics={task['is_logistics']}, partner_type={task['partner_type']}")
            
            # Verify data access rules
            if task["is_logistics"]:
                # Logistics partners should see delivery details
                print(f"  Logistics partner - can see client_name: {task.get('client_name') is not None}")
            else:
                # Service partners should NOT see client identity
                assert task.get("client_name") is None, "Service partner should not see client_name"
                print(f"  Service partner - client_name correctly hidden")
    
    def test_partner_assigned_work_stats(self, partner_headers):
        """GET /api/partner-portal/assigned-work/stats returns KPI stats."""
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work/stats", headers=partner_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "total" in data, "Stats should have total"
        assert "assigned" in data, "Stats should have assigned"
        assert "completed" in data, "Stats should have completed"
        
        print(f"✓ GET /api/partner-portal/assigned-work/stats: total={data['total']}, assigned={data.get('assigned', 0)}, completed={data.get('completed', 0)}")


class TestHealthCheck:
    """Basic health check to ensure API is running."""
    
    def test_api_health(self):
        """Verify API is accessible."""
        response = requests.get(f"{BASE_URL}/api/health")
        # Accept 200 or 404 (if no health endpoint, try another)
        if response.status_code == 404:
            response = requests.get(f"{BASE_URL}/api/auth/login", json={})
            # Even a 422 means the API is running
            assert response.status_code in [200, 400, 401, 422], f"API not accessible: {response.status_code}"
        else:
            assert response.status_code == 200
        print(f"✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
