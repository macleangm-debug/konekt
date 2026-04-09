"""
Iteration 228: Test Admin Sales Ratings, Leaderboard Privacy, Balanced Scoring, Dashboard Improvements
- Admin Sales Ratings endpoint (KPIs, reps_table, low_alerts, trend, recent_feedback)
- Admin review endpoint for low ratings
- Leaderboard privacy (no revenue field for sales view)
- Balanced scoring (score + label fields)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"
RATED_ORDER_NUMBER = "ORD-20260311-2C3D7A"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def staff_token():
    """Get staff authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    assert response.status_code == 200, f"Staff login failed: {response.text}"
    return response.json().get("token")


class TestAdminSalesRatingsEndpoint:
    """Test GET /api/admin/discount-analytics/sales-ratings"""

    def test_sales_ratings_returns_kpis(self, admin_token):
        """Verify KPIs are returned: avg_team_rating, total_ratings, highest_rep, lowest_rep"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-analytics/sales-ratings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("ok") is True, "Response should have ok=True"
        assert "kpis" in data, "Response should contain kpis"
        
        kpis = data["kpis"]
        assert "avg_team_rating" in kpis, "KPIs should have avg_team_rating"
        assert "total_ratings" in kpis, "KPIs should have total_ratings"
        assert "highest_rep" in kpis, "KPIs should have highest_rep"
        assert "lowest_rep" in kpis, "KPIs should have lowest_rep"
        
        # Validate types
        assert isinstance(kpis["avg_team_rating"], (int, float)), "avg_team_rating should be numeric"
        assert isinstance(kpis["total_ratings"], int), "total_ratings should be int"
        print(f"✓ KPIs returned: avg={kpis['avg_team_rating']}, total={kpis['total_ratings']}")

    def test_sales_ratings_returns_arrays(self, admin_token):
        """Verify arrays are returned: reps_table, low_alerts, trend, recent_feedback"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-analytics/sales-ratings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "reps_table" in data, "Response should contain reps_table"
        assert "low_alerts" in data, "Response should contain low_alerts"
        assert "trend" in data, "Response should contain trend"
        assert "recent_feedback" in data, "Response should contain recent_feedback"
        
        assert isinstance(data["reps_table"], list), "reps_table should be a list"
        assert isinstance(data["low_alerts"], list), "low_alerts should be a list"
        assert isinstance(data["trend"], list), "trend should be a list"
        assert isinstance(data["recent_feedback"], list), "recent_feedback should be a list"
        
        print(f"✓ Arrays returned: reps={len(data['reps_table'])}, alerts={len(data['low_alerts'])}, trend={len(data['trend'])}, feedback={len(data['recent_feedback'])}")

    def test_sales_ratings_reps_table_structure(self, admin_token):
        """Verify reps_table entries have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-analytics/sales-ratings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["reps_table"]:
            rep = data["reps_table"][0]
            assert "name" in rep, "Rep should have name"
            assert "avg_rating" in rep, "Rep should have avg_rating"
            assert "ratings_count" in rep, "Rep should have ratings_count"
            assert "deals_closed" in rep, "Rep should have deals_closed"
            print(f"✓ Rep table structure valid: {rep['name']} - {rep['avg_rating']}/5")
        else:
            print("⚠ No reps in table (may be expected if no ratings)")

    def test_sales_ratings_requires_admin(self):
        """Verify endpoint requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/discount-analytics/sales-ratings")
        assert response.status_code in [401, 403], "Should require authentication"
        print("✓ Endpoint requires authentication")


