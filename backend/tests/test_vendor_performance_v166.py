"""
Test Vendor Performance Pack (Phase 2)
- Admin: GET /api/admin/vendor-performance/team (list all vendors with scores)
- Admin: GET /api/admin/vendor-performance/team/{vendorId} (full breakdown with tips)
- Vendor: GET /api/vendor/my-performance (own score, breakdown without tip field)
- Customer: NO ACCESS (403/401)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestVendorPerformanceBackend:
    """Vendor Performance API Tests"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data.get("token")

    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor/partner auth token"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        return data.get("access_token")

    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        return data.get("token")

    # ===== ADMIN ENDPOINTS =====

    def test_admin_get_vendor_team_performance(self, admin_token):
        """Admin can get all vendor performance scores"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "team" in data, "Response should have 'team' key"
        team = data["team"]
        assert isinstance(team, list), "Team should be a list"
        
        # If there are vendors, verify structure
        if len(team) > 0:
            vendor = team[0]
            assert "vendor_id" in vendor, "Vendor should have vendor_id"
            assert "name" in vendor, "Vendor should have name"
            assert "email" in vendor, "Vendor should have email"
            assert "performance_score" in vendor, "Vendor should have performance_score"
            assert "performance_zone" in vendor, "Vendor should have performance_zone"
            assert "sample_size" in vendor, "Vendor should have sample_size"
            
            # Verify zone is valid
            assert vendor["performance_zone"] in ["excellent", "safe", "risk", "developing"], \
                f"Invalid zone: {vendor['performance_zone']}"
            
            print(f"Found {len(team)} vendors in team performance list")
            for v in team[:3]:  # Print first 3
                print(f"  - {v.get('name', 'N/A')}: {v.get('performance_score')}% ({v.get('performance_zone')})")

    def test_admin_get_vendor_detail_performance(self, admin_token):
        """Admin can get full breakdown for a specific vendor"""
        # First get the team list to find a vendor_id
        team_response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert team_response.status_code == 200
        team = team_response.json().get("team", [])
        
        if len(team) == 0:
            pytest.skip("No vendors found to test detail endpoint")
        
        vendor_id = team[0]["vendor_id"]
        
        # Get detail
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team/{vendor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify full breakdown structure
        assert "vendor_id" in data, "Should have vendor_id"
        assert "vendor_name" in data, "Should have vendor_name"
        assert "performance_score" in data, "Should have performance_score"
        assert "performance_zone" in data, "Should have performance_zone"
        assert "sample_size" in data, "Should have sample_size"
        assert "breakdown" in data, "Should have breakdown"
        assert "tips" in data, "Should have tips (admin sees tips)"
        assert "computed_at" in data, "Should have computed_at"
        assert "last_updated" in data, "Should have last_updated"
        
        # Verify breakdown has 5 metrics
        breakdown = data["breakdown"]
        assert len(breakdown) == 5, f"Should have 5 breakdown metrics, got {len(breakdown)}"
        
        # Verify each breakdown entry has tip field (admin sees tips)
        for b in breakdown:
            assert "label" in b, "Breakdown should have label"
            assert "raw_score" in b, "Breakdown should have raw_score"
            assert "weight" in b, "Breakdown should have weight"
            assert "weighted" in b, "Breakdown should have weighted"
            assert "tip" in b, "Admin breakdown should have tip field"
        
        # Verify tips array
        assert isinstance(data["tips"], list), "Tips should be a list"
        
        print(f"Vendor detail: {data.get('vendor_name')} - {data.get('performance_score')}%")
        print(f"  Breakdown: {[b['label'] for b in breakdown]}")
        print(f"  Tips: {data.get('tips', [])[:2]}")

    def test_admin_get_vendor_detail_not_found(self, admin_token):
        """Admin gets 404 for non-existent vendor"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team/nonexistent-vendor-id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    # ===== VENDOR SELF-VIEW =====

    def test_vendor_get_my_performance(self, vendor_token):
        """Vendor can see own performance score and breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/my-performance",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "performance_score" in data, "Should have performance_score"
        assert "performance_zone" in data, "Should have performance_zone"
        assert "sample_size" in data, "Should have sample_size"
        assert "breakdown" in data, "Should have breakdown"
        assert "tips" in data, "Should have tips"
        assert "computed_at" in data, "Should have computed_at"
        assert "last_updated" in data, "Should have last_updated"
        
        # ROLE SAFETY: Verify breakdown entries do NOT have 'tip' field
        breakdown = data["breakdown"]
        assert len(breakdown) == 5, f"Should have 5 breakdown metrics, got {len(breakdown)}"
        
        for b in breakdown:
            assert "label" in b, "Breakdown should have label"
            assert "raw_score" in b, "Breakdown should have raw_score"
            assert "weight" in b, "Breakdown should have weight"
            assert "weighted" in b, "Breakdown should have weighted"
            assert "tip" not in b, "Vendor breakdown should NOT have tip field (role safety)"
        
        # But tips array should still be present
        assert isinstance(data["tips"], list), "Tips array should be present"
        
        print(f"Vendor self-view: {data.get('performance_score')}% ({data.get('performance_zone')})")
        print(f"  Sample size: {data.get('sample_size')}")

    # ===== ACCESS CONTROL =====

    def test_customer_cannot_access_admin_vendor_team(self, customer_token):
        """Customer cannot access admin vendor performance endpoint (403)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Customer correctly blocked from admin vendor-performance/team (403)")

    def test_customer_cannot_access_vendor_my_performance(self, customer_token):
        """Customer cannot access vendor my-performance endpoint (401)"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/my-performance",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Customer token is not a partner token, so should get 401
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"Customer correctly blocked from vendor/my-performance ({response.status_code})")

    def test_vendor_cannot_access_admin_vendor_team(self, vendor_token):
        """Vendor cannot access admin vendor team endpoint (403)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        # Vendor token is partner token, not admin token - should fail auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"Vendor correctly blocked from admin vendor-performance/team ({response.status_code})")

    def test_unauthenticated_cannot_access_vendor_performance(self):
        """Unauthenticated requests are rejected"""
        # Admin endpoint
        response1 = requests.get(f"{BASE_URL}/api/admin/vendor-performance/team")
        assert response1.status_code in [401, 403], f"Expected 401/403, got {response1.status_code}"
        
        # Vendor endpoint
        response2 = requests.get(f"{BASE_URL}/api/vendor/my-performance")
        assert response2.status_code in [401, 403], f"Expected 401/403, got {response2.status_code}"
        
        print("Unauthenticated requests correctly rejected")

    # ===== DATA VALIDATION =====

    def test_vendor_performance_score_range(self, admin_token):
        """Performance scores should be 0-100"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        team = response.json().get("team", [])
        
        for vendor in team:
            score = vendor.get("performance_score", 0)
            assert 0 <= score <= 100, f"Score {score} out of range for {vendor.get('name')}"
        
        print(f"All {len(team)} vendor scores are in valid range (0-100)")

    def test_vendor_performance_zones_valid(self, admin_token):
        """Performance zones should be valid values"""
        valid_zones = ["excellent", "safe", "risk", "developing"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        team = response.json().get("team", [])
        
        for vendor in team:
            zone = vendor.get("performance_zone")
            assert zone in valid_zones, f"Invalid zone '{zone}' for {vendor.get('name')}"
        
        print(f"All {len(team)} vendor zones are valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
