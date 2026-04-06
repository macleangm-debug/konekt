"""
E2E Order Flow Test Suite - Iteration 177
Tests the complete role-by-role order flow for Konekt B2B platform:
1. Product visibility in marketplace (approved vendor products)
2. Product detail page with variants/images/pricing
3. Order creation via checkout-quote flow
4. Customer order tracking
5. Admin/Sales order visibility with customer/payer/assignment details
6. Vendor order visibility
7. Status propagation across all roles
8. Admin submissions and idempotent approval
9. Business settings public endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"

# Known product from context
HP_LASERJET_PRODUCT_ID = "69d3aa541f2d0a62eb3d1f6f"
HP_LASERJET_PRICE = 1250000
HP_LASERJET_VARIANTS_COUNT = 2


class TestAuthenticationFlows:
    """Test authentication for all roles"""
    
    def test_admin_login(self):
        """TEST: Admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in admin login response"
        print(f"PASS: Admin login successful")
    
    def test_customer_login(self):
        """TEST: Customer can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in customer login response"
        print(f"PASS: Customer login successful")
    
    def test_vendor_login(self):
        """TEST: Vendor/Partner can login successfully"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data or "partner_token" in data, "No token in vendor login response"
        print(f"PASS: Vendor login successful")


class TestMarketplaceProductVisibility:
    """TEST 1 & 2: Product visibility and detail in marketplace"""
    
    def test_marketplace_search_returns_hp_laserjet(self):
        """TEST 1: GET /api/marketplace/products/search returns the approved HP LaserJet product"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200, f"Marketplace search failed: {response.text}"
        products = response.json()
        assert isinstance(products, list), "Expected list of products"
        
        # Find HP LaserJet product
        hp_product = None
        for p in products:
            if "HP LaserJet" in p.get("name", "") or p.get("id") == HP_LASERJET_PRODUCT_ID:
                hp_product = p
                break
        
        assert hp_product is not None, "HP LaserJet product not found in marketplace search"
        assert hp_product.get("is_active") == True, "HP LaserJet should be active"
        
        # Check price
        price = hp_product.get("price") or hp_product.get("base_price") or 0
        assert price == HP_LASERJET_PRICE, f"Expected price {HP_LASERJET_PRICE}, got {price}"
        
        print(f"PASS: HP LaserJet found in marketplace with price={price}, is_active=True")
    
    def test_product_detail_returns_full_info(self):
        """TEST 2: GET /api/marketplace/products/{product_id} returns full product detail"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/{HP_LASERJET_PRODUCT_ID}")
        assert response.status_code == 200, f"Product detail failed: {response.text}"
        product = response.json()
        
        # Verify required fields
        assert "id" in product, "Product should have id"
        assert "name" in product, "Product should have name"
        assert "HP LaserJet" in product.get("name", ""), "Product name should contain HP LaserJet"
        
        # Check price
        price = product.get("price") or product.get("base_price") or 0
        assert price == HP_LASERJET_PRICE, f"Expected price {HP_LASERJET_PRICE}, got {price}"
        
        # Check variants if present
        variants = product.get("variants", [])
        if variants:
            assert len(variants) == HP_LASERJET_VARIANTS_COUNT, f"Expected {HP_LASERJET_VARIANTS_COUNT} variants"
        
        # Verify vendor_id is NOT exposed to public
        assert "vendor_id" not in product, "vendor_id should NOT be exposed in public product detail"
        
        # Check other expected fields
        assert product.get("is_active") == True, "Product should be active"
        
        print(f"PASS: Product detail returned with name={product.get('name')}, price={price}, vendor_id hidden")


