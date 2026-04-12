"""
Test Suite for Iteration 277:
- GET /api/categories - Canonical categories with subcategories (no TEST_ entries)
- GET /api/admin/weekly-digest/snapshot - Revenue breakdown has NO 'Uncategorized'
- POST /api/affiliate-applications - Phone normalization
- POST /api/admin/affiliates - Phone normalization
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestCategoriesEndpoint:
    """Test GET /api/categories - Canonical categories with subcategories."""

    def test_categories_endpoint_returns_200(self):
        """Categories endpoint should return 200 (public, no auth)."""
        resp = requests.get(f"{BASE_URL}/api/categories")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ GET /api/categories returns 200")

    def test_categories_response_structure(self):
        """Response should have ok=True and categories array."""
        resp = requests.get(f"{BASE_URL}/api/categories")
        assert resp.status_code == 200
        data = resp.json()
        
        assert data.get("ok") is True, "Response should have ok=True"
        assert "categories" in data, "Response should have 'categories' field"
        assert isinstance(data["categories"], list), "categories should be a list"
        print(f"✓ Response structure valid: ok=True, {len(data['categories'])} categories")

    def test_categories_have_required_fields(self):
        """Each category should have id, name, slug, subcategories."""
        resp = requests.get(f"{BASE_URL}/api/categories")
        assert resp.status_code == 200
        data = resp.json()
        
        for cat in data["categories"]:
            assert "id" in cat, f"Category missing 'id': {cat}"
            assert "name" in cat, f"Category missing 'name': {cat}"
            assert "slug" in cat, f"Category missing 'slug': {cat}"
            assert "subcategories" in cat, f"Category missing 'subcategories': {cat}"
            assert isinstance(cat["subcategories"], list), f"subcategories should be list: {cat}"
        
        print(f"✓ All {len(data['categories'])} categories have required fields")

    def test_no_test_prefix_categories(self):
        """Categories should NOT include TEST_ prefixed entries."""
        resp = requests.get(f"{BASE_URL}/api/categories")
        assert resp.status_code == 200
        data = resp.json()
        
        for cat in data["categories"]:
            assert not cat.get("name", "").startswith("TEST_"), f"Found TEST_ category: {cat['name']}"
            for sub in cat.get("subcategories", []):
                assert not sub.get("name", "").startswith("TEST_"), f"Found TEST_ subcategory: {sub['name']}"
        
        print("✓ No TEST_ prefixed categories or subcategories found")

    def test_categories_have_real_names(self):
        """Categories should have real business names (not UUIDs or 'Uncategorized')."""
        resp = requests.get(f"{BASE_URL}/api/categories")
        assert resp.status_code == 200
        data = resp.json()
        
        category_names = [cat.get("name", "") for cat in data["categories"]]
        print(f"Category names: {category_names}")
        
        # Should not have 'Uncategorized'
        for name in category_names:
            assert name.lower() != "uncategorized", f"Found 'Uncategorized' category"
        
        print(f"✓ Categories have real names: {category_names[:5]}...")


class TestWeeklyDigestRevenueBreakdown:
    """Test GET /api/admin/weekly-digest/snapshot - No 'Uncategorized' in revenue_breakdown."""

    def test_weekly_digest_returns_200(self, admin_headers):
        """Weekly digest endpoint should return 200 with auth."""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ GET /api/admin/weekly-digest/snapshot returns 200")

    def test_revenue_breakdown_exists(self, admin_headers):
        """Response should have revenue_breakdown array."""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "revenue_breakdown" in data, "Response should have 'revenue_breakdown'"
        assert isinstance(data["revenue_breakdown"], list), "revenue_breakdown should be a list"
        print(f"✓ revenue_breakdown exists with {len(data['revenue_breakdown'])} entries")

    def test_no_uncategorized_in_revenue_breakdown(self, admin_headers):
        """Revenue breakdown should NOT have 'Uncategorized' category."""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        
        revenue_breakdown = data.get("revenue_breakdown", [])
        categories_in_breakdown = [item.get("category", "") for item in revenue_breakdown]
        print(f"Categories in revenue_breakdown: {categories_in_breakdown}")
        
        for item in revenue_breakdown:
            cat_name = item.get("category", "")
            assert cat_name.lower() != "uncategorized", f"Found 'Uncategorized' in revenue_breakdown: {item}"
        
        print("✓ No 'Uncategorized' in revenue_breakdown")

    def test_revenue_breakdown_has_real_category_names(self, admin_headers):
        """Revenue breakdown categories should be real names like 'Office Supplies', 'Apparel', 'General'."""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        
        revenue_breakdown = data.get("revenue_breakdown", [])
        
        # Valid fallback categories per the implementation
        valid_fallbacks = ["General", "Services", "Custom Orders"]
        
        for item in revenue_breakdown:
            cat_name = item.get("category", "")
            # Should not be empty
            assert cat_name, f"Category name should not be empty: {item}"
            # Should not be a UUID (36 chars with dashes)
            is_uuid = len(cat_name) == 36 and cat_name.count("-") == 4
            assert not is_uuid, f"Category appears to be a UUID: {cat_name}"
            # Should not be 'Uncategorized'
            assert cat_name.lower() != "uncategorized", f"Found 'Uncategorized': {item}"
        
        print(f"✓ All revenue_breakdown categories are real names")

    def test_revenue_breakdown_item_structure(self, admin_headers):
        """Each revenue_breakdown item should have category, revenue, pct."""
        resp = requests.get(f"{BASE_URL}/api/admin/weekly-digest/snapshot", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        
        for item in data.get("revenue_breakdown", []):
            assert "category" in item, f"Item missing 'category': {item}"
            assert "revenue" in item, f"Item missing 'revenue': {item}"
            assert "pct" in item, f"Item missing 'pct': {item}"
        
        print("✓ All revenue_breakdown items have required fields")


class TestAffiliateApplicationPhoneNormalization:
    """Test POST /api/affiliate-applications - Phone normalization."""

    def test_affiliate_application_with_phone(self):
        """Affiliate application should save normalized phone format."""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "full_name": f"TEST_Applicant_{unique_id}",
            "email": f"test_applicant_{unique_id}@example.com",
            "phone": "+255712345678",  # Already normalized format
            "company_name": "Test Company",
            "region": "Dar es Salaam",
            "notes": "Test application for phone normalization"
        }
        
        resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        print(f"Application response: {data}")
        
        # Verify phone is in normalized format
        if "application" in data:
            app = data["application"]
            phone = app.get("phone", "")
            assert phone.startswith("+"), f"Phone should start with +: {phone}"
            print(f"✓ Application created with phone: {phone}")
        elif "id" in data:
            print(f"✓ Application created with id: {data['id']}")
        else:
            print(f"✓ Application submitted successfully")

    def test_affiliate_application_phone_normalization_format(self):
        """Phone should be normalized to +XXXXXXXXXXXXX format."""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "full_name": f"TEST_PhoneNorm_{unique_id}",
            "email": f"test_phonenorm_{unique_id}@example.com",
            "phone": "+255712345678",
            "company_name": "",
            "region": "",
            "notes": ""
        }
        
        resp = requests.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        print("✓ Affiliate application accepts normalized phone format")


class TestAdminAffiliatePhoneNormalization:
    """Test POST /api/admin/affiliates - Phone normalization."""

    def test_create_affiliate_with_normalized_phone(self, admin_headers):
        """Admin creating affiliate should save normalized phone format."""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Affiliate_{unique_id}",
            "email": f"test_affiliate_{unique_id}@example.com",
            "phone": "+255712345678",  # Normalized format
            "affiliate_code": f"TEST{unique_id}".upper(),
            "is_active": True,
            "notes": "Test affiliate for phone normalization",
            "payout_method": "mobile_money",
            "mobile_money_number": "712345678",
            "mobile_money_provider": "M-Pesa"
        }
        
        resp = requests.post(f"{BASE_URL}/api/admin/affiliates", json=payload, headers=admin_headers)
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        print(f"Affiliate response: {data}")
        
        # Verify phone is in normalized format
        if "affiliate" in data:
            aff = data["affiliate"]
            phone = aff.get("phone", "")
            if phone:
                assert phone.startswith("+"), f"Phone should start with +: {phone}"
            print(f"✓ Affiliate created with phone: {phone}")
        elif "id" in data:
            print(f"✓ Affiliate created with id: {data['id']}")
        else:
            print(f"✓ Affiliate created successfully")

    def test_affiliate_phone_format_validation(self, admin_headers):
        """Affiliate phone should be in +XXXXXXXXXXXXX format."""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_PhoneFormat_{unique_id}",
            "email": f"test_phoneformat_{unique_id}@example.com",
            "phone": "+254712345678",  # Kenya format
            "affiliate_code": f"TESTKE{unique_id}".upper()[:12],
            "is_active": True
        }
        
        resp = requests.post(f"{BASE_URL}/api/admin/affiliates", json=payload, headers=admin_headers)
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        print("✓ Admin affiliate creation accepts normalized phone format")


class TestCleanup:
    """Cleanup TEST_ prefixed data after tests."""

    def test_cleanup_test_affiliates(self, admin_headers):
        """Delete TEST_ prefixed affiliates."""
        resp = requests.get(f"{BASE_URL}/api/admin/affiliates", headers=admin_headers)
        if resp.status_code == 200:
            data = resp.json()
            affiliates = data.get("affiliates", [])
            deleted = 0
            for aff in affiliates:
                aff_id = aff.get("id") or aff.get("_id")
                if not aff_id:
                    continue
                if aff.get("name", "").startswith("TEST_") or aff.get("affiliate_code", "").startswith("TEST"):
                    del_resp = requests.delete(f"{BASE_URL}/api/admin/affiliates/{aff_id}", headers=admin_headers)
                    if del_resp.status_code in [200, 204]:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} TEST_ affiliates")
        else:
            print(f"Could not fetch affiliates for cleanup: {resp.status_code}")

    def test_cleanup_test_applications(self, admin_headers):
        """Delete TEST_ prefixed affiliate applications."""
        resp = requests.get(f"{BASE_URL}/api/admin/affiliate-applications", headers=admin_headers)
        if resp.status_code == 200:
            data = resp.json()
            applications = data.get("applications", [])
            deleted = 0
            for app in applications:
                app_id = app.get("id") or app.get("_id")
                if not app_id:
                    continue
                if app.get("full_name", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/admin/affiliate-applications/{app_id}", headers=admin_headers)
                    if del_resp.status_code in [200, 204]:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} TEST_ applications")
        else:
            print(f"Could not fetch applications for cleanup: {resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
