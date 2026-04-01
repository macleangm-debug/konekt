"""
Pack 4 - Finance + Vendor Scheduling & Assignment Tests
Tests:
1. Payment queue status filtering (all/uploaded/approved/rejected)
2. Payment queue enriched fields (customer_name, payer_name, contact_phone, etc.)
3. Payment detail endpoint with customer_contact and approval_history
4. Payment approval flow (no regression)
5. Vendor ETA endpoint
6. Internal buffer date endpoints
7. Delivery dates endpoint
8. Vendor assignment suggestion endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
VENDOR_EMAIL = "demo.partner@konekt.com"
VENDOR_PASSWORD = "Partner123!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def vendor_token():
    """Get vendor auth token"""
    resp = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        # Partner auth returns access_token, not token
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Vendor login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def sales_token():
    """Get sales auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Sales login failed: {resp.status_code} - {resp.text}")


class TestPaymentQueueStatusFiltering:
    """Test payment queue status filtering - Pack 4 feature"""

    def test_payment_queue_all_status(self, admin_token):
        """GET /api/admin/payments/queue?status=all returns ALL payments"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        # Should include all statuses
        print(f"All payments count: {len(data)}")

    def test_payment_queue_uploaded_status(self, admin_token):
        """GET /api/admin/payments/queue?status=uploaded returns only pending/uploaded"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=uploaded",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        # All items should have status=uploaded
        for item in data:
            assert item.get("status") == "uploaded", f"Expected uploaded status, got {item.get('status')}"
        print(f"Uploaded payments count: {len(data)}")

    def test_payment_queue_approved_status(self, admin_token):
        """GET /api/admin/payments/queue?status=approved returns only approved"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=approved",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        # All items should have status=approved
        for item in data:
            assert item.get("status") == "approved", f"Expected approved status, got {item.get('status')}"
        print(f"Approved payments count: {len(data)}")

    def test_payment_queue_rejected_status(self, admin_token):
        """GET /api/admin/payments/queue?status=rejected returns only rejected"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=rejected",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        # All items should have status=rejected
        for item in data:
            assert item.get("status") == "rejected", f"Expected rejected status, got {item.get('status')}"
        print(f"Rejected payments count: {len(data)}")


class TestPaymentQueueEnrichedFields:
    """Test payment queue returns enriched fields - Pack 4 feature"""

    def test_payment_queue_has_enriched_fields(self, admin_token):
        """Each payment includes customer_name, payer_name, contact_phone, etc."""
        resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if len(data) == 0:
            pytest.skip("No payments in queue to test enriched fields")
        
        # Check first payment has all required fields
        payment = data[0]
        required_fields = [
            "payment_proof_id", "payment_id", "invoice_id", "invoice_number",
            "customer_name", "payer_name", "contact_phone", "company_name",
            "payment_reference", "approved_by", "approved_at", "rejection_reason",
            "amount_paid", "status", "created_at"
        ]
        
        for field in required_fields:
            assert field in payment, f"Missing field: {field}"
        
        print(f"Payment enriched fields verified: {list(payment.keys())}")


