"""
Test Vendor Margin UX Pack - Pack 1 & Pack 2 Backend APIs
Tests for:
- GET /api/admin/vendors - Vendor list
- GET /api/admin/vendors/stats - Vendor stats
- GET /api/admin/vendors/{id} - Vendor detail
- POST /api/admin/vendors - Create vendor
- GET /api/admin/margins/global - Global margin tiers
- POST /api/admin/margins/resolve - Pricing resolution
- POST /api/admin/margins/preview - Preview pricing table
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Auth headers for admin requests."""
    return {"Authorization": f"Bearer {admin_token}"}


class TestVendorAdminAPIs:
    """Pack 1: Vendor Admin API Tests"""

    def test_get_vendors_list(self, auth_headers):
        """GET /api/admin/vendors - List all vendors"""
        response = requests.get(f"{BASE_URL}/api/admin/vendors", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/vendors - Found {len(data)} vendors")

    def test_get_vendors_stats(self, auth_headers):
        """GET /api/admin/vendors/stats - Vendor statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/vendors/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify expected stat keys
        expected_keys = ["total", "active", "inactive", "products", "services", "promotional_materials"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        print(f"✓ GET /api/admin/vendors/stats - Stats: total={data.get('total')}, active={data.get('active')}")

    def test_get_vendors_filtered_by_capability(self, auth_headers):
        """GET /api/admin/vendors?capability=products - Filter by capability"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendors",
            params={"capability": "products"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/vendors?capability=products - Found {len(data)} product vendors")

    def test_create_vendor(self, auth_headers):
        """POST /api/admin/vendors - Create a new vendor"""
        import time
        unique_id = int(time.time())
        payload = {
            "name": f"TEST_Vendor_{unique_id}",
            "email": f"test.vendor.{unique_id}@example.com",
            "phone": "+255123456789",
            "company": f"Test Company {unique_id}",
            "capability_type": "products"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/vendors",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain vendor id"
        assert data.get("full_name") == payload["name"], "Vendor name should match"
        print(f"✓ POST /api/admin/vendors - Created vendor: {data.get('id')}")
        return data.get("id")

    def test_get_vendor_detail(self, auth_headers):
        """GET /api/admin/vendors/{id} - Get vendor detail"""
        # First get list to find a vendor
        list_response = requests.get(f"{BASE_URL}/api/admin/vendors", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            vendor_id = list_response.json()[0].get("id")
            response = requests.get(f"{BASE_URL}/api/admin/vendors/{vendor_id}", headers=auth_headers)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert "id" in data, "Response should contain vendor id"
            assert "name" in data, "Response should contain vendor name"
            assert "supply_records" in data, "Response should contain supply_records"
            print(f"✓ GET /api/admin/vendors/{vendor_id} - Vendor: {data.get('name')}, supply_records: {len(data.get('supply_records', []))}")
        else:
            pytest.skip("No vendors found to test detail endpoint")


class TestMarginAdminAPIs:
    """Pack 2: Margin Admin API Tests"""

    def test_get_global_margins(self, auth_headers):
        """GET /api/admin/margins/global - Get global margin tiers"""
        response = requests.get(f"{BASE_URL}/api/admin/margins/global", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tiers" in data, "Response should contain tiers"
        assert "defaults" in data, "Response should contain defaults"
        assert isinstance(data["tiers"], list), "Tiers should be a list"
        print(f"✓ GET /api/admin/margins/global - Found {len(data['tiers'])} tiers")
        # Verify tier structure
        if data["tiers"]:
            tier = data["tiers"][0]
            assert "min" in tier, "Tier should have min"
            assert "max" in tier, "Tier should have max"
            assert "type" in tier, "Tier should have type"
            print(f"  First tier: {tier.get('label', 'N/A')} - min={tier['min']}, max={tier['max']}, type={tier['type']}")

    def test_resolve_price(self, auth_headers):
        """POST /api/admin/margins/resolve - Test pricing resolution"""
        test_prices = [5000, 25000, 100000, 500000, 2000000]
        for base_price in test_prices:
            response = requests.post(
                f"{BASE_URL}/api/admin/margins/resolve",
                json={"base_price": base_price},
                headers=auth_headers
            )
            assert response.status_code == 200, f"Expected 200 for price {base_price}, got {response.status_code}: {response.text}"
            data = response.json()
            assert "base_price" in data, "Response should contain base_price"
            assert "final_price" in data, "Response should contain final_price"
            assert "resolved_from" in data, "Response should contain resolved_from"
            assert data["final_price"] >= data["base_price"], "Final price should be >= base price"
            margin = data["final_price"] - data["base_price"]
            margin_pct = (margin / base_price * 100) if base_price else 0
            print(f"✓ Resolve {base_price:,} -> {data['final_price']:,.0f} (margin: {margin:,.0f} = {margin_pct:.1f}%, source: {data['resolved_from']})")

    def test_preview_margins(self, auth_headers):
        """POST /api/admin/margins/preview - Get pricing preview table"""
        response = requests.post(f"{BASE_URL}/api/admin/margins/preview", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tiers" in data, "Response should contain tiers"
        assert "preview" in data, "Response should contain preview"
        assert isinstance(data["preview"], list), "Preview should be a list"
        print(f"✓ POST /api/admin/margins/preview - {len(data['preview'])} sample prices")
        # Verify preview structure
        if data["preview"]:
            sample = data["preview"][0]
            assert "base_price" in sample, "Preview item should have base_price"
            assert "final_price" in sample, "Preview item should have final_price"
            assert "margin" in sample, "Preview item should have margin"
            assert "margin_pct" in sample, "Preview item should have margin_pct"
            assert "resolved_from" in sample, "Preview item should have resolved_from"

    def test_update_global_margins(self, auth_headers):
        """PUT /api/admin/margins/global - Update global margin tiers"""
        # First get current tiers
        get_response = requests.get(f"{BASE_URL}/api/admin/margins/global", headers=auth_headers)
        assert get_response.status_code == 200
        current_tiers = get_response.json().get("tiers", [])
        
        # Update with same tiers (idempotent test)
        response = requests.put(
            f"{BASE_URL}/api/admin/margins/global",
            json={"tiers": current_tiers},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response should indicate success"
        print(f"✓ PUT /api/admin/margins/global - Updated {len(current_tiers)} tiers")


class TestExistingPagesRegression:
    """Regression tests for existing pages (Orders, Payments, Quotes)"""

    def test_orders_page_loads(self, auth_headers):
        """GET /api/admin/orders-ops - Orders page data"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/admin/orders-ops - Orders page working")

    def test_payments_queue_loads(self, auth_headers):
        """GET /api/admin/payments/queue - Payments queue data"""
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/admin/payments/queue - Payments queue working")

    def test_quotes_page_loads(self, auth_headers):
        """GET /api/admin/quotes-v2 - Quotes page data"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/admin/quotes-v2 - Quotes page working")

    def test_sidebar_counts(self, auth_headers):
        """GET /api/admin/sidebar-counts - Sidebar badge counts"""
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-counts", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ GET /api/admin/sidebar-counts - Counts: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
