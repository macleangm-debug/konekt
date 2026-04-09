"""
Test Suite for Vendor Dashboard + Affiliate Dashboard Upgrades (V219)
Tests:
1. GET /api/partner-portal/dashboard - Vendor dashboard with KPIs, pipeline, actions, charts
2. GET /api/affiliate/earnings-summary - Extended affiliate summary with charts
3. GET /api/affiliate/product-promotions - Products with affiliate amounts and share links
4. Vendor-safe verification - No customer names or Konekt margins exposed
5. Sales Dashboard regression - /staff still works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "password123"


class TestPartnerLogin:
    """Partner authentication tests"""
    
    def test_partner_login_success(self):
        """Test partner login via unified /login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        assert response.status_code == 200, f"Partner login failed: {response.text}"
        data = response.json()
        assert "token" in data or "partner_token" in data or "access_token" in data, f"No token in response: {data}"
        print(f"PASS: Partner login successful")


class TestVendorDashboardAPI:
    """Tests for GET /api/partner-portal/dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get partner token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token") or data.get("partner_token") or data.get("access_token")
        else:
            pytest.skip("Partner login failed - skipping vendor dashboard tests")
    
    def test_dashboard_returns_200(self):
        """Test dashboard endpoint returns 200"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        print("PASS: Dashboard returns 200")
    
    def test_dashboard_has_vendor_kpis(self):
        """Test dashboard returns vendor_kpis with required fields"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "vendor_kpis" in data, "Missing vendor_kpis in response"
        kpis = data["vendor_kpis"]
        
        required_fields = ["total_jobs", "active_jobs", "completed_jobs", "delayed", 
                          "settlement_total", "pending_settlement", "paid_settlement"]
        for field in required_fields:
            assert field in kpis, f"Missing {field} in vendor_kpis"
        
        print(f"PASS: vendor_kpis has all required fields: {list(kpis.keys())}")
    
    def test_dashboard_has_vendor_pipeline(self):
        """Test dashboard returns vendor_pipeline with 7 stages"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "vendor_pipeline" in data, "Missing vendor_pipeline in response"
        pipeline = data["vendor_pipeline"]
        
        expected_stages = ["assigned", "awaiting_ack", "in_production", "ready_to_dispatch", 
                          "delayed", "delivered", "completed"]
        for stage in expected_stages:
            assert stage in pipeline, f"Missing {stage} in vendor_pipeline"
            assert isinstance(pipeline[stage], int), f"{stage} should be integer"
        
        print(f"PASS: vendor_pipeline has all 7 stages: {pipeline}")
    
    def test_dashboard_has_work_requiring_action(self):
        """Test dashboard returns work_requiring_action array"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "work_requiring_action" in data, "Missing work_requiring_action in response"
        actions = data["work_requiring_action"]
        assert isinstance(actions, list), "work_requiring_action should be a list"
        
        # If there are actions, verify structure
        if len(actions) > 0:
            action = actions[0]
            assert "type" in action, "Action missing 'type'"
            assert "urgency" in action, "Action missing 'urgency'"
            assert "title" in action, "Action missing 'title'"
            assert "description" in action, "Action missing 'description'"
            print(f"PASS: work_requiring_action has {len(actions)} items with correct structure")
        else:
            print("PASS: work_requiring_action is empty (no pending actions)")
    
    def test_dashboard_has_recent_assignments(self):
        """Test dashboard returns recent_assignments array"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_assignments" in data, "Missing recent_assignments in response"
        assignments = data["recent_assignments"]
        assert isinstance(assignments, list), "recent_assignments should be a list"
        
        print(f"PASS: recent_assignments has {len(assignments)} items")
    
    def test_dashboard_has_charts(self):
        """Test dashboard returns charts with fulfillment_trend and delivery_performance"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "charts" in data, "Missing charts in response"
        charts = data["charts"]
        
        assert "fulfillment_trend" in charts, "Missing fulfillment_trend in charts"
        assert "delivery_performance" in charts, "Missing delivery_performance in charts"
        
        # Verify 6 months of data
        assert len(charts["fulfillment_trend"]) == 6, "fulfillment_trend should have 6 months"
        assert len(charts["delivery_performance"]) == 6, "delivery_performance should have 6 months"
        
        # Verify structure
        if len(charts["fulfillment_trend"]) > 0:
            ft = charts["fulfillment_trend"][0]
            assert "month" in ft, "fulfillment_trend missing 'month'"
            assert "assigned" in ft, "fulfillment_trend missing 'assigned'"
            assert "completed" in ft, "fulfillment_trend missing 'completed'"
        
        if len(charts["delivery_performance"]) > 0:
            dp = charts["delivery_performance"][0]
            assert "month" in dp, "delivery_performance missing 'month'"
            assert "on_time" in dp, "delivery_performance missing 'on_time'"
            assert "delayed" in dp, "delivery_performance missing 'delayed'"
        
        print(f"PASS: charts has fulfillment_trend and delivery_performance with 6 months each")
    
    def test_vendor_safe_no_customer_names(self):
        """Test that recent_assignments does NOT expose customer names"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/partner-portal/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assignments = data.get("recent_assignments", [])
        forbidden_fields = ["customer_name", "customer_email", "client_name", "client_email", 
                           "konekt_margin", "sales_price", "final_price"]
        
        for assignment in assignments:
            for field in forbidden_fields:
                assert field not in assignment, f"VENDOR-SAFE VIOLATION: {field} exposed in assignment"
            
            # Verify vendor-safe fields ARE present
            assert "vendor_order_no" in assignment, "Missing vendor_order_no"
            assert "base_price" in assignment, "Missing base_price (vendor price)"
        
        print(f"PASS: Vendor-safe verification - no customer names or Konekt margins exposed")


