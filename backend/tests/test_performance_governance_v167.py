"""
Performance Governance Phase 3 Tests — Tests for unified performance governance CRUD,
weight normalization, threshold validation, audit logging, and integration with
sales/vendor performance services.
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
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def vendor_token():
    """Get vendor/partner auth token"""
    response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    assert response.status_code == 200, f"Vendor login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    assert response.status_code == 200, f"Customer login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def sales_token():
    """Get sales auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    assert response.status_code == 200, f"Sales login failed: {response.text}"
    return response.json().get("token")


class TestPerformanceGovernanceSettings:
    """Tests for GET/PUT /api/admin/performance-governance/settings"""

    def test_get_settings_returns_defaults_or_saved(self, admin_token):
        """GET /api/admin/performance-governance/settings returns settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/performance-governance/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "sales" in data, "Missing 'sales' section"
        assert "vendor" in data, "Missing 'vendor' section"
        
        # Verify sales settings structure
        assert "weights" in data["sales"], "Missing sales weights"
        assert "thresholds" in data["sales"], "Missing sales thresholds"
        assert "min_sample_size" in data["sales"], "Missing sales min_sample_size"
        
        # Verify vendor settings structure
        assert "weights" in data["vendor"], "Missing vendor weights"
        assert "thresholds" in data["vendor"], "Missing vendor thresholds"
        assert "min_sample_size" in data["vendor"], "Missing vendor min_sample_size"
        
        # Verify threshold structure
        for role in ["sales", "vendor"]:
            thresholds = data[role]["thresholds"]
            assert "excellent" in thresholds
            assert "safe" in thresholds
            assert "risk" in thresholds
        
        print(f"GET settings returned: sales weights={list(data['sales']['weights'].keys())}, vendor weights={list(data['vendor']['weights'].keys())}")

    def test_put_settings_saves_and_normalizes_weights(self, admin_token):
        """PUT /api/admin/performance-governance/settings saves and normalizes weights"""
        # Send weights that don't sum to 1.0
        payload = {
            "sales": {
                "weights": {
                    "customer_rating": 0.40,
                    "conversion_rate": 0.30,
                    "revenue_contribution": 0.20,
                    "response_speed": 0.10,
                    "follow_up_compliance": 0.10,
                },
                "thresholds": {"excellent": 90, "safe": 75, "risk": 55},
                "min_sample_size": 8
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/performance-governance/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        
        # Verify weights were normalized to sum=1.0
        sales_weights = data["sales"]["weights"]
        total = sum(sales_weights.values())
        assert 0.98 <= total <= 1.02, f"Weights not normalized: sum={total}"
        
        # Verify thresholds were saved
        assert data["sales"]["thresholds"]["excellent"] == 90
        assert data["sales"]["thresholds"]["safe"] == 75
        assert data["sales"]["thresholds"]["risk"] == 55
        
        # Verify min_sample_size was saved
        assert data["sales"]["min_sample_size"] == 8
        
        print(f"PUT settings: weights normalized to sum={total:.2f}, thresholds saved correctly")

    def test_put_settings_enforces_threshold_ordering(self, admin_token):
        """PUT enforces excellent > safe > risk threshold ordering"""
        # Send invalid thresholds (safe >= excellent)
        payload = {
            "vendor": {
                "thresholds": {"excellent": 80, "safe": 85, "risk": 70}
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/performance-governance/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        
        # Verify ordering was enforced
        thresholds = data["vendor"]["thresholds"]
        assert thresholds["excellent"] > thresholds["safe"], f"excellent ({thresholds['excellent']}) should be > safe ({thresholds['safe']})"
        assert thresholds["safe"] > thresholds["risk"], f"safe ({thresholds['safe']}) should be > risk ({thresholds['risk']})"
        
        print(f"Threshold ordering enforced: excellent={thresholds['excellent']}, safe={thresholds['safe']}, risk={thresholds['risk']}")


class TestPerformanceGovernanceAudit:
    """Tests for GET /api/admin/performance-governance/audit"""

    def test_get_audit_returns_history(self, admin_token):
        """GET /api/admin/performance-governance/audit returns change history"""
        response = requests.get(
            f"{BASE_URL}/api/admin/performance-governance/audit",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "entries" in data, "Missing 'entries' field"
        assert isinstance(data["entries"], list), "entries should be a list"
        
        # Should have at least 1 entry from previous tests
        if len(data["entries"]) > 0:
            entry = data["entries"][0]
            assert "action" in entry or "changed_by" in entry, "Audit entry missing expected fields"
            print(f"Audit log has {len(data['entries'])} entries, latest by: {entry.get('changed_by', 'unknown')}")
        else:
            print("Audit log is empty (no changes made yet)")


class TestPerformanceGovernanceAccessControl:
    """Tests for admin-only access control on governance endpoints"""

    def test_non_admin_gets_403_on_settings(self, sales_token):
        """Non-admin (sales) gets 403 on governance settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/performance-governance/settings",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Sales user correctly blocked from governance settings (403)")

    def test_non_admin_gets_403_on_audit(self, sales_token):
        """Non-admin (sales) gets 403 on governance audit"""
        response = requests.get(
            f"{BASE_URL}/api/admin/performance-governance/audit",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Sales user correctly blocked from governance audit (403)")

    def test_customer_gets_401_on_settings(self, customer_token):
        """Customer gets 401/403 on governance settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/performance-governance/settings",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"Customer correctly blocked from governance settings ({response.status_code})")

    def test_unauthenticated_gets_401(self):
        """Unauthenticated request gets 401"""
        response = requests.get(f"{BASE_URL}/api/admin/performance-governance/settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Unauthenticated request correctly blocked (401/403)")


class TestSalesPerformanceIntegration:
    """Tests that sales performance still works after governance integration"""

    def test_sales_team_performance_returns_data(self, admin_token):
        """GET /api/admin/sales-performance/team returns correct data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # API returns {"team": [...]} structure
        team = data.get("team", data) if isinstance(data, dict) else data
        assert isinstance(team, list), f"Expected list of sales members, got {type(team)}"
        
        if len(team) > 0:
            member = team[0]
            assert "performance_score" in member, "Missing performance_score"
            assert "performance_zone" in member, "Missing performance_zone"
            print(f"Sales team has {len(team)} members, first: {member.get('name', member.get('email', 'unknown'))} at {member.get('performance_score')}%")
        else:
            print("No sales team members found")

    def test_sales_detail_returns_breakdown(self, admin_token):
        """GET /api/admin/sales-performance/team/{userId} returns breakdown"""
        # First get team to find a user ID
        team_response = requests.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert team_response.status_code == 200
        data = team_response.json()
        team = data.get("team", data) if isinstance(data, dict) else data
        
        if len(team) == 0:
            pytest.skip("No sales team members to test detail")
        
        user_id = team[0].get("sales_user_id") or team[0].get("user_id") or team[0].get("id")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/sales-performance/team/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "breakdown" in data, "Missing breakdown"
        assert "performance_score" in data, "Missing performance_score"
        print(f"Sales detail for {user_id}: score={data.get('performance_score')}%, breakdown has {len(data.get('breakdown', []))} metrics")


class TestVendorPerformanceIntegration:
    """Tests that vendor performance still works after governance integration"""

    def test_vendor_team_performance_returns_data(self, admin_token):
        """GET /api/admin/vendor-performance/team returns correct data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-performance/team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # API returns {"team": [...]} structure
        team = data.get("team", data) if isinstance(data, dict) else data
        assert isinstance(team, list), f"Expected list of vendors, got {type(team)}"
        
        if len(team) > 0:
            vendor = team[0]
            assert "performance_score" in vendor, "Missing performance_score"
            assert "performance_zone" in vendor, "Missing performance_zone"
            print(f"Vendor team has {len(team)} vendors, first: {vendor.get('name', 'unknown')} at {vendor.get('performance_score')}%")
        else:
            print("No vendors found")

    def test_vendor_my_performance_returns_data(self, vendor_token):
        """GET /api/vendor/my-performance returns vendor's own performance"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/my-performance",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "performance_score" in data, "Missing performance_score"
        assert "performance_zone" in data, "Missing performance_zone"
        assert "breakdown" in data, "Missing breakdown"
        
        # Verify breakdown has expected metrics (by label since key may not be present)
        breakdown_labels = [b.get("label", "").lower() for b in data.get("breakdown", [])]
        expected_labels = ["timeliness", "quality", "responsiveness", "internal rating", "process compliance"]
        for label in expected_labels:
            assert any(label in bl for bl in breakdown_labels), f"Missing breakdown metric: {label}"
        
        print(f"Vendor my-performance: score={data.get('performance_score')}%, zone={data.get('performance_zone')}")


class TestGovernanceSettingsReset:
    """Reset governance settings to defaults after tests"""

    def test_reset_to_defaults(self, admin_token):
        """Reset governance settings to reasonable defaults"""
        payload = {
            "sales": {
                "weights": {
                    "customer_rating": 0.30,
                    "conversion_rate": 0.25,
                    "revenue_contribution": 0.20,
                    "response_speed": 0.15,
                    "follow_up_compliance": 0.10,
                },
                "thresholds": {"excellent": 85, "safe": 70, "risk": 50},
                "min_sample_size": 5
            },
            "vendor": {
                "weights": {
                    "timeliness": 0.25,
                    "quality": 0.25,
                    "responsiveness": 0.20,
                    "rating": 0.20,
                    "compliance": 0.10,
                },
                "thresholds": {"excellent": 85, "safe": 70, "risk": 50},
                "min_sample_size": 3
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/performance-governance/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload
        )
        assert response.status_code == 200, f"Reset failed: {response.text}"
        print("Governance settings reset to defaults")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
