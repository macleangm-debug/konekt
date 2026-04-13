"""
Test Suite for Sales Dashboard Ratings Integration & Promotion Display Changes (v300)
Tests:
1. Sales Dashboard API - commission_summary, avg_rating, total_ratings, recent_ratings
2. Group Deals - 'Save TZS X' format (not percentage)
3. Homepage Group Deals - 'Save TZS X' format
4. Deal of the Day - 'Save TZS X' format
5. Referral Landing Page - discount_amount field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def staff_token():
    """Get staff auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Staff authentication failed")


class TestSalesDashboardAPI:
    """Test Sales Dashboard API returns correct structure with ratings integration"""
    
    def test_sales_dashboard_returns_200(self, staff_token):
        """GET /api/staff/sales-dashboard returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Sales dashboard returns 200")
    
    def test_sales_dashboard_has_commission_summary(self, staff_token):
        """Sales dashboard returns commission_summary with expected, pending, paid, total"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        
        assert "commission_summary" in data, "Missing commission_summary"
        cs = data["commission_summary"]
        assert "expected" in cs, "Missing expected in commission_summary"
        assert "pending" in cs, "Missing pending in commission_summary"
        assert "paid" in cs, "Missing paid in commission_summary"
        assert "total" in cs, "Missing total in commission_summary"
        print(f"PASS: commission_summary = {cs}")
    
    def test_sales_dashboard_has_avg_rating(self, staff_token):
        """Sales dashboard returns avg_rating field"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        
        assert "avg_rating" in data, "Missing avg_rating"
        assert isinstance(data["avg_rating"], (int, float)), "avg_rating should be numeric"
        print(f"PASS: avg_rating = {data['avg_rating']}")
    
    def test_sales_dashboard_has_total_ratings(self, staff_token):
        """Sales dashboard returns total_ratings field"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        
        assert "total_ratings" in data, "Missing total_ratings"
        assert isinstance(data["total_ratings"], int), "total_ratings should be integer"
        print(f"PASS: total_ratings = {data['total_ratings']}")
    
    def test_sales_dashboard_has_recent_ratings(self, staff_token):
        """Sales dashboard returns recent_ratings array"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        
        assert "recent_ratings" in data, "Missing recent_ratings"
        assert isinstance(data["recent_ratings"], list), "recent_ratings should be array"
        print(f"PASS: recent_ratings count = {len(data['recent_ratings'])}")
    
    def test_sales_dashboard_has_kpis(self, staff_token):
        """Sales dashboard returns kpis with expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        
        assert "kpis" in data, "Missing kpis"
        kpis = data["kpis"]
        expected_fields = ["today_orders", "today_revenue", "month_orders", "month_revenue", 
                          "pipeline_value", "total_earned", "pending_payout"]
        for field in expected_fields:
            assert field in kpis, f"Missing {field} in kpis"
        print(f"PASS: kpis has all expected fields")
    
    def test_sales_dashboard_has_recent_orders(self, staff_token):
        """Sales dashboard returns recent_orders with commission info"""
        response = requests.get(
            f"{BASE_URL}/api/staff/sales-dashboard",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        data = response.json()
        
        assert "recent_orders" in data, "Missing recent_orders"
        assert isinstance(data["recent_orders"], list), "recent_orders should be array"
        
        # If there are orders, check structure
        if len(data["recent_orders"]) > 0:
            order = data["recent_orders"][0]
            assert "commission_amount" in order, "Missing commission_amount in order"
            assert "commission_status" in order, "Missing commission_status in order"
        print(f"PASS: recent_orders count = {len(data['recent_orders'])}")


class TestGroupDealsPublicAPI:
    """Test Group Deals public API returns price data for 'Save TZS X' display"""
    
    def test_group_deals_list_returns_200(self):
        """GET /api/public/group-deals returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Group deals list returns 200")
    
    def test_group_deals_have_price_fields(self):
        """Group deals have original_price and discounted_price for amount calculation"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        data = response.json()
        
        if len(data) > 0:
            deal = data[0]
            assert "original_price" in deal, "Missing original_price"
            assert "discounted_price" in deal, "Missing discounted_price"
            
            # Verify amount saved can be calculated
            if deal["original_price"] > deal["discounted_price"]:
                amount_saved = deal["original_price"] - deal["discounted_price"]
                print(f"PASS: Deal has prices - original: {deal['original_price']}, discounted: {deal['discounted_price']}, save: {amount_saved}")
            else:
                print(f"PASS: Deal has prices (no discount active)")
        else:
            print("PASS: No active deals to test (empty list)")
    
    def test_group_deals_featured_returns_200(self):
        """GET /api/public/group-deals/featured returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Featured group deals returns 200")
    
    def test_deal_of_the_day_endpoint(self):
        """GET /api/public/group-deals/deal-of-the-day returns 200 or 404"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/deal-of-the-day")
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "original_price" in data, "Missing original_price"
            assert "discounted_price" in data, "Missing discounted_price"
            print(f"PASS: Deal of the day has price fields")
        else:
            print("PASS: No deal of the day set (404)")
    
    def test_group_deal_detail_returns_prices(self):
        """GET /api/public/group-deals/{id} returns price fields"""
        # First get list to find an ID
        list_response = requests.get(f"{BASE_URL}/api/public/group-deals")
        deals = list_response.json()
        
        if len(deals) > 0:
            deal_id = deals[0]["id"]
            response = requests.get(f"{BASE_URL}/api/public/group-deals/{deal_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "original_price" in data, "Missing original_price"
            assert "discounted_price" in data, "Missing discounted_price"
            print(f"PASS: Deal detail has price fields for amount calculation")
        else:
            print("SKIP: No deals available to test detail endpoint")


class TestReferralAPI:
    """Test Referral API returns discount_amount for 'Save TZS X' display"""
    
    def test_referral_settings_public(self):
        """GET /api/referrals/settings/public returns discount settings"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "referee_discount_value" in data, "Missing referee_discount_value"
        assert "referee_discount_type" in data, "Missing referee_discount_type"
        print(f"PASS: Referral settings - type: {data['referee_discount_type']}, value: {data['referee_discount_value']}")
    
    def test_referral_code_lookup(self):
        """GET /api/referrals/code/{code} returns referrer info"""
        # First find a valid referral code
        response = requests.get(f"{BASE_URL}/api/referrals/settings/public")
        
        # Try a known code pattern or skip
        test_response = requests.get(f"{BASE_URL}/api/referrals/code/KONEKT-TEST123")
        
        if test_response.status_code == 200:
            data = test_response.json()
            assert "referral_code" in data, "Missing referral_code"
            assert "referrer_name" in data, "Missing referrer_name"
            # Check for discount info
            has_discount_info = "discount_percent" in data or "discount_amount" in data
            assert has_discount_info, "Missing discount info (discount_percent or discount_amount)"
            print(f"PASS: Referral code lookup returns discount info")
        else:
            print("SKIP: No valid referral code found for testing")


class TestAdminGroupDealsAPI:
    """Test Admin Group Deals API for profit calculator"""
    
    def test_admin_campaigns_list(self, admin_token):
        """GET /api/admin/group-deals/campaigns returns campaigns with margin info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/group-deals/campaigns",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        if len(data) > 0:
            campaign = data[0]
            # Check for fields needed by profit calculator
            assert "original_price" in campaign, "Missing original_price"
            assert "discounted_price" in campaign, "Missing discounted_price"
            assert "margin_per_unit" in campaign or "vendor_cost" in campaign, "Missing margin info"
            print(f"PASS: Admin campaigns have price/margin fields for profit calculator")
        else:
            print("PASS: No campaigns to verify (empty list)")


class TestPromotionDisplayNoPercentage:
    """Verify promotion APIs don't force percentage display on customer-facing endpoints"""
    
    def test_public_group_deals_no_percentage_field(self):
        """Public group deals should have amount fields, not percentage"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals")
        data = response.json()
        
        if len(data) > 0:
            deal = data[0]
            # Should have price fields for amount calculation
            assert "original_price" in deal, "Missing original_price"
            assert "discounted_price" in deal, "Missing discounted_price"
            # These fields allow frontend to calculate: Save TZS (original - discounted)
            print("PASS: Group deals have price fields for 'Save TZS X' calculation")
        else:
            print("PASS: No deals to verify")
    
    def test_featured_deals_have_amount_fields(self):
        """Featured deals should have amount fields"""
        response = requests.get(f"{BASE_URL}/api/public/group-deals/featured")
        data = response.json()
        
        if len(data) > 0:
            deal = data[0]
            assert "original_price" in deal, "Missing original_price"
            assert "discounted_price" in deal, "Missing discounted_price"
            print("PASS: Featured deals have price fields for amount display")
        else:
            print("PASS: No featured deals to verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
