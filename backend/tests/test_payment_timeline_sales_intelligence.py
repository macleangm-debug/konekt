"""
Test Payment Timeline, Sales Intelligence, and Staff Performance APIs
Tests for iteration 63 - New features:
- Payment Timeline (5 steps)
- Sales Intelligence Leaderboard with efficiency scoring
- Staff Performance Dashboard
- Supervisor Performance Dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPaymentTimelineAPI:
    """Payment Timeline API tests"""
    
    def test_get_payment_timeline_steps(self):
        """Test GET /api/payment-timeline/steps returns 5 steps"""
        response = requests.get(f"{BASE_URL}/api/payment-timeline/steps")
        assert response.status_code == 200
        
        data = response.json()
        assert "steps" in data
        steps = data["steps"]
        
        # Verify 5 steps exist
        assert len(steps) == 5
        
        # Verify step keys and labels
        expected_steps = [
            {"key": "issued", "label": "Invoice Issued"},
            {"key": "proof_submitted", "label": "Payment Submitted"},
            {"key": "verification", "label": "Verification In Progress"},
            {"key": "confirmed", "label": "Payment Confirmed"},
            {"key": "fulfilled", "label": "Processing / Fulfilled"},
        ]
        
        for i, expected in enumerate(expected_steps):
            assert steps[i]["key"] == expected["key"], f"Step {i} key mismatch"
            assert steps[i]["label"] == expected["label"], f"Step {i} label mismatch"
    
    def test_get_invoice_timeline_events(self):
        """Test GET /api/payment-timeline/invoice/:id returns events and sequence"""
        test_invoice_id = "test-invoice-timeline-001"
        response = requests.get(f"{BASE_URL}/api/payment-timeline/invoice/{test_invoice_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "invoice_id" in data
        assert data["invoice_id"] == test_invoice_id
        assert "events" in data
        assert "sequence" in data
        
        # Verify sequence has 5 steps
        assert len(data["sequence"]) == 5
    
    def test_invoice_timeline_with_nonexistent_invoice(self):
        """Test timeline returns empty events for non-existent invoice"""
        response = requests.get(f"{BASE_URL}/api/payment-timeline/invoice/nonexistent-invoice-xyz")
        assert response.status_code == 200
        
        data = response.json()
        assert data["events"] == []
        assert len(data["sequence"]) == 5


class TestSalesIntelligenceAPI:
    """Sales Intelligence API tests"""
    
    def test_get_sales_leaderboard(self):
        """Test GET /api/sales-intelligence/leaderboard returns staff with efficiency scores"""
        response = requests.get(f"{BASE_URL}/api/sales-intelligence/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If there are staff members, verify structure
        if len(data) > 0:
            person = data[0]
            required_fields = [
                "sales_user_id",
                "sales_name",
                "sales_email",
                "close_rate",
                "response_speed_score",
                "customer_rating_score",
                "efficiency_score",
                "open_workload",
                "total_opportunities",
                "won_opportunities",
            ]
            for field in required_fields:
                assert field in person, f"Missing field: {field}"
            
            # Verify efficiency score is calculated (formula: close_rate*0.4 + response_speed*0.3 + rating*0.3)
            assert isinstance(person["efficiency_score"], (int, float))
            assert person["efficiency_score"] >= 0
    
    def test_leaderboard_sorted_by_efficiency(self):
        """Test leaderboard is sorted by efficiency score descending"""
        response = requests.get(f"{BASE_URL}/api/sales-intelligence/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 1:
            # Verify sorted by efficiency descending
            for i in range(len(data) - 1):
                assert data[i]["efficiency_score"] >= data[i+1]["efficiency_score"], \
                    f"Leaderboard not sorted: {data[i]['efficiency_score']} < {data[i+1]['efficiency_score']}"
    
    def test_assign_preview(self):
        """Test POST /api/sales-intelligence/assign-preview returns assignment preview"""
        response = requests.post(
            f"{BASE_URL}/api/sales-intelligence/assign-preview",
            json={"category": "printing", "source": "website", "lead_type": "standard"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should return assignment info or no_sales_staff_available
        assert "assignment_reason" in data
        if data.get("assigned_sales_id"):
            assert "assigned_sales_name" in data
            assert "assignment_score" in data


class TestStaffPerformanceAPI:
    """Staff Performance Dashboard API tests"""
    
    def test_get_staff_sales_performance(self):
        """Test GET /api/staff-performance/sales returns team data"""
        response = requests.get(f"{BASE_URL}/api/staff-performance/sales")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify structure matches leaderboard
        if len(data) > 0:
            person = data[0]
            assert "sales_user_id" in person
            assert "efficiency_score" in person
            assert "close_rate" in person
            assert "open_workload" in person
    
    def test_get_supervisor_overview(self):
        """Test GET /api/staff-performance/supervisor-overview returns metrics"""
        response = requests.get(f"{BASE_URL}/api/staff-performance/supervisor-overview")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields
        required_fields = [
            "team_size",
            "average_efficiency",
            "at_risk_count",
            "overloaded_count",
            "leaderboard",
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify types
        assert isinstance(data["team_size"], int)
        assert isinstance(data["average_efficiency"], (int, float))
        assert isinstance(data["at_risk_count"], int)
        assert isinstance(data["overloaded_count"], int)
        assert isinstance(data["leaderboard"], list)
    
    def test_supervisor_overview_at_risk_staff(self):
        """Test supervisor overview identifies at-risk staff (efficiency < 50)"""
        response = requests.get(f"{BASE_URL}/api/staff-performance/supervisor-overview")
        assert response.status_code == 200
        
        data = response.json()
        at_risk_staff = data.get("at_risk_staff", [])
        
        # Verify all at-risk staff have efficiency < 50
        for person in at_risk_staff:
            assert person["efficiency_score"] < 50, \
                f"At-risk staff {person['sales_name']} has efficiency {person['efficiency_score']} >= 50"
    
    def test_supervisor_overview_overloaded_staff(self):
        """Test supervisor overview identifies overloaded staff (workload > 15)"""
        response = requests.get(f"{BASE_URL}/api/staff-performance/supervisor-overview")
        assert response.status_code == 200
        
        data = response.json()
        overloaded_staff = data.get("overloaded_staff", [])
        
        # Verify all overloaded staff have workload > 15
        for person in overloaded_staff:
            assert person["open_workload"] > 15, \
                f"Overloaded staff {person['sales_name']} has workload {person['open_workload']} <= 15"
    
    def test_supervisor_overview_top_performer(self):
        """Test supervisor overview includes top performer"""
        response = requests.get(f"{BASE_URL}/api/staff-performance/supervisor-overview")
        assert response.status_code == 200
        
        data = response.json()
        
        if data["team_size"] > 0:
            assert "top_performer" in data
            top = data["top_performer"]
            if top:
                assert "sales_name" in top
                assert "efficiency_score" in top
    
    def test_my_stats_endpoint(self):
        """Test GET /api/staff-performance/my-stats returns team average"""
        response = requests.get(f"{BASE_URL}/api/staff-performance/my-stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "team_average" in data
        assert "total_staff" in data


class TestEfficiencyScoreCalculation:
    """Test efficiency score formula: close_rate*0.4 + response_speed*0.3 + rating*0.3"""
    
    def test_efficiency_score_components(self):
        """Verify efficiency score is calculated from 3 components"""
        response = requests.get(f"{BASE_URL}/api/sales-intelligence/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            person = data[0]
            
            # Calculate expected efficiency
            expected = (
                person["close_rate"] * 0.40 +
                person["response_speed_score"] * 0.30 +
                person["customer_rating_score"] * 0.30
            )
            expected = round(expected, 2)
            
            # Allow small floating point difference
            assert abs(person["efficiency_score"] - expected) < 0.1, \
                f"Efficiency score mismatch: got {person['efficiency_score']}, expected {expected}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
