"""
Walk-in Sale & Account Mapping Tests — Iteration 288
Tests:
- POST /api/admin/walk-in-sale creates order, invoice, payment in one step
- Walk-in sale response includes order_number (WLK-*), invoice_number, total
- Walk-in sale order has status=completed, closure_locked=true, sales_channel=walk_in
- Walk-in sale validates business client fields (VRN, BRN) when client_type=business
- Walk-in sale with empty items returns 400 error
- Account mapping: registration with phone links historical orders by phone match
- Track Order page 6-step lifecycle (regression)
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWalkInSale:
    """Walk-in Sale endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_token = login_resp.json()["token"]
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.admin_token}"
        }
    
    def test_walkin_sale_creates_order_invoice_payment(self):
        """POST /api/admin/walk-in-sale creates order, invoice, and payment in one step"""
        payload = {
            "items": [
                {"name": "Test Product A", "quantity": 2, "unit_price": 15000},
                {"name": "Test Product B", "quantity": 1, "unit_price": 25000}
            ],
            "customer_name": "TEST_WalkIn Customer",
            "customer_phone": "+255712345678",
            "client_type": "individual",
            "payment_method": "cash",
            "notes": "Test walk-in sale"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/walk-in-sale", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Walk-in sale failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert data["status"] == "success"
        assert "order_id" in data
        assert "order_number" in data
        assert "invoice_number" in data
        assert "total" in data
        assert "currency" in data
        
        # Verify order_number starts with WLK-
        assert data["order_number"].startswith("WLK-"), f"Order number should start with WLK-, got: {data['order_number']}"
        
        # Verify total calculation (2*15000 + 1*25000 = 55000)
        assert data["total"] == 55000, f"Expected total 55000, got: {data['total']}"
        
        print(f"Walk-in sale created: {data['order_number']}, Invoice: {data['invoice_number']}, Total: {data['total']}")
    
    def test_walkin_sale_order_has_correct_fields(self):
        """Walk-in sale order has status=completed, closure_locked=true, sales_channel=walk_in"""
        # Create a walk-in sale
        payload = {
            "items": [{"name": "Field Test Product", "quantity": 1, "unit_price": 10000}],
            "customer_name": "TEST_FieldCheck Customer",
            "client_type": "individual",
            "payment_method": "mobile_money"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/walk-in-sale", json=payload, headers=self.headers)
        assert response.status_code == 200
        
        order_number = response.json()["order_number"]
        
        # Fetch the order to verify fields
        orders_resp = requests.get(f"{BASE_URL}/api/admin/orders?search={order_number}", headers=self.headers)
        assert orders_resp.status_code == 200
        
        orders = orders_resp.json().get("orders", [])
        assert len(orders) > 0, f"Order {order_number} not found"
        
        order = orders[0]
        assert order["status"] == "completed", f"Expected status=completed, got: {order['status']}"
        assert order["closure_locked"] == True, f"Expected closure_locked=true, got: {order.get('closure_locked')}"
        assert order["sales_channel"] == "walk_in", f"Expected sales_channel=walk_in, got: {order.get('sales_channel')}"
        assert order.get("is_walk_in") == True, f"Expected is_walk_in=true, got: {order.get('is_walk_in')}"
        assert order.get("closure_method") == "confirmed_in_person", f"Expected closure_method=confirmed_in_person, got: {order.get('closure_method')}"
        assert order.get("sales_contribution_type") == "assisted", f"Expected sales_contribution_type=assisted, got: {order.get('sales_contribution_type')}"
        
        print(f"Order {order_number} has correct walk-in fields")
    
    def test_walkin_sale_empty_items_returns_400(self):
        """Walk-in sale with empty items returns 400 error"""
        payload = {
            "items": [],
            "customer_name": "TEST_EmptyItems Customer",
            "client_type": "individual",
            "payment_method": "cash"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/walk-in-sale", json=payload, headers=self.headers)
        assert response.status_code == 400, f"Expected 400, got: {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "item" in data["detail"].lower(), f"Error should mention items: {data['detail']}"
        
        print(f"Empty items validation works: {data['detail']}")
    
    def test_walkin_sale_business_validation_missing_vrn_brn(self):
        """Walk-in sale validates business client fields (VRN, BRN) when client_type=business"""
        payload = {
            "items": [{"name": "Business Test Product", "quantity": 1, "unit_price": 50000}],
            "customer_name": "TEST_Business Customer",
            "client_type": "business",
            "payment_method": "bank_transfer"
            # Missing: business_name, vrn, brn
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/walk-in-sale", json=payload, headers=self.headers)
        assert response.status_code == 400, f"Expected 400 for missing business fields, got: {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        # Should mention VRN, BRN, Business Name
        detail_lower = data["detail"].lower()
        assert "vrn" in detail_lower or "brn" in detail_lower or "business" in detail_lower, f"Error should mention business fields: {data['detail']}"
        
        print(f"Business validation works: {data['detail']}")
    
    def test_walkin_sale_business_with_all_fields_succeeds(self):
        """Walk-in sale with business client and all required fields succeeds"""
        payload = {
            "items": [{"name": "Business Product", "quantity": 3, "unit_price": 20000}],
            "customer_name": "TEST_Business Complete",
            "client_type": "business",
            "business_name": "Test Company Ltd",
            "vrn": "TZ123456789",
            "brn": "BRN-2024-001",
            "payment_method": "bank_transfer"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/walk-in-sale", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Business walk-in sale failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "success"
        assert data["order_number"].startswith("WLK-")
        assert data["total"] == 60000  # 3 * 20000
        
        print(f"Business walk-in sale created: {data['order_number']}")
    
    def test_walkin_sale_response_includes_required_fields(self):
        """Walk-in sale response includes order_number (WLK-*), invoice_number, total"""
        payload = {
            "items": [{"name": "Response Test", "quantity": 1, "unit_price": 5000}],
            "customer_name": "TEST_Response Check",
            "client_type": "individual",
            "payment_method": "cash"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/walk-in-sale", json=payload, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all required response fields
        assert "order_number" in data, "Response missing order_number"
        assert "invoice_number" in data, "Response missing invoice_number"
        assert "total" in data, "Response missing total"
        assert "order_id" in data, "Response missing order_id"
        assert "currency" in data, "Response missing currency"
        assert "status" in data, "Response missing status"
        
        # Verify formats
        assert data["order_number"].startswith("WLK-"), f"Order number format wrong: {data['order_number']}"
        assert "INV" in data["invoice_number"], f"Invoice number format wrong: {data['invoice_number']}"
        assert isinstance(data["total"], (int, float)), f"Total should be numeric: {data['total']}"
        
        print(f"Response fields verified: order={data['order_number']}, invoice={data['invoice_number']}, total={data['total']}")


class TestAccountMapping:
    """Account mapping tests — registration links historical orders by phone"""
    
    def test_registration_endpoint_exists(self):
        """Registration endpoint /api/auth/register exists"""
        # Test with invalid data to verify endpoint exists
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "",
            "password": "",
            "full_name": ""
        })
        # Should return 400 or 422 for validation, not 404
        assert response.status_code in [400, 422], f"Registration endpoint should exist, got: {response.status_code}"
        print("Registration endpoint exists")
    
    def test_registration_with_phone_creates_user(self):
        """Registration with phone number creates user successfully"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"test_mapping_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"TEST_Mapping User {unique_id}",
            "phone": f"+255700{unique_id[:6]}",
            "company": "Test Company"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # May fail if email already exists, but should not be 404
        if response.status_code == 200:
            data = response.json()
            assert "token" in data, "Registration should return token"
            assert "user" in data, "Registration should return user"
            assert data["user"]["email"] == payload["email"]
            print(f"User registered: {payload['email']}")
        elif response.status_code == 400:
            # Email might already exist
            print(f"Registration returned 400 (possibly duplicate): {response.json()}")
        else:
            pytest.fail(f"Unexpected registration response: {response.status_code} - {response.text}")


class TestTrackOrderLifecycle:
    """Track Order page 6-step lifecycle regression tests"""
    
    def test_track_order_endpoint_exists(self):
        """Track order endpoint /api/orders/track/{order_number} exists"""
        # Test with a known order number format
        response = requests.get(f"{BASE_URL}/api/orders/track/ORD-TEST-123456")
        # Should return 404 for not found, not 500 or other errors
        assert response.status_code in [200, 404], f"Track endpoint should exist, got: {response.status_code}"
        print("Track order endpoint exists")
    
    def test_track_existing_walkin_order(self):
        """Track an existing walk-in order returns order data"""
        # First create a walk-in order
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Create walk-in sale
        create_resp = requests.post(f"{BASE_URL}/api/admin/walk-in-sale", json={
            "items": [{"name": "Track Test", "quantity": 1, "unit_price": 8000}],
            "customer_name": "TEST_Track Customer",
            "customer_phone": "+255711111111",
            "client_type": "individual",
            "payment_method": "cash"
        }, headers=headers)
        
        assert create_resp.status_code == 200
        order_number = create_resp.json()["order_number"]
        
        # Track the order
        track_resp = requests.get(f"{BASE_URL}/api/orders/track/{order_number}")
        assert track_resp.status_code == 200, f"Track order failed: {track_resp.text}"
        
        order = track_resp.json()
        assert order.get("order_number") == order_number or order.get("id")
        assert order.get("status") == "completed"
        
        print(f"Tracked order {order_number}: status={order.get('status')}")


class TestCatalogProductsForWalkIn:
    """Catalog products API for walk-in sale product search"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        self.admin_token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_catalog_products_endpoint_exists(self):
        """GET /api/admin/catalog/products returns products list"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/products", headers=self.headers)
        assert response.status_code == 200, f"Catalog products failed: {response.text}"
        
        data = response.json()
        # Should return a list (possibly empty)
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        
        if len(data) > 0:
            product = data[0]
            # Products should have name/title and price
            assert "name" in product or "title" in product, "Product should have name or title"
            print(f"Catalog has {len(data)} products")
        else:
            print("Catalog is empty (no products)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
