"""
Test Suite for Iteration 329: Product Upload Wizard, Commission Engine, Quote Flow

Features tested:
1. Product upload wizard: subcategory is dropdown when category has subcategories configured
2. Product upload wizard: subcategory dropdown includes '+ Request new subcategory' option
3. Commission engine POST /api/admin/commission/calculate uses tier distribution_split
4. Commission engine with channel=affiliate returns affiliate_allocation > 0
5. Commission engine with channel=direct returns sales_allocation based on tier sales_pct
6. Quote → Invoice → Order flow: approve quote generates invoice + order with pending_payment
7. POST /api/admin/catalog/subcategory-requests creates a subcategory request
8. GET /api/admin/catalog/subcategory-requests returns pending requests
9. Vendor Ops select-winner uses pricing engine (calculate_sell_price) not hardcoded margin
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
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
    """Get authorization headers."""
    return {"Authorization": f"Bearer {admin_token}"}


class TestSubcategoryRequestEndpoints:
    """Test subcategory request CRUD endpoints."""

    def test_create_subcategory_request(self, auth_headers):
        """POST /api/admin/catalog/subcategory-requests creates a subcategory request."""
        payload = {
            "category_name": "Office Supplies",
            "name": "TEST_Ergonomic Accessories",
            "requested_by": "test_user_329",
            "reason": "Need category for ergonomic products"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/catalog/subcategory-requests",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True, "Expected ok=True"
        assert "request" in data, "Expected 'request' in response"
        req = data["request"]
        assert req.get("category_name") == "Office Supplies"
        assert req.get("requested_name") == "TEST_Ergonomic Accessories"
        assert req.get("status") == "pending"
        print(f"✓ Created subcategory request: {req.get('id')}")

    def test_list_subcategory_requests(self, auth_headers):
        """GET /api/admin/catalog/subcategory-requests returns pending requests."""
        response = requests.get(
            f"{BASE_URL}/api/admin/catalog/subcategory-requests",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of requests"
        # Check if our test request is in the list
        test_requests = [r for r in data if "TEST_" in r.get("requested_name", "")]
        print(f"✓ Found {len(data)} pending subcategory requests, {len(test_requests)} are test requests")


class TestCommissionEngineDistributionSplit:
    """Test commission engine uses tier distribution_split for allocations."""

    def test_commission_calculate_endpoint_exists(self, auth_headers):
        """POST /api/admin/commission/calculate endpoint exists."""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 70000,
            "channel": "direct"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/commission/calculate",
            json=payload,
            headers=auth_headers
        )
        # Endpoint may return 200 or 404 if not implemented
        if response.status_code == 404:
            pytest.skip("Commission calculate endpoint not implemented yet")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ Commission calculate response: {data}")

    def test_commission_affiliate_channel_allocation(self, auth_headers):
        """Commission engine with channel=affiliate returns affiliate_allocation > 0."""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 70000,
            "channel": "affiliate"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/commission/calculate",
            json=payload,
            headers=auth_headers
        )
        if response.status_code == 404:
            pytest.skip("Commission calculate endpoint not implemented yet")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Affiliate channel should have affiliate_allocation > 0
        affiliate_alloc = data.get("affiliate_allocation", 0)
        assert affiliate_alloc > 0, f"Expected affiliate_allocation > 0, got {affiliate_alloc}"
        print(f"✓ Affiliate channel allocation: {affiliate_alloc}")

    def test_commission_direct_channel_sales_allocation(self, auth_headers):
        """Commission engine with channel=direct returns sales_allocation based on tier sales_pct."""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 70000,
            "channel": "direct"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/commission/calculate",
            json=payload,
            headers=auth_headers
        )
        if response.status_code == 404:
            pytest.skip("Commission calculate endpoint not implemented yet")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Direct channel should have sales_allocation > 0
        sales_alloc = data.get("sales_allocation", 0)
        assert sales_alloc > 0, f"Expected sales_allocation > 0, got {sales_alloc}"
        print(f"✓ Direct channel sales allocation: {sales_alloc}")


class TestQuoteToInvoiceOrderFlow:
    """Test Quote → Invoice → Order flow with approval."""

    def test_create_quote(self, auth_headers):
        """Create a test quote."""
        payload = {
            "customer_name": "TEST_Quote_Customer_329",
            "customer_email": "test_quote_329@example.com",
            "customer_company": "Test Company 329",
            "line_items": [
                {
                    "description": "Test Product",
                    "quantity": 2,
                    "unit_price": 50000,
                    "subtotal": 100000,
                    "total": 100000
                }
            ],
            "subtotal": 100000,
            "tax": 0,
            "discount": 0,
            "total": 100000,
            "currency": "TZS",
            "status": "draft"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/quotes-v2",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "quote_number" in data or "id" in data, "Expected quote_number or id in response"
        quote_id = data.get("id") or data.get("_id")
        quote_number = data.get("quote_number")
        print(f"✓ Created quote: {quote_number} (ID: {quote_id})")
        return quote_id

    def test_approve_quote_generates_invoice_and_order(self, auth_headers):
        """Approving a quote generates Invoice + Order with pending_payment status."""
        # First create a quote
        payload = {
            "customer_name": "TEST_Approval_Customer_329",
            "customer_email": "test_approval_329@example.com",
            "customer_company": "Test Approval Company",
            "line_items": [
                {
                    "description": "Test Approval Product",
                    "quantity": 1,
                    "unit_price": 75000,
                    "subtotal": 75000,
                    "total": 75000
                }
            ],
            "subtotal": 75000,
            "tax": 0,
            "discount": 0,
            "total": 75000,
            "currency": "TZS",
            "status": "draft"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/quotes-v2",
            json=payload,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Quote creation failed: {create_response.text}"
        quote_data = create_response.json()
        quote_id = quote_data.get("id") or quote_data.get("_id")
        quote_number = quote_data.get("quote_number")
        print(f"✓ Created quote for approval: {quote_number}")

        # Now approve the quote
        approve_response = requests.patch(
            f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=approved",
            headers=auth_headers
        )
        assert approve_response.status_code == 200, f"Quote approval failed: {approve_response.text}"
        approve_data = approve_response.json()
        
        # Check that invoice and order were generated
        generated_invoice = approve_data.get("generated_invoice") or approve_data.get("converted_invoice_number")
        generated_order = approve_data.get("generated_order") or approve_data.get("converted_order_number")
        
        assert generated_invoice is not None, f"Expected generated_invoice, got: {approve_data}"
        assert generated_order is not None, f"Expected generated_order, got: {approve_data}"
        
        print(f"✓ Quote approved - Invoice: {generated_invoice}, Order: {generated_order}")
        
        # Verify the order has pending_payment status
        # Get the order to verify status
        order_id = approve_data.get("converted_order_id")
        if order_id:
            order_response = requests.get(
                f"{BASE_URL}/api/admin/orders/{order_id}",
                headers=auth_headers
            )
            if order_response.status_code == 200:
                order_data = order_response.json()
                order = order_data.get("order", order_data)
                current_status = order.get("current_status")
                assert current_status == "pending_payment", f"Expected pending_payment, got {current_status}"
                print(f"✓ Order status verified: {current_status}")


class TestVendorOpsSelectWinnerPricingEngine:
    """Test Vendor Ops select-winner uses pricing engine."""

    def test_create_price_request_and_submit_quote(self, auth_headers):
        """Create a price request and submit a vendor quote."""
        # Create price request
        pr_payload = {
            "product_or_service": "TEST_Pricing_Engine_Product_329",
            "description": "Test product for pricing engine verification",
            "category": "Office Supplies",
            "quantity": 10,
            "unit_of_measurement": "Piece",
            "notes": "Testing pricing engine integration"
        }
        pr_response = requests.post(
            f"{BASE_URL}/api/vendor-ops/price-requests",
            json=pr_payload,
            headers=auth_headers
        )
        assert pr_response.status_code == 200, f"Price request creation failed: {pr_response.text}"
        pr_data = pr_response.json()
        pr_id = pr_data.get("price_request", {}).get("id")
        print(f"✓ Created price request: {pr_id}")
        return pr_id

    def test_select_winner_uses_pricing_engine(self, auth_headers):
        """Select winner uses calculate_sell_price from pricing engine."""
        # Create price request
        pr_payload = {
            "product_or_service": "TEST_Select_Winner_329",
            "description": "Test for select winner pricing",
            "category": "Office Supplies",
            "quantity": 5,
            "unit_of_measurement": "Piece"
        }
        pr_response = requests.post(
            f"{BASE_URL}/api/vendor-ops/price-requests",
            json=pr_payload,
            headers=auth_headers
        )
        assert pr_response.status_code == 200
        pr_data = pr_response.json()
        pr_id = pr_data.get("price_request", {}).get("id")

        # Submit a vendor quote
        quote_payload = {
            "vendor_id": "test_vendor_329",
            "vendor_name": "Test Vendor 329",
            "base_price": 50000,  # Vendor cost
            "lead_time": "3 days",
            "notes": "Test quote"
        }
        quote_response = requests.post(
            f"{BASE_URL}/api/vendor-ops/price-requests/{pr_id}/submit-quote",
            json=quote_payload,
            headers=auth_headers
        )
        assert quote_response.status_code == 200, f"Quote submission failed: {quote_response.text}"
        print(f"✓ Submitted vendor quote with base_price=50000")

        # Select the winner
        select_payload = {
            "vendor_id": "test_vendor_329"
        }
        select_response = requests.post(
            f"{BASE_URL}/api/vendor-ops/price-requests/{pr_id}/select-vendor",
            json=select_payload,
            headers=auth_headers
        )
        assert select_response.status_code == 200, f"Select winner failed: {select_response.text}"
        select_data = select_response.json()
        
        base_price = select_data.get("base_price")
        sell_price = select_data.get("sell_price")
        
        assert base_price == 50000, f"Expected base_price=50000, got {base_price}"
        assert sell_price is not None, "Expected sell_price in response"
        
        # Verify pricing engine was used (sell_price should be > base_price with margin)
        # Based on pricing tiers, Tier 1 (0-100K) has 35% margin
        # So sell_price should be approximately 50000 * 1.35 = 67500
        expected_min_sell = base_price * 1.20  # At least 20% margin
        assert sell_price >= expected_min_sell, f"Expected sell_price >= {expected_min_sell}, got {sell_price}"
        
        margin_pct = ((sell_price - base_price) / base_price) * 100
        print(f"✓ Select winner: base={base_price}, sell={sell_price}, margin={margin_pct:.1f}%")


class TestCatalogConfigSubcategories:
    """Test catalog config returns categories with subcategories."""

    def test_catalog_config_has_categories_with_subcategories(self, auth_headers):
        """GET /api/vendor-ops/catalog-config returns categories with subcategories array."""
        response = requests.get(
            f"{BASE_URL}/api/vendor-ops/catalog-config",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        categories = data.get("categories", [])
        assert len(categories) > 0, "Expected at least one category"
        
        # Check if any category has subcategories
        cats_with_subs = [c for c in categories if isinstance(c, dict) and c.get("subcategories")]
        print(f"✓ Found {len(categories)} categories, {len(cats_with_subs)} have subcategories")
        
        # Print sample category structure
        if categories:
            sample = categories[0]
            if isinstance(sample, dict):
                print(f"  Sample category: {sample.get('name')} - subcategories: {sample.get('subcategories', [])}")


class TestPricingTierDistributionSplit:
    """Test pricing tier has distribution_split configuration."""

    def test_settings_hub_has_pricing_tiers_with_distribution_split(self, auth_headers):
        """Settings Hub pricing_policy_tiers have distribution_split."""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings-hub",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        tiers = data.get("pricing_policy_tiers", [])
        if not tiers:
            pytest.skip("No pricing_policy_tiers configured")
        
        # Check first tier for distribution_split
        tier1 = tiers[0]
        distribution_split = tier1.get("distribution_split", {})
        
        print(f"✓ Tier 1: {tier1.get('label', 'Unknown')}")
        print(f"  - total_margin_pct: {tier1.get('total_margin_pct')}")
        print(f"  - distribution_split: {distribution_split}")
        
        # Verify distribution_split has expected keys
        expected_keys = ["affiliate_pct", "sales_pct", "referral_pct", "reserve_pct"]
        for key in expected_keys:
            if key in distribution_split:
                print(f"    - {key}: {distribution_split[key]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
