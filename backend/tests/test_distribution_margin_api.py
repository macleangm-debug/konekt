"""
Phase 41 Distribution Margin API Tests
Tests the Distribution Margin Engine backend endpoints:
- GET /api/admin/distribution-margin/settings
- PUT /api/admin/distribution-margin/settings
- POST /api/admin/distribution-margin/preview
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDistributionMarginAPI:
    """Distribution Margin Engine API tests"""

    def test_get_settings_returns_defaults(self):
        """GET /api/admin/distribution-margin/settings returns default settings"""
        response = requests.get(f"{BASE_URL}/api/admin/distribution-margin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "settings" in data
        
        settings = data["settings"]
        # Verify default values
        assert settings.get("konekt_margin_pct") == 20
        assert settings.get("distribution_margin_pct") == 10
        assert settings.get("affiliate_pct") == 4
        assert settings.get("sales_pct") == 3
        assert settings.get("discount_pct") == 3
        assert settings.get("attribution_window_days") == 365
        assert settings.get("minimum_payout") == 50000
        print("✓ GET settings returns correct defaults")

    def test_preview_pricing_calculation(self):
        """POST /api/admin/distribution-margin/preview returns correct pricing breakdown"""
        payload = {
            "vendor_price_tax_inclusive": 10000,
            "konekt_margin_pct": 20,
            "distribution_margin_pct": 10,
            "affiliate_pct": 4,
            "sales_pct": 3,
            "discount_pct": 3
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/distribution-margin/preview",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True
        
        # Verify pricing calculation: vendor=10000, konekt=20%, dist=10% => final=13000
        pricing = data.get("pricing", {})
        assert pricing.get("vendor_price_tax_inclusive") == 10000
        assert pricing.get("konekt_margin_pct") == 20
        assert pricing.get("konekt_margin_value") == 2000  # 10000 * 20%
        assert pricing.get("distribution_margin_pct") == 10
        assert pricing.get("distribution_margin_value") == 1000  # 10000 * 10%
        assert pricing.get("final_price") == 13000  # 10000 + 2000 + 1000
        
        # Verify split validation
        split = data.get("split", {})
        assert split.get("is_valid") is True
        assert split.get("total_split_pct") == 10  # 4 + 3 + 3
        
        # Verify components
        components = data.get("components", {})
        assert components.get("affiliate_commission") == 400  # 10000 * 4%
        assert components.get("sales_commission") == 300  # 10000 * 3%
        assert components.get("customer_discount") == 300  # 10000 * 3%
        print("✓ Preview pricing calculation is correct")

    def test_preview_rejects_over_allocated_split(self):
        """POST /api/admin/distribution-margin/preview rejects over-allocated split"""
        payload = {
            "vendor_price_tax_inclusive": 10000,
            "konekt_margin_pct": 20,
            "distribution_margin_pct": 10,
            "affiliate_pct": 5,
            "sales_pct": 4,
            "discount_pct": 3  # Total = 12% > 10% distribution margin
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/distribution-margin/preview",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        # The preview endpoint still returns ok=True but split.is_valid=False
        split = data.get("split", {})
        assert split.get("is_valid") is False, "Split should be invalid when over-allocated"
        assert split.get("total_split_pct") == 12  # 5 + 4 + 3
        assert split.get("distribution_margin_pct") == 10
        print("✓ Preview correctly identifies over-allocated split")

    def test_put_settings_saves_valid_settings(self):
        """PUT /api/admin/distribution-margin/settings saves settings and validates split"""
        payload = {
            "konekt_margin_pct": 20,
            "distribution_margin_pct": 10,
            "affiliate_pct": 4,
            "sales_pct": 3,
            "discount_pct": 3,
            "attribution_window_days": 365,
            "minimum_payout": 50000
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/distribution-margin/settings",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "settings" in data
        
        # Verify settings were saved
        settings = data["settings"]
        assert settings.get("konekt_margin_pct") == 20
        assert settings.get("distribution_margin_pct") == 10
        assert settings.get("affiliate_pct") == 4
        
        # Verify split validation
        split = data.get("split", {})
        assert split.get("is_valid") is True
        print("✓ PUT settings saves valid settings")

    def test_put_settings_rejects_over_allocated_split(self):
        """PUT /api/admin/distribution-margin/settings rejects over-allocated split"""
        payload = {
            "konekt_margin_pct": 20,
            "distribution_margin_pct": 10,
            "affiliate_pct": 6,
            "sales_pct": 4,
            "discount_pct": 3,  # Total = 13% > 10% distribution margin
            "attribution_window_days": 365,
            "minimum_payout": 50000
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/distribution-margin/settings",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is False, "Should reject over-allocated split"
        assert "error" in data
        assert "exceeds" in data["error"].lower() or "split" in data["error"].lower()
        print("✓ PUT settings rejects over-allocated split")


class TestHealthAndBasicEndpoints:
    """Basic health and endpoint tests"""

    def test_api_health(self):
        """API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ API health check passed")

    def test_products_endpoint(self):
        """Products endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        # Products endpoint returns dict with 'products' key
        if isinstance(data, dict):
            products = data.get("products", [])
        else:
            products = data
        assert isinstance(products, list)
        print(f"✓ Products endpoint returned {len(products)} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
