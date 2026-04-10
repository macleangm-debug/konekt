"""
Pipeline Intelligence API Tests
Tests for conversion metrics, stale deals, and rep performance endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestPipelineConversionMetrics:
    """Tests for GET /api/admin/pipeline/conversion-metrics"""
    
    def test_conversion_metrics_returns_200(self):
        """Verify conversion-metrics endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/conversion-metrics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ conversion-metrics returns 200")
    
    def test_conversion_metrics_has_funnel_array(self):
        """Verify response contains funnel array with required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/conversion-metrics")
        data = response.json()
        
        assert "funnel" in data, "Response missing 'funnel' field"
        assert isinstance(data["funnel"], list), "funnel should be an array"
        
        # Check each funnel stage has required fields
        for stage in data["funnel"]:
            assert "stage" in stage, f"Stage missing 'stage' field: {stage}"
            assert "label" in stage, f"Stage missing 'label' field: {stage}"
            assert "count" in stage, f"Stage missing 'count' field: {stage}"
            assert "value" in stage, f"Stage missing 'value' field: {stage}"
            assert "conversion_from_prev" in stage, f"Stage missing 'conversion_from_prev' field: {stage}"
        
        print(f"✓ funnel array has {len(data['funnel'])} stages with all required fields")
    
    def test_conversion_metrics_has_summary_fields(self):
        """Verify response contains total_leads, won_count, lost_count, win_rate, avg_days_to_close"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/conversion-metrics")
        data = response.json()
        
        required_fields = ["total_leads", "won_count", "lost_count", "win_rate", "avg_days_to_close"]
        for field in required_fields:
            assert field in data, f"Response missing '{field}' field"
        
        # Validate types
        assert isinstance(data["total_leads"], int), "total_leads should be int"
        assert isinstance(data["won_count"], int), "won_count should be int"
        assert isinstance(data["lost_count"], int), "lost_count should be int"
        assert isinstance(data["win_rate"], (int, float)), "win_rate should be numeric"
        assert isinstance(data["avg_days_to_close"], (int, float)), "avg_days_to_close should be numeric"
        
        print(f"✓ Summary fields present: total_leads={data['total_leads']}, won={data['won_count']}, lost={data['lost_count']}, win_rate={data['win_rate']}%, avg_days={data['avg_days_to_close']}")


class TestPipelineStaleDeals:
    """Tests for GET /api/admin/pipeline/stale-deals"""
    
    def test_stale_deals_returns_200(self):
        """Verify stale-deals endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/stale-deals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ stale-deals returns 200")
    
    def test_stale_deals_has_required_structure(self):
        """Verify response contains stale_deals array and count"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/stale-deals")
        data = response.json()
        
        assert "stale_deals" in data, "Response missing 'stale_deals' field"
        assert "count" in data, "Response missing 'count' field"
        assert isinstance(data["stale_deals"], list), "stale_deals should be an array"
        assert isinstance(data["count"], int), "count should be int"
        assert data["count"] == len(data["stale_deals"]), "count should match stale_deals length"
        
        print(f"✓ stale_deals structure valid with {data['count']} stale deals")
    
    def test_stale_deals_items_have_required_fields(self):
        """Verify each stale deal has days_inactive and threshold_days"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/stale-deals")
        data = response.json()
        
        if len(data["stale_deals"]) > 0:
            for deal in data["stale_deals"]:
                assert "days_inactive" in deal, f"Deal missing 'days_inactive': {deal}"
                assert "threshold_days" in deal, f"Deal missing 'threshold_days': {deal}"
                assert isinstance(deal["days_inactive"], int), "days_inactive should be int"
                assert isinstance(deal["threshold_days"], int), "threshold_days should be int"
            print(f"✓ All {len(data['stale_deals'])} stale deals have days_inactive and threshold_days")
        else:
            print("✓ No stale deals to validate (empty array is valid)")


class TestPipelineRepPerformance:
    """Tests for GET /api/admin/pipeline/rep-performance"""
    
    def test_rep_performance_returns_200(self):
        """Verify rep-performance endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/rep-performance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ rep-performance returns 200")
    
    def test_rep_performance_has_reps_array(self):
        """Verify response contains reps array"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/rep-performance")
        data = response.json()
        
        assert "reps" in data, "Response missing 'reps' field"
        assert isinstance(data["reps"], list), "reps should be an array"
        
        print(f"✓ reps array present with {len(data['reps'])} reps")
    
    def test_rep_performance_items_have_required_fields(self):
        """Verify each rep has required performance fields"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline/rep-performance")
        data = response.json()
        
        required_fields = ["rep", "total_leads", "won", "lost", "active", "pipeline_value", "conversion_rate"]
        
        if len(data["reps"]) > 0:
            for rep in data["reps"]:
                for field in required_fields:
                    assert field in rep, f"Rep missing '{field}': {rep}"
            
            # Validate types for first rep
            first_rep = data["reps"][0]
            assert isinstance(first_rep["rep"], str), "rep should be string"
            assert isinstance(first_rep["total_leads"], int), "total_leads should be int"
            assert isinstance(first_rep["won"], int), "won should be int"
            assert isinstance(first_rep["lost"], int), "lost should be int"
            assert isinstance(first_rep["active"], int), "active should be int"
            assert isinstance(first_rep["pipeline_value"], (int, float)), "pipeline_value should be numeric"
            assert isinstance(first_rep["conversion_rate"], (int, float)), "conversion_rate should be numeric"
            
            print(f"✓ All {len(data['reps'])} reps have required fields with correct types")
        else:
            print("✓ No reps to validate (empty array is valid)")


class TestRegressionQuoteRequest:
    """Regression tests for Quote Request page at /request-quote"""
    
    def test_public_branding_endpoint(self):
        """Verify public branding endpoint works (used by quote request page)"""
        response = requests.get(f"{BASE_URL}/api/public/branding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/public/branding returns 200")
    
    def test_public_requests_endpoint_accepts_post(self):
        """Verify public-requests endpoint accepts POST (quote submission)"""
        # Just verify the endpoint exists and accepts POST
        # We don't want to create actual data
        response = requests.post(
            f"{BASE_URL}/api/public-requests",
            json={
                "request_type": "quote",
                "primary_lane": "products",
                "details": "TEST - ignore",
                "quantity": 1,
                "urgency": "flexible",
                "budget_range": "under_500k",
                "full_name": "Test User",
                "email": "test@test.com",
                "company_name": "Test Co"
            }
        )
        # Should either succeed (201) or fail validation (400/422) - not 404 or 500
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ /api/public-requests POST endpoint accessible (status: {response.status_code})")


class TestRegressionPaymentReview:
    """Regression tests for Payment Review drawer at /admin/payments"""
    
    def test_payments_queue_endpoint(self):
        """Verify payments queue endpoint exists"""
        # This endpoint may require auth, so we just check it doesn't 404
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue")
        # Should be 200 (if no auth) or 401/403 (if auth required) - not 404
        assert response.status_code != 404, f"Payments queue endpoint not found: {response.status_code}"
        print(f"✓ /api/admin/payments/queue endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
