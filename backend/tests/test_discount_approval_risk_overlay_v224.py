"""
Test Discount Approval Risk Overlay - Iteration 224
Tests the auto-warning overlay in discount approval flow:
- Risk classification (safe/warning/critical) in margin_impact
- Discount analytics endpoints with real data
- Admin discount requests list with risk badges
- Discount request detail with risk_level and risk_message
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# Module-level session and token to avoid rate limiting
_session = None
_token = None

def get_authenticated_session():
    """Get or create authenticated session (singleton pattern to avoid rate limiting)"""
    global _session, _token
    if _session is None or _token is None:
        _session = requests.Session()
        _session.headers.update({"Content-Type": "application/json"})
        login_resp = _session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        _token = login_resp.json().get("token")
        assert _token, "No token returned from login"
        _session.headers.update({"Authorization": f"Bearer {_token}"})
    return _session


class TestDiscountAnalyticsKPIs:
    """Test GET /api/admin/discount-analytics/kpis returns real data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = get_authenticated_session()
    
    def test_kpis_endpoint_returns_200(self):
        """KPIs endpoint should return 200 with auth"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-analytics/kpis")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_kpis_returns_expected_fields(self):
        """KPIs should return all expected metric fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-analytics/kpis")
        data = resp.json()
        
        expected_fields = [
            "total_discounts_given", "average_discount_percent", "discounted_orders_count",
            "discounted_orders_percent", "total_orders", "revenue_after_discounts",
            "revenue_before_discounts", "margin_impact", "approval_rate",
            "approved_requests", "rejected_requests", "total_requests", "period_days"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_kpis_has_real_data(self):
        """KPIs should have real data (217 orders mentioned in context)"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-analytics/kpis?days=365")
        data = resp.json()
        
        # Should have orders (context says 217 orders)
        assert data.get("total_orders", 0) > 0, "Expected real order data"
        print(f"Total orders: {data.get('total_orders')}")
        print(f"Total requests: {data.get('total_requests')}")


class TestDiscountAnalyticsHighRisk:
    """Test GET /api/admin/discount-analytics/high-risk returns risk-classified data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = get_authenticated_session()
    
    def test_high_risk_endpoint_returns_200(self):
        """High-risk endpoint should return 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-analytics/high-risk")
        assert resp.status_code == 200
    
    def test_high_risk_returns_array(self):
        """High-risk should return an array"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-analytics/high-risk")
        data = resp.json()
        assert isinstance(data, list), "Expected array response"
    
    def test_high_risk_items_have_risk_level(self):
        """Each high-risk item should have risk_level field"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-analytics/high-risk?days=365")
        data = resp.json()
        
        if len(data) > 0:
            for item in data[:5]:  # Check first 5 items
                assert "risk_level" in item, f"Missing risk_level in item: {item}"
                assert item["risk_level"] in ["safe", "warning", "critical"], \
                    f"Invalid risk_level: {item['risk_level']}"
                print(f"Order {item.get('order_number')}: risk_level={item.get('risk_level')}")


class TestDiscountAnalyticsRequests:
    """Test GET /api/admin/discount-analytics/requests returns discount requests list"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = get_authenticated_session()
    
    def test_requests_endpoint_returns_200(self):
        """Requests endpoint should return 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-analytics/requests")
        assert resp.status_code == 200
    
    def test_requests_returns_array(self):
        """Requests should return an array"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-analytics/requests")
        data = resp.json()
        assert isinstance(data, list), "Expected array response"


class TestAdminDiscountRequestsList:
    """Test GET /api/admin/discount-requests returns list with risk badges"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = get_authenticated_session()
    
    def test_discount_requests_list_returns_200(self):
        """Discount requests list should return 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-requests")
        assert resp.status_code == 200
    
    def test_discount_requests_has_items_and_kpis(self):
        """Response should have items array and kpis object"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-requests")
        data = resp.json()
        
        assert "items" in data, "Missing 'items' in response"
        assert "kpis" in data, "Missing 'kpis' in response"
        assert isinstance(data["items"], list), "items should be array"
        assert isinstance(data["kpis"], dict), "kpis should be object"
    
    def test_discount_requests_items_have_margin_impact(self):
        """Each discount request should have margin_impact - risk_level may be missing for old requests"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-requests")
        data = resp.json()
        items = data.get("items", [])
        
        if len(items) > 0:
            has_risk_level = False
            for item in items[:5]:  # Check first 5
                # margin_impact should exist
                margin_impact = item.get("margin_impact")
                if margin_impact:
                    # Check for risk_level in margin_impact (may be missing for old requests)
                    if "risk_level" in margin_impact:
                        has_risk_level = True
                        assert margin_impact["risk_level"] in ["safe", "warning", "critical"], \
                            f"Invalid risk_level: {margin_impact['risk_level']}"
                        print(f"Request {item.get('request_id')}: risk_level={margin_impact.get('risk_level')}")
                    else:
                        # Old request without risk_level - should still have margin_safe
                        assert "margin_safe" in margin_impact, \
                            f"Missing margin_safe in margin_impact for {item.get('request_id')}"
                        print(f"Request {item.get('request_id')}: margin_safe={margin_impact.get('margin_safe')} (legacy)")
            
            # Note: It's OK if no requests have risk_level yet (all legacy data)
            print(f"Has risk_level in any request: {has_risk_level}")


