"""
Commission Engine & Pricing Policy API Tests
Tests the unified pricing policy engine for Konekt B2B platform.

Features tested:
- GET /api/commission-engine/pricing-policy-tiers - Returns 5 Tanzania-default tiers
- POST /api/commission-engine/preview - Calculates economics for base_cost
- POST /api/commission-engine/calculate-order - Multi-item order calculations
- POST /api/commission-engine/validate-wallet - Wallet usage validation
- PUT /api/commission-engine/pricing-policy-tiers - Tier validation (split > 100%, margin overflow)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestPricingPolicyTiers:
    """Tests for GET /api/commission-engine/pricing-policy-tiers"""
    
    def test_get_pricing_policy_tiers_returns_5_tiers(self):
        """Verify API returns exactly 5 Tanzania-default tiers"""
        response = requests.get(f"{BASE_URL}/api/commission-engine/pricing-policy-tiers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tiers" in data, "Response should contain 'tiers' key"
        tiers = data["tiers"]
        assert len(tiers) == 5, f"Expected 5 tiers, got {len(tiers)}"
        
        # Verify tier labels match Tanzania defaults
        expected_labels = [
            "Small (0 – 100K)",
            "Lower-Medium (100K – 500K)",
            "Medium (500K – 2M)",
            "Large (2M – 10M)",
            "Enterprise (10M+)"
        ]
        actual_labels = [t["label"] for t in tiers]
        assert actual_labels == expected_labels, f"Tier labels mismatch: {actual_labels}"
    
    def test_tier_structure_has_required_fields(self):
        """Verify each tier has all required fields"""
        response = requests.get(f"{BASE_URL}/api/commission-engine/pricing-policy-tiers")
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        required_fields = [
            "label", "min_amount", "max_amount", 
            "total_margin_pct", "protected_platform_margin_pct", 
            "distributable_margin_pct", "distribution_split"
        ]
        split_fields = ["affiliate_pct", "promotion_pct", "sales_pct", "referral_pct", "reserve_pct"]
        
        for i, tier in enumerate(tiers):
            for field in required_fields:
                assert field in tier, f"Tier {i+1} missing field: {field}"
            
            split = tier["distribution_split"]
            for field in split_fields:
                assert field in split, f"Tier {i+1} distribution_split missing: {field}"
    
    def test_tier_4_large_has_correct_margins(self):
        """Verify Tier 4 (Large 2M-10M) has total_margin 20%, protected 14%, distributable 6%"""
        response = requests.get(f"{BASE_URL}/api/commission-engine/pricing-policy-tiers")
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        tier_4 = tiers[3]  # 0-indexed, Tier 4 is index 3
        
        assert tier_4["label"] == "Large (2M – 10M)", f"Tier 4 label mismatch: {tier_4['label']}"
        assert tier_4["min_amount"] == 2000001, f"Tier 4 min_amount: {tier_4['min_amount']}"
        assert tier_4["max_amount"] == 10000000, f"Tier 4 max_amount: {tier_4['max_amount']}"
        assert tier_4["total_margin_pct"] == 20, f"Tier 4 total_margin_pct: {tier_4['total_margin_pct']}"
        assert tier_4["protected_platform_margin_pct"] == 14, f"Tier 4 protected: {tier_4['protected_platform_margin_pct']}"
        assert tier_4["distributable_margin_pct"] == 6, f"Tier 4 distributable: {tier_4['distributable_margin_pct']}"


class TestPreviewEndpoint:
    """Tests for POST /api/commission-engine/preview"""
    
    def test_preview_tier_4_base_cost_3000000(self):
        """Test preview for base_cost=3000000 (Tier 4: Large 2M-10M)"""
        payload = {
            "base_cost": 3000000,
            "has_affiliate": True,
            "has_referral": False,
            "has_sales": True
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify tier resolution
        assert data["tier_label"] == "Large (2M – 10M)", f"Wrong tier: {data['tier_label']}"
        
        # Verify margin calculations
        # base_cost = 3,000,000
        # total_margin_pct = 20% → selling_price = 3,000,000 * 1.20 = 3,600,000
        # total_margin_amount = 600,000
        # protected_platform_margin_pct = 14% → 3,000,000 * 0.14 = 420,000
        # distributable_margin_pct = 6% → 3,000,000 * 0.06 = 180,000
        
        assert data["base_cost"] == 3000000
        assert data["selling_price"] == 3600000, f"selling_price: {data['selling_price']}"
        assert data["total_margin_pct"] == 20
        assert data["total_margin_amount"] == 600000, f"total_margin_amount: {data['total_margin_amount']}"
        assert data["protected_platform_margin_pct"] == 14
        assert data["protected_platform_margin_amount"] == 420000, f"protected: {data['protected_platform_margin_amount']}"
        assert data["distributable_margin_pct"] == 6
        assert data["distributable_pool"] == 180000, f"distributable_pool: {data['distributable_pool']}"
    
    def test_preview_referral_overrides_affiliate(self):
        """When has_referral=true AND has_affiliate=true, affiliate_amount must be 0"""
        payload = {
            "base_cost": 3000000,
            "has_affiliate": True,
            "has_referral": True,
            "has_sales": True
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        allocations = data["allocations"]
        
        # Referral overrides affiliate - affiliate_amount must be 0
        assert allocations["affiliate_amount"] == 0, f"affiliate_amount should be 0 when referral exists: {allocations['affiliate_amount']}"
        assert allocations["affiliate_pct_applied"] == 0, f"affiliate_pct_applied should be 0: {allocations['affiliate_pct_applied']}"
        
        # Referral should have allocation
        assert allocations["referral_amount"] > 0, f"referral_amount should be > 0: {allocations['referral_amount']}"
        assert allocations["referral_pct_applied"] > 0, f"referral_pct_applied should be > 0: {allocations['referral_pct_applied']}"
        
        # Verify priority rules
        assert data["priority_rules_applied"]["referral_overrode_affiliate"] == True
        assert data["priority_rules_applied"]["affiliate_active"] == False
        assert data["priority_rules_applied"]["referral_active"] == True
    
    def test_preview_affiliate_active_when_no_referral(self):
        """When has_referral=false AND has_affiliate=true, affiliate_amount must be > 0"""
        payload = {
            "base_cost": 3000000,
            "has_affiliate": True,
            "has_referral": False,
            "has_sales": True
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        allocations = data["allocations"]
        
        # Affiliate should have allocation when no referral
        assert allocations["affiliate_amount"] > 0, f"affiliate_amount should be > 0: {allocations['affiliate_amount']}"
        assert allocations["affiliate_pct_applied"] > 0, f"affiliate_pct_applied should be > 0: {allocations['affiliate_pct_applied']}"
        
        # Referral should be 0
        assert allocations["referral_amount"] == 0, f"referral_amount should be 0: {allocations['referral_amount']}"
        assert allocations["referral_pct_applied"] == 0, f"referral_pct_applied should be 0: {allocations['referral_pct_applied']}"
        
        # Verify priority rules
        assert data["priority_rules_applied"]["referral_overrode_affiliate"] == False
        assert data["priority_rules_applied"]["affiliate_active"] == True
        assert data["priority_rules_applied"]["referral_active"] == False
    
    def test_preview_small_tier(self):
        """Test preview for base_cost=50000 (Tier 1: Small 0-100K)"""
        payload = {
            "base_cost": 50000,
            "has_affiliate": True,
            "has_referral": False,
            "has_sales": False
        }
        response = requests.post(f"{BASE_URL}/api/commission-engine/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier_label"] == "Small (0 – 100K)"
        assert data["total_margin_pct"] == 35
        assert data["protected_platform_margin_pct"] == 23
        assert data["distributable_margin_pct"] == 12


class TestTierValidation:
    """Tests for PUT /api/commission-engine/pricing-policy-tiers validation"""
    
    def test_reject_split_exceeds_100_percent(self):
        """PUT should reject tiers where split percentages exceed 100%"""
        # First get current tiers
        get_response = requests.get(f"{BASE_URL}/api/commission-engine/pricing-policy-tiers")
        assert get_response.status_code == 200
        tiers = get_response.json()["tiers"]
        
        # Modify first tier to have split > 100%
        invalid_tiers = [t.copy() for t in tiers]
        invalid_tiers[0] = {
            **invalid_tiers[0],
            "distribution_split": {
                "affiliate_pct": 50,
                "promotion_pct": 30,
                "sales_pct": 30,  # Total = 50+30+30+20+15 = 145%
                "referral_pct": 20,
                "reserve_pct": 15
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/commission-engine/pricing-policy-tiers",
            json={"tiers": invalid_tiers}
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "errors" in data["detail"]
        errors = data["detail"]["errors"]
        assert any("exceeds 100%" in e for e in errors), f"Expected split error: {errors}"
    
    def test_reject_protected_plus_distributable_exceeds_total(self):
        """PUT should reject tiers where protected + distributable exceeds total_margin"""
        get_response = requests.get(f"{BASE_URL}/api/commission-engine/pricing-policy-tiers")
        assert get_response.status_code == 200
        tiers = get_response.json()["tiers"]
        
        # Modify first tier to have protected + distributable > total
        invalid_tiers = [t.copy() for t in tiers]
        invalid_tiers[0] = {
            **invalid_tiers[0],
            "total_margin_pct": 20,
            "protected_platform_margin_pct": 15,
            "distributable_margin_pct": 10  # 15 + 10 = 25 > 20
        }
        
        response = requests.put(
            f"{BASE_URL}/api/commission-engine/pricing-policy-tiers",
            json={"tiers": invalid_tiers}
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "errors" in data["detail"]
        errors = data["detail"]["errors"]
        assert any("exceeds total_margin" in e for e in errors), f"Expected margin error: {errors}"


class TestCalculateOrder:
    """Tests for POST /api/commission-engine/calculate-order"""
    
    def test_calculate_multi_item_order(self):
        """Calculate correct totals for multi-item order across different tiers"""
        payload = {
            "order_id": "TEST_ORDER_001",
            "line_items": [
                {"sku": "SKU001", "name": "Small Item", "base_cost": 50000, "quantity": 2},  # Tier 1
                {"sku": "SKU002", "name": "Large Item", "base_cost": 3000000, "quantity": 1}  # Tier 4
            ],
            "source_type": "affiliate",
            "affiliate_user_id": "aff123",
            "assigned_sales_id": "sales456",
            "referral_user_id": None,
            "wallet_amount": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify order structure
        assert data["order_id"] == "TEST_ORDER_001"
        assert data["source_type"] == "affiliate"
        assert "totals" in data
        assert "item_breakdowns" in data
        assert len(data["item_breakdowns"]) == 2
        
        # Verify item breakdowns
        item1 = data["item_breakdowns"][0]
        assert item1["sku"] == "SKU001"
        assert item1["quantity"] == 2
        assert item1["tier_label"] == "Small (0 – 100K)"
        
        item2 = data["item_breakdowns"][1]
        assert item2["sku"] == "SKU002"
        assert item2["quantity"] == 1
        assert item2["tier_label"] == "Large (2M – 10M)"
        
        # Verify totals are calculated
        totals = data["totals"]
        assert totals["base_cost"] > 0
        assert totals["selling_price"] > totals["base_cost"]
        assert totals["total_margin"] > 0
        assert totals["protected_platform_margin"] > 0
        assert totals["distributable_pool"] > 0
        
        # Verify affiliate commission is calculated (since affiliate_user_id is set and no referral)
        assert totals["affiliate_commission"] > 0, f"affiliate_commission should be > 0: {totals['affiliate_commission']}"
    
    def test_calculate_order_with_referral_overrides_affiliate(self):
        """Verify referral overrides affiliate in order calculation"""
        payload = {
            "order_id": "TEST_ORDER_002",
            "line_items": [
                {"sku": "SKU001", "name": "Test Item", "base_cost": 500000, "quantity": 1}
            ],
            "source_type": "referral",
            "affiliate_user_id": "aff123",
            "assigned_sales_id": None,
            "referral_user_id": "ref456",
            "wallet_amount": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/commission-engine/calculate-order", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        totals = data["totals"]
        
        # Referral overrides affiliate
        assert totals["affiliate_commission"] == 0, f"affiliate_commission should be 0 with referral: {totals['affiliate_commission']}"
        assert totals["referral_reward"] > 0, f"referral_reward should be > 0: {totals['referral_reward']}"
        
        # Verify priority rules
        assert data["priority_rules"]["referral_overrides_affiliate"] == True
        assert data["priority_rules"]["affiliate_active"] == False


class TestValidateWallet:
    """Tests for POST /api/commission-engine/validate-wallet"""
    
    def test_wallet_capped_at_distributable_pool(self):
        """Wallet usage must be capped at distributable pool"""
        payload = {
            "wallet_amount": 500000,  # Request more than distributable
            "base_cost": 3000000,
            "selling_price": 3600000,
            "distributable_pool": 180000,  # 6% of 3M
            "promotion_amount": 36000,
            "max_wallet_usage_pct": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-wallet", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Wallet should be capped at distributable pool (180000)
        assert data["requested_wallet_amount"] == 500000
        assert data["allowed_wallet_amount"] <= 180000, f"allowed_wallet_amount should be <= distributable: {data['allowed_wallet_amount']}"
        assert data["was_reduced"] == True
        assert data["wallet_valid"] == True
        assert data["cap_by_distributable"] == 180000
    
    def test_wallet_within_limits(self):
        """Wallet within all limits should be allowed fully"""
        payload = {
            "wallet_amount": 50000,  # Within all limits
            "base_cost": 3000000,
            "selling_price": 3600000,
            "distributable_pool": 180000,
            "promotion_amount": 36000,
            "max_wallet_usage_pct": 30  # 30% of 3.6M = 1,080,000
        }
        
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-wallet", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        assert data["requested_wallet_amount"] == 50000
        assert data["allowed_wallet_amount"] == 50000
        assert data["was_reduced"] == False
        assert data["wallet_valid"] == True


class TestTierConfigValidation:
    """Tests for POST /api/commission-engine/validate-tier-config"""
    
    def test_validate_valid_tier_config(self):
        """Valid tier config should pass validation"""
        payload = {
            "total_margin_pct": 20,
            "protected_platform_margin_pct": 14,
            "distributable_margin_pct": 6,
            "distribution_split": {
                "affiliate_pct": 30,
                "promotion_pct": 20,
                "sales_pct": 20,
                "referral_pct": 20,
                "reserve_pct": 10
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-tier-config", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["valid"] == True
        assert len(data["errors"]) == 0
    
    def test_validate_invalid_split_total(self):
        """Invalid split total should return errors"""
        payload = {
            "total_margin_pct": 20,
            "protected_platform_margin_pct": 14,
            "distributable_margin_pct": 6,
            "distribution_split": {
                "affiliate_pct": 50,
                "promotion_pct": 30,
                "sales_pct": 30,
                "referral_pct": 20,
                "reserve_pct": 15  # Total = 145%
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/commission-engine/validate-tier-config", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["valid"] == False
        assert len(data["errors"]) > 0
        assert any("exceeds 100%" in e for e in data["errors"])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