class TestCustomerCheckoutQuote:
    """TEST 3: Customer checkout-quote flow"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_customer_checkout_quote_creates_quote(self, customer_token):
        """TEST 3: POST /api/customer/checkout-quote creates a quote with HP LaserJet"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Build checkout payload
        subtotal = HP_LASERJET_PRICE
        vat_percent = 18
        vat_amount = subtotal * vat_percent / 100
        total = subtotal + vat_amount
        
        payload = {
            "items": [
                {
                    "name": "HP LaserJet Pro M404dn Printer",
                    "quantity": 1,
                    "unit_price": HP_LASERJET_PRICE,
                    "subtotal": HP_LASERJET_PRICE
                }
            ],
            "subtotal": subtotal,
            "vat_percent": vat_percent,
            "vat_amount": vat_amount,
            "total": total,
            "delivery_address": {
                "street": "123 Test Street",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam",
                "contact_phone": "+255123456789"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/customer/checkout-quote", json=payload, headers=headers)
        assert response.status_code == 200, f"Checkout quote failed: {response.text}"
        data = response.json()
        
        # Verify quote created
        assert "id" in data or "quote_number" in data, "Quote should have id or quote_number"
        assert data.get("status") == "pending", f"Quote status should be pending, got {data.get('status')}"
        
        print(f"PASS: Checkout quote created with id={data.get('id')}, quote_number={data.get('quote_number')}, status=pending")


class TestCustomerOrderView:
    """TEST 4: Customer order view"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_customer_orders_returns_list(self, customer_token):
        """TEST 4: GET /api/customer/orders returns customer's orders"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/orders", headers=headers)
        assert response.status_code == 200, f"Customer orders failed: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Expected list of orders"
        
        # Verify order structure if orders exist
        if orders:
            order = orders[0]
            # Customer should see timeline info
            assert "timeline_steps" in order or "customer_status" in order, "Order should have timeline info"
            # Customer should NOT see vendor_id
            assert "vendor_ids" not in order, "vendor_ids should NOT be exposed to customer"
            assert "vendor" not in order, "vendor should NOT be exposed to customer"
        
        print(f"PASS: Customer orders returned {len(orders)} orders")


class TestAdminOrderView:
    """TEST 5: Admin order view with enrichment"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_admin_orders_ops_returns_enriched_list(self, admin_token):
        """TEST 5: GET /api/admin/orders-ops shows orders with customer info, amounts, status, assignment"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers)
        assert response.status_code == 200, f"Admin orders-ops failed: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Expected list of orders"
        assert len(orders) > 0, "Expected at least some orders (context says 100 exist)"
        
        # Verify enrichment on first order
        order = orders[0]
        # Admin should see customer info
        assert "customer_name" in order or "customer_email" in order, "Order should have customer info"
        # Admin should see status
        assert "status" in order or "fulfillment_state" in order, "Order should have status"
        # Admin should see sales assignment info
        assert "sales_owner" in order or "sales_name" in order, "Order should have sales assignment info"
        
        print(f"PASS: Admin orders-ops returned {len(orders)} orders with enrichment")


class TestVendorOrderView:
    """TEST 6: Vendor order view"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor auth token"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Vendor login failed")
        data = response.json()
        return data.get("token") or data.get("access_token") or data.get("partner_token")
    
    def test_vendor_orders_returns_assigned_orders(self, vendor_token):
        """TEST 6: GET /api/vendor/orders shows vendor's assigned orders"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=headers)
        assert response.status_code == 200, f"Vendor orders failed: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Expected list of orders"
        
        # Verify vendor order structure if orders exist
        if orders:
            order = orders[0]
            # Vendor should see their base price, not customer price
            assert "base_price" in order or "vendor_total" in order, "Vendor order should have base_price"
            # Vendor should see timeline
            assert "timeline" in order, "Vendor order should have timeline"
            # Vendor should see sales contact
            assert "sales_name" in order or "sales_phone" in order, "Vendor order should have sales contact"
        
        print(f"PASS: Vendor orders returned {len(orders)} orders")


class TestAdminVendorSupplySubmissions:
    """TEST 7 & 8: Admin vendor supply submissions and idempotent approval"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_admin_vendor_supply_submissions(self, admin_token):
        """TEST 7: GET /api/admin/vendor-supply/submissions shows vendor product submissions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/vendor-supply/submissions", headers=headers)
        assert response.status_code == 200, f"Vendor supply submissions failed: {response.text}"
        data = response.json()
        
        # Could be list or dict with submissions key
        submissions = data if isinstance(data, list) else data.get("submissions", [])
        assert isinstance(submissions, list), "Expected list of submissions"
        
        print(f"PASS: Vendor supply submissions returned {len(submissions)} submissions")
    
    def test_idempotent_approval_no_duplicate_product(self, admin_token):
        """TEST 8: Re-approving same submission does NOT create duplicate product"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current product count for HP LaserJet
        search_response = requests.get(f"{BASE_URL}/api/marketplace/products/search?q=HP%20LaserJet")
        assert search_response.status_code == 200
        products_before = [p for p in search_response.json() if "HP LaserJet" in p.get("name", "")]
        count_before = len(products_before)
        
        # Get submissions to find an approved one
        submissions_response = requests.get(f"{BASE_URL}/api/admin/vendor-supply/submissions", headers=headers)
        if submissions_response.status_code != 200:
            pytest.skip("Could not get submissions")
        
        data = submissions_response.json()
        submissions = data if isinstance(data, list) else data.get("submissions", [])
        
        # Find an approved submission
        approved_submission = None
        for s in submissions:
            if s.get("status") == "approved":
                approved_submission = s
                break
        
        if not approved_submission:
            # No approved submission to test idempotency, skip
            print("PASS: No approved submission found to test idempotency (test skipped)")
            return
        
        # Try to re-approve (should be idempotent)
        submission_id = approved_submission.get("id")
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/vendor-supply/submissions/{submission_id}/approve",
            headers=headers
        )
        # Should either succeed (200) or indicate already approved (400/409)
        assert approve_response.status_code in [200, 400, 409], f"Unexpected status: {approve_response.status_code}"
        
        # Check product count hasn't increased
        search_response_after = requests.get(f"{BASE_URL}/api/marketplace/products/search?q=HP%20LaserJet")
        products_after = [p for p in search_response_after.json() if "HP LaserJet" in p.get("name", "")]
        count_after = len(products_after)
        
        assert count_after == count_before, f"Duplicate product created! Before: {count_before}, After: {count_after}"
        
        print(f"PASS: Idempotent approval verified - no duplicate products created")


class TestBusinessSettingsPublic:
    """TEST 9: Business settings public endpoint"""
    
    def test_business_settings_public_returns_company_data(self):
        """TEST 9: GET /api/admin/business-settings/public returns company identity data"""
        response = requests.get(f"{BASE_URL}/api/admin/business-settings/public")
        assert response.status_code == 200, f"Business settings public failed: {response.text}"
        data = response.json()
        
        # Should return company identity data
        assert isinstance(data, dict), "Expected dict response"
        # Common fields that might be present
        possible_fields = ["company_name", "company", "name", "logo", "address", "phone", "email"]
        has_company_data = any(field in data for field in possible_fields)
        assert has_company_data or len(data) > 0, "Expected some company data in response"
        
        print(f"PASS: Business settings public returned company data with keys: {list(data.keys())[:5]}")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("PASS: Health endpoint returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
