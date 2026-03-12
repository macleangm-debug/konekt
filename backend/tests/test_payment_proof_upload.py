"""
Test Payment Proof Upload Flow and Bank Transfer Submission
Tests for:
- Payment proof upload API - POST /api/uploads/payment-proof
- Bank transfer intent creation
- Bank transfer submission with proof_url and proof_filename
- Admin payments listing and filtering
- Admin verify and reject actions
"""
import pytest
import requests
import os
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def test_order():
    """Create a test order for payment testing"""
    order_payload = {
        "customer_name": "TEST_PaymentProof User",
        "customer_email": "test_payment_proof@example.com",
        "customer_phone": "+255123456789",
        "customer_company": "Test Proof Company",
        "delivery_address": "123 Test Street",
        "city": "Dar es Salaam",
        "country": "Tanzania",
        "notes": "Test order for payment proof testing",
        "line_items": [
            {
                "description": "Test Product for Proof Upload",
                "quantity": 10,
                "unit_price": 5000,
                "total": 50000
            }
        ],
        "subtotal": 50000,
        "tax": 9000,
        "discount": 0,
        "total": 59000
    }
    response = requests.post(f"{BASE_URL}/api/guest/orders", json=order_payload)
    if response.status_code in [200, 201]:
        return response.json()
    pytest.skip(f"Failed to create test order: {response.status_code}")


class TestPaymentProofUpload:
    """Tests for payment proof upload API"""

    def test_upload_endpoint_exists(self):
        """Test that the upload endpoint exists"""
        # Send a request without file to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/uploads/payment-proof",
            data={"payment_id": "test", "customer_email": "test@example.com"}
        )
        # Should return 400 (no file) not 404 (not found)
        assert response.status_code in [400, 422], f"Endpoint should exist but return validation error: {response.status_code}"
        print(f"PASS: Payment proof upload endpoint exists")

    def test_upload_payment_proof_success(self, test_order):
        """Test uploading a payment proof file"""
        # First create a bank transfer intent to get a payment_id
        intent_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/intent",
            json={
                "target_type": "order",
                "target_id": test_order.get("id") or test_order.get("order_id"),
                "customer_name": "TEST_PaymentProof User",
                "customer_email": "test_payment_proof@example.com"
            }
        )
        
        if intent_response.status_code != 200:
            pytest.skip(f"Failed to create bank transfer intent: {intent_response.text}")
        
        payment_data = intent_response.json()
        payment_id = payment_data["payment"]["id"]
        
        # Create a fake image file for testing
        fake_file_content = b"fake image content for testing"
        files = {
            "file": ("test_proof.png", io.BytesIO(fake_file_content), "image/png")
        }
        data = {
            "payment_id": payment_id,
            "customer_email": "test_payment_proof@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/uploads/payment-proof",
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Upload should succeed: {response.status_code} - {response.text}"
        
        result = response.json()
        assert "file" in result, "Response should contain file info"
        assert "url" in result["file"], "Response should contain file URL"
        assert "filename" in result["file"], "Response should contain filename"
        assert result["payment_id"] == payment_id
        print(f"PASS: Payment proof uploaded successfully, URL: {result['file']['url']}")
        
        # Store for later tests
        self.__class__.uploaded_proof_url = result["file"]["url"]
        self.__class__.uploaded_proof_filename = result["file"]["filename"]
        self.__class__.payment_id = payment_id

    def test_upload_requires_file(self):
        """Test that upload endpoint requires a file"""
        response = requests.post(
            f"{BASE_URL}/api/uploads/payment-proof",
            data={
                "payment_id": "test123",
                "customer_email": "test@example.com"
            }
        )
        assert response.status_code in [400, 422], f"Should fail without file: {response.status_code}"
        print("PASS: Upload correctly requires file")

    def test_upload_requires_payment_id(self):
        """Test that upload endpoint requires payment_id"""
        fake_file_content = b"fake image content"
        files = {
            "file": ("test.png", io.BytesIO(fake_file_content), "image/png")
        }
        response = requests.post(
            f"{BASE_URL}/api/uploads/payment-proof",
            files=files,
            data={"customer_email": "test@example.com"}
        )
        assert response.status_code in [400, 422], f"Should fail without payment_id: {response.status_code}"
        print("PASS: Upload correctly requires payment_id")


class TestBankTransferFlow:
    """Tests for bank transfer intent and submission flow"""

    def test_create_bank_transfer_intent(self, test_order):
        """Test creating a bank transfer intent"""
        response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/intent",
            json={
                "target_type": "order",
                "target_id": test_order.get("id") or test_order.get("order_id"),
                "customer_name": "TEST_BankTransfer User",
                "customer_email": "test_banktransfer@example.com"
            }
        )
        
        assert response.status_code == 200, f"Intent creation should succeed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "payment" in data, "Response should contain payment object"
        assert "bank_details" in data, "Response should contain bank_details"
        
        payment = data["payment"]
        assert payment["status"] == "awaiting_customer_payment", f"Status should be awaiting_customer_payment: {payment['status']}"
        assert payment["provider"] == "bank_transfer"
        
        bank_details = data["bank_details"]
        assert "bank_name" in bank_details
        assert "account_number" in bank_details
        assert "reference" in bank_details
        
        print(f"PASS: Bank transfer intent created with reference: {bank_details['reference']}")
        self.__class__.payment_id = payment["id"]
        self.__class__.reference = bank_details["reference"]

    def test_mark_bank_transfer_submitted_with_proof(self, test_order):
        """Test marking bank transfer as submitted with proof URL"""
        # Create a new payment intent first
        intent_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/intent",
            json={
                "target_type": "order",
                "target_id": test_order.get("id") or test_order.get("order_id"),
                "customer_name": "TEST_MarkSubmitted User",
                "customer_email": "test_marksubmitted@example.com"
            }
        )
        
        assert intent_response.status_code == 200, f"Intent failed: {intent_response.text}"
        payment_id = intent_response.json()["payment"]["id"]
        
        # Mark as submitted with proof
        response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/mark-submitted",
            json={
                "payment_id": payment_id,
                "proof_url": "https://example.com/proof.png",
                "proof_filename": "test_proof.png",
                "transaction_reference": "TXN-123456"
            }
        )
        
        assert response.status_code == 200, f"Mark submitted should succeed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data["status"] == "payment_submitted", f"Status should be payment_submitted: {data['status']}"
        print(f"PASS: Bank transfer marked as submitted with proof")
        
        # Store payment_id for admin tests
        self.__class__.submitted_payment_id = payment_id

    def test_mark_bank_transfer_submitted_without_proof(self, test_order):
        """Test marking bank transfer as submitted without proof"""
        # Create a new payment intent
        intent_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/intent",
            json={
                "target_type": "order",
                "target_id": test_order.get("id") or test_order.get("order_id"),
                "customer_name": "TEST_NoProof User",
                "customer_email": "test_noproof@example.com"
            }
        )
        
        assert intent_response.status_code == 200
        payment_id = intent_response.json()["payment"]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/mark-submitted",
            json={
                "payment_id": payment_id,
                "transaction_reference": "TXN-789012"
            }
        )
        
        assert response.status_code == 200, f"Mark submitted without proof should succeed: {response.status_code}"
        print("PASS: Bank transfer submitted without proof (optional proof_url)")

    def test_mark_submitted_invalid_payment_id(self):
        """Test marking submitted with invalid payment ID"""
        response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/mark-submitted",
            json={
                "payment_id": "invalid_id_format",
                "transaction_reference": "TXN-TEST"
            }
        )
        
        assert response.status_code == 400, f"Should fail with invalid ID: {response.status_code}"
        print("PASS: Invalid payment ID correctly rejected")


