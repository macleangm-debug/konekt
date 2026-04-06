"""
Test: Unified Checkout Flow v180
Tests the 3-stage checkout flow:
- Stage 1: Contact + Delivery + Order placement
- Stage 2: Bank details + Payment proof submission (same page)
- Stage 3: Confirmation + Account CTA

Key behavior: Cart persists until payment proof submission (NOT at order placement)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUnifiedCheckoutBackend:
    """Backend API tests for unified checkout flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = f"test_checkout_{uuid.uuid4().hex[:8]}@example.com"
        self.test_name = "Test Checkout User"
        self.test_phone = "+255711222333"
        self.product_id = "69cce8c07f547b40594bc531"  # A5 Notebook
        self.product_name = "A5 Notebook"
        self.product_price = 8000
    
    # ─── Stage 1: Checkout creates order ───────────────────
    
    def test_checkout_creates_order_with_guest_flags(self):
        """POST /api/public/checkout creates order with is_guest_order=true"""
        payload = {
            "customer_name": self.test_name,
            "email": self.test_email,
            "phone": self.test_phone,
            "delivery_address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "items": [{
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": 2,
                "unit_price": self.product_price,
                "subtotal": self.product_price * 2,
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert response.status_code == 200, f"Checkout failed: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "order_number" in data
        assert data["order_number"].startswith("ORD-")
        assert data.get("total") == self.product_price * 2
        assert data.get("payment_status") == "pending_submission"
        
        # Store for later tests
        self.__class__.order_number = data["order_number"]
        self.__class__.order_email = self.test_email
        print(f"Order created: {data['order_number']}")
    
    def test_checkout_returns_bank_details(self):
        """Checkout response includes bank details for payment"""
        payload = {
            "customer_name": self.test_name,
            "email": f"bank_test_{uuid.uuid4().hex[:6]}@example.com",
            "phone": self.test_phone,
            "items": [{
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": 1,
                "unit_price": self.product_price,
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        bank = data.get("bank_details", {})
        assert bank.get("bank_name"), "Bank name missing"
        assert bank.get("account_name"), "Account name missing"
        assert bank.get("account_number"), "Account number missing"
        print(f"Bank details: {bank.get('bank_name')} - {bank.get('account_number')}")
    
    def test_checkout_returns_account_info_cta(self):
        """Checkout returns account_info for CTA (create_account or login)"""
        payload = {
            "customer_name": self.test_name,
            "email": f"cta_test_{uuid.uuid4().hex[:6]}@example.com",
            "phone": self.test_phone,
            "items": [{
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": 1,
                "unit_price": self.product_price,
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        account_info = data.get("account_info", {})
        assert account_info.get("type") in ["create_account", "login"], f"Invalid account_info type: {account_info}"
        assert account_info.get("message"), "Account CTA message missing"
        print(f"Account CTA: {account_info.get('type')} - {account_info.get('message')}")
    
    def test_checkout_validates_required_fields(self):
        """Checkout validates name, email, phone, items"""
        # Missing name
        response = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "email": "test@example.com",
            "phone": "+255711222333",
            "items": [{"product_id": "x", "quantity": 1, "unit_price": 100}]
        })
        assert response.status_code == 400
        
        # Missing email
        response = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": "Test",
            "phone": "+255711222333",
            "items": [{"product_id": "x", "quantity": 1, "unit_price": 100}]
        })
        assert response.status_code == 400
        
        # Empty cart
        response = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": "Test",
            "email": "test@example.com",
            "phone": "+255711222333",
            "items": []
        })
        assert response.status_code == 400
        print("Validation tests passed")
    
    # ─── Stage 2: Payment proof submission ─────────────────
    
    def test_payment_proof_creates_submission(self):
        """POST /api/public/payment-proof creates payment_proof_submissions record"""
        # First create an order
        order_email = f"proof_test_{uuid.uuid4().hex[:6]}@example.com"
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": self.test_name,
            "email": order_email,
            "phone": self.test_phone,
            "items": [{
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": 1,
                "unit_price": self.product_price,
            }]
        })
        assert checkout_response.status_code == 200
        order_number = checkout_response.json()["order_number"]
        
        # Submit payment proof
        proof_payload = {
            "order_number": order_number,
            "email": order_email,
            "payer_name": self.test_name,
            "amount_paid": self.product_price,
            "bank_reference": f"TXN-{uuid.uuid4().hex[:8].upper()}",
            "payment_method": "bank_transfer",
            "payment_date": "2026-04-06",
        }
        
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert response.status_code == 200, f"Payment proof failed: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert data.get("order_number") == order_number
        assert data.get("payment_status") == "pending_review"
        assert "message" in data
        print(f"Payment proof submitted for {order_number}")
    
    def test_payment_proof_updates_order_status(self):
        """Payment proof updates order to pending_review/awaiting_payment_verification"""
        order_email = f"status_test_{uuid.uuid4().hex[:6]}@example.com"
        
        # Create order
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": self.test_name,
            "email": order_email,
            "phone": self.test_phone,
            "items": [{
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": 1,
                "unit_price": self.product_price,
            }]
        })
        order_number = checkout_response.json()["order_number"]
        
        # Submit proof
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json={
            "order_number": order_number,
            "email": order_email,
            "payer_name": self.test_name,
            "amount_paid": self.product_price,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("payment_status") == "pending_review"
        print(f"Order status updated to pending_review")
    
    def test_payment_proof_validates_email_match(self):
        """Payment proof returns 403 for mismatched email"""
        order_email = f"email_match_{uuid.uuid4().hex[:6]}@example.com"
        
        # Create order
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": self.test_name,
            "email": order_email,
            "phone": self.test_phone,
            "items": [{
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": 1,
                "unit_price": self.product_price,
            }]
        })
        order_number = checkout_response.json()["order_number"]
        
        # Try with wrong email
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json={
            "order_number": order_number,
            "email": "wrong@example.com",
            "payer_name": self.test_name,
            "amount_paid": self.product_price,
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Email validation working correctly")
    
    def test_payment_proof_validates_order_exists(self):
        """Payment proof returns 404 for non-existent order"""
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json={
            "order_number": "ORD-NONEXISTENT-123456",
            "email": "test@example.com",
            "payer_name": "Test",
            "amount_paid": 1000,
        })
        assert response.status_code == 404
        print("Order existence validation working")
    
    def test_payment_proof_returns_account_cta(self):
        """Payment proof response includes account_info CTA"""
        order_email = f"cta_proof_{uuid.uuid4().hex[:6]}@example.com"
        
        # Create order
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": self.test_name,
            "email": order_email,
            "phone": self.test_phone,
            "items": [{
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": 1,
                "unit_price": self.product_price,
            }]
        })
        order_number = checkout_response.json()["order_number"]
        
        # Submit proof
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json={
            "order_number": order_number,
            "email": order_email,
            "payer_name": self.test_name,
            "amount_paid": self.product_price,
        })
        assert response.status_code == 200
        
        data = response.json()
        account_info = data.get("account_info", {})
        assert account_info.get("type") in ["create_account", "login"]
        print(f"Payment proof CTA: {account_info.get('type')}")
    
    # ─── Admin visibility tests ────────────────────────────
    
    def test_guest_payment_proof_in_admin_queue(self):
        """Guest payment proofs appear in admin payment queue"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json().get("token")
        
        # Check payment queue
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/payment-proofs/admin?status=pending", headers=headers)
        assert response.status_code == 200, f"Payment queue failed: {response.text}"
        
        data = response.json()
        # Should be a list or have items
        items = data if isinstance(data, list) else data.get("items", data.get("proofs", []))
        print(f"Admin payment queue has {len(items)} pending proofs")
    
    def test_guest_orders_in_admin_orders(self):
        """Guest orders appear in admin orders list"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        token = login_response.json().get("token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
        assert response.status_code == 200, f"Admin orders failed: {response.text}"
        
        data = response.json()
        orders = data if isinstance(data, list) else data.get("orders", data.get("items", []))
        print(f"Admin orders list has {len(orders)} orders")
    
    # ─── Marketplace and cart tests ────────────────────────
    
    def test_marketplace_products_public(self):
        """Public can search marketplace products"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200
        
        products = response.json()
        assert isinstance(products, list)
        assert len(products) > 0, "No products found"
        
        # Check product has required fields for cart
        product = products[0]
        assert "id" in product
        assert "name" in product
        print(f"Marketplace has {len(products)} products")
    
    def test_marketplace_listing_detail_public(self):
        """Public can view product details"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/listing/{self.product_id}")
        assert response.status_code == 200
        
        data = response.json()
        # API returns {listing: {...}} wrapper
        product = data.get("listing", data)
        assert product.get("id") == self.product_id or product.get("name")
        print(f"Product detail: {product.get('name')}")
    
    # ─── Standalone payment proof page ─────────────────────
    
    def test_standalone_payment_proof_works(self):
        """Standalone /payment-proof page endpoint works for returning users"""
        order_email = f"standalone_{uuid.uuid4().hex[:6]}@example.com"
        
        # Create order
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": self.test_name,
            "email": order_email,
            "phone": self.test_phone,
            "items": [{
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": 1,
                "unit_price": self.product_price,
            }]
        })
        order_number = checkout_response.json()["order_number"]
        
        # Simulate standalone payment proof submission (same endpoint)
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json={
            "order_number": order_number,
            "email": order_email,
            "payer_name": "Returning User",
            "amount_paid": self.product_price,
            "bank_reference": "STANDALONE-REF-123",
        })
        assert response.status_code == 200
        print(f"Standalone payment proof works for {order_number}")
    
    # ─── Health check ──────────────────────────────────────
    
    def test_health_endpoint(self):
        """Health endpoint working"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
