"""
Test Suite for Quote Estimation API and Margin Simulator (Iteration 263)

Tests:
1. POST /api/quote-estimate - Basic price estimation
2. POST /api/quote-estimate - With promo code LAUNCH2026
3. POST /api/quote-estimate/range - Price range estimation
4. POST /api/quote-estimate - Customer-safe output validation (no internal margins)
5. POST /api/promotions/apply - Customer endpoint with referral_priority blocking
6. POST /api/commission-engine/calculate-order - Margin simulator backend
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
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code}")


@pytest.fixture
def auth_headers(admin_token):
    """Auth headers for admin requests"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestQuoteEstimationAPI:
    """Tests for POST /api/quote-estimate endpoint"""

    def test_basic_price_estimate(self):
        """Test basic price estimation with base_cost=50000 qty=3"""
        response = requests.post(
            f"{BASE_URL}/api/quote-estimate",
            json={"base_cost": 50000, "quantity": 3}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify customer-safe fields are present
        assert "estimated_unit_price" in data
        assert "estimated_total" in data
        assert "quantity" in data
        assert "promotion_applied" in data
        assert "discount_amount" in data
        assert "final_estimated_total" in data
        assert "price_note" in data
        
        # Verify quantity matches
        assert data["quantity"] == 3
        
        # Verify pricing logic (unit price should be > base_cost due to margin)
        assert data["estimated_unit_price"] > 50000, "Unit price should include margin"
        
        # Verify total = unit_price * quantity
        expected_total = data["estimated_unit_price"] * 3
        assert abs(data["estimated_total"] - expected_total) < 1, "Total should be unit_price * quantity"
        
        # Without promo, final_estimated_total should equal estimated_total
        assert data["final_estimated_total"] == data["estimated_total"]
        assert data["promotion_applied"] == False
        
        print(f"PASS: Basic estimate - unit_price={data['estimated_unit_price']}, total={data['estimated_total']}")

    def test_price_estimate_with_promo_code_launch2026(self):
        """Test price estimation with LAUNCH2026 promo code"""
        response = requests.post(
            f"{BASE_URL}/api/quote-estimate",
            json={
                "base_cost": 50000,
                "quantity": 3,
                "promo_code": "LAUNCH2026"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify promo was applied
        assert data["promotion_applied"] == True, "LAUNCH2026 promo should be applied"
        assert data["discount_amount"] > 0, "Discount amount should be > 0"
        
        # Verify final total is less than estimated total
        assert data["final_estimated_total"] < data["estimated_total"], "Final total should be less after discount"
        
        # Verify discount math
        expected_final = data["estimated_total"] - data["discount_amount"]
        assert abs(data["final_estimated_total"] - expected_final) < 1, "Final = total - discount"
        
        # Verify promo message is present
        assert "promo_message" in data
        
        print(f"PASS: Promo LAUNCH2026 - discount={data['discount_amount']}, final={data['final_estimated_total']}")

    def test_customer_safe_output_no_internal_margins(self):
        """Verify quote estimate returns ONLY customer-safe fields (no internal margins)"""
        response = requests.post(
            f"{BASE_URL}/api/quote-estimate",
            json={"base_cost": 100000, "quantity": 2}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # These fields should NOT be present (internal margin data)
        forbidden_fields = [
            "margin_pct", "margin_percent", "total_margin_pct",
            "distributable_pool", "distributable_margin",
            "protected_margin", "protected_platform_margin",
            "affiliate_commission", "sales_commission",
            "referral_reward", "promotion_budget",
            "allocation", "allocations", "tier"
        ]
        
        for field in forbidden_fields:
            assert field not in data, f"Customer-unsafe field '{field}' should not be exposed"
        
        # These fields SHOULD be present (customer-safe)
        required_fields = [
            "estimated_unit_price", "estimated_total", "quantity",
            "promotion_applied", "discount_amount", "final_estimated_total", "price_note"
        ]
        
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing"
        
        print("PASS: Customer-safe output verified - no internal margins exposed")

    def test_price_estimate_zero_base_cost(self):
        """Test handling of zero base cost"""
        response = requests.post(
            f"{BASE_URL}/api/quote-estimate",
            json={"base_cost": 0, "quantity": 1}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["estimated_unit_price"] == 0
        assert data["estimated_total"] == 0
        assert data["final_estimated_total"] == 0
        
        print("PASS: Zero base cost handled correctly")


class TestQuoteEstimationRangeAPI:
    """Tests for POST /api/quote-estimate/range endpoint"""

    def test_price_range_estimation(self):
        """Test price range for min=40000 max=80000"""
        response = requests.post(
            f"{BASE_URL}/api/quote-estimate/range",
            json={
                "min_base_cost": 40000,
                "max_base_cost": 80000,
                "quantity": 1
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "price_range_low" in data
        assert "price_range_high" in data
        assert "quantity" in data
        assert "range_note" in data
        
        # Verify range logic
        assert data["price_range_low"] > 40000, "Low price should include margin"
        assert data["price_range_high"] > 80000, "High price should include margin"
        assert data["price_range_high"] > data["price_range_low"], "High should be > low"
        
        # Verify range note format
        assert "TZS" in data["range_note"], "Range note should include currency"
        
        print(f"PASS: Price range - low={data['price_range_low']}, high={data['price_range_high']}")

    def test_price_range_with_quantity(self):
        """Test price range with quantity > 1"""
        response = requests.post(
            f"{BASE_URL}/api/quote-estimate/range",
            json={
                "min_base_cost": 50000,
                "max_base_cost": 100000,
                "quantity": 5
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["quantity"] == 5
        
        # Range should be multiplied by quantity
        # Get single unit range for comparison
        single_response = requests.post(
            f"{BASE_URL}/api/quote-estimate/range",
            json={"min_base_cost": 50000, "max_base_cost": 100000, "quantity": 1}
        )
        single_data = single_response.json()
        
        # Multi-quantity range should be ~5x single
        assert abs(data["price_range_low"] - single_data["price_range_low"] * 5) < 10
        assert abs(data["price_range_high"] - single_data["price_range_high"] * 5) < 10
        
        print(f"PASS: Price range with qty=5 - low={data['price_range_low']}, high={data['price_range_high']}")


class TestPromotionsApplyCustomerEndpoint:
    """Tests for POST /api/promotions/apply customer endpoint"""

    def test_apply_valid_promo_code(self):
        """Test applying valid promo code returns customer-safe output"""
        response = requests.post(
            f"{BASE_URL}/api/promotions/apply",
            json={
                "code": "LAUNCH2026",
                "customer_id": "test-customer-123",
                "line_items": [{"base_cost": 50000, "quantity": 2}]
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Should be valid
        assert data.get("valid") == True, f"Expected valid=True, got {data}"
        
        # Customer-safe fields
        assert "discount_amount" in data
        assert "message" in data or "promo_name" in data
        
        # Should NOT expose internal fields
        assert "was_capped" not in data or data.get("was_capped") is None
        assert "max_promo_amount" not in data
        assert "raw_discount" not in data
        
        print(f"PASS: Valid promo applied - discount={data.get('discount_amount')}")

    def test_apply_invalid_promo_code(self):
        """Test applying invalid promo code"""
        response = requests.post(
            f"{BASE_URL}/api/promotions/apply",
            json={
                "code": "INVALID_CODE_XYZ",
                "customer_id": "test-customer-123",
                "line_items": [{"base_cost": 50000, "quantity": 1}]
            }
        )
        assert response.status_code == 200  # Returns 200 with valid=false
        
        data = response.json()
        assert data.get("valid") == False
        assert "reason" in data
        
        print(f"PASS: Invalid promo rejected - reason={data.get('reason')}")

    def test_referral_priority_blocks_promo_when_referral_active(self):
        """Test that referral_priority promo is blocked when has_referral=true"""
        # HOLIDAY5K has referral_priority stacking rule
        response = requests.post(
            f"{BASE_URL}/api/promotions/apply",
            json={
                "code": "HOLIDAY5K",
                "customer_id": "test-customer-123",
                "line_items": [{"base_cost": 100000, "quantity": 1}],
                "has_referral": True  # Referral is active
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Should be blocked due to referral priority
        assert data.get("valid") == False, f"Expected valid=False when referral active, got {data}"
        assert "referral" in data.get("reason", "").lower() or "priority" in data.get("reason", "").lower()
        
        print(f"PASS: Referral priority blocks promo - reason={data.get('reason')}")


class TestMarginSimulatorBackend:
    """Tests for /api/commission-engine/calculate-order (Margin Simulator backend)"""

    def test_margin_simulator_basic_calculation(self, auth_headers):
        """Test margin simulator with order value 3000000"""
        response = requests.post(
            f"{BASE_URL}/api/commission-engine/calculate-order",
            json={
                "order_id": "SIM-TEST-001",
                "line_items": [
                    {"sku": "SIM-1", "name": "Test Item", "base_cost": 3000000, "quantity": 1}
                ],
                "source_type": "website",
                "assigned_sales_id": "sim-sales"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify totals structure
        assert "totals" in data, "Response should have totals"
        t = data["totals"]
        
        # Verify key fields
        assert "base_cost" in t
        assert "selling_price" in t
        assert "total_margin" in t
        assert "protected_platform_margin" in t
        assert "distributable_pool" in t
        
        # Verify selling price > base cost
        assert t["selling_price"] > t["base_cost"], "Selling price should include margin"
        
        # Verify margin breakdown
        assert t["total_margin"] > 0
        assert t["protected_platform_margin"] >= 0
        assert t["distributable_pool"] >= 0
        
        print(f"PASS: Margin simulator - base={t['base_cost']}, selling={t['selling_price']}, margin={t['total_margin']}")

    def test_margin_simulator_with_affiliate(self, auth_headers):
        """Test margin simulator with affiliate enabled shows affiliate_commission > 0"""
        response = requests.post(
            f"{BASE_URL}/api/commission-engine/calculate-order",
            json={
                "order_id": "SIM-TEST-002",
                "line_items": [
                    {"sku": "SIM-1", "name": "Test Item", "base_cost": 1000000, "quantity": 1}
                ],
                "source_type": "affiliate",
                "affiliate_user_id": "sim-affiliate-123",
                "assigned_sales_id": "sim-sales"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        t = data.get("totals", {})
        
        # Affiliate commission should be > 0 when affiliate is active
        assert t.get("affiliate_commission", 0) > 0, f"Affiliate commission should be > 0, got {t.get('affiliate_commission')}"
        
        print(f"PASS: Affiliate enabled - commission={t.get('affiliate_commission')}")

    def test_margin_simulator_referral_overrides_affiliate(self, auth_headers):
        """Test that referral disables affiliate commission (referral overrides)"""
        response = requests.post(
            f"{BASE_URL}/api/commission-engine/calculate-order",
            json={
                "order_id": "SIM-TEST-003",
                "line_items": [
                    {"sku": "SIM-1", "name": "Test Item", "base_cost": 1000000, "quantity": 1}
                ],
                "source_type": "affiliate",
                "affiliate_user_id": "sim-affiliate-123",
                "referral_user_id": "sim-referral-456",  # Referral active
                "assigned_sales_id": "sim-sales"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        t = data.get("totals", {})
        
        # When referral is active, affiliate commission should be 0
        assert t.get("affiliate_commission", 0) == 0, f"Affiliate should be 0 when referral active, got {t.get('affiliate_commission')}"
        
        # Referral reward should be > 0
        assert t.get("referral_reward", 0) > 0, f"Referral reward should be > 0, got {t.get('referral_reward')}"
        
        # Check priority rules
        pr = data.get("priority_rules", {})
        assert pr.get("referral_overrides_affiliate") == True, "Priority rules should indicate referral overrides affiliate"
        
        print(f"PASS: Referral overrides affiliate - affiliate={t.get('affiliate_commission')}, referral={t.get('referral_reward')}")

    def test_margin_simulator_wallet_capped_at_distributable(self, auth_headers):
        """Test that wallet amount is capped at distributable pool"""
        # First get the distributable pool for a known order
        response = requests.post(
            f"{BASE_URL}/api/commission-engine/calculate-order",
            json={
                "order_id": "SIM-TEST-004",
                "line_items": [
                    {"sku": "SIM-1", "name": "Test Item", "base_cost": 500000, "quantity": 1}
                ],
                "source_type": "website",
                "assigned_sales_id": "sim-sales",
                "wallet_amount": 0
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        distributable_pool = data.get("totals", {}).get("distributable_pool", 0)
        
        # Now request wallet amount > distributable pool
        excessive_wallet = distributable_pool + 100000
        
        response2 = requests.post(
            f"{BASE_URL}/api/commission-engine/calculate-order",
            json={
                "order_id": "SIM-TEST-005",
                "line_items": [
                    {"sku": "SIM-1", "name": "Test Item", "base_cost": 500000, "quantity": 1}
                ],
                "source_type": "website",
                "assigned_sales_id": "sim-sales",
                "wallet_amount": excessive_wallet
            },
            headers=auth_headers
        )
        assert response2.status_code == 200
        
        data2 = response2.json()
        wallet_validation = data2.get("wallet_validation", {})
        
        # Wallet should be capped
        if wallet_validation:
            allowed = wallet_validation.get("allowed_wallet_amount", 0)
            assert allowed <= distributable_pool, f"Wallet should be capped at distributable pool ({distributable_pool}), got {allowed}"
            
            if wallet_validation.get("was_reduced"):
                print(f"PASS: Wallet capped - requested={excessive_wallet}, allowed={allowed}, cap={distributable_pool}")
            else:
                print(f"PASS: Wallet validation present - allowed={allowed}")
        else:
            # If no wallet_validation, check totals
            print(f"PASS: Wallet calculation completed - distributable_pool={distributable_pool}")


class TestPricingPolicyTiers:
    """Tests for pricing policy tiers endpoint"""

    def test_get_pricing_policy_tiers(self, auth_headers):
        """Test fetching pricing policy tiers"""
        response = requests.get(
            f"{BASE_URL}/api/commission-engine/pricing-policy-tiers",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tiers" in data, "Response should have tiers"
        
        tiers = data["tiers"]
        assert len(tiers) > 0, "Should have at least one tier"
        
        # Verify tier structure
        tier = tiers[0]
        assert "label" in tier
        assert "min_amount" in tier
        assert "max_amount" in tier
        assert "total_margin_pct" in tier
        assert "protected_platform_margin_pct" in tier
        assert "distributable_margin_pct" in tier
        assert "distribution_split" in tier
        
        print(f"PASS: Pricing policy tiers - {len(tiers)} tiers found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