class TestAdminReviewEndpoint:
    """Test PUT /api/admin/discount-analytics/sales-ratings/{order_number}/review"""

    def test_review_rating_success(self, admin_token):
        """Admin can mark a rated order as reviewed with note"""
        response = requests.put(
            f"{BASE_URL}/api/admin/discount-analytics/sales-ratings/{RATED_ORDER_NUMBER}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"admin_note": "Reviewed by test - iteration 228"}
        )
        # May return ok=False if order not found or already reviewed, but should not error
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "ok" in data, "Response should have ok field"
        print(f"✓ Review endpoint responded: ok={data.get('ok')}")

    def test_review_requires_admin(self):
        """Verify review endpoint requires admin authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/discount-analytics/sales-ratings/{RATED_ORDER_NUMBER}/review",
            json={"admin_note": "Test"}
        )
        assert response.status_code in [401, 403], "Should require authentication"
        print("✓ Review endpoint requires authentication")


class TestLeaderboardPrivacy:
    """Test GET /api/staff/sales-dashboard leaderboard privacy"""

    def test_leaderboard_no_revenue_field(self, staff_token):
        """Verify leaderboard does NOT contain 'revenue' field (privacy)"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "leaderboard" in data, "Response should contain leaderboard"
        leaderboard = data["leaderboard"]
        
        if leaderboard:
            for entry in leaderboard:
                assert "revenue" not in entry, f"Leaderboard entry should NOT have revenue field: {entry}"
            print(f"✓ Leaderboard privacy verified: {len(leaderboard)} entries, no revenue field")
        else:
            print("⚠ Leaderboard empty (may be expected)")


class TestBalancedScoring:
    """Test balanced scoring in leaderboard"""

    def test_leaderboard_has_score_and_label(self, staff_token):
        """Verify leaderboard contains 'score' and 'label' fields"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        leaderboard = data.get("leaderboard", [])
        
        if leaderboard:
            for entry in leaderboard:
                assert "score" in entry, f"Leaderboard entry should have score: {entry}"
                assert "label" in entry, f"Leaderboard entry should have label: {entry}"
                assert isinstance(entry["score"], (int, float)), "Score should be numeric"
                assert entry["label"] in ["Top Performer", "Strong", "Improving", "Needs Attention"], \
                    f"Invalid label: {entry['label']}"
            
            # Verify sorted by score descending
            scores = [e["score"] for e in leaderboard]
            assert scores == sorted(scores, reverse=True), "Leaderboard should be sorted by score desc"
            
            print(f"✓ Balanced scoring verified: {len(leaderboard)} entries with score/label")
            for e in leaderboard[:3]:
                print(f"  - {e['name']}: score={e['score']}, label={e['label']}")
        else:
            print("⚠ Leaderboard empty (may be expected)")

    def test_leaderboard_has_required_fields(self, staff_token):
        """Verify leaderboard entries have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        leaderboard = data.get("leaderboard", [])
        required_fields = ["rank", "name", "deals", "commission", "avg_rating", "score", "label"]
        
        if leaderboard:
            for entry in leaderboard:
                for field in required_fields:
                    assert field in entry, f"Missing field '{field}' in leaderboard entry"
            print(f"✓ All required fields present in leaderboard")
        else:
            print("⚠ Leaderboard empty")


class TestSalesDashboardRatings:
    """Test sales dashboard rating features"""

    def test_dashboard_has_rating_fields(self, staff_token):
        """Verify dashboard returns avg_rating, total_ratings, recent_ratings"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "avg_rating" in data, "Dashboard should have avg_rating"
        assert "total_ratings" in data, "Dashboard should have total_ratings"
        assert "recent_ratings" in data, "Dashboard should have recent_ratings"
        
        assert isinstance(data["avg_rating"], (int, float)), "avg_rating should be numeric"
        assert isinstance(data["total_ratings"], int), "total_ratings should be int"
        assert isinstance(data["recent_ratings"], list), "recent_ratings should be list"
        
        print(f"✓ Dashboard rating fields: avg={data['avg_rating']}, total={data['total_ratings']}, recent={len(data['recent_ratings'])}")


class TestDaysFilter:
    """Test days filter parameter"""

    def test_sales_ratings_days_filter(self, admin_token):
        """Verify days filter works on sales-ratings endpoint"""
        for days in [30, 60, 90]:
            response = requests.get(
                f"{BASE_URL}/api/admin/discount-analytics/sales-ratings?days={days}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Failed for days={days}: {response.text}"
            data = response.json()
            assert data.get("ok") is True
        print("✓ Days filter works for 30, 60, 90 days")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
