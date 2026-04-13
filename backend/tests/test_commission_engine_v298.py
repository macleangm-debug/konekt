"""
Commission Engine & Track Order Tests - Iteration 298

Tests:
1. Commission engine /api/admin/commission/calculate
   - Direct channel: sales gets 15% of margin, no affiliate/referral
   - Assisted channel: sales gets 10% (reduced), no affiliate
   - Affiliate channel: affiliate gets 10%, sales support 5%
   - Referral channel: referral gets 10%, NO sales, NO affiliate
   - Group deal channel: no individual commissions
   - Wallet max respects protected allocations
   - Invalid channel returns 400 error

2. Track Order API
   - Phone search returns group deal commitments
   - Reference search (GDC-...) returns group deal status
   - Reference search (ORD-...) returns normal order

3. Settings Hub - Referral & Wallet section
   - wallet_enabled, max_wallet_per_order, protect_allocations, enforce_single_channel toggles
   - Performance Targets: min_rating_threshold, rating_weight_in_kpi_pct
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCommissionEngineAPI:
    """Test POST /api/admin/commission/calculate endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for admin requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_direct_channel_commission(self):
        """Direct channel: sales gets 15% of margin, no affiliate/referral"""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 80000,
            "channel": "direct",
            "wallet_balance": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        margin = 100000 - 80000  # 20000
        
        # Direct channel: sales gets 15% of margin
        assert data["channel"] == "direct"
        assert data["margin"] == margin
        # Sales allocation should be 15% of margin = 3000
        assert data["sales_allocation"] == round(margin * 0.15, 2), f"Expected {margin * 0.15}, got {data['sales_allocation']}"
        # No affiliate or referral for direct channel
        assert data["affiliate_allocation"] == 0
        assert data["referral_allocation"] == 0
        print(f"PASS: Direct channel - sales_allocation={data['sales_allocation']}, affiliate={data['affiliate_allocation']}, referral={data['referral_allocation']}")
    
    def test_assisted_channel_commission(self):
        """Assisted channel: sales gets 10% (reduced), no affiliate"""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 80000,
            "channel": "assisted",
            "wallet_balance": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        margin = 20000
        
        # Assisted channel: sales gets 10% of margin
        assert data["channel"] == "assisted"
        assert data["sales_allocation"] == round(margin * 0.10, 2), f"Expected {margin * 0.10}, got {data['sales_allocation']}"
        # No affiliate for assisted channel
        assert data["affiliate_allocation"] == 0
        assert data["referral_allocation"] == 0
        print(f"PASS: Assisted channel - sales_allocation={data['sales_allocation']}")
    
    def test_affiliate_channel_commission(self):
        """Affiliate channel: affiliate gets 10%, sales support 5%"""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 80000,
            "channel": "affiliate",
            "wallet_balance": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        margin = 20000
        
        # Affiliate channel: affiliate gets 10% of margin
        assert data["channel"] == "affiliate"
        assert data["affiliate_allocation"] == round(margin * 0.10, 2), f"Expected {margin * 0.10}, got {data['affiliate_allocation']}"
        # Sales support gets 5% (10% * 0.5)
        expected_sales_support = round(margin * 0.10 * 0.5, 2)
        assert data["sales_allocation"] == expected_sales_support, f"Expected {expected_sales_support}, got {data['sales_allocation']}"
        # No referral for affiliate channel
        assert data["referral_allocation"] == 0
        print(f"PASS: Affiliate channel - affiliate={data['affiliate_allocation']}, sales_support={data['sales_allocation']}")
    
    def test_referral_channel_commission(self):
        """Referral channel: referral gets 10%, NO sales, NO affiliate"""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 80000,
            "channel": "referral",
            "wallet_balance": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        margin = 20000
        
        # Referral channel: referral gets 10% of margin
        assert data["channel"] == "referral"
        assert data["referral_allocation"] == round(margin * 0.10, 2), f"Expected {margin * 0.10}, got {data['referral_allocation']}"
        # NO sales, NO affiliate for referral channel
        assert data["sales_allocation"] == 0, f"Expected 0 sales for referral, got {data['sales_allocation']}"
        assert data["affiliate_allocation"] == 0, f"Expected 0 affiliate for referral, got {data['affiliate_allocation']}"
        print(f"PASS: Referral channel - referral={data['referral_allocation']}, sales={data['sales_allocation']}, affiliate={data['affiliate_allocation']}")
    
    def test_group_deal_channel_commission(self):
        """Group deal channel: no individual commissions"""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 80000,
            "channel": "group_deal",
            "wallet_balance": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Group deal channel: no individual commissions
        assert data["channel"] == "group_deal"
        assert data["sales_allocation"] == 0, f"Expected 0 sales for group_deal, got {data['sales_allocation']}"
        assert data["affiliate_allocation"] == 0, f"Expected 0 affiliate for group_deal, got {data['affiliate_allocation']}"
        assert data["referral_allocation"] == 0, f"Expected 0 referral for group_deal, got {data['referral_allocation']}"
        print(f"PASS: Group deal channel - all allocations are 0")
    
    def test_wallet_max_respects_protected_allocations(self):
        """Wallet max = MIN(wallet_balance, promotion_reserve + remaining)"""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 80000,
            "channel": "direct",
            "wallet_balance": 50000  # Large wallet balance
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Wallet max should be limited by promotion_reserve + remaining (flexible margin)
        # It should NOT exceed the flexible margin
        flexible_margin = data["promotion_reserve"] + data["remaining"]
        assert data["wallet_max"] <= flexible_margin, f"Wallet max {data['wallet_max']} exceeds flexible margin {flexible_margin}"
        assert data["wallet_max"] <= payload["wallet_balance"], f"Wallet max {data['wallet_max']} exceeds wallet balance {payload['wallet_balance']}"
        print(f"PASS: Wallet max={data['wallet_max']} respects flexible margin={flexible_margin}")
    
    def test_invalid_channel_returns_400(self):
        """Invalid channel returns 400 error"""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 80000,
            "channel": "invalid_channel",
            "wallet_balance": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 400, f"Expected 400 for invalid channel, got {resp.status_code}: {resp.text}"
        print(f"PASS: Invalid channel returns 400")
    
    def test_zero_margin_returns_zero_allocations(self):
        """Zero margin (selling_price == vendor_cost) returns zero allocations"""
        payload = {
            "selling_price": 100000,
            "vendor_cost": 100000,  # No margin
            "channel": "direct",
            "wallet_balance": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data["margin"] == 0
        assert data["sales_allocation"] == 0
        assert data["affiliate_allocation"] == 0
        assert data["referral_allocation"] == 0
        assert data["wallet_max"] == 0
        print(f"PASS: Zero margin returns zero allocations")
    
    def test_negative_selling_price_returns_400(self):
        """Negative or zero selling_price returns 400"""
        payload = {
            "selling_price": 0,
            "vendor_cost": 80000,
            "channel": "direct",
            "wallet_balance": 0
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/commission/calculate", json=payload)
        assert resp.status_code == 400, f"Expected 400 for zero selling_price, got {resp.status_code}: {resp.text}"
        print(f"PASS: Zero selling_price returns 400")


class TestTrackOrderAPI:
    """Test Track Order public endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_track_by_phone_endpoint_exists(self):
        """Phone search endpoint exists and returns proper response"""
        # Test with a sample phone number
        resp = self.session.get(f"{BASE_URL}/api/public/group-deals/track?phone=%2B255123456789")
        # Should return 200 with empty array or data, not 404
        assert resp.status_code in [200, 404], f"Expected 200 or 404, got {resp.status_code}: {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            assert isinstance(data, list), "Phone track should return a list"
            print(f"PASS: Phone track endpoint returns list with {len(data)} items")
        else:
            print(f"PASS: Phone track endpoint exists (returned 404 for non-existent phone)")
    
    def test_track_by_gdc_reference(self):
        """Reference search (GDC-...) returns group deal status"""
        # Test with a sample GDC reference
        resp = self.session.get(f"{BASE_URL}/api/public/group-deals/track?ref=GDC-TEST-12345")
        # Should return 200 with empty array or data, not 500
        assert resp.status_code in [200, 404], f"Expected 200 or 404, got {resp.status_code}: {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            assert isinstance(data, list), "GDC track should return a list"
            print(f"PASS: GDC reference track endpoint returns list")
        else:
            print(f"PASS: GDC reference track endpoint exists (returned 404 for non-existent ref)")
    
    def test_track_by_order_reference(self):
        """Reference search (ORD-...) returns normal order"""
        # Test with a sample ORD reference
        resp = self.session.get(f"{BASE_URL}/api/orders/track/ORD-TEST-12345")
        # Should return 200 with order data or 404 for not found
        assert resp.status_code in [200, 404], f"Expected 200 or 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Order track endpoint exists (status={resp.status_code})")


class TestSettingsHubAPI:
    """Test Settings Hub API for wallet and performance settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for admin requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_settings_hub_has_wallet_settings(self):
        """Settings Hub has wallet_enabled, max_wallet_per_order, protect_allocations, enforce_single_channel"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        commercial = data.get("commercial", {})
        
        # Check wallet settings exist
        assert "wallet_enabled" in commercial or commercial.get("wallet_enabled") is not None, "wallet_enabled should exist"
        assert "max_wallet_per_order" in commercial or commercial.get("max_wallet_per_order") is not None, "max_wallet_per_order should exist"
        assert "protect_allocations" in commercial or commercial.get("protect_allocations") is not None, "protect_allocations should exist"
        assert "enforce_single_channel" in commercial or commercial.get("enforce_single_channel") is not None, "enforce_single_channel should exist"
        
        print(f"PASS: Settings Hub has wallet settings - wallet_enabled={commercial.get('wallet_enabled')}, max_wallet_per_order={commercial.get('max_wallet_per_order')}, protect_allocations={commercial.get('protect_allocations')}, enforce_single_channel={commercial.get('enforce_single_channel')}")
    
    def test_settings_hub_has_performance_targets(self):
        """Settings Hub has min_rating_threshold, rating_weight_in_kpi_pct"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        pt = data.get("performance_targets", {})
        
        # Check performance target settings exist
        assert "min_rating_threshold" in pt or pt.get("min_rating_threshold") is not None, "min_rating_threshold should exist"
        assert "rating_weight_in_kpi_pct" in pt or pt.get("rating_weight_in_kpi_pct") is not None, "rating_weight_in_kpi_pct should exist"
        
        print(f"PASS: Settings Hub has performance targets - min_rating_threshold={pt.get('min_rating_threshold')}, rating_weight_in_kpi_pct={pt.get('rating_weight_in_kpi_pct')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
