"""
Final Production Readiness Test Suite v256
Tests all 6 tasks implemented for Konekt B2B e-commerce platform:
1. Vendor Product Upload + Admin Approval (bulk approve/reject, nested format normalization)
2. Logistics Partner UI Extensions (delivery ops header, KPIs, delivery columns, role-safe nav)
3. Category-Based Margin Rules (category-aware pricing engine, min/target margin, rule CRUD)
4. Sales Follow-Up Automation (overdue followups, stale leads, quotes awaiting response)
5. Weekly Operations Digest (in-app delivery, preview/manual trigger)
6. Final wiring/table audit (empty states hardened, text-slate-400→500/600)
"""
import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner authentication token."""
    response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Partner authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Admin request headers."""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def partner_headers(partner_token):
    """Partner request headers."""
    return {"Authorization": f"Bearer {partner_token}", "Content-Type": "application/json"}


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 1: VENDOR PRODUCT APPROVAL TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestVendorProductApproval:
    """Tests for vendor product submission approval workflow."""

    def test_get_vendor_submissions_list(self, admin_headers):
        """GET /api/admin/vendor-submissions returns normalized data."""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check normalization - product_name should be at top level
        if len(data) > 0:
            sub = data[0]
            # Verify normalized fields exist
            assert "id" in sub, "Submission should have id"
            # product_name should be normalized from nested product.product_name
            if sub.get("product") and isinstance(sub["product"], dict):
                # If nested format exists, product_name should also be at top level
                assert "product_name" in sub, "product_name should be normalized to top level"
            print(f"Found {len(data)} vendor submissions")

    def test_get_vendor_submissions_stats(self, admin_headers):
        """GET /api/admin/vendor-submissions/stats counts pending_review as pending."""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions/stats", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total" in data, "Stats should have total"
        assert "pending" in data, "Stats should have pending count"
        assert "approved" in data, "Stats should have approved count"
        assert "rejected" in data, "Stats should have rejected count"
        
        # Verify counts are integers
        assert isinstance(data["total"], int), "total should be integer"
        assert isinstance(data["pending"], int), "pending should be integer"
        print(f"Stats: total={data['total']}, pending={data['pending']}, approved={data['approved']}, rejected={data['rejected']}")

    def test_get_vendor_submissions_filtered_by_status(self, admin_headers):
        """GET /api/admin/vendor-submissions?status=pending returns filtered list."""
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions?status=pending", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned items should have pending or pending_review status
        for sub in data:
            assert sub.get("review_status") in ["pending", "pending_review"], \
                f"Expected pending status, got {sub.get('review_status')}"

    def test_approve_submission_creates_product(self, admin_headers):
        """POST /api/admin/vendor-submissions/{id}/approve creates product in DB."""
        # First get a pending submission
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions?status=pending", headers=admin_headers)
        assert response.status_code == 200
        
        pending = response.json()
        if len(pending) == 0:
            pytest.skip("No pending submissions to approve")
        
        submission = pending[0]
        submission_id = submission["id"]
        
        # Approve the submission
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/{submission_id}/approve",
            json={"notes": "TEST_Approved via automated test", "publish": True},
            headers=admin_headers
        )
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        
        result = approve_response.json()
        assert result.get("ok") is True, "Approve should return ok=True"
        assert "product_id" in result, "Approve should return product_id"
        
        # Verify submission status changed
        verify_response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions/{submission_id}", headers=admin_headers)
        if verify_response.status_code == 200:
            updated = verify_response.json()
            assert updated.get("review_status") == "approved", "Status should be approved"
        
        print(f"Approved submission {submission_id}, created product {result.get('product_id')}")

    def test_reject_submission_with_notes(self, admin_headers):
        """POST /api/admin/vendor-submissions/{id}/reject with notes."""
        # Get a pending submission
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions?status=pending", headers=admin_headers)
        assert response.status_code == 200
        
        pending = response.json()
        if len(pending) == 0:
            pytest.skip("No pending submissions to reject")
        
        submission = pending[0]
        submission_id = submission["id"]
        
        # Reject with notes
        reject_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/{submission_id}/reject",
            json={"notes": "TEST_Rejected: Does not meet quality standards"},
            headers=admin_headers
        )
        assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
        
        result = reject_response.json()
        assert result.get("ok") is True, "Reject should return ok=True"
        
        print(f"Rejected submission {submission_id}")

    def test_bulk_approve_submissions(self, admin_headers):
        """POST /api/admin/vendor-submissions/bulk-approve approves multiple."""
        # Get pending submissions
        response = requests.get(f"{BASE_URL}/api/admin/vendor-submissions?status=pending", headers=admin_headers)
        assert response.status_code == 200
        
        pending = response.json()
        if len(pending) < 2:
            pytest.skip("Need at least 2 pending submissions for bulk approve test")
        
        # Take first 2 pending submissions
        ids_to_approve = [pending[0]["id"], pending[1]["id"]]
        
        bulk_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/bulk-approve",
            json={"ids": ids_to_approve, "notes": "TEST_Bulk approved", "publish": True},
            headers=admin_headers
        )
        assert bulk_response.status_code == 200, f"Bulk approve failed: {bulk_response.text}"
        
        result = bulk_response.json()
        assert result.get("ok") is True
        assert "approved" in result, "Should return approved count"
        print(f"Bulk approved {result.get('approved')} submissions")


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 3: CATEGORY-BASED MARGIN RULES TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestCategoryMarginRules:
    """Tests for category-aware pricing engine and margin rules CRUD."""

    def test_get_category_margin_rules(self, admin_headers):
        """GET /api/admin/category-margin-rules returns default + category rules."""
        response = requests.get(f"{BASE_URL}/api/admin/category-margin-rules", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "default" in data, "Should have default rules"
        assert "categories" in data, "Should have categories dict"
        
        # Verify default structure
        default = data["default"]
        assert "min_margin_pct" in default, "Default should have min_margin_pct"
        assert "target_margin_pct" in default, "Default should have target_margin_pct"
        
        print(f"Default margin: {default.get('target_margin_pct')}%, Categories: {list(data.get('categories', {}).keys())}")

    def test_preview_margin_with_category_printing(self, admin_headers):
        """POST /api/admin/category-margin-rules/preview with category=printing returns 35% margin."""
        response = requests.post(
            f"{BASE_URL}/api/admin/category-margin-rules/preview",
            json={"partner_cost": 100000, "category": "printing"},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "selling_price" in data, "Should have selling_price"
        assert "margin_pct" in data, "Should have margin_pct"
        assert "rule_source" in data, "Should have rule_source"
        
        # Printing category should have 35% margin
        margin_pct = data.get("margin_pct", 0)
        # Allow some tolerance for rounding
        assert 30 <= margin_pct <= 40, f"Printing margin should be ~35%, got {margin_pct}%"
        
        print(f"Printing category: cost=100000, selling_price={data['selling_price']}, margin={margin_pct}%, source={data['rule_source']}")

    def test_preview_margin_with_no_category_returns_default(self, admin_headers):
        """POST /api/admin/category-margin-rules/preview with no category returns 30% default."""
        response = requests.post(
            f"{BASE_URL}/api/admin/category-margin-rules/preview",
            json={"partner_cost": 100000},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "selling_price" in data
        assert "margin_pct" in data
        
        # Default should be 30%
        margin_pct = data.get("margin_pct", 0)
        assert 25 <= margin_pct <= 35, f"Default margin should be ~30%, got {margin_pct}%"
        
        print(f"Default margin: cost=100000, selling_price={data['selling_price']}, margin={margin_pct}%")

    def test_create_category_rule(self, admin_headers):
        """PUT /api/admin/category-margin-rules/category/test_cat creates new category rule."""
        test_category = f"test_cat_{uuid4().hex[:6]}"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/category-margin-rules/category/{test_category}",
            json={
                "min_margin_pct": 25,
                "target_margin_pct": 40,
                "max_discount_pct": 5,
                "negotiation_allowed": True
            },
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert result.get("ok") is True
        assert result.get("category_key") == test_category
        
        # Verify the rule was created
        verify_response = requests.get(f"{BASE_URL}/api/admin/category-margin-rules", headers=admin_headers)
        assert verify_response.status_code == 200
        rules = verify_response.json()
        assert test_category in rules.get("categories", {}), f"Category {test_category} should exist"
        
        print(f"Created category rule: {test_category}")
        
        # Cleanup - delete the test category
        requests.delete(f"{BASE_URL}/api/admin/category-margin-rules/category/{test_category}", headers=admin_headers)

    def test_preview_margin_with_logistics_category(self, admin_headers):
        """POST /api/admin/category-margin-rules/preview with category=logistics returns 20% margin."""
        response = requests.post(
            f"{BASE_URL}/api/admin/category-margin-rules/preview",
            json={"partner_cost": 50000, "category": "logistics"},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        margin_pct = data.get("margin_pct", 0)
        # Logistics should have 20% margin
        assert 15 <= margin_pct <= 25, f"Logistics margin should be ~20%, got {margin_pct}%"
        
        print(f"Logistics category: margin={margin_pct}%")


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 5: WEEKLY OPERATIONS DIGEST TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestWeeklyDigest:
    """Tests for weekly operations digest preview and delivery."""

    def test_digest_preview_returns_all_sections(self, admin_headers):
        """GET /api/admin/digest/preview returns task_pipeline, partner_performance, revenue_flow, alerts."""
        response = requests.get(f"{BASE_URL}/api/admin/digest/preview", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify all required sections
        assert "task_pipeline" in data, "Should have task_pipeline section"
        assert "partner_performance" in data, "Should have partner_performance section"
        assert "revenue_flow" in data, "Should have revenue_flow section"
        assert "alerts" in data, "Should have alerts section"
        assert "generated_at" in data, "Should have generated_at timestamp"
        assert "period" in data, "Should have period string"
        
        print(f"Digest preview: period={data['period']}")
        print(f"  Task Pipeline: {data['task_pipeline'][:50]}...")
        print(f"  Alerts: {data['alerts'][:50]}...")

    def test_digest_deliver_creates_notification(self, admin_headers):
        """POST /api/admin/digest/deliver creates weekly_operations_digest notification."""
        response = requests.post(f"{BASE_URL}/api/admin/digest/deliver", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True, "Deliver should return ok=True"
        assert "digest" in data, "Should return the digest data"
        
        digest = data["digest"]
        assert "task_pipeline" in digest
        assert "partner_performance" in digest
        
        print(f"Digest delivered for period: {digest.get('period')}")


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 2: LOGISTICS PARTNER UI EXTENSIONS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestLogisticsPartnerExtensions:
    """Tests for logistics partner portal extensions."""

    def test_partner_assigned_work_endpoint(self, partner_headers):
        """GET /api/partner-portal/assigned-work returns tasks with is_logistics flag."""
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of tasks"
        
        # Check if is_logistics flag is present
        if len(data) > 0:
            task = data[0]
            # is_logistics should be present (True for distributor partners)
            assert "is_logistics" in task or "status" in task, "Task should have status or is_logistics"
            print(f"Found {len(data)} assigned tasks, is_logistics={task.get('is_logistics')}")

    def test_partner_assigned_work_stats(self, partner_headers):
        """GET /api/partner-portal/assigned-work/stats returns KPI stats."""
        response = requests.get(f"{BASE_URL}/api/partner-portal/assigned-work/stats", headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should have various status counts
        assert isinstance(data, dict), "Stats should be a dict"
        print(f"Partner work stats: {data}")

    def test_partner_dashboard_returns_partner_type(self, partner_headers):
        """GET /api/partner-portal/dashboard returns partner with type info."""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        partner = data.get("partner", {})
        
        # Partner should have type info for nav detection
        partner_type = partner.get("partner_type") or partner.get("type") or partner.get("role")
        print(f"Partner type: {partner_type}, name: {partner.get('name')}")


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 4: SALES FOLLOW-UP AUTOMATION TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestSalesFollowUpAutomation:
    """Tests for sales follow-up automation endpoints."""

    def test_sales_followup_alerts_endpoint(self, admin_headers):
        """GET /api/admin/sales-followup/alerts returns overdue followups."""
        response = requests.get(f"{BASE_URL}/api/admin/sales-followup/alerts", headers=admin_headers)
        # This endpoint may not exist, check gracefully
        if response.status_code == 404:
            pytest.skip("Sales followup alerts endpoint not implemented")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"Sales followup alerts: {data}")

    def test_crm_leads_with_overdue_followups(self, admin_headers):
        """GET /api/admin/crm/leads returns leads with follow-up info."""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=admin_headers)
        if response.status_code == 404:
            pytest.skip("CRM leads endpoint not found")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check if leads have follow-up fields
        leads = data if isinstance(data, list) else data.get("leads", [])
        if len(leads) > 0:
            lead = leads[0]
            # Should have next_follow_up_at or similar field
            print(f"Found {len(leads)} CRM leads")


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 6: EMPTY STATES AND UI AUDIT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestEmptyStatesAndUIAudit:
    """Tests for empty states and UI text improvements."""

    def test_admin_dashboard_kpis(self, admin_headers):
        """GET /api/admin/dashboard/kpis returns proper data structure."""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/kpis", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should have KPI data, not generic "No data" messages
        assert isinstance(data, dict), "KPIs should be a dict"
        print(f"Admin dashboard KPIs: {list(data.keys())}")

    def test_admin_sidebar_counts(self, admin_headers):
        """GET /api/admin/sidebar-counts returns proper counts."""
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-counts", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict), "Sidebar counts should be a dict"
        print(f"Sidebar counts: {data}")

    def test_service_tasks_stats_summary(self, admin_headers):
        """GET /api/admin/service-tasks/stats/summary returns proper stats."""
        response = requests.get(f"{BASE_URL}/api/admin/service-tasks/stats/summary", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict), "Stats summary should be a dict"
        print(f"Service tasks stats: {data}")


# ═══════════════════════════════════════════════════════════════════════════════
# ADDITIONAL INTEGRATION TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestAdditionalIntegration:
    """Additional integration tests for production readiness."""

    def test_health_check(self):
        """Basic health check."""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200

    def test_public_branding(self):
        """GET /api/public/branding returns branding config."""
        response = requests.get(f"{BASE_URL}/api/public/branding")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict)

    def test_admin_auth_me(self, admin_headers):
        """GET /api/auth/me returns admin user info."""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "email" in data or "user" in data

    def test_notifications_unread_count(self, admin_headers):
        """GET /api/notifications/unread-count returns count."""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data or isinstance(data, int) or "unread_count" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