class TestAdminPaymentsPage:
    """Tests for admin payments listing and actions"""

    def test_list_payments(self, admin_token):
        """Test listing all payments"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"List payments should succeed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of payments"
        print(f"PASS: Admin payments list returns {len(data)} payments")
        
        # Check payment structure
        if len(data) > 0:
            payment = data[0]
            assert "id" in payment, "Payment should have id"
            assert "status" in payment, "Payment should have status"
            assert "provider" in payment, "Payment should have provider"
            print(f"PASS: Payment structure validated - status: {payment['status']}, provider: {payment['provider']}")

    def test_filter_payments_by_status(self, admin_token):
        """Test filtering payments by status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments",
            params={"status": "payment_submitted"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Filter by status should work: {response.status_code}"
        
        data = response.json()
        # All returned payments should have payment_submitted status
        for payment in data:
            assert payment["status"] == "payment_submitted", f"Filtered payment has wrong status: {payment['status']}"
        
        print(f"PASS: Filter by status returns {len(data)} payment_submitted payments")

    def test_get_single_payment(self, admin_token, test_order):
        """Test getting a single payment by ID"""
        # First create a payment
        intent_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/intent",
            json={
                "target_type": "order",
                "target_id": test_order.get("id") or test_order.get("order_id"),
                "customer_name": "TEST_SinglePayment User",
                "customer_email": "test_singlepayment@example.com"
            }
        )
        
        if intent_response.status_code != 200:
            pytest.skip("Failed to create payment for single payment test")
        
        payment_id = intent_response.json()["payment"]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/{payment_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get single payment should succeed: {response.status_code}"
        
        payment = response.json()
        assert payment["id"] == payment_id
        print(f"PASS: Single payment retrieved successfully")

    def test_verify_payment(self, admin_token, test_order):
        """Test admin verifying a payment"""
        # Create and submit a payment for verification
        intent_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/intent",
            json={
                "target_type": "order",
                "target_id": test_order.get("id") or test_order.get("order_id"),
                "customer_name": "TEST_Verify User",
                "customer_email": "test_verify@example.com"
            }
        )
        
        assert intent_response.status_code == 200
        payment_id = intent_response.json()["payment"]["id"]
        
        # Mark as submitted
        submit_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/mark-submitted",
            json={
                "payment_id": payment_id,
                "proof_url": "https://example.com/verify_proof.png",
                "proof_filename": "verify_proof.png"
            }
        )
        assert submit_response.status_code == 200
        
        # Verify the payment
        verify_response = requests.post(
            f"{BASE_URL}/api/admin/payments/{payment_id}/verify",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert verify_response.status_code == 200, f"Verify should succeed: {verify_response.status_code} - {verify_response.text}"
        
        result = verify_response.json()
        assert result["status"] == "paid", f"Status should be paid: {result['status']}"
        print("PASS: Payment verified successfully by admin")
        
        # Verify the payment status was updated
        get_response = requests.get(
            f"{BASE_URL}/api/admin/payments/{payment_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        updated_payment = get_response.json()
        assert updated_payment["status"] == "paid", f"Payment status should be paid after verification"
        print("PASS: Payment status correctly updated to 'paid'")

    def test_reject_payment(self, admin_token, test_order):
        """Test admin rejecting a payment"""
        # Create and submit a payment for rejection
        intent_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/intent",
            json={
                "target_type": "order",
                "target_id": test_order.get("id") or test_order.get("order_id"),
                "customer_name": "TEST_Reject User",
                "customer_email": "test_reject@example.com"
            }
        )
        
        assert intent_response.status_code == 200
        payment_id = intent_response.json()["payment"]["id"]
        
        # Mark as submitted
        submit_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/mark-submitted",
            json={
                "payment_id": payment_id,
                "proof_url": "https://example.com/reject_proof.png"
            }
        )
        assert submit_response.status_code == 200
        
        # Reject the payment
        reject_response = requests.post(
            f"{BASE_URL}/api/admin/payments/{payment_id}/reject",
            params={"reason": "Invalid proof document"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert reject_response.status_code == 200, f"Reject should succeed: {reject_response.status_code} - {reject_response.text}"
        
        result = reject_response.json()
        assert result["status"] == "rejected", f"Status should be rejected: {result['status']}"
        print("PASS: Payment rejected successfully by admin")
        
        # Verify rejection details
        get_response = requests.get(
            f"{BASE_URL}/api/admin/payments/{payment_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        rejected_payment = get_response.json()
        assert rejected_payment["status"] == "rejected"
        assert rejected_payment.get("rejection_reason") == "Invalid proof document"
        print("PASS: Rejection reason correctly stored")


class TestPaymentStatusBadge:
    """Test payment status in orders (for badge display)"""

    def test_order_has_payment_status(self, test_order):
        """Test that orders have payment_status field"""
        order_id = test_order.get("id") or test_order.get("order_id")
        
        response = requests.get(f"{BASE_URL}/api/orders/track/{order_id}")
        
        assert response.status_code == 200, f"Track order should succeed: {response.status_code}"
        
        order = response.json()
        assert "payment_status" in order, "Order should have payment_status field"
        print(f"PASS: Order has payment_status: {order['payment_status']}")

    def test_verified_payment_updates_order_status(self, admin_token, test_order):
        """Test that verifying payment updates order's payment_status"""
        order_id = test_order.get("id") or test_order.get("order_id")
        
        # Create a new intent for this test
        intent_response = requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/intent",
            json={
                "target_type": "order",
                "target_id": order_id,
                "customer_name": "TEST_StatusUpdate User",
                "customer_email": "test_statusupdate@example.com"
            }
        )
        
        if intent_response.status_code != 200:
            pytest.skip("Failed to create payment intent")
        
        payment_id = intent_response.json()["payment"]["id"]
        
        # Submit payment
        requests.post(
            f"{BASE_URL}/api/payments/bank-transfer/mark-submitted",
            json={"payment_id": payment_id, "proof_url": "https://example.com/test.png"}
        )
        
        # Verify payment
        verify_response = requests.post(
            f"{BASE_URL}/api/admin/payments/{payment_id}/verify",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert verify_response.status_code == 200
        
        # Check order's payment_status
        order_response = requests.get(f"{BASE_URL}/api/orders/track/{order_id}")
        assert order_response.status_code == 200
        
        order = order_response.json()
        assert order.get("payment_status") == "paid", f"Order payment_status should be 'paid' after verification: {order.get('payment_status')}"
        print("PASS: Order payment_status correctly updated to 'paid' after verification")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_note(self):
        """Note about cleanup"""
        print("NOTE: Test payments created with 'TEST_' prefix for identification")
        print("PASS: Test suite completed")
