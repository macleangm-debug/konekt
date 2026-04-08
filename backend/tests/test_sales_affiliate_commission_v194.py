"""
Test Sales Commission Dashboard + Affiliate Dashboard APIs
Iteration 194 - Testing new commission/affiliate endpoints and margin engine
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for testing"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner token for testing"""
    response = requests.post(
        f"{BASE_URL}/api/partner-auth/login",
        json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Partner login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def sales_token():
    """Get sales staff token (uses admin auth endpoint)"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": SALES_EMAIL, "password": SALES_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    # Sales staff may not exist, skip gracefully
    pytest.skip(f"Sales login failed: {response.status_code}")


class TestSalesCommissionAPIs:
    """Test Sales Commission Dashboard endpoints"""

    def test_commission_summary_returns_ok(self, admin_token):
        """GET /api/staff/commissions/summary returns ok with summary object"""
        response = requests.get(
            f"{BASE_URL}/api/staff/commissions/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Response should have ok=True"
        assert "summary" in data, "Response should have summary object"
        
        summary = data["summary"]
        # Verify all required fields exist
        assert "total_earned" in summary, "Summary should have total_earned"
        assert "pending_payout" in summary, "Summary should have pending_payout"
        assert "paid_out" in summary, "Summary should have paid_out"
        assert "expected" in summary, "Summary should have expected"
        
        # Values should be numeric
        assert isinstance(summary["total_earned"], (int, float)), "total_earned should be numeric"
        assert isinstance(summary["pending_payout"], (int, float)), "pending_payout should be numeric"
        assert isinstance(summary["paid_out"], (int, float)), "paid_out should be numeric"
        assert isinstance(summary["expected"], (int, float)), "expected should be numeric"
        print(f"Commission summary: {summary}")

    def test_commission_orders_returns_ok(self, admin_token):
        """GET /api/staff/commissions/orders returns ok with orders array"""
        response = requests.get(
            f"{BASE_URL}/api/staff/commissions/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Response should have ok=True"
        assert "orders" in data, "Response should have orders array"
        assert isinstance(data["orders"], list), "orders should be a list"
        
        # If there are orders, verify structure
        if data["orders"]:
            order = data["orders"][0]
            required_fields = ["order_number", "customer_name", "order_total", 
                              "commission_amount", "commission_status", "order_status"]
            for field in required_fields:
                assert field in order, f"Order should have {field}"
            print(f"Found {len(data['orders'])} orders with commission data")
        else:
            print("No orders found (expected for admin user without assigned orders)")

    def test_commission_monthly_returns_ok(self, admin_token):
        """GET /api/staff/commissions/monthly returns ok with months array"""
        response = requests.get(
            f"{BASE_URL}/api/staff/commissions/monthly",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Response should have ok=True"
        assert "months" in data, "Response should have months array"
        assert isinstance(data["months"], list), "months should be a list"
        
        # If there are months, verify structure
        if data["months"]:
            month = data["months"][0]
            required_fields = ["month", "earned", "pending", "paid", "count"]
            for field in required_fields:
                assert field in month, f"Month should have {field}"
            print(f"Found {len(data['months'])} months of commission data")
        else:
            print("No monthly data found (expected for new setup)")


class TestAffiliateAPIs:
    """Test Affiliate Dashboard endpoints"""

    def test_affiliate_me_returns_200_not_401(self, admin_token):
        """GET /api/affiliate/me returns 200 with profile and summary (not 401)"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # This was returning 401 in iteration 194, now should return 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "profile" in data, "Response should have profile object"
        assert "summary" in data, "Response should have summary object"
        
        # Summary should have required fields
        summary = data["summary"]
        required_fields = ["total_earned", "total_approved", "total_paid", "payable_balance"]
        for field in required_fields:
            assert field in summary, f"Summary should have {field}"
        
        print(f"Affiliate /me response: profile={data['profile']}, summary={summary}")

    def test_product_promotions_returns_ok(self, admin_token):
        """GET /api/affiliate/product-promotions returns ok with products array"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate/product-promotions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Response should have ok=True"
        assert "products" in data, "Response should have products array"
        assert isinstance(data["products"], list), "products should be a list"
        
        # Verify products have required fields
        if data["products"]:
            product = data["products"][0]
            required_fields = ["product_name", "final_price", "affiliate_amount", 
                              "discount_amount", "promo_code", "share_link"]
            for field in required_fields:
                assert field in product, f"Product should have {field}"
            
            # Verify pricing values are numeric
            assert isinstance(product["final_price"], (int, float)), "final_price should be numeric"
            assert isinstance(product["affiliate_amount"], (int, float)), "affiliate_amount should be numeric"
            assert isinstance(product["discount_amount"], (int, float)), "discount_amount should be numeric"
            
            print(f"Found {len(data['products'])} products with affiliate pricing")
            print(f"Sample product: {product['product_name']} - Final: {product['final_price']}, Affiliate: {product['affiliate_amount']}, Discount: {product['discount_amount']}")
            
            # Verify rule_scope is tier
            assert "rule_scope" in product, "Product should have rule_scope"
            assert product["rule_scope"] == "tier", f"Expected rule_scope=tier, got {product['rule_scope']}"
            print(f"Product rule_scope: {product['rule_scope']}")
        else:
            print("No products found")

    def test_product_promotions_returns_10_products(self, admin_token):
        """GET /api/affiliate/product-promotions returns 10 products with rule_scope=tier"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate/product-promotions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        products = data.get("products", [])
        
        # Should have 10 products
        assert len(products) == 10, f"Expected 10 products, got {len(products)}"
        
        # All products should have rule_scope=tier
        for p in products:
            assert p.get("rule_scope") == "tier", f"Product {p.get('product_name')} has rule_scope={p.get('rule_scope')}, expected tier"
        
        print(f"All {len(products)} products have rule_scope=tier")

    def test_product_promotions_with_partner_token(self, partner_token):
        """GET /api/affiliate/product-promotions works with partner token"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate/product-promotions",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "products" in data
        print(f"Partner token: Found {len(data['products'])} products")

    def test_earnings_summary_returns_ok(self, admin_token):
        """GET /api/affiliate/earnings-summary returns ok with summary and earnings"""
        response = requests.get(
            f"{BASE_URL}/api/affiliate/earnings-summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Response should have ok=True"
        assert "summary" in data, "Response should have summary object"
        assert "earnings" in data, "Response should have earnings array"
        
        summary = data["summary"]
        required_fields = ["total_earned", "pending_payout", "paid_out", "referral_count"]
        for field in required_fields:
            assert field in summary, f"Summary should have {field}"
        
        print(f"Affiliate earnings summary: {summary}")


class TestMarginEngineAPIs:
    """Test Margin Engine and Distribution Settings endpoints"""

    def test_margin_rules_tier_returns_4_bands(self, admin_token):
        """GET /api/admin/margin-rules?scope=tier returns 4 tiered price bands"""
        response = requests.get(
            f"{BASE_URL}/api/admin/margin-rules?scope=tier",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # API returns list directly
        rules = data if isinstance(data, list) else data.get("rules", [])
        
        # Should have 4 tiered bands
        tier_rules = [r for r in rules if r.get("scope") == "tier"]
        assert len(tier_rules) >= 4, f"Expected at least 4 tier rules, got {len(tier_rules)}"
        
        # Verify tier structure - expected bands
        expected_margins = {30, 25, 20, 15}  # 0-50k=30%, 50k-200k=25%, 200k-1M=20%, 1M+=15%
        actual_margins = {t.get("margin_pct") for t in tier_rules}
        assert expected_margins == actual_margins, f"Expected margins {expected_margins}, got {actual_margins}"
        
        for tier in tier_rules:
            assert "margin_pct" in tier, "Tier should have margin_pct"
            print(f"Tier: {tier.get('tier_label', 'N/A')} - Margin: {tier.get('margin_pct')}%")

    def test_distribution_settings_returns_40_30_30(self, admin_token):
        """GET /api/admin/distribution-margin/settings returns affiliate=40, sales=30, discount=30"""
        response = requests.get(
            f"{BASE_URL}/api/admin/distribution-margin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        settings = data.get("settings") or data
        
        # Verify split percentages
        affiliate_pct = settings.get("affiliate_pct", 0)
        sales_pct = settings.get("sales_pct", 0)
        discount_pct = settings.get("discount_pct", 0)
        
        assert affiliate_pct == 40, f"Expected affiliate_pct=40, got {affiliate_pct}"
        assert sales_pct == 30, f"Expected sales_pct=30, got {sales_pct}"
        assert discount_pct == 30, f"Expected discount_pct=30, got {discount_pct}"
        
        print(f"Distribution split: Affiliate={affiliate_pct}%, Sales={sales_pct}%, Discount={discount_pct}%")

    def test_distribution_preview_calculates_correctly(self, admin_token):
        """POST /api/admin/distribution-margin/preview with vendor_price_tax_inclusive=10000 calculates splits"""
        # Use correct field name: vendor_price_tax_inclusive
        # With 40/30/30 split of distributable pool
        response = requests.post(
            f"{BASE_URL}/api/admin/distribution-margin/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "vendor_price_tax_inclusive": 10000,
                "konekt_margin_pct": 20,
                "distribution_margin_pct": 10,
                "affiliate_pct": 40,
                "sales_pct": 30,
                "discount_pct": 30
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Response should have ok=True"
        assert "pricing" in data, "Response should have pricing object"
        assert "components" in data, "Response should have components object"
        
        pricing = data["pricing"]
        components = data["components"]
        
        # Verify pricing calculations
        # vendor=10000, konekt=20%=2000, dist=10%=1000, final=13000
        assert pricing["final_price"] == 13000, f"Expected final_price=13000, got {pricing['final_price']}"
        assert pricing["konekt_margin_value"] == 2000, f"Expected konekt_margin_value=2000, got {pricing['konekt_margin_value']}"
        assert pricing["distribution_margin_value"] == 1000, f"Expected distribution_margin_value=1000, got {pricing['distribution_margin_value']}"
        
        # Verify component splits (40/30/30 of 1000 distributable pool)
        # affiliate=400, sales=300, discount=300
        assert components["affiliate_commission"] == 400, f"Expected affiliate=400, got {components['affiliate_commission']}"
        assert components["sales_commission"] == 300, f"Expected sales=300, got {components['sales_commission']}"
        assert components["customer_discount"] == 300, f"Expected discount=300, got {components['customer_discount']}"
        
        print(f"Preview for vendor_price=10000:")
        print(f"  Final price: {pricing['final_price']}")
        print(f"  Affiliate: {components['affiliate_commission']}, Sales: {components['sales_commission']}, Discount: {components['customer_discount']}")


class TestMarginRulesEndpoint:
    """Test margin rules CRUD endpoint"""

    def test_get_margin_rules_list(self, admin_token):
        """GET /api/admin/margin-rules returns list of rules"""
        response = requests.get(
            f"{BASE_URL}/api/admin/margin-rules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # API returns list directly
        rules = data if isinstance(data, list) else data.get("rules", [])
        assert isinstance(rules, list), "Should return list of rules"
        assert len(rules) > 0, "Should have at least one margin rule"
        print(f"Found {len(rules)} margin rules")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