class TestPaymentDetailEndpoint:
    """Test payment detail endpoint - Pack 4 feature"""

    def test_payment_detail_returns_customer_contact_and_history(self, admin_token):
        """GET /api/admin/payments/{id} returns customer_contact and approval_history"""
        # First get a payment from queue
        queue_resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert queue_resp.status_code == 200
        payments = queue_resp.json()
        
        if len(payments) == 0:
            pytest.skip("No payments to test detail endpoint")
        
        # Find a payment with a valid payment_proof_id
        payment_proof_id = None
        for p in payments:
            if p.get("payment_proof_id"):
                payment_proof_id = p.get("payment_proof_id")
                break
        
        if not payment_proof_id:
            pytest.skip("No payments with payment_proof_id to test detail endpoint")
        
        # Get payment detail
        resp = requests.get(
            f"{BASE_URL}/api/admin/payments/{payment_proof_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Check for customer_contact
        assert "customer_contact" in data, "Missing customer_contact field"
        assert isinstance(data["customer_contact"], dict), "customer_contact should be dict"
        
        # Check for approval_history
        assert "approval_history" in data, "Missing approval_history field"
        assert isinstance(data["approval_history"], list), "approval_history should be list"
        
        # Check proof, payment, invoice are present
        assert "proof" in data, "Missing proof field"
        assert "payment" in data, "Missing payment field"
        assert "invoice" in data, "Missing invoice field"
        
        print(f"Payment detail verified with customer_contact: {data['customer_contact']}")
        print(f"Approval history entries: {len(data['approval_history'])}")


class TestPaymentApprovalFlow:
    """Test payment approval flow - no regression"""

    def test_payment_approval_endpoint_exists(self, admin_token):
        """POST /api/admin/payments/{id}/approve endpoint exists"""
        # Get a payment to test (we won't actually approve to avoid side effects)
        queue_resp = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=uploaded",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert queue_resp.status_code == 200
        
        # Just verify the endpoint structure is correct
        # We test with a fake ID to check 404 handling
        resp = requests.post(
            f"{BASE_URL}/api/admin/payments/fake-id-12345/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"approver_role": "admin"}
        )
        # Should return 404 for non-existent payment, not 500
        assert resp.status_code in [404, 400], f"Expected 404/400, got {resp.status_code}"
        print("Payment approval endpoint structure verified")


class TestVendorEtaEndpoint:
    """Test vendor ETA endpoint - Pack 4 feature"""

    def test_vendor_eta_endpoint_exists(self, vendor_token):
        """POST /api/vendor/orders/{id}/eta endpoint exists"""
        # Test with fake ID to verify endpoint structure
        resp = requests.post(
            f"{BASE_URL}/api/vendor/orders/fake-vendor-order-id/eta",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={"promised_date": "2026-02-15"}
        )
        # Should return 404 for non-existent order, not 500
        assert resp.status_code in [404, 400], f"Expected 404/400, got {resp.status_code}"
        print("Vendor ETA endpoint structure verified")

    def test_vendor_eta_requires_promised_date(self, vendor_token):
        """POST /api/vendor/orders/{id}/eta requires promised_date"""
        resp = requests.post(
            f"{BASE_URL}/api/vendor/orders/fake-vendor-order-id/eta",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={}  # Missing promised_date
        )
        # Should return 400 for missing field or 404 for non-existent order
        assert resp.status_code in [400, 404], f"Expected 400/404, got {resp.status_code}"
        print("Vendor ETA validation verified")


class TestInternalBufferEndpoints:
    """Test internal buffer date endpoints - Pack 4 feature"""

    def test_internal_buffer_endpoint_exists(self, sales_token):
        """POST /api/sales/delivery/{id}/internal-buffer endpoint exists"""
        resp = requests.post(
            f"{BASE_URL}/api/sales/delivery/fake-vendor-order-id/internal-buffer",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"internal_target_date": "2026-02-17"}
        )
        # Should return 404 for non-existent order, not 500
        assert resp.status_code in [404, 400], f"Expected 404/400, got {resp.status_code}"
        print("Internal buffer endpoint structure verified")

    def test_delivery_dates_endpoint_exists(self, sales_token):
        """GET /api/sales/delivery/{id}/dates endpoint exists"""
        resp = requests.get(
            f"{BASE_URL}/api/sales/delivery/fake-vendor-order-id/dates",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        # Should return 404 for non-existent order, not 500
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Delivery dates endpoint structure verified")


class TestVendorAssignmentEndpoint:
    """Test vendor assignment suggestion endpoint - Pack 4 feature"""

    def test_vendor_assignment_suggest_endpoint(self, admin_token):
        """GET /api/admin/vendor-assignment/suggest returns ranked candidates"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendor-assignment/suggest",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Should have candidates key
        assert "candidates" in data, "Missing candidates field"
        assert isinstance(data["candidates"], list), "candidates should be list"
        
        # Note: candidates may be empty if no vendor users exist - this is expected
        print(f"Vendor candidates returned: {len(data['candidates'])}")
        
        # If candidates exist, verify structure
        if len(data["candidates"]) > 0:
            candidate = data["candidates"][0]
            expected_fields = ["vendor_id", "vendor_name", "active_orders", "score"]
            for field in expected_fields:
                assert field in candidate, f"Candidate missing field: {field}"

    def test_vendor_assignment_with_capabilities_filter(self, admin_token):
        """GET /api/admin/vendor-assignment/suggest?capabilities=printing returns filtered"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendor-assignment/suggest?capabilities=printing,branding",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "candidates" in data
        print(f"Filtered vendor candidates: {len(data['candidates'])}")


class TestVendorOrdersWithEta:
    """Test vendor orders include ETA fields"""

    def test_vendor_orders_list(self, vendor_token):
        """GET /api/vendor/orders returns orders list"""
        resp = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Vendor orders count: {len(data)}")


class TestSalesDeliveryAccess:
    """Test sales can access delivery endpoints"""

    def test_sales_logistics_status_endpoint(self, sales_token):
        """GET /api/sales/delivery/{id}/logistics-status endpoint exists"""
        resp = requests.get(
            f"{BASE_URL}/api/sales/delivery/fake-vendor-order-id/logistics-status",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        # Should return 404 for non-existent order
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Sales logistics status endpoint verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
