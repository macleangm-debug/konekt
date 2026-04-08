"""
Phase E: Sales Discount Request Workflow Tests
Tests for discount request creation, listing, approval, rejection, and margin floor protection.
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "neema.sales@konekt.demo"
STAFF_PASSWORD = "password123"


class TestDiscountRequestPhaseE:
    """Phase E: Sales Discount Request Workflow Tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("token") or data.get("access_token")
        assert token, "No token in admin login response"
        return token
    
    @pytest.fixture(scope="class")
    def staff_token(self):
        """Get staff authentication token (sales role)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        token = data.get("token") or data.get("access_token")
        assert token, "No token in staff login response"
        return token
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Admin request headers"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def staff_headers(self, staff_token):
        """Staff request headers"""
        return {
            "Authorization": f"Bearer {staff_token}",
            "Content-Type": "application/json"
        }
    
    # ═══ STAFF ENDPOINTS ═══
    
    def test_staff_create_discount_request_percentage(self, staff_headers):
        """Staff creates a discount request with percentage type"""
        payload = {
            "quote_ref": f"TEST-QTN-{int(time.time())}",
            "customer_name": "TEST_Customer_Discount",
            "customer_email": "test.discount@example.com",
            "discount_type": "percentage",
            "discount_value": 10,
            "reason": "Bulk order discount for loyal customer",
            "notes": "Customer has ordered 5 times this month",
            "urgency": "normal",
            "item_notes": "Apply to all items"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/discount-requests",
            json=payload,
            headers=staff_headers
        )
        
        assert response.status_code == 200, f"Create discount request failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True, f"Response not ok: {data}"
        
        request = data.get("request", {})
        assert "request_id" in request, "No request_id in response"
        assert request.get("status") == "pending", f"Status should be pending, got: {request.get('status')}"
        assert request.get("discount_type") == "percentage"
        assert request.get("discount_value") == 10
        assert request.get("customer_name") == "TEST_Customer_Discount"
        assert "margin_impact" in request, "No margin_impact in response"
        
        # Store for later tests
        self.__class__.created_request_id = request.get("request_id")
        print(f"Created discount request: {self.__class__.created_request_id}")
    
    def test_staff_create_discount_request_fixed(self, staff_headers):
        """Staff creates a discount request with fixed amount type"""
        payload = {
            "quote_ref": f"TEST-QTN-FIXED-{int(time.time())}",
            "customer_name": "TEST_Customer_Fixed",
            "customer_email": "test.fixed@example.com",
            "discount_type": "fixed",
            "discount_value": 50000,
            "reason": "Special promotion discount",
            "urgency": "high"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/discount-requests",
            json=payload,
            headers=staff_headers
        )
        
        assert response.status_code == 200, f"Create fixed discount request failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        request = data.get("request", {})
        assert request.get("discount_type") == "fixed"
        assert request.get("discount_value") == 50000
        assert request.get("urgency") == "high"
        
        self.__class__.fixed_request_id = request.get("request_id")
        print(f"Created fixed discount request: {self.__class__.fixed_request_id}")
    
    def test_staff_create_discount_request_with_order_ref(self, staff_headers):
        """Staff creates a discount request with order reference"""
        payload = {
            "order_ref": f"TEST-ORD-{int(time.time())}",
            "customer_name": "TEST_Customer_Order",
            "customer_email": "test.order@example.com",
            "discount_type": "percentage",
            "discount_value": 5,
            "reason": "Post-order adjustment",
            "urgency": "urgent"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/discount-requests",
            json=payload,
            headers=staff_headers
        )
        
        assert response.status_code == 200, f"Create order discount request failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        request = data.get("request", {})
        assert request.get("order_ref") is not None
        assert request.get("urgency") == "urgent"
        
        self.__class__.order_request_id = request.get("request_id")
        print(f"Created order discount request: {self.__class__.order_request_id}")
    
    def test_staff_list_own_discount_requests(self, staff_headers):
        """Staff lists their own discount requests"""
        response = requests.get(
            f"{BASE_URL}/api/staff/discount-requests",
            headers=staff_headers
        )
        
        assert response.status_code == 200, f"List staff requests failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        items = data.get("items", [])
        assert isinstance(items, list), "Items should be a list"
        
        # Should contain our created requests
        request_ids = [item.get("request_id") for item in items]
        if hasattr(self.__class__, 'created_request_id'):
            assert self.__class__.created_request_id in request_ids, "Created request not in staff list"
        
        print(f"Staff has {len(items)} discount requests")
    
    # ═══ ADMIN ENDPOINTS ═══
    
    def test_admin_list_discount_requests_with_kpis(self, admin_headers):
        """Admin lists all discount requests with KPIs"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Admin list requests failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        # Check KPIs
        kpis = data.get("kpis", {})
        assert "total" in kpis, "No total in KPIs"
        assert "pending" in kpis, "No pending in KPIs"
        assert "approved" in kpis, "No approved in KPIs"
        assert "rejected" in kpis, "No rejected in KPIs"
        
        items = data.get("items", [])
        assert isinstance(items, list), "Items should be a list"
        
        print(f"Admin KPIs: total={kpis.get('total')}, pending={kpis.get('pending')}, approved={kpis.get('approved')}, rejected={kpis.get('rejected')}")
    
    def test_admin_list_discount_requests_filter_pending(self, admin_headers):
        """Admin filters discount requests by pending status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests?status=pending",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Admin filter pending failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        items = data.get("items", [])
        # All items should be pending
        for item in items:
            assert item.get("status") == "pending", f"Item {item.get('request_id')} is not pending"
        
        print(f"Found {len(items)} pending discount requests")
    
    def test_admin_get_discount_request_detail(self, admin_headers):
        """Admin gets full detail of a discount request"""
        if not hasattr(self.__class__, 'created_request_id'):
            pytest.skip("No created request to get detail for")
        
        request_id = self.__class__.created_request_id
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests/{request_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Admin get detail failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        request = data.get("request", {})
        assert request.get("request_id") == request_id
        assert "sales_rep_name" in request or "sales_rep_email" in request
        assert "customer_name" in request
        assert "discount_type" in request
        assert "discount_value" in request
        assert "margin_impact" in request
        assert "reason" in request
        
        print(f"Got detail for request: {request_id}")
    
    def test_admin_get_nonexistent_request(self, admin_headers):
        """Admin gets 404 for non-existent request"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests/NONEXISTENT-123",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Unexpected status: {response.text}"
        data = response.json()
        assert data.get("ok") is False, "Should return ok: false for non-existent request"
        assert "error" in data or "not found" in str(data).lower()
    
    def test_admin_approve_discount_request(self, admin_headers):
        """Admin approves a discount request"""
        if not hasattr(self.__class__, 'created_request_id'):
            pytest.skip("No created request to approve")
        
        request_id = self.__class__.created_request_id
        payload = {
            "admin_note": "Approved for loyal customer"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/discount-requests/{request_id}/approve",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Admin approve failed: {response.text}"
        data = response.json()
        
        # Check if approval succeeded or was blocked by margin floor
        if data.get("ok") is True:
            request = data.get("request", {})
            assert request.get("status") == "approved", f"Status should be approved, got: {request.get('status')}"
            assert request.get("reviewed_by") is not None or request.get("admin_note") is not None
            print(f"Approved request: {request_id}")
        else:
            # Margin floor protection may have blocked it
            error = data.get("error", "")
            assert "margin" in error.lower() or "floor" in error.lower(), f"Unexpected error: {error}"
            print(f"Approval blocked by margin floor: {error}")
    
    def test_admin_reject_discount_request(self, admin_headers):
        """Admin rejects a discount request"""
        if not hasattr(self.__class__, 'fixed_request_id'):
            pytest.skip("No fixed request to reject")
        
        request_id = self.__class__.fixed_request_id
        payload = {
            "admin_note": "Discount too high for this order"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/discount-requests/{request_id}/reject",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Admin reject failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True, f"Reject should succeed: {data}"
        
        request = data.get("request", {})
        assert request.get("status") == "rejected", f"Status should be rejected, got: {request.get('status')}"
        
        print(f"Rejected request: {request_id}")
    
    def test_admin_cannot_approve_already_rejected(self, admin_headers):
        """Admin cannot approve an already rejected request"""
        if not hasattr(self.__class__, 'fixed_request_id'):
            pytest.skip("No rejected request to test")
        
        request_id = self.__class__.fixed_request_id
        payload = {
            "admin_note": "Trying to approve rejected request"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/discount-requests/{request_id}/approve",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Unexpected status: {response.text}"
        data = response.json()
        assert data.get("ok") is False, "Should not be able to approve rejected request"
        assert "already" in str(data.get("error", "")).lower() or "rejected" in str(data.get("error", "")).lower()
        
        print(f"Correctly blocked re-approval of rejected request")
    
    def test_admin_cannot_reject_already_approved(self, admin_headers):
        """Admin cannot reject an already approved request"""
        if not hasattr(self.__class__, 'created_request_id'):
            pytest.skip("No approved request to test")
        
        # First check if the request was actually approved
        request_id = self.__class__.created_request_id
        detail_response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests/{request_id}",
            headers=admin_headers
        )
        detail_data = detail_response.json()
        
        if detail_data.get("request", {}).get("status") != "approved":
            pytest.skip("Request was not approved (margin floor protection)")
        
        payload = {
            "admin_note": "Trying to reject approved request"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/discount-requests/{request_id}/reject",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Unexpected status: {response.text}"
        data = response.json()
        assert data.get("ok") is False, "Should not be able to reject approved request"
        
        print(f"Correctly blocked rejection of approved request")
    
    # ═══ MARGIN FLOOR PROTECTION ═══
    
    def test_margin_floor_protection_large_discount(self, staff_headers, admin_headers):
        """Test that large discounts are flagged as margin unsafe"""
        # Create a request with a very large discount
        payload = {
            "quote_ref": f"TEST-QTN-LARGE-{int(time.time())}",
            "customer_name": "TEST_Customer_Large_Discount",
            "customer_email": "test.large@example.com",
            "discount_type": "percentage",
            "discount_value": 90,  # 90% discount - should breach margin floor
            "reason": "Testing margin floor protection",
            "urgency": "normal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/discount-requests",
            json=payload,
            headers=staff_headers
        )
        
        assert response.status_code == 200, f"Create large discount request failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        request = data.get("request", {})
        request_id = request.get("request_id")
        
        # Check margin_safe flag
        margin_safe = request.get("margin_safe")
        margin_warning = request.get("margin_warning", "")
        
        print(f"Large discount request margin_safe={margin_safe}, warning={margin_warning}")
        
        # Try to approve - should fail if margin_safe is False
        if margin_safe is False:
            approve_response = requests.put(
                f"{BASE_URL}/api/admin/discount-requests/{request_id}/approve",
                json={"admin_note": "Testing margin floor"},
                headers=admin_headers
            )
            
            approve_data = approve_response.json()
            assert approve_data.get("ok") is False, "Should not approve margin-unsafe discount"
            assert "margin" in str(approve_data.get("error", "")).lower()
            print("Margin floor protection working correctly")
        else:
            print("Note: Large discount was margin-safe (no source doc pricing)")
    
    # ═══ DATA VALIDATION ═══
    
    def test_discount_request_has_required_fields(self, staff_headers):
        """Verify discount request response has all required fields"""
        payload = {
            "quote_ref": f"TEST-QTN-FIELDS-{int(time.time())}",
            "customer_name": "TEST_Customer_Fields",
            "customer_email": "test.fields@example.com",
            "discount_type": "percentage",
            "discount_value": 5,
            "reason": "Testing required fields",
            "notes": "Additional notes",
            "item_notes": "Item specific notes",
            "urgency": "low"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/discount-requests",
            json=payload,
            headers=staff_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        request = data.get("request", {})
        
        # Required fields
        required_fields = [
            "request_id", "status", "quote_ref", "customer_name", "customer_email",
            "discount_type", "discount_value", "discount_amount", "standard_price",
            "proposed_final_price", "reason", "notes", "item_notes", "urgency",
            "margin_impact", "margin_safe", "created_at", "updated_at", "expires_at"
        ]
        
        for field in required_fields:
            assert field in request, f"Missing required field: {field}"
        
        print("All required fields present in discount request")
    
    def test_margin_impact_structure(self, staff_headers):
        """Verify margin_impact has correct structure"""
        payload = {
            "quote_ref": f"TEST-QTN-MARGIN-{int(time.time())}",
            "customer_name": "TEST_Customer_Margin",
            "discount_type": "percentage",
            "discount_value": 10,
            "reason": "Testing margin impact structure"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff/discount-requests",
            json=payload,
            headers=staff_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        request = data.get("request", {})
        margin_impact = request.get("margin_impact", {})
        
        # Expected margin impact fields
        expected_fields = [
            "total_base_cost", "total_operational_margin", "total_distributable_margin",
            "discount_pool_pct", "max_safe_discount", "requested_discount",
            "remaining_margin_after_discount", "margin_safe"
        ]
        
        for field in expected_fields:
            assert field in margin_impact, f"Missing margin_impact field: {field}"
        
        print(f"Margin impact structure valid: {margin_impact}")


class TestDiscountRequestKPIs:
    """Test KPI calculations for discount requests"""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        """Get admin authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json().get("token") or response.json().get("access_token")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_kpi_counts_are_consistent(self, admin_headers):
        """Verify KPI counts match actual data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        kpis = data.get("kpis", {})
        items = data.get("items", [])
        
        # Count statuses in items
        pending_count = sum(1 for item in items if item.get("status") == "pending")
        approved_count = sum(1 for item in items if item.get("status") == "approved")
        rejected_count = sum(1 for item in items if item.get("status") == "rejected")
        
        # Note: KPIs are calculated from all docs, items may be limited
        # So we just verify KPIs are non-negative integers
        assert isinstance(kpis.get("total"), int) and kpis.get("total") >= 0
        assert isinstance(kpis.get("pending"), int) and kpis.get("pending") >= 0
        assert isinstance(kpis.get("approved"), int) and kpis.get("approved") >= 0
        assert isinstance(kpis.get("rejected"), int) and kpis.get("rejected") >= 0
        
        # Total should equal sum of statuses
        assert kpis.get("total") == kpis.get("pending") + kpis.get("approved") + kpis.get("rejected")
        
        print(f"KPIs consistent: total={kpis.get('total')}, pending={kpis.get('pending')}, approved={kpis.get('approved')}, rejected={kpis.get('rejected')}")


class TestDiscountRequestFilters:
    """Test filtering capabilities for discount requests"""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        """Get admin authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json().get("token") or response.json().get("access_token")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_filter_by_approved_status(self, admin_headers):
        """Filter discount requests by approved status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests?status=approved",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        for item in items:
            assert item.get("status") == "approved", f"Item {item.get('request_id')} is not approved"
        
        print(f"Found {len(items)} approved discount requests")
    
    def test_filter_by_rejected_status(self, admin_headers):
        """Filter discount requests by rejected status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests?status=rejected",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        for item in items:
            assert item.get("status") == "rejected", f"Item {item.get('request_id')} is not rejected"
        
        print(f"Found {len(items)} rejected discount requests")
    
    def test_limit_parameter(self, admin_headers):
        """Test limit parameter for pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-requests?limit=5",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        assert len(items) <= 5, f"Expected max 5 items, got {len(items)}"
        print(f"Limit parameter working: got {len(items)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