class TestAffiliateEarningsSummaryAPI:
    """Tests for GET /api/affiliate/earnings-summary endpoint"""
    
    @classmethod
    def setup_class(cls):
        """Get partner token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            cls.token = data.get("token") or data.get("partner_token") or data.get("access_token")
        else:
            cls.token = None
    
    def test_earnings_summary_returns_200(self):
        """Test earnings-summary endpoint returns 200"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/affiliate/earnings-summary", headers=headers)
        assert response.status_code == 200, f"Earnings summary failed: {response.text}"
        print("PASS: Earnings summary returns 200")
    
    def test_earnings_summary_has_extended_fields(self):
        """Test earnings-summary returns extended summary fields"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/affiliate/earnings-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data, "Missing summary in response"
        summary = data["summary"]
        
        # Extended fields for Affiliate Dashboard V2
        expected_fields = ["total_earned", "expected", "pending_payout", "paid_out",
                          "active_promotions", "successful_orders", "total_clicks", "conversion_rate"]
        for field in expected_fields:
            assert field in summary, f"Missing {field} in summary"
        
        print(f"PASS: earnings-summary has extended fields: {list(summary.keys())}")
    
    def test_earnings_summary_has_charts(self):
        """Test earnings-summary returns charts with earnings_trend and conversions_trend"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/affiliate/earnings-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "charts" in data, "Missing charts in response"
        charts = data["charts"]
        
        assert "earnings_trend" in charts, "Missing earnings_trend in charts"
        assert "conversions_trend" in charts, "Missing conversions_trend in charts"
        
        # Verify 6 months of data
        assert len(charts["earnings_trend"]) == 6, "earnings_trend should have 6 months"
        assert len(charts["conversions_trend"]) == 6, "conversions_trend should have 6 months"
        
        # Verify structure
        if len(charts["earnings_trend"]) > 0:
            et = charts["earnings_trend"][0]
            assert "month" in et, "earnings_trend missing 'month'"
            assert "earned" in et, "earnings_trend missing 'earned'"
            assert "paid" in et, "earnings_trend missing 'paid'"
        
        if len(charts["conversions_trend"]) > 0:
            ct = charts["conversions_trend"][0]
            assert "month" in ct, "conversions_trend missing 'month'"
            assert "orders" in ct, "conversions_trend missing 'orders'"
        
        print(f"PASS: earnings-summary has charts with 6 months each")
    
    def test_earnings_summary_has_earnings_rows(self):
        """Test earnings-summary returns earnings array"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/affiliate/earnings-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "earnings" in data, "Missing earnings in response"
        earnings = data["earnings"]
        assert isinstance(earnings, list), "earnings should be a list"
        
        print(f"PASS: earnings-summary has {len(earnings)} earnings rows")


class TestAffiliateProductPromotionsAPI:
    """Tests for GET /api/affiliate/product-promotions endpoint"""
    
    @classmethod
    def setup_class(cls):
        """Get partner token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            cls.token = data.get("token") or data.get("partner_token") or data.get("access_token")
        else:
            cls.token = None
    
    def test_product_promotions_returns_200(self):
        """Test product-promotions endpoint returns 200"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/affiliate/product-promotions", headers=headers)
        assert response.status_code == 200, f"Product promotions failed: {response.text}"
        print("PASS: Product promotions returns 200")
    
    def test_product_promotions_has_products(self):
        """Test product-promotions returns products array"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/affiliate/product-promotions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data, "Missing products in response"
        products = data["products"]
        assert isinstance(products, list), "products should be a list"
        
        print(f"PASS: product-promotions has {len(products)} products")
    
    def test_product_promotions_has_promo_code(self):
        """Test product-promotions returns promo_code"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/affiliate/product-promotions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "promo_code" in data, "Missing promo_code in response"
        assert isinstance(data["promo_code"], str), "promo_code should be a string"
        
        print(f"PASS: product-promotions has promo_code: {data['promo_code']}")
    
    def test_product_has_affiliate_amount_and_share_link(self):
        """Test each product has affiliate_amount, captions, share_link, promo_code"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{BASE_URL}/api/affiliate/product-promotions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        products = data.get("products", [])
        if len(products) == 0:
            pytest.skip("No products available to test")
        
        # Check first product
        product = products[0]
        required_fields = ["id", "product_name", "final_price", "affiliate_amount", 
                          "promo_code", "share_link", "captions"]
        for field in required_fields:
            assert field in product, f"Product missing {field}"
        
        # Verify captions is an array with text
        assert isinstance(product["captions"], list), "captions should be a list"
        if len(product["captions"]) > 0:
            assert "text" in product["captions"][0], "caption missing 'text'"
        
        print(f"PASS: Products have affiliate_amount, share_link, captions, promo_code")


class TestSalesDashboardRegression:
    """Regression tests for Sales Dashboard at /staff"""
    
    def test_staff_login_success(self):
        """Test staff login via unified /api/auth/login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        assert "token" in data or "staff_token" in data or "access_token" in data, f"No token in response: {data}"
        
        # Verify user role is sales
        user = data.get("user", {})
        assert user.get("role") == "sales", f"Expected sales role, got: {user.get('role')}"
        print(f"PASS: Staff login successful - role: {user.get('role')}")
    
    def test_staff_dashboard_accessible(self):
        """Test staff dashboard endpoint is accessible after login"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Staff login failed - skipping dashboard test")
        
        data = login_response.json()
        token = data.get("token") or data.get("staff_token") or data.get("access_token")
        
        # Try to access staff dashboard
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/staff-dashboard/me", headers=headers)
        
        # Accept 200 (endpoint should work)
        assert response.status_code == 200, f"Staff dashboard failed: {response.status_code} - {response.text}"
        print(f"PASS: Staff dashboard accessible (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
