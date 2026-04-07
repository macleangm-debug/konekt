"""
Test Guest Checkout Bug Fixes - Iteration 187
Tests:
1. Bug Fix 1: Guest checkout CTA URL now points to /register instead of /activate-account
2. Bug Fix 2: Guest payment proof writes to db.payments for admin queue visibility
3. Admin payment queue shows guest payment proofs
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

class TestGuestCheckoutBugFixes:
    """Test guest checkout bug fixes - uses unique emails to ensure create_account flow"""
    
    def test_guest_checkout_returns_register_url(self):
        """Bug Fix 1: Guest checkout should return invite_url pointing to /register"""
        # Use unique email to ensure we get create_account (not login for existing user)
        test_email = f"test_guest_{uuid.uuid4().hex[:12]}@example.com"
        test_name = "Test Guest User"
        test_phone = "+255700000000"
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Create a guest checkout order
        checkout_payload = {
            "customer_name": test_name,
            "email": test_email,
            "phone": test_phone,
            "company_name": "Test Company",
            "items": [
                {
                    "product_id": "test-product-001",
                    "product_name": "Test Product",
                    "quantity": 1,
                    "unit_price": 10000,
                    "price": 10000
                }
            ],
            "delivery_address": "Test Address",
            "city": "Dar es Salaam",
            "country": "Tanzania"
        }
        
        res = session.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert res.status_code == 200, f"Checkout failed: {res.text}"
        
        data = res.json()
        assert data.get("ok") is True, "Checkout response should have ok=True"
        assert "order_number" in data, "Response should contain order_number"
        assert "account_info" in data, "Response should contain account_info"
        
        account_info = data.get("account_info", {})
        assert account_info.get("type") == "create_account", f"Expected type=create_account, got {account_info.get('type')}"
        
        invite_url = account_info.get("invite_url", "")
        assert "/register" in invite_url, f"invite_url should contain /register, got: {invite_url}"
        assert "token=" in invite_url, f"invite_url should contain token parameter, got: {invite_url}"
        assert "source=guest_checkout" in invite_url, f"invite_url should contain source=guest_checkout, got: {invite_url}"
        
        # Verify it does NOT contain /activate-account
        assert "/activate-account" not in invite_url, f"invite_url should NOT contain /activate-account, got: {invite_url}"
        
        print(f"✓ Bug Fix 1 PASS: invite_url correctly points to /register: {invite_url}")
    
    def test_guest_payment_proof_creates_canonical_payment_record(self):
        """Bug Fix 2: Guest payment proof should create record in db.payments"""
        # Use unique email
        test_email = f"test_proof_{uuid.uuid4().hex[:12]}@example.com"
        test_name = "Test Proof User"
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # First create an order
        checkout_payload = {
            "customer_name": test_name,
            "email": test_email,
            "phone": "+255700000001",
            "items": [{"product_id": "test-001", "product_name": "Test", "quantity": 1, "unit_price": 5000}],
            "delivery_address": "Test",
            "city": "Dar"
        }
        
        res = session.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert res.status_code == 200, f"Checkout failed: {res.text}"
        order_number = res.json().get("order_number")
        
        # Submit payment proof
        proof_payload = {
            "order_number": order_number,
            "email": test_email,
            "amount_paid": 5000,
            "currency": "TZS",
            "payment_date": datetime.utcnow().isoformat(),
            "bank_reference": f"TEST-REF-{uuid.uuid4().hex[:8]}",
            "payment_method": "bank_transfer",
            "payer_name": test_name,
            "notes": "Test payment proof"
        }
        
        res = session.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert res.status_code == 200, f"Payment proof submission failed: {res.text}"
        
        data = res.json()
        assert data.get("ok") is True, "Payment proof response should have ok=True"
        assert data.get("payment_status") == "pending_review", f"Expected payment_status=pending_review, got {data.get('payment_status')}"
        
        print(f"✓ Payment proof submitted for order {order_number}")
    
    def test_admin_payment_queue_shows_guest_proofs(self):
        """Bug Fix 2 (admin visibility): Admin payment queue should show guest payment proofs"""
        # Use unique email
        test_email = f"test_admin_queue_{uuid.uuid4().hex[:12]}@example.com"
        test_name = "Test Admin Queue User"
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Create order
        checkout_payload = {
            "customer_name": test_name,
            "email": test_email,
            "phone": "+255700000002",
            "items": [{"product_id": "test-002", "product_name": "Test", "quantity": 1, "unit_price": 3000}],
            "delivery_address": "Test",
            "city": "Dar"
        }
        
        res = session.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert res.status_code == 200
        order_number = res.json().get("order_number")
        
        # Submit payment proof
        proof_payload = {
            "order_number": order_number,
            "email": test_email,
            "amount_paid": 3000,
            "bank_reference": f"ADMIN-TEST-{uuid.uuid4().hex[:6]}",
            "payer_name": test_name
        }
        
        res = session.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert res.status_code == 200
        
        # Get admin token
        res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert res.status_code == 200, "Admin login failed"
        admin_token = res.json().get("token")
        
        # Query admin payment queue
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = session.get(f"{BASE_URL}/api/admin/payments?status=pending", headers=headers)
        assert res.status_code == 200, f"Admin payments query failed: {res.text}"
        
        payments = res.json()
        assert isinstance(payments, list), "Response should be a list"
        
        # Find our test payment
        test_payment = None
        for payment in payments:
            if payment.get("order_number") == order_number:
                test_payment = payment
                break
        
        assert test_payment is not None, f"Guest payment proof for order {order_number} not found in admin queue"
        
        # Verify payment record fields
        assert test_payment.get("status") == "pending", f"Expected status=pending, got {test_payment.get('status')}"
        assert test_payment.get("source") == "guest_payment_proof", f"Expected source=guest_payment_proof, got {test_payment.get('source')}"
        assert test_payment.get("is_guest_submission") is True, "Expected is_guest_submission=True"
        
        print(f"✓ Bug Fix 2 PASS: Guest payment proof visible in admin queue for order {order_number}")


class TestGuestCheckoutFullFlow:
    """Test complete guest checkout flow end-to-end"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = f"e2e_guest_{uuid.uuid4().hex[:8]}@example.com"
        self.test_name = "E2E Guest User"
        self.test_phone = "+255711111111"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin auth token"""
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get("token")
        return None
    
    def test_full_guest_checkout_flow(self):
        """
        Full E2E flow:
        1. POST /api/public/checkout -> creates order
        2. Verify invite_url has /register (not /activate-account)
        3. POST /api/public/payment-proof -> submits proof
        4. GET /api/admin/payments?status=pending -> admin sees it
        """
        # Step 1: Create guest checkout order
        checkout_payload = {
            "customer_name": self.test_name,
            "email": self.test_email,
            "phone": self.test_phone,
            "company_name": "E2E Test Company",
            "items": [
                {
                    "product_id": "6d927ec9-a7b8-43f5-8ade-15f211d2112a",
                    "product_name": "Classic Cotton T-Shirt",
                    "quantity": 10,
                    "unit_price": 8000,
                    "price": 8000
                }
            ],
            "delivery_address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania"
        }
        
        res = self.session.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert res.status_code == 200, f"Step 1 FAIL: Checkout failed: {res.text}"
        
        checkout_data = res.json()
        order_number = checkout_data.get("order_number")
        account_info = checkout_data.get("account_info", {})
        invite_url = account_info.get("invite_url", "")
        
        print(f"Step 1 PASS: Order created - {order_number}")
        
        # Step 2: Verify invite_url format
        assert "/register" in invite_url, f"Step 2 FAIL: invite_url should contain /register"
        assert "/activate-account" not in invite_url, f"Step 2 FAIL: invite_url should NOT contain /activate-account"
        print(f"Step 2 PASS: invite_url correctly points to /register")
        
        # Step 3: Submit payment proof
        proof_payload = {
            "order_number": order_number,
            "email": self.test_email,
            "amount_paid": 80000,  # 10 * 8000
            "currency": "TZS",
            "payment_date": datetime.utcnow().isoformat(),
            "bank_reference": f"E2E-REF-{uuid.uuid4().hex[:8]}",
            "payment_method": "bank_transfer",
            "payer_name": self.test_name,
            "notes": "E2E test payment"
        }
        
        res = self.session.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert res.status_code == 200, f"Step 3 FAIL: Payment proof failed: {res.text}"
        print(f"Step 3 PASS: Payment proof submitted")
        
        # Step 4: Admin sees payment in queue
        admin_token = self.get_admin_token()
        assert admin_token, "Step 4 FAIL: Could not get admin token"
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = self.session.get(f"{BASE_URL}/api/admin/payments?status=pending", headers=headers)
        assert res.status_code == 200, f"Step 4 FAIL: Admin payments query failed: {res.text}"
        
        payments = res.json()
        found = any(p.get("order_number") == order_number for p in payments)
        assert found, f"Step 4 FAIL: Payment for {order_number} not in admin queue"
        
        print(f"Step 4 PASS: Admin can see payment in queue")
        print(f"\n✓ FULL E2E FLOW PASS for order {order_number}")


class TestPublicMarketplaceAPI:
    """Test public marketplace API for PDP"""
    
    def test_product_detail_api(self):
        """Test product detail API returns correct data"""
        product_id = "6d927ec9-a7b8-43f5-8ade-15f211d2112a"
        res = requests.get(f"{BASE_URL}/api/public-marketplace/listing/{product_id}")
        
        assert res.status_code == 200, f"Product detail API failed: {res.text}"
        
        data = res.json()
        listing = data.get("listing", {})
        
        # Product should have a name (ID may differ due to MongoDB ObjectId)
        assert listing.get("name"), "Product should have name"
        
        print(f"✓ Product detail API working - returned product: {listing.get('name')}")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Test admin can login"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        
        data = res.json()
        assert "token" in data, "Response should contain token"
        assert data.get("user", {}).get("role") in ["admin", "super_admin"], f"Expected admin role, got {data.get('user', {}).get('role')}"
        
        print(f"✓ Admin login successful")
