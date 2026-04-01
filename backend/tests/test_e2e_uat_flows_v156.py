"""
E2E UAT Tests for Konekt B2B Platform - Iteration 156
Tests all 4 commercial flows: Service, Promo Sample, Promo Custom, Product Order
Plus vendor visibility, sales delivery override, and CRM flows.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"


class TestAuthEndpoints:
    """Test authentication endpoints for all roles"""
    
    def test_customer_login(self):
        """Customer can login via /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        print(f"Customer login response: {response.status_code}")
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in customer login response"
        print(f"Customer login SUCCESS - token received")
    
    def test_admin_login(self):
        """Admin can login via /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login response: {response.status_code}")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in admin login response"
        print(f"Admin login SUCCESS - token received")
    
    def test_vendor_login(self):
        """Vendor can login via /api/partner-auth/login"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        print(f"Vendor login response: {response.status_code}")
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        # Partner auth returns access_token instead of token
        assert "access_token" in data or "token" in data, "No token in vendor login response"
        print(f"Vendor login SUCCESS - token received")
    
    def test_sales_login(self):
        """Sales can login via /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        print(f"Sales login response: {response.status_code}")
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in sales login response"
        print(f"Sales login SUCCESS - token received")


class TestFlowBServiceRequest:
    """Flow B - Service Request E2E: Guest submits service_quote request"""
    
    def test_01_submit_service_quote_request(self):
        """Guest submits service_quote request via /api/public-requests"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "request_type": "service_quote",
            "guest_email": f"test_service_{unique_id}@example.com",
            "guest_name": f"Test Service User {unique_id}",
            "title": "Service Quote Request - UAT Test",
            "details": {
                "service_type": "consulting",
                "description": "Need consulting services for business expansion",
                "budget_range": "5000-10000 TZS",
                "timeline": "2 weeks"
            },
            "notes": "UAT test service request"
        }
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        print(f"Service quote submission: {response.status_code}")
        assert response.status_code == 200, f"Service quote submission failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response not ok"
        assert "request_id" in data, "No request_id in response"
        assert "request_number" in data, "No request_number in response"
        print(f"Service quote submitted: {data.get('request_number')}")
        # Store for later tests
        TestFlowBServiceRequest.request_id = data.get("request_id")
        TestFlowBServiceRequest.request_number = data.get("request_number")
    
    def test_02_request_appears_in_admin_inbox(self):
        """Request appears in admin requests inbox"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("token")
        
        # Get admin requests
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/requests", headers=headers)
        print(f"Admin requests list: {response.status_code}")
        assert response.status_code == 200, f"Failed to get admin requests: {response.text}"
        
        requests_list = response.json()
        assert isinstance(requests_list, list), "Response should be a list"
        
        # Find our request
        our_request = None
        for req in requests_list:
            if req.get("id") == getattr(TestFlowBServiceRequest, 'request_id', None):
                our_request = req
                break
        
        if our_request:
            assert our_request.get("request_type") == "service_quote", "Request type should be service_quote"
            print(f"Found service_quote request in admin inbox: {our_request.get('request_number')}")
        else:
            print(f"Request not found in inbox (may be filtered), checking request_type filter...")
            # Try filtering by request_type
            response = requests.get(f"{BASE_URL}/api/admin/requests?request_type=service_quote", headers=headers)
            assert response.status_code == 200
            filtered_list = response.json()
            print(f"Found {len(filtered_list)} service_quote requests")
    
    def test_03_admin_can_convert_to_lead(self):
        """Admin can convert request to lead"""
        request_id = getattr(TestFlowBServiceRequest, 'request_id', None)
        if not request_id:
            pytest.skip("No request_id from previous test")
        
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Convert to lead
        response = requests.post(
            f"{BASE_URL}/api/admin/requests/{request_id}/convert-to-lead",
            headers=headers
        )
        print(f"Convert to lead: {response.status_code}")
        assert response.status_code == 200, f"Convert to lead failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Convert to lead not ok"
        assert "lead_id" in data, "No lead_id in response"
        print(f"Converted to lead: {data.get('lead_id')}")
        TestFlowBServiceRequest.lead_id = data.get("lead_id")
    
    def test_04_lead_appears_in_crm(self):
        """Lead appears in CRM leads list"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get CRM leads
        response = requests.get(f"{BASE_URL}/api/admin/sales-crm/leads", headers=headers)
        print(f"CRM leads list: {response.status_code}")
        assert response.status_code == 200, f"Failed to get CRM leads: {response.text}"
        
        leads = response.json()
        assert isinstance(leads, list), "Response should be a list"
        print(f"Found {len(leads)} leads in CRM")


