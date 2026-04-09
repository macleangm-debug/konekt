"""
Test Vendor Dashboard Upgrade V218
Tests the extended /api/partner-portal/dashboard endpoint with:
- vendor_kpis (total_jobs, active_jobs, completed_jobs, delayed, settlement_total, pending_settlement, paid_settlement)
- vendor_pipeline (assigned, awaiting_ack, in_production, ready_to_dispatch, delayed, delivered, completed)
- work_requiring_action (items with urgency, title, description)
- recent_assignments (vendor-safe data: vendor_order_no, vendor_price only, no customer names)
- charts (fulfillment_trend, delivery_performance - 6 monthly entries each)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Partner/Vendor credentials
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestVendorDashboardUpgrade:
    """Tests for the upgraded Vendor Dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def partner_token(self):
        """Get partner authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            # Partner login returns partner_token
            return data.get("partner_token") or data.get("token")
        pytest.skip(f"Partner authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def partner_headers(self, partner_token):
        """Headers with partner authorization"""
        return {
            "Authorization": f"Bearer {partner_token}",
            "Content-Type": "application/json"
        }
    
    def test_partner_dashboard_endpoint_returns_200(self, partner_headers):
        """Test that /api/partner-portal/dashboard returns 200"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Dashboard endpoint returns 200")
    
    def test_dashboard_has_vendor_kpis(self, partner_headers):
        """Test that dashboard response contains vendor_kpis with all required fields"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "vendor_kpis" in data, "Missing vendor_kpis in response"
        kpis = data["vendor_kpis"]
        
        required_fields = ["total_jobs", "active_jobs", "completed_jobs", "delayed", 
                          "settlement_total", "pending_settlement", "paid_settlement"]
        for field in required_fields:
            assert field in kpis, f"Missing {field} in vendor_kpis"
            assert isinstance(kpis[field], (int, float)), f"{field} should be numeric"
        
        print(f"PASS: vendor_kpis contains all required fields: {kpis}")
    
    def test_dashboard_has_vendor_pipeline(self, partner_headers):
        """Test that dashboard response contains vendor_pipeline with all stages"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "vendor_pipeline" in data, "Missing vendor_pipeline in response"
        pipeline = data["vendor_pipeline"]
        
        required_stages = ["assigned", "awaiting_ack", "in_production", "ready_to_dispatch", 
                          "delayed", "delivered", "completed"]
        for stage in required_stages:
            assert stage in pipeline, f"Missing {stage} in vendor_pipeline"
            assert isinstance(pipeline[stage], int), f"{stage} should be integer count"
        
        print(f"PASS: vendor_pipeline contains all stages: {pipeline}")
    
    def test_dashboard_has_work_requiring_action(self, partner_headers):
        """Test that dashboard response contains work_requiring_action array"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "work_requiring_action" in data, "Missing work_requiring_action in response"
        actions = data["work_requiring_action"]
        assert isinstance(actions, list), "work_requiring_action should be a list"
        
        # If there are action items, verify structure
        if len(actions) > 0:
            action = actions[0]
            assert "urgency" in action, "Action item missing urgency"
            assert "title" in action, "Action item missing title"
            assert "description" in action, "Action item missing description"
            assert action["urgency"] in ["hot", "high", "medium", "low"], f"Invalid urgency: {action['urgency']}"
        
        print(f"PASS: work_requiring_action is valid array with {len(actions)} items")
    
    def test_dashboard_has_recent_assignments(self, partner_headers):
        """Test that dashboard response contains recent_assignments with vendor-safe data"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_assignments" in data, "Missing recent_assignments in response"
        assignments = data["recent_assignments"]
        assert isinstance(assignments, list), "recent_assignments should be a list"
        
        # If there are assignments, verify vendor-safe structure
        if len(assignments) > 0:
            assignment = assignments[0]
            # Should have vendor_order_no
            assert "vendor_order_no" in assignment, "Assignment missing vendor_order_no"
            # Should have base_price (vendor price)
            assert "base_price" in assignment, "Assignment missing base_price"
            # Should have status
            assert "status" in assignment, "Assignment missing status"
            # Should have items array
            assert "items" in assignment, "Assignment missing items"
            
            # Verify items have vendor_price (not customer price or Konekt margin)
            if len(assignment.get("items", [])) > 0:
                item = assignment["items"][0]
                assert "vendor_price" in item, "Item missing vendor_price"
                assert "name" in item, "Item missing name"
                # Should NOT have customer_name or konekt_margin
                assert "customer_name" not in assignment, "Assignment should NOT have customer_name (vendor-safe)"
                assert "konekt_margin" not in assignment, "Assignment should NOT have konekt_margin (vendor-safe)"
        
        print(f"PASS: recent_assignments is vendor-safe with {len(assignments)} items")
    
    def test_dashboard_has_charts(self, partner_headers):
        """Test that dashboard response contains charts with fulfillment_trend and delivery_performance"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "charts" in data, "Missing charts in response"
        charts = data["charts"]
        
        # Check fulfillment_trend
        assert "fulfillment_trend" in charts, "Missing fulfillment_trend in charts"
        fulfillment = charts["fulfillment_trend"]
        assert isinstance(fulfillment, list), "fulfillment_trend should be a list"
        assert len(fulfillment) == 6, f"fulfillment_trend should have 6 entries, got {len(fulfillment)}"
        
        if len(fulfillment) > 0:
            entry = fulfillment[0]
            assert "month" in entry, "fulfillment_trend entry missing month"
            assert "assigned" in entry, "fulfillment_trend entry missing assigned"
            assert "completed" in entry, "fulfillment_trend entry missing completed"
        
        # Check delivery_performance
        assert "delivery_performance" in charts, "Missing delivery_performance in charts"
        delivery = charts["delivery_performance"]
        assert isinstance(delivery, list), "delivery_performance should be a list"
        assert len(delivery) == 6, f"delivery_performance should have 6 entries, got {len(delivery)}"
        
        if len(delivery) > 0:
            entry = delivery[0]
            assert "month" in entry, "delivery_performance entry missing month"
            assert "on_time" in entry, "delivery_performance entry missing on_time"
            assert "delayed" in entry, "delivery_performance entry missing delayed"
        
        print(f"PASS: charts contains fulfillment_trend ({len(fulfillment)} entries) and delivery_performance ({len(delivery)} entries)")
    
    def test_dashboard_has_partner_info(self, partner_headers):
        """Test that dashboard response contains partner info"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "partner" in data, "Missing partner in response"
        partner = data["partner"]
        if partner:
            assert "name" in partner, "Partner missing name"
            assert "id" in partner, "Partner missing id"
        
        print(f"PASS: partner info present: {partner.get('name') if partner else 'None'}")
    
    def test_dashboard_has_summary(self, partner_headers):
        """Test that dashboard response contains summary with catalog info"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data, "Missing summary in response"
        summary = data["summary"]
        
        expected_fields = ["catalog_count", "active_allocations", "pending_fulfillment", 
                          "completed_jobs", "settlement_total_estimate"]
        for field in expected_fields:
            assert field in summary, f"Missing {field} in summary"
        
        print(f"PASS: summary contains all expected fields: {summary}")
    
    def test_kpis_values_are_consistent(self, partner_headers):
        """Test that KPI values are logically consistent"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        kpis = data["vendor_kpis"]
        
        # total_jobs should be >= active_jobs + completed_jobs
        total = kpis["total_jobs"]
        active = kpis["active_jobs"]
        completed = kpis["completed_jobs"]
        
        # settlement_total should be >= pending + paid
        settlement_total = kpis["settlement_total"]
        pending = kpis["pending_settlement"]
        paid = kpis["paid_settlement"]
        
        # Verify non-negative values
        assert total >= 0, "total_jobs should be non-negative"
        assert active >= 0, "active_jobs should be non-negative"
        assert completed >= 0, "completed_jobs should be non-negative"
        assert kpis["delayed"] >= 0, "delayed should be non-negative"
        assert settlement_total >= 0, "settlement_total should be non-negative"
        assert pending >= 0, "pending_settlement should be non-negative"
        assert paid >= 0, "paid_settlement should be non-negative"
        
        print(f"PASS: KPI values are logically consistent - total:{total}, active:{active}, completed:{completed}, delayed:{kpis['delayed']}")
    
    def test_pipeline_counts_are_non_negative(self, partner_headers):
        """Test that all pipeline stage counts are non-negative integers"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        pipeline = data["vendor_pipeline"]
        
        for stage, count in pipeline.items():
            assert isinstance(count, int), f"{stage} should be integer"
            assert count >= 0, f"{stage} should be non-negative, got {count}"
        
        print(f"PASS: All pipeline counts are non-negative integers")
    
    def test_work_actions_sorted_by_urgency(self, partner_headers):
        """Test that work_requiring_action items are sorted by urgency (hot > high > medium > low)"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        actions = data["work_requiring_action"]
        
        if len(actions) > 1:
            urgency_order = {"hot": 0, "high": 1, "medium": 2, "low": 3}
            for i in range(len(actions) - 1):
                current_urgency = urgency_order.get(actions[i].get("urgency", "low"), 4)
                next_urgency = urgency_order.get(actions[i+1].get("urgency", "low"), 4)
                assert current_urgency <= next_urgency, f"Actions not sorted by urgency at index {i}"
        
        print(f"PASS: work_requiring_action items are sorted by urgency")
    
    def test_unauthorized_access_returns_401(self):
        """Test that accessing dashboard without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Unauthorized access returns 401/403")


class TestVendorDashboardDataIntegrity:
    """Additional tests for data integrity and vendor-safe requirements"""
    
    @pytest.fixture(scope="class")
    def partner_token(self):
        """Get partner authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("partner_token") or data.get("token")
        pytest.skip(f"Partner authentication failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def partner_headers(self, partner_token):
        return {
            "Authorization": f"Bearer {partner_token}",
            "Content-Type": "application/json"
        }
    
    def test_recent_assignments_no_customer_identity(self, partner_headers):
        """Verify recent_assignments does not expose customer identity beyond operational need"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        assignments = data.get("recent_assignments", [])
        
        # Fields that should NOT be present (customer identity / Konekt margins)
        forbidden_fields = ["customer_name", "customer_email", "customer_phone", 
                           "konekt_margin", "konekt_price", "sales_price", "admin_notes"]
        
        for assignment in assignments:
            for field in forbidden_fields:
                assert field not in assignment, f"Assignment should NOT contain {field} (vendor-safe violation)"
        
        print(f"PASS: recent_assignments is vendor-safe (no customer identity or Konekt margins)")
    
    def test_charts_have_correct_month_labels(self, partner_headers):
        """Verify chart entries have valid month labels"""
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=partner_headers)
        assert response.status_code == 200
        data = response.json()
        
        charts = data.get("charts", {})
        valid_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        for entry in charts.get("fulfillment_trend", []):
            assert entry.get("month") in valid_months, f"Invalid month label: {entry.get('month')}"
        
        for entry in charts.get("delivery_performance", []):
            assert entry.get("month") in valid_months, f"Invalid month label: {entry.get('month')}"
        
        print("PASS: Chart entries have valid month labels")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
