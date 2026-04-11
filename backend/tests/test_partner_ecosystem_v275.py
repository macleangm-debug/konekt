"""
Partner Ecosystem Summary API Tests - v275
Tests the /api/admin/partner-ecosystem/summary endpoint for KPIs, coverage, and partners data.
Uses class-scoped fixtures to minimize login attempts and avoid rate limiting.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token once for all tests in module"""
    time.sleep(1)  # Rate limit protection
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
    )
    if login_response.status_code == 429:
        pytest.skip("Rate limited - skipping tests")
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    return login_response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Auth headers for authenticated requests"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def ecosystem_data(auth_headers):
    """Fetch ecosystem data once for all tests"""
    response = requests.get(
        f"{BASE_URL}/api/admin/partner-ecosystem/summary",
        headers=auth_headers
    )
    assert response.status_code == 200
    return response.json()


class TestPartnerEcosystemSummary:
    """Tests for Partner Ecosystem Summary endpoint"""
    
    def test_summary_endpoint_returns_200(self, auth_headers):
        """Test that summary endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/admin/partner-ecosystem/summary",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
    
    def test_summary_contains_kpis(self, ecosystem_data):
        """Test that summary contains KPIs with required fields"""
        kpis = ecosystem_data.get("kpis", {})
        assert "total_partners" in kpis, "KPIs should have total_partners"
        assert "active_partners" in kpis, "KPIs should have active_partners"
        assert "inactive_partners" in kpis, "KPIs should have inactive_partners"
        assert "preferred_partners" in kpis, "KPIs should have preferred_partners"
        assert "affiliates" in kpis, "KPIs should have affiliates"
        assert "pending_applications" in kpis, "KPIs should have pending_applications"
        assert "by_type" in kpis, "KPIs should have by_type breakdown"
        
        # Verify types are integers
        assert isinstance(kpis["total_partners"], int), "total_partners should be int"
        assert isinstance(kpis["active_partners"], int), "active_partners should be int"
        assert isinstance(kpis["inactive_partners"], int), "inactive_partners should be int"
        assert isinstance(kpis["affiliates"], int), "affiliates should be int"
        assert isinstance(kpis["pending_applications"], int), "pending_applications should be int"
        assert isinstance(kpis["by_type"], dict), "by_type should be a dict"
    
    def test_summary_contains_coverage(self, ecosystem_data):
        """Test that summary contains coverage analysis"""
        coverage = ecosystem_data.get("coverage", {})
        assert "regions_served" in coverage, "Coverage should have regions_served"
        assert "categories_covered" in coverage, "Coverage should have categories_covered"
        assert "partners_without_region" in coverage, "Coverage should have partners_without_region"
        assert "partners_without_category" in coverage, "Coverage should have partners_without_category"
        
        # Verify types
        assert isinstance(coverage["regions_served"], list), "regions_served should be list"
        assert isinstance(coverage["categories_covered"], list), "categories_covered should be list"
        assert isinstance(coverage["partners_without_region"], int), "partners_without_region should be int"
        assert isinstance(coverage["partners_without_category"], int), "partners_without_category should be int"
    
    def test_summary_contains_partners_list(self, ecosystem_data):
        """Test that summary contains partners list with required fields"""
        partners = ecosystem_data.get("partners", [])
        assert isinstance(partners, list), "partners should be a list"
        
        if len(partners) > 0:
            partner = partners[0]
            # Verify partner fields
            assert "name" in partner, "Partner should have name"
            assert "partner_type" in partner, "Partner should have partner_type"
            assert "regions" in partner, "Partner should have regions"
            assert "categories" in partner, "Partner should have categories"
            assert "status" in partner, "Partner should have status"
            assert "contact_person" in partner, "Partner should have contact_person"
            assert "email" in partner, "Partner should have email"
            assert "phone" in partner, "Partner should have phone"
            assert "coverage_mode" in partner, "Partner should have coverage_mode"
            assert "fulfillment_type" in partner, "Partner should have fulfillment_type"
            assert "lead_time_days" in partner, "Partner should have lead_time_days"
    
    def test_kpi_counts_are_consistent(self, ecosystem_data):
        """Test that KPI counts are logically consistent"""
        kpis = ecosystem_data.get("kpis", {})
        partners = ecosystem_data.get("partners", [])
        
        # Total partners should match list length
        assert kpis["total_partners"] == len(partners), \
            f"total_partners ({kpis['total_partners']}) should match partners list length ({len(partners)})"
        
        # Active + inactive should be <= total (some might have other statuses)
        assert kpis["active_partners"] + kpis["inactive_partners"] <= kpis["total_partners"], \
            "Active + inactive should be <= total"
    
    def test_by_type_breakdown_sums_to_total(self, ecosystem_data):
        """Test that by_type breakdown sums to total partners"""
        kpis = ecosystem_data.get("kpis", {})
        by_type = kpis.get("by_type", {})
        
        type_sum = sum(by_type.values())
        assert type_sum == kpis["total_partners"], \
            f"Sum of by_type ({type_sum}) should equal total_partners ({kpis['total_partners']})"
    
    def test_partner_types_are_valid(self, ecosystem_data):
        """Test that partner types are from expected set"""
        valid_types = {"distributor", "service", "service_partner", "product", "hybrid", "other"}
        partners = ecosystem_data.get("partners", [])
        
        for partner in partners:
            ptype = partner.get("partner_type", "other")
            assert ptype in valid_types, f"Invalid partner type: {ptype}"
    
    def test_partner_statuses_are_valid(self, ecosystem_data):
        """Test that partner statuses are from expected set"""
        valid_statuses = {"active", "inactive", "suspended"}
        partners = ecosystem_data.get("partners", [])
        
        for partner in partners:
            status = partner.get("status", "inactive")
            assert status in valid_statuses, f"Invalid partner status: {status}"
    
    def test_regions_and_categories_are_lists(self, ecosystem_data):
        """Test that regions and categories are always lists"""
        partners = ecosystem_data.get("partners", [])
        for partner in partners:
            assert isinstance(partner.get("regions", []), list), \
                f"Partner {partner.get('name')} regions should be list"
            assert isinstance(partner.get("categories", []), list), \
                f"Partner {partner.get('name')} categories should be list"


class TestPartnerEcosystemDataIntegrity:
    """Tests for data integrity in Partner Ecosystem"""
    
    def test_coverage_regions_from_active_partners(self, ecosystem_data):
        """Test that regions_served only includes regions from active partners"""
        coverage = ecosystem_data.get("coverage", {})
        partners = ecosystem_data.get("partners", [])
        
        # Get regions from active partners only
        active_regions = set()
        for p in partners:
            if p.get("status") == "active":
                for r in p.get("regions", []):
                    if r:
                        active_regions.add(r)
        
        served_regions = set(coverage.get("regions_served", []))
        
        # regions_served should be subset of active partner regions
        assert served_regions.issubset(active_regions) or served_regions == active_regions, \
            f"regions_served should only include active partner regions"
    
    def test_gap_counts_are_accurate(self, ecosystem_data):
        """Test that gap counts (partners without region/category) are accurate"""
        coverage = ecosystem_data.get("coverage", {})
        partners = ecosystem_data.get("partners", [])
        
        # Count active partners without regions
        active_no_region = 0
        active_no_category = 0
        for p in partners:
            if p.get("status") == "active":
                if not p.get("regions"):
                    active_no_region += 1
                if not p.get("categories"):
                    active_no_category += 1
        
        assert coverage.get("partners_without_region") == active_no_region, \
            f"partners_without_region mismatch: expected {active_no_region}, got {coverage.get('partners_without_region')}"
        assert coverage.get("partners_without_category") == active_no_category, \
            f"partners_without_category mismatch: expected {active_no_category}, got {coverage.get('partners_without_category')}"