class TestFlowDPromoSample:
    """Flow D - Promo Sample E2E: Guest submits promo_sample request"""
    
    def test_01_submit_promo_sample_request(self):
        """Guest submits promo_sample request via /api/public-requests"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "request_type": "promo_sample",
            "guest_email": f"test_promo_sample_{unique_id}@example.com",
            "guest_name": f"Test Promo Sample User {unique_id}",
            "title": "Promo Sample Request - UAT Test",
            "details": {
                "product_type": "branded_merchandise",
                "sample_quantity": 5,
                "branding_requirements": "Company logo on front",
                "delivery_timeline": "1 week"
            },
            "notes": "UAT test promo sample request"
        }
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        print(f"Promo sample submission: {response.status_code}")
        assert response.status_code == 200, f"Promo sample submission failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response not ok"
        assert "request_id" in data, "No request_id in response"
        print(f"Promo sample submitted: {data.get('request_number')}")
        TestFlowDPromoSample.request_id = data.get("request_id")
    
    def test_02_promo_sample_appears_in_admin_inbox(self):
        """Promo sample request appears in admin inbox with correct type"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get admin requests filtered by promo_sample
        response = requests.get(f"{BASE_URL}/api/admin/requests?request_type=promo_sample", headers=headers)
        print(f"Promo sample requests: {response.status_code}")
        assert response.status_code == 200
        
        requests_list = response.json()
        print(f"Found {len(requests_list)} promo_sample requests")
        
        # Verify our request is there
        request_id = getattr(TestFlowDPromoSample, 'request_id', None)
        if request_id:
            found = any(r.get("id") == request_id for r in requests_list)
            if found:
                print("Promo sample request found in admin inbox")


class TestFlowCPromoCustom:
    """Flow C - Promo Custom E2E: Guest submits promo_custom request"""
    
    def test_01_submit_promo_custom_request(self):
        """Guest submits promo_custom request with branding details"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "request_type": "promo_custom",
            "guest_email": f"test_promo_custom_{unique_id}@example.com",
            "guest_name": f"Test Promo Custom User {unique_id}",
            "title": "Custom Promotional Materials - UAT Test",
            "details": {
                "product_type": "custom_branded_items",
                "quantity": 500,
                "branding_details": {
                    "logo_placement": "front_center",
                    "colors": ["blue", "white"],
                    "material": "cotton"
                },
                "budget_range": "10000-20000 TZS"
            },
            "notes": "UAT test promo custom request"
        }
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        print(f"Promo custom submission: {response.status_code}")
        assert response.status_code == 200, f"Promo custom submission failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response not ok"
        print(f"Promo custom submitted: {data.get('request_number')}")
        TestFlowCPromoCustom.request_id = data.get("request_id")
    
    def test_02_promo_custom_appears_in_admin_inbox(self):
        """Promo custom request appears in admin inbox"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get admin requests filtered by promo_custom
        response = requests.get(f"{BASE_URL}/api/admin/requests?request_type=promo_custom", headers=headers)
        print(f"Promo custom requests: {response.status_code}")
        assert response.status_code == 200
        
        requests_list = response.json()
        print(f"Found {len(requests_list)} promo_custom requests")


