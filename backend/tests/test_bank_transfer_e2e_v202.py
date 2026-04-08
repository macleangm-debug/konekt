"""
Bank Transfer E2E Tests - Iteration 202
Tests the complete guest checkout → payment proof → admin approval/rejection flow.

Key scenarios:
1. Guest checkout creates order via POST /api/public/checkout
2. Guest payment proof via POST /api/public/payment-proof
3. Admin sees proof in GET /api/admin/payments/queue
4. Admin approve via POST /api/admin/payments/{id}/approve
5. Admin reject via POST /api/admin/payments/{id}/reject
"""
import os
import pytest
import requests
from datetime import datetime
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestBankTransferE2E:
    """End-to-end tests for Bank Transfer guest checkout flow."""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token."""
        resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        return resp.json().get("token")

    @pytest.fixture(scope="class")
    def guest_order(self):
        """Create a guest order for testing."""
        unique_id = uuid4().hex[:6]
        payload = {
            "customer_name": f"Test Guest {unique_id}",
            "email": f"test.guest.{unique_id}@example.com",
            "phone": "+255700000001",
            "company_name": "Test Company",
            "delivery_address": "123 Test Street, Dar es Salaam",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "notes": "E2E test order",
            "items": [
                {
                    "product_id": "test-product-001",
                    "product_name": "Test Product",
                    "quantity": 2,
                    "unit_price": 50000,
                    "price": 50000,
                }
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert resp.status_code == 200, f"Guest checkout failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "order_number" in data
        return {
            "order_number": data["order_number"],
            "order_id": data.get("order_id"),
            "email": payload["email"],
            "customer_name": payload["customer_name"],
            "total": data.get("total", 0),
        }

    # ─── Test 1: Guest Checkout Creates Order ─────────────────────
    def test_guest_checkout_creates_order(self):
        """POST /api/public/checkout creates a real order."""
        unique_id = uuid4().hex[:6]
        payload = {
            "customer_name": f"Checkout Test {unique_id}",
            "email": f"checkout.test.{unique_id}@example.com",
            "phone": "+255700000002",
            "items": [
                {
                    "product_id": "prod-123",
                    "product_name": "Widget A",
                    "quantity": 1,
                    "unit_price": 25000,
                }
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert resp.status_code == 200, f"Checkout failed: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert data.get("ok") is True
        assert "order_number" in data
        assert "order_id" in data
        assert "total" in data
        assert "bank_details" in data
        
        # Verify bank details
        bank = data["bank_details"]
        assert bank.get("bank_name"), "Bank name missing"
        assert bank.get("account_number"), "Account number missing"
        
        print(f"✓ Guest checkout created order: {data['order_number']}")

    def test_guest_checkout_requires_fields(self):
        """POST /api/public/checkout validates required fields."""
        # Missing name
        resp = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "email": "test@example.com",
            "phone": "+255700000000",
            "items": [{"product_id": "x", "quantity": 1, "unit_price": 1000}]
        })
        assert resp.status_code == 400
        
        # Missing email
        resp = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": "Test",
            "phone": "+255700000000",
            "items": [{"product_id": "x", "quantity": 1, "unit_price": 1000}]
        })
        assert resp.status_code == 400
        
        # Empty cart
        resp = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": "Test",
            "email": "test@example.com",
            "phone": "+255700000000",
            "items": []
        })
        assert resp.status_code == 400
        
        print("✓ Guest checkout validates required fields")

    # ─── Test 2: Guest Payment Proof Submission ───────────────────
    def test_guest_payment_proof_submission(self, guest_order):
        """POST /api/public/payment-proof creates payment proof for guest order."""
        payload = {
            "order_number": guest_order["order_number"],
            "email": guest_order["email"],
            "amount_paid": guest_order["total"],
            "payer_name": "Test Payer Name",
            "bank_reference": f"REF-{uuid4().hex[:8].upper()}",
            "payment_method": "bank_transfer",
            "notes": "E2E test payment proof",
        }
        resp = requests.post(f"{BASE_URL}/api/public/payment-proof", json=payload)
        assert resp.status_code == 200, f"Payment proof submission failed: {resp.text}"
        data = resp.json()
        
        assert data.get("ok") is True
        assert data.get("order_number") == guest_order["order_number"]
        assert data.get("payment_status") == "pending_review"
        
        print(f"✓ Payment proof submitted for order: {guest_order['order_number']}")

    def test_guest_payment_proof_requires_order_number(self):
        """POST /api/public/payment-proof requires order_number."""
        resp = requests.post(f"{BASE_URL}/api/public/payment-proof", json={
            "email": "test@example.com",
            "amount_paid": 50000,
        })
        assert resp.status_code == 400
        print("✓ Payment proof requires order_number")

    def test_guest_payment_proof_validates_email(self, guest_order):
        """POST /api/public/payment-proof validates email matches order."""
        resp = requests.post(f"{BASE_URL}/api/public/payment-proof", json={
            "order_number": guest_order["order_number"],
            "email": "wrong.email@example.com",
            "amount_paid": 50000,
        })
        assert resp.status_code == 403, "Should reject mismatched email"
        print("✓ Payment proof validates email matches order")

    # ─── Test 3: Admin Sees Proof in Queue ────────────────────────
    def test_admin_sees_proof_in_queue(self, admin_token, guest_order):
        """GET /api/admin/payments/queue includes guest payment proofs."""
        # First submit a payment proof
        proof_payload = {
            "order_number": guest_order["order_number"],
            "email": guest_order["email"],
            "amount_paid": guest_order["total"],
            "payer_name": "Queue Test Payer",
            "bank_reference": f"QUEUE-{uuid4().hex[:6].upper()}",
        }
        submit_resp = requests.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert submit_resp.status_code == 200
        
        # Now check admin queue
        headers = {"Authorization": f"Bearer {admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        assert resp.status_code == 200, f"Admin queue failed: {resp.text}"
        
        queue = resp.json()
        assert isinstance(queue, list), "Queue should be a list"
        
        # Find our order in the queue
        found = None
        for item in queue:
            if item.get("order_number") == guest_order["order_number"]:
                found = item
                break
        
        assert found is not None, f"Order {guest_order['order_number']} not found in admin queue"
        assert found.get("payer_name") == "Queue Test Payer", "payer_name should be from proof submission"
        assert found.get("is_guest") is True, "Should be marked as guest order"
        
        print(f"✓ Admin queue contains guest order: {guest_order['order_number']}")

    # ─── Test 4: Admin Approve Payment Proof ──────────────────────
    def test_admin_approve_payment_proof(self, admin_token):
        """POST /api/admin/payments/{id}/approve updates order correctly."""
        # Create a fresh order for approval test
        unique_id = uuid4().hex[:6]
        checkout_payload = {
            "customer_name": f"Approve Test {unique_id}",
            "email": f"approve.test.{unique_id}@example.com",
            "phone": "+255700000003",
            "items": [{"product_id": "prod-approve", "product_name": "Approval Widget", "quantity": 1, "unit_price": 30000}]
        }
        checkout_resp = requests.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert checkout_resp.status_code == 200
        order_data = checkout_resp.json()
        order_number = order_data["order_number"]
        
        # Submit payment proof
        proof_payload = {
            "order_number": order_number,
            "email": checkout_payload["email"],
            "amount_paid": order_data["total"],
            "payer_name": "Approval Payer Name",
            "bank_reference": f"APPROVE-{uuid4().hex[:6].upper()}",
        }
        proof_resp = requests.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert proof_resp.status_code == 200
        
        # Get the payment proof ID from admin queue
        headers = {"Authorization": f"Bearer {admin_token}"}
        queue_resp = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        assert queue_resp.status_code == 200
        
        queue = queue_resp.json()
        proof_item = next((x for x in queue if x.get("order_number") == order_number), None)
        assert proof_item is not None, f"Order {order_number} not in queue"
        
        payment_proof_id = proof_item.get("payment_proof_id")
        assert payment_proof_id, "payment_proof_id missing from queue item"
        
        # Approve the payment (requires body with approver_role)
        approve_resp = requests.post(
            f"{BASE_URL}/api/admin/payments/{payment_proof_id}/approve",
            headers=headers,
            json={"approver_role": "admin"}
        )
        assert approve_resp.status_code == 200, f"Approval failed: {approve_resp.text}"
        approve_data = approve_resp.json()
        
        # Verify approval response
        assert approve_data.get("fully_paid") is True, "Should be fully paid"
        
        order_doc = approve_data.get("order")
        assert order_doc is not None, "Order should be returned"
        assert order_doc.get("status") in ["created", "paid"], f"Order status should be created/paid, got: {order_doc.get('status')}"
        assert order_doc.get("payment_status") == "paid", "Payment status should be paid"
        assert order_doc.get("payer_name") == "Approval Payer Name", "payer_name should be from proof, not customer_name"
        assert order_doc.get("approved_by"), "approved_by should be set"
        
        # Verify no duplicate order created (order_id should match original)
        assert order_doc.get("order_number") == order_number, "Should update existing order, not create new"
        
        print(f"✓ Admin approved payment proof for order: {order_number}")
        print(f"  - Order status: {order_doc.get('status')}")
        print(f"  - Payment status: {order_doc.get('payment_status')}")
        print(f"  - Approved by: {order_doc.get('approved_by')}")
        print(f"  - Payer name: {order_doc.get('payer_name')}")

    # ─── Test 5: Admin Reject Payment Proof ───────────────────────
    def test_admin_reject_payment_proof(self, admin_token):
        """POST /api/admin/payments/{id}/reject handles guest orders correctly."""
        # Create a fresh order for rejection test
        unique_id = uuid4().hex[:6]
        checkout_payload = {
            "customer_name": f"Reject Test {unique_id}",
            "email": f"reject.test.{unique_id}@example.com",
            "phone": "+255700000004",
            "items": [{"product_id": "prod-reject", "product_name": "Rejection Widget", "quantity": 1, "unit_price": 20000}]
        }
        checkout_resp = requests.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert checkout_resp.status_code == 200
        order_data = checkout_resp.json()
        order_number = order_data["order_number"]
        
        # Submit payment proof
        proof_payload = {
            "order_number": order_number,
            "email": checkout_payload["email"],
            "amount_paid": order_data["total"],
            "payer_name": "Rejection Payer",
            "bank_reference": f"REJECT-{uuid4().hex[:6].upper()}",
        }
        proof_resp = requests.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert proof_resp.status_code == 200
        
        # Get the payment proof ID from admin queue
        headers = {"Authorization": f"Bearer {admin_token}"}
        queue_resp = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        assert queue_resp.status_code == 200
        
        queue = queue_resp.json()
        proof_item = next((x for x in queue if x.get("order_number") == order_number), None)
        assert proof_item is not None, f"Order {order_number} not in queue"
        
        payment_proof_id = proof_item.get("payment_proof_id")
        assert payment_proof_id, "payment_proof_id missing"
        
        # Reject the payment
        reject_resp = requests.post(
            f"{BASE_URL}/api/admin/payments/{payment_proof_id}/reject",
            headers=headers,
            json={"reason": "Test rejection - invalid proof"}
        )
        assert reject_resp.status_code == 200, f"Rejection failed: {reject_resp.text}"
        reject_data = reject_resp.json()
        
        assert reject_data.get("ok") is True, "Rejection should return ok=True"
        
        # Verify order status was reset (not crashed due to invoice=None)
        # Check order directly
        order_status_resp = requests.get(
            f"{BASE_URL}/api/public/order-status/{order_number}",
            params={"email": checkout_payload["email"]}
        )
        assert order_status_resp.status_code == 200, f"Order status check failed: {order_status_resp.text}"
        order_status = order_status_resp.json()
        
        # Order should be back to awaiting payment proof state
        assert order_status.get("payment_status") == "rejected", f"Payment status should be rejected, got: {order_status.get('payment_status')}"
        
        print(f"✓ Admin rejected payment proof for order: {order_number}")
        print(f"  - Order payment_status: {order_status.get('payment_status')}")
        print(f"  - No crash on invoice=None (guest order)")

    # ─── Test 6: Verify payer_name vs customer_name separation ────
    def test_payer_name_customer_name_separation(self, admin_token):
        """Verify payer_name is separate from customer_name in approval flow."""
        unique_id = uuid4().hex[:6]
        customer_name = f"Customer Name {unique_id}"
        payer_name = f"Different Payer {unique_id}"
        
        # Create order
        checkout_payload = {
            "customer_name": customer_name,
            "email": f"separation.test.{unique_id}@example.com",
            "phone": "+255700000005",
            "items": [{"product_id": "prod-sep", "product_name": "Separation Widget", "quantity": 1, "unit_price": 15000}]
        }
        checkout_resp = requests.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert checkout_resp.status_code == 200
        order_data = checkout_resp.json()
        order_number = order_data["order_number"]
        
        # Submit proof with DIFFERENT payer_name
        proof_payload = {
            "order_number": order_number,
            "email": checkout_payload["email"],
            "amount_paid": order_data["total"],
            "payer_name": payer_name,  # Different from customer_name
            "bank_reference": f"SEP-{uuid4().hex[:6].upper()}",
        }
        proof_resp = requests.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert proof_resp.status_code == 200
        
        # Get proof from queue
        headers = {"Authorization": f"Bearer {admin_token}"}
        queue_resp = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        queue = queue_resp.json()
        proof_item = next((x for x in queue if x.get("order_number") == order_number), None)
        
        # Verify queue shows correct separation
        assert proof_item.get("customer_name") == customer_name, "customer_name should be from order"
        assert proof_item.get("payer_name") == payer_name, "payer_name should be from proof submission"
        
        # Approve and verify order has correct fields
        payment_proof_id = proof_item.get("payment_proof_id")
        approve_resp = requests.post(
            f"{BASE_URL}/api/admin/payments/{payment_proof_id}/approve",
            headers=headers,
            json={"approver_role": "admin"}
        )
        assert approve_resp.status_code == 200
        
        order_doc = approve_resp.json().get("order")
        assert order_doc.get("customer_name") == customer_name, "Order customer_name should be preserved"
        assert order_doc.get("payer_name") == payer_name, "Order payer_name should be from proof"
        
        print(f"✓ payer_name ({payer_name}) correctly separated from customer_name ({customer_name})")


class TestAdminPaymentsQueueCount:
    """Test that admin payments queue count includes pending guest proofs."""

    @pytest.fixture(scope="class")
    def admin_token(self):
        resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        return resp.json().get("token")

    def test_queue_includes_pending_status(self, admin_token):
        """Admin queue should include proofs with status='pending' (guest proofs)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a guest order and submit proof
        unique_id = uuid4().hex[:6]
        checkout_resp = requests.post(f"{BASE_URL}/api/public/checkout", json={
            "customer_name": f"Count Test {unique_id}",
            "email": f"count.test.{unique_id}@example.com",
            "phone": "+255700000006",
            "items": [{"product_id": "prod-count", "product_name": "Count Widget", "quantity": 1, "unit_price": 10000}]
        })
        assert checkout_resp.status_code == 200
        order_number = checkout_resp.json()["order_number"]
        
        # Submit proof
        proof_resp = requests.post(f"{BASE_URL}/api/public/payment-proof", json={
            "order_number": order_number,
            "email": f"count.test.{unique_id}@example.com",
            "amount_paid": checkout_resp.json()["total"],
            "payer_name": "Count Payer",
        })
        assert proof_resp.status_code == 200
        
        # Check queue
        queue_resp = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        assert queue_resp.status_code == 200
        queue = queue_resp.json()
        
        # Find our proof
        found = next((x for x in queue if x.get("order_number") == order_number), None)
        assert found is not None, "Guest proof should appear in admin queue"
        assert found.get("status") in ["pending", "uploaded"], f"Status should be pending/uploaded, got: {found.get('status')}"
        
        print(f"✓ Admin queue includes pending guest proof: {order_number}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
