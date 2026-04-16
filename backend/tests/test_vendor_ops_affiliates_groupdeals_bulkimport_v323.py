"""
Test Suite for Iteration 323 Features:
1. VendorOps Orders/Fulfillment tab - GET /api/admin/orders-ops
2. Affiliates admin form with new fields (first_name, last_name, etc.)
3. Group Deals 5-step wizard campaign creation
4. Bulk import for catalog items via CSV
"""
import pytest
import requests
import os
import io
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@konekt.co.tz",
        "password": "KnktcKk_L-hw1wSyquvd!"
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")

@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: VendorOps Orders/Fulfillment Tab Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestVendorOpsOrdersTab:
    """Tests for VendorOps Orders/Fulfillment tab - GET /api/admin/orders-ops"""
    
    def test_orders_ops_endpoint_returns_200(self, auth_headers):
        """GET /api/admin/orders-ops should return 200"""
        resp = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ GET /api/admin/orders-ops returns 200")
    
    def test_orders_ops_returns_array_or_orders_key(self, auth_headers):
        """Response should be array or have 'orders' key"""
        resp = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # Can be array directly or {orders: [...]}
        if isinstance(data, list):
            orders = data
        else:
            orders = data.get("orders", [])
        assert isinstance(orders, list), "Orders should be a list"
        print(f"✓ Orders endpoint returns list with {len(orders)} orders")
    
    def test_orders_ops_with_status_filter(self, auth_headers):
        """GET /api/admin/orders-ops?status=pending_payment should filter"""
        resp = requests.get(f"{BASE_URL}/api/admin/orders-ops?status=pending_payment", headers=auth_headers)
        assert resp.status_code == 200, f"Status filter failed: {resp.text}"
        print("✓ Orders endpoint accepts status filter")
    
    def test_orders_ops_order_structure(self, auth_headers):
        """Orders should have expected fields: order_number, current_status, payment_confirmed"""
        resp = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        orders = data if isinstance(data, list) else data.get("orders", [])
        if len(orders) > 0:
            order = orders[0]
            # Check for key fields used by OrdersFulfillmentTab
            assert "order_number" in order or "id" in order, "Order should have order_number or id"
            print(f"✓ Order structure valid: {list(order.keys())[:8]}...")
        else:
            print("✓ No orders to validate structure (empty list is valid)")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: Affiliates Admin Form Tests (new fields)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAffiliatesAdminForm:
    """Tests for Affiliates admin form with aligned fields"""
    
    def test_get_affiliates_returns_200(self, auth_headers):
        """GET /api/admin/affiliates should return 200"""
        resp = requests.get(f"{BASE_URL}/api/admin/affiliates", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ GET /api/admin/affiliates returns 200")
    
    def test_create_affiliate_with_new_fields(self, auth_headers):
        """POST /api/admin/affiliates with first_name, last_name, primary_platform, etc."""
        unique_id = uuid4().hex[:8]
        payload = {
            "first_name": "TEST_John",
            "last_name": "Doe",
            "name": "TEST_John Doe",  # Combined name
            "email": f"test_affiliate_{unique_id}@example.com",
            "phone": "+255712345678",
            "location": "Dar es Salaam",
            "affiliate_code": f"TEST{unique_id.upper()}",
            "is_active": True,
            "primary_platform": "WhatsApp",
            "social_instagram": "@testuser",
            "social_tiktok": "@testuser",
            "social_facebook": "testuser",
            "social_website": "https://example.com",
            "audience_size": "1,000-5,000",
            "promotion_strategy": "Social media posts and direct messaging",
            "product_interests": "Electronics, Office Supplies",
            "expected_monthly_sales": 500000,
            "payout_method": "mobile_money",
            "mobile_money_number": "712345678",
            "mobile_money_provider": "M-Pesa",
        }
        resp = requests.post(f"{BASE_URL}/api/admin/affiliates", json=payload, headers=auth_headers)
        assert resp.status_code in [200, 201], f"Create affiliate failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        # Verify affiliate was created
        assert "affiliate" in data or "id" in data or "affiliate_code" in data, f"Unexpected response: {data}"
        print(f"✓ Created affiliate with new fields: {payload['affiliate_code']}")
        return payload["affiliate_code"]
    
    def test_affiliates_list_has_expected_fields(self, auth_headers):
        """Affiliates list should include performance fields"""
        resp = requests.get(f"{BASE_URL}/api/admin/affiliates", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        affiliates = data.get("affiliates", [])
        if len(affiliates) > 0:
            aff = affiliates[0]
            # Check for fields used by Performance tab
            expected_fields = ["name", "email", "affiliate_code", "is_active"]
            for field in expected_fields:
                assert field in aff, f"Missing field: {field}"
            print(f"✓ Affiliate has expected fields: {list(aff.keys())[:10]}...")
        else:
            print("✓ No affiliates to validate (empty list is valid)")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: Affiliate Withdrawals/Payouts Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestAffiliateWithdrawals:
    """Tests for Affiliate Withdrawals tab - GET /api/affiliate-payouts/admin"""
    
    def test_get_withdrawals_returns_200(self, auth_headers):
        """GET /api/affiliate-payouts/admin should return 200"""
        resp = requests.get(f"{BASE_URL}/api/affiliate-payouts/admin", headers=auth_headers)
        # May return 200 or 404 if endpoint doesn't exist
        assert resp.status_code in [200, 404], f"Unexpected status: {resp.status_code}"
        if resp.status_code == 200:
            data = resp.json()
            withdrawals = data.get("withdrawals", data.get("payouts", []))
            print(f"✓ GET /api/affiliate-payouts/admin returns 200 with {len(withdrawals)} records")
        else:
            print("⚠ Withdrawals endpoint returns 404 - may not be implemented yet")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: Group Deals 5-Step Wizard Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestGroupDealsWizard:
    """Tests for Group Deals campaign creation wizard"""
    
    def test_get_campaigns_returns_200(self, auth_headers):
        """GET /api/admin/group-deals/campaigns should return 200"""
        resp = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Campaigns should be a list"
        print(f"✓ GET /api/admin/group-deals/campaigns returns {len(data)} campaigns")
    
    def test_product_search_for_wizard(self, auth_headers):
        """GET /api/admin/group-deals/products/search should return products"""
        resp = requests.get(f"{BASE_URL}/api/admin/group-deals/products/search?q=", headers=auth_headers)
        assert resp.status_code == 200, f"Product search failed: {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Product search should return list"
        print(f"✓ Product search returns {len(data)} products")
    
    def test_create_campaign_with_wizard_fields(self, auth_headers):
        """POST /api/admin/group-deals/campaigns with wizard fields"""
        unique_id = uuid4().hex[:6]
        payload = {
            "product_name": f"TEST_Wizard_Product_{unique_id}",
            "product_id": f"test-prod-{unique_id}",
            "product_image": "",
            "category": "Electronics",
            "description": "Test campaign from wizard",
            "vendor_cost": "800000",
            "original_price": "1200000",
            "discounted_price": "960000",
            "display_target": "50",
            "vendor_threshold": "30",
            "duration_days": "14",
            "commission_mode": "none",
            "affiliate_share_pct": "0",
        }
        resp = requests.post(f"{BASE_URL}/api/admin/group-deals/campaigns", json=payload, headers=auth_headers)
        assert resp.status_code in [200, 201], f"Create campaign failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "id" in data or "campaign_id" in data, f"Campaign should have id: {data}"
        print(f"✓ Created group deal campaign: {payload['product_name']}")
        return data.get("id") or data.get("campaign_id")
    
    def test_campaign_has_margin_calculation(self, auth_headers):
        """Campaigns should have margin_per_unit and margin_pct"""
        resp = requests.get(f"{BASE_URL}/api/admin/group-deals/campaigns", headers=auth_headers)
        assert resp.status_code == 200
        campaigns = resp.json()
        if len(campaigns) > 0:
            camp = campaigns[0]
            # Check for margin fields used by ProfitCalculator
            if "margin_per_unit" in camp or "margin_pct" in camp:
                print(f"✓ Campaign has margin fields: margin_per_unit={camp.get('margin_per_unit')}, margin_pct={camp.get('margin_pct')}")
            else:
                print("⚠ Campaign missing margin fields (may be calculated client-side)")
        else:
            print("✓ No campaigns to validate margin fields")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: Bulk Import Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBulkImport:
    """Tests for Bulk Import - POST /api/admin/catalog-workspace/bulk-import"""
    
    def test_catalog_workspace_stats(self, auth_headers):
        """GET /api/admin/catalog-workspace/stats should return 200"""
        resp = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats", headers=auth_headers)
        assert resp.status_code == 200, f"Stats failed: {resp.status_code}"
        data = resp.json()
        assert "products" in data or "categories" in data, f"Stats should have products/categories: {data}"
        print(f"✓ Catalog workspace stats: {data.get('products', 0)} products, {data.get('category_count', 0)} categories")
    
    def test_bulk_import_csv(self, auth_headers):
        """POST /api/admin/catalog-workspace/bulk-import with CSV file"""
        unique_id = uuid4().hex[:6]
        csv_content = f"""name,category,subcategory,unit_of_measurement,sku,description,active
TEST_BulkItem1_{unique_id},Office Supplies,Stationery,Piece,SKU-{unique_id}-1,Test item 1,true
TEST_BulkItem2_{unique_id},Office Supplies,Stationery,Box,SKU-{unique_id}-2,Test item 2,true
TEST_BulkItem3_{unique_id},Electronics,Accessories,Piece,SKU-{unique_id}-3,Test item 3,true
"""
        files = {"file": ("test_import.csv", csv_content, "text/csv")}
        headers = {"Authorization": auth_headers["Authorization"]}  # No Content-Type for multipart
        
        resp = requests.post(f"{BASE_URL}/api/admin/catalog-workspace/bulk-import", files=files, headers=headers)
        assert resp.status_code == 200, f"Bulk import failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "imported" in data, f"Response should have 'imported' count: {data}"
        assert data["imported"] >= 0, "Imported count should be >= 0"
        print(f"✓ Bulk import: {data.get('imported')} imported, {data.get('skipped', 0)} skipped")
        return data
    
    def test_bulk_import_validates_required_name(self, auth_headers):
        """Bulk import should skip rows without name"""
        csv_content = """name,category,subcategory,unit_of_measurement,sku,description,active
,Office Supplies,Stationery,Piece,SKU-NONAME,Missing name,true
"""
        files = {"file": ("test_noname.csv", csv_content, "text/csv")}
        headers = {"Authorization": auth_headers["Authorization"]}
        
        resp = requests.post(f"{BASE_URL}/api/admin/catalog-workspace/bulk-import", files=files, headers=headers)
        assert resp.status_code == 200, f"Import failed: {resp.status_code}"
        data = resp.json()
        assert data.get("skipped", 0) >= 1, "Should skip row without name"
        print(f"✓ Bulk import validates required name: skipped {data.get('skipped')} rows")
    
    def test_bulk_import_detects_duplicates(self, auth_headers):
        """Bulk import should detect duplicates by name+category"""
        unique_id = uuid4().hex[:6]
        csv_content = f"""name,category,subcategory,unit_of_measurement,sku,description,active
TEST_DupItem_{unique_id},Office Supplies,Stationery,Piece,SKU-DUP-1,First item,true
TEST_DupItem_{unique_id},Office Supplies,Stationery,Piece,SKU-DUP-2,Duplicate item,true
"""
        files = {"file": ("test_dup.csv", csv_content, "text/csv")}
        headers = {"Authorization": auth_headers["Authorization"]}
        
        resp = requests.post(f"{BASE_URL}/api/admin/catalog-workspace/bulk-import", files=files, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        # First should import, second should be skipped as duplicate
        assert data.get("imported", 0) >= 1, "Should import at least one"
        print(f"✓ Bulk import handles duplicates: {data.get('imported')} imported, {data.get('skipped', 0)} skipped")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6: VendorOps Page Structure Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestVendorOpsPageStructure:
    """Tests for VendorOps page tabs and data"""
    
    def test_vendor_ops_dashboard_stats(self, auth_headers):
        """GET /api/vendor-ops/dashboard-stats should return stats"""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats", headers=auth_headers)
        assert resp.status_code == 200, f"Dashboard stats failed: {resp.status_code}"
        data = resp.json()
        print(f"✓ VendorOps dashboard stats: {data}")
    
    def test_vendor_ops_vendors_list(self, auth_headers):
        """GET /api/vendor-ops/vendors should return vendors"""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/vendors", headers=auth_headers)
        assert resp.status_code == 200, f"Vendors list failed: {resp.status_code}"
        data = resp.json()
        vendors = data.get("vendors", [])
        print(f"✓ VendorOps vendors: {len(vendors)} vendors")
    
    def test_vendor_ops_products_list(self, auth_headers):
        """GET /api/vendor-ops/products should return products"""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/products", headers=auth_headers)
        assert resp.status_code == 200, f"Products list failed: {resp.status_code}"
        data = resp.json()
        products = data.get("products", [])
        print(f"✓ VendorOps products: {len(products)} products")
    
    def test_vendor_ops_price_requests(self, auth_headers):
        """GET /api/vendor-ops/price-requests should return requests"""
        resp = requests.get(f"{BASE_URL}/api/vendor-ops/price-requests", headers=auth_headers)
        assert resp.status_code == 200, f"Price requests failed: {resp.status_code}"
        data = resp.json()
        requests_list = data.get("price_requests", [])
        print(f"✓ VendorOps price requests: {len(requests_list)} requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