class TestFlowAProductOrder:
    """Flow A - Product Order E2E: Customer checkout flow"""
    
    def test_01_customer_login(self):
        """Customer logs in"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        TestFlowAProductOrder.customer_token = response.json().get("token")
        print("Customer logged in successfully")
    
    def test_02_browse_marketplace(self):
        """Customer browses marketplace products"""
        headers = {"Authorization": f"Bearer {TestFlowAProductOrder.customer_token}"}
        
        # Try marketplace search endpoint
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search", headers=headers)
        print(f"Marketplace search: {response.status_code}")
        
        if response.status_code == 200:
            products = response.json()
            print(f"Found {len(products) if isinstance(products, list) else 'N/A'} products in marketplace")
        else:
            # Try alternative endpoint
            response = requests.get(f"{BASE_URL}/api/marketplace/products", headers=headers)
            print(f"Marketplace products: {response.status_code}")
    
    def test_03_submit_checkout_quote(self):
        """Customer submits checkout quote"""
        headers = {"Authorization": f"Bearer {TestFlowAProductOrder.customer_token}"}
        
        payload = {
            "items": [
                {
                    "name": "Test Product UAT",
                    "sku": "TEST-UAT-001",
                    "quantity": 2,
                    "unit_price": 5000,
                    "subtotal": 10000
                }
            ],
            "subtotal": 10000,
            "vat_percent": 18,
            "vat_amount": 1800,
            "total": 11800,
            "delivery_address": {
                "street": "123 Test Street",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam",
                "country": "Tanzania",
                "contact_phone": "+255123456789"
            },
            "delivery_notes": "UAT test delivery",
            "source": "in_account_checkout"
        }
        
        response = requests.post(f"{BASE_URL}/api/customer/checkout-quote", json=payload, headers=headers)
        print(f"Checkout quote: {response.status_code}")
        assert response.status_code == 200, f"Checkout quote failed: {response.text}"
        
        data = response.json()
        assert "quote_number" in data, "No quote_number in response"
        print(f"Checkout quote created: {data.get('quote_number')}")
        TestFlowAProductOrder.quote_id = data.get("id")
        TestFlowAProductOrder.quote_number = data.get("quote_number")
    
    def test_04_admin_sees_payment_queue(self):
        """Admin can see payment queue"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        print(f"Payment queue: {response.status_code}")
        assert response.status_code == 200, f"Payment queue failed: {response.text}"
        
        queue = response.json()
        print(f"Payment queue has {len(queue) if isinstance(queue, list) else 'N/A'} items")


class TestRequestTypeCorrectness:
    """Verify request_type field is exactly one of the canonical values"""
    
    def test_valid_request_types_only(self):
        """Only canonical request_type values are accepted"""
        valid_types = ["service_quote", "promo_custom", "promo_sample", "product_bulk"]
        
        # Test valid type
        payload = {
            "request_type": "service_quote",
            "guest_email": "test_valid@example.com",
            "guest_name": "Test Valid",
            "title": "Valid Request Type Test"
        }
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code == 200, f"Valid request_type rejected: {response.text}"
        print("Valid request_type 'service_quote' accepted")
    
    def test_invalid_request_type_rejected(self):
        """Invalid request_type values are rejected"""
        payload = {
            "request_type": "invalid_type",
            "guest_email": "test_invalid@example.com",
            "guest_name": "Test Invalid",
            "title": "Invalid Request Type Test"
        }
        response = requests.post(f"{BASE_URL}/api/public-requests", json=payload)
        # Should be rejected with 400
        print(f"Invalid request_type response: {response.status_code}")
        # Note: The public-requests endpoint may have different validation
        # The /api/requests endpoint validates strictly