class TestDiscountRequestDetail:
    """Test GET /api/admin/discount-requests/{id} returns detail with risk overlay data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = get_authenticated_session()
    
    def test_get_discount_request_detail(self):
        """Get detail of a discount request and verify margin_impact fields"""
        # First get list to find a request_id
        list_resp = self.session.get(f"{BASE_URL}/api/admin/discount-requests")
        assert list_resp.status_code == 200
        items = list_resp.json().get("items", [])
        
        if len(items) == 0:
            pytest.skip("No discount requests to test detail endpoint")
        
        request_id = items[0].get("request_id")
        assert request_id, "No request_id in first item"
        
        # Get detail
        detail_resp = self.session.get(f"{BASE_URL}/api/admin/discount-requests/{request_id}")
        assert detail_resp.status_code == 200
        
        data = detail_resp.json()
        assert data.get("ok") == True, f"Expected ok=True, got: {data}"
        
        request = data.get("request", {})
        assert request, "No request in response"
        
        # Verify margin_impact exists
        margin_impact = request.get("margin_impact", {})
        assert margin_impact, "Missing margin_impact in request"
        
        # Check for risk_level and risk_message (may be missing for legacy requests)
        if "risk_level" in margin_impact:
            assert margin_impact["risk_level"] in ["safe", "warning", "critical"]
            assert "risk_message" in margin_impact, "Missing risk_message when risk_level present"
            
            print(f"Request {request_id}:")
            print(f"  risk_level: {margin_impact.get('risk_level')}")
            print(f"  risk_message: {margin_impact.get('risk_message')}")
            print(f"  max_safe_discount: {margin_impact.get('max_safe_discount')}")
            print(f"  requested_discount: {margin_impact.get('requested_discount')}")
            print(f"  remaining_margin_after_discount: {margin_impact.get('remaining_margin_after_discount')}")
        else:
            # Legacy request - should have margin_safe
            assert "margin_safe" in margin_impact, "Missing margin_safe in legacy margin_impact"
            print(f"Request {request_id} (legacy): margin_safe={margin_impact.get('margin_safe')}")


class TestRiskClassificationLogic:
    """Test the _classify_discount_risk function logic via API responses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = get_authenticated_session()
    
    def test_risk_levels_are_valid(self):
        """All risk levels in discount requests should be valid"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-requests")
        items = resp.json().get("items", [])
        
        valid_levels = {"safe", "warning", "critical"}
        
        for item in items:
            margin_impact = item.get("margin_impact", {})
            if margin_impact:
                risk_level = margin_impact.get("risk_level")
                if risk_level:
                    assert risk_level in valid_levels, \
                        f"Invalid risk_level '{risk_level}' for {item.get('request_id')}"
    
    def test_risk_message_present_for_non_safe(self):
        """Warning and critical risks should have meaningful risk_message"""
        resp = self.session.get(f"{BASE_URL}/api/admin/discount-requests")
        items = resp.json().get("items", [])
        
        for item in items:
            margin_impact = item.get("margin_impact", {})
            if margin_impact:
                risk_level = margin_impact.get("risk_level")
                risk_message = margin_impact.get("risk_message", "")
                
                if risk_level in ["warning", "critical"]:
                    assert len(risk_message) > 10, \
                        f"Expected meaningful risk_message for {risk_level}, got: '{risk_message}'"


class TestDiscountAnalyticsAuth:
    """Test that discount analytics endpoints require authentication"""
    
    def test_kpis_requires_auth(self):
        """KPIs endpoint should return 401/403 without auth"""
        resp = requests.get(f"{BASE_URL}/api/admin/discount-analytics/kpis")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
    
    def test_high_risk_requires_auth(self):
        """High-risk endpoint should return 401/403 without auth"""
        resp = requests.get(f"{BASE_URL}/api/admin/discount-analytics/high-risk")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
    
    def test_requests_requires_auth(self):
        """Requests endpoint should return 401/403 without auth"""
        resp = requests.get(f"{BASE_URL}/api/admin/discount-analytics/requests")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