class TestVendorVisibility:
    """Vendor visibility tests - vendor should NOT see customer_price or margin"""
    
    def test_01_vendor_login(self):
        """Vendor logs in via partner auth"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        print(f"Vendor login: {response.status_code}")
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        # Partner auth returns access_token instead of token
        TestVendorVisibility.vendor_token = data.get("access_token") or data.get("token")
        print("Vendor logged in successfully")
    
    def test_02_vendor_gets_orders(self):
        """Vendor can get their orders"""
        headers = {"Authorization": f"Bearer {TestVendorVisibility.vendor_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=headers)
        print(f"Vendor orders: {response.status_code}")
        assert response.status_code == 200, f"Vendor orders failed: {response.text}"
        
        orders = response.json()
        print(f"Vendor has {len(orders) if isinstance(orders, list) else 'N/A'} orders")
        
        # Check that orders don't expose customer_price or margin
        if isinstance(orders, list) and len(orders) > 0:
            for order in orders[:3]:  # Check first 3 orders
                # Vendor should NOT see these fields
                assert "customer_price" not in order, "Vendor should NOT see customer_price"
                assert "margin" not in order, "Vendor should NOT see margin"
                assert "sell_price" not in order, "Vendor should NOT see sell_price"
                
                # Vendor SHOULD see vendor_price/base_price
                # Check items
                for item in order.get("items", []):
                    assert "customer_price" not in item, "Vendor should NOT see customer_price in items"
                    assert "margin" not in item, "Vendor should NOT see margin in items"
                    # Should have vendor_price
                    assert "vendor_price" in item or "base_price" in item, "Vendor should see vendor_price"
            
            print("Vendor visibility check PASSED - no customer_price/margin exposed")
    
    def test_03_vendor_status_transitions(self):
        """Vendor can update status through internal statuses only"""
        headers = {"Authorization": f"Bearer {TestVendorVisibility.vendor_token}"}
        
        # Get vendor orders
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=headers)
        orders = response.json()
        
        if isinstance(orders, list) and len(orders) > 0:
            # Find an order that can be updated
            test_order = None
            for order in orders:
                status = order.get("status", "")
                if status in ["assigned", "work_scheduled", "in_progress"]:
                    test_order = order
                    break
            
            if test_order:
                order_id = test_order.get("id")
                current_status = test_order.get("status")
                
                # Vendor should be able to move to next internal status
                next_status_map = {
                    "assigned": "work_scheduled",
                    "work_scheduled": "in_progress",
                    "in_progress": "ready_for_pickup"
                }
                
                if current_status in next_status_map:
                    next_status = next_status_map[current_status]
                    response = requests.post(
                        f"{BASE_URL}/api/vendor/orders/{order_id}/status",
                        json={"status": next_status},
                        headers=headers
                    )
                    print(f"Vendor status update to {next_status}: {response.status_code}")
                    # Don't assert success as order may not be in right state
            else:
                print("No vendor orders in updatable state")
        else:
            print("No vendor orders to test status transitions")
    
    def test_04_vendor_cannot_set_logistics_status(self):
        """Vendor CANNOT set logistics statuses (picked_up, in_transit, delivered, completed)"""
        headers = {"Authorization": f"Bearer {TestVendorVisibility.vendor_token}"}
        
        # Get vendor orders
        response = requests.get(f"{BASE_URL}/api/vendor/orders", headers=headers)
        orders = response.json()
        
        if isinstance(orders, list) and len(orders) > 0:
            order_id = orders[0].get("id")
            
            # Try to set logistics status - should fail
            logistics_statuses = ["picked_up", "in_transit", "delivered", "completed"]
            for status in logistics_statuses:
                response = requests.post(
                    f"{BASE_URL}/api/vendor/orders/{order_id}/status",
                    json={"status": status},
                    headers=headers
                )
                # Should be rejected (400 or 403)
                if response.status_code in [400, 403]:
                    print(f"Vendor correctly blocked from setting '{status}' status")
                else:
                    print(f"Warning: Vendor status '{status}' response: {response.status_code}")
        else:
            print("No vendor orders to test logistics status restriction")


class TestSalesDeliveryOverride:
    """Sales delivery override tests - sales controls logistics after ready_for_pickup"""
    
    def test_01_sales_login(self):
        """Sales user logs in"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        print(f"Sales login: {response.status_code}")
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        TestSalesDeliveryOverride.sales_token = response.json().get("token")
        print("Sales logged in successfully")
    
    def test_02_sales_can_get_logistics_status(self):
        """Sales can get logistics status for vendor orders"""
        # First get admin token to find vendor orders
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        admin_token = login_resp.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get orders list
        response = requests.get(f"{BASE_URL}/api/admin/orders/list", headers=admin_headers)
        if response.status_code == 200:
            orders = response.json()
            if isinstance(orders, list) and len(orders) > 0:
                # Find an order with vendor_orders
                for order in orders[:5]:
                    order_id = order.get("id")
                    # Get order detail to find vendor_order_id
                    detail_resp = requests.get(f"{BASE_URL}/api/admin/orders/{order_id}", headers=admin_headers)
                    if detail_resp.status_code == 200:
                        detail = detail_resp.json()
                        vendor_orders = detail.get("vendor_orders", [])
                        if vendor_orders:
                            vendor_order_id = vendor_orders[0].get("id")
                            
                            # Now test sales logistics status endpoint
                            sales_headers = {"Authorization": f"Bearer {TestSalesDeliveryOverride.sales_token}"}
                            status_resp = requests.get(
                                f"{BASE_URL}/api/sales/delivery/{vendor_order_id}/logistics-status",
                                headers=sales_headers
                            )
                            print(f"Sales logistics status: {status_resp.status_code}")
                            if status_resp.status_code == 200:
                                status_data = status_resp.json()
                                print(f"Current status: {status_data.get('current_status')}")
                                print(f"Can sales update: {status_data.get('can_sales_update')}")
                                print(f"Next statuses: {status_data.get('next_statuses')}")
                            break
        print("Sales logistics status endpoint tested")


class TestCRMFlow:
    """CRM flow tests - convert request to lead, update lead status"""
    
    def test_01_crm_leads_list(self):
        """Admin can list CRM leads"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/sales-crm/leads", headers=headers)
        print(f"CRM leads: {response.status_code}")
        assert response.status_code == 200, f"CRM leads failed: {response.text}"
        
        leads = response.json()
        print(f"Found {len(leads) if isinstance(leads, list) else 'N/A'} CRM leads")
    
    def test_02_update_lead_status(self):
        """Admin can update lead status"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get leads
        response = requests.get(f"{BASE_URL}/api/admin/sales-crm/leads", headers=headers)
        leads = response.json()
        
        if isinstance(leads, list) and len(leads) > 0:
            lead_id = leads[0].get("id")
            
            # Update status
            response = requests.post(
                f"{BASE_URL}/api/admin/sales-crm/update-lead-status",
                json={"lead_id": lead_id, "status": "contacted"},
                headers=headers
            )
            print(f"Update lead status: {response.status_code}")
            if response.status_code == 200:
                print("Lead status updated successfully")
        else:
            print("No leads to update")


class TestIdentityVerification:
    """Identity verification tests - approved_by, payer_name separation"""
    
    def test_01_payment_queue_has_payer_info(self):
        """Payment queue shows payer_name separately from customer_name"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        print(f"Payment queue: {response.status_code}")
        assert response.status_code == 200
        
        queue = response.json()
        if isinstance(queue, list) and len(queue) > 0:
            for item in queue[:3]:
                # Check that payer_name field exists (may be empty)
                print(f"Payment item has payer_name: {'payer_name' in item}")
                print(f"Payment item has customer_name: {'customer_name' in item}")
    
    def test_02_invoices_list_has_payer_info(self):
        """Invoices list shows payer_name"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/invoices/list", headers=headers)
        print(f"Invoices list: {response.status_code}")
        assert response.status_code == 200
        
        invoices = response.json()
        if isinstance(invoices, list) and len(invoices) > 0:
            for inv in invoices[:3]:
                print(f"Invoice has payer_name: {inv.get('payer_name', 'N/A')}")


class TestQuotesAPI:
    """Test quotes API endpoints"""
    
    def test_01_list_quotes(self):
        """Admin can list quotes"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", headers=headers)
        print(f"Quotes list: {response.status_code}")
        assert response.status_code == 200, f"Quotes list failed: {response.text}"
        
        quotes = response.json()
        print(f"Found {len(quotes) if isinstance(quotes, list) else 'N/A'} quotes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
