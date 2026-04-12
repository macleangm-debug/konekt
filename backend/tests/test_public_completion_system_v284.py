"""
Test Public Completion System — Public-facing order/delivery confirmation flow
Tests: Token-based access, Phone lookup, Order number lookup, Public close endpoint
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for creating test data
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestPublicCompletionSystem:
    """Public Completion API tests — no auth required for public endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and get admin token for creating test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin to create test data
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.admin_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        else:
            pytest.skip("Admin login failed - cannot create test data")
    
    def _create_test_delivery_note(self, phone="255712345678", customer_name="TEST_PublicCompletion"):
        """Helper to create a delivery note for testing"""
        payload = {
            "source_type": "direct",
            "customer_name": customer_name,
            "customer_phone": phone,
            "customer_company": "Test Company",
            "delivered_to": "Test Receiver",
            "delivery_address": "123 Test Street, Dar es Salaam",
            "line_items": [
                {"product_name": "Test Product", "quantity": 2, "sku": "TEST-SKU-001"}
            ],
            "delivered_by": "test@konekt.co.tz"
        }
        resp = self.session.post(f"{BASE_URL}/api/admin/delivery-notes", json=payload, headers=self.admin_headers)
        return resp
    
    # ─── Token-based Access Tests ───
    def test_token_lookup_valid_token(self):
        """GET /api/public/completion/token/{token} resolves delivery note by confirmation_token"""
        # First create a delivery note
        create_resp = self._create_test_delivery_note(phone="255711111111", customer_name="TEST_TokenLookup")
        assert create_resp.status_code == 200, f"Failed to create DN: {create_resp.text}"
        dn = create_resp.json()
        dn_id = dn["id"]
        
        # Get the confirmation token from the created note (need to fetch it via admin endpoint)
        get_resp = self.session.get(f"{BASE_URL}/api/admin/delivery-notes/{dn_id}", headers=self.admin_headers)
        assert get_resp.status_code == 200
        dn_full = get_resp.json()
        token = dn_full.get("confirmation_token")
        assert token, "Delivery note should have confirmation_token"
        
        # Now test public token lookup (no auth required)
        public_resp = self.session.get(f"{BASE_URL}/api/public/completion/token/{token}")
        assert public_resp.status_code == 200, f"Token lookup failed: {public_resp.text}"
        
        data = public_resp.json()
        assert data["id"] == dn_id
        assert data["note_number"] == dn["note_number"]
        assert data["customer_name"] == "TEST_TokenLookup"
        assert "confirmation_token" not in data, "Token should not be exposed in public response"
        print(f"✓ Token lookup returned DN: {data['note_number']}")
    
    def test_token_lookup_invalid_token(self):
        """GET /api/public/completion/token/{token} returns 404 for invalid token"""
        resp = self.session.get(f"{BASE_URL}/api/public/completion/token/invalid-token-xyz123")
        assert resp.status_code == 404
        assert "invalid" in resp.json().get("detail", "").lower() or "expired" in resp.json().get("detail", "").lower()
        print("✓ Invalid token correctly returns 404")
    
    # ─── Phone Lookup Tests ───
    def test_phone_lookup_finds_pending_notes(self):
        """GET /api/public/completion/phone/{phone} returns pending delivery notes"""
        test_phone = "255722222222"
        
        # Create a delivery note with this phone
        create_resp = self._create_test_delivery_note(phone=test_phone, customer_name="TEST_PhoneLookup")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Lookup by phone (no auth required)
        public_resp = self.session.get(f"{BASE_URL}/api/public/completion/phone/{test_phone}")
        assert public_resp.status_code == 200, f"Phone lookup failed: {public_resp.text}"
        
        data = public_resp.json()
        assert "delivery_notes" in data
        assert "orders" in data
        
        # Should find our created note
        found = any(d["id"] == dn["id"] for d in data["delivery_notes"])
        assert found, f"Created DN {dn['id']} not found in phone lookup results"
        print(f"✓ Phone lookup found {len(data['delivery_notes'])} delivery notes")
    
    def test_phone_lookup_matches_last_9_digits(self):
        """Phone lookup matches last 9 digits of phone number"""
        test_phone = "255733333333"
        
        create_resp = self._create_test_delivery_note(phone=test_phone, customer_name="TEST_PhoneDigits")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Lookup with just last 9 digits
        public_resp = self.session.get(f"{BASE_URL}/api/public/completion/phone/733333333")
        assert public_resp.status_code == 200
        
        data = public_resp.json()
        found = any(d["id"] == dn["id"] for d in data["delivery_notes"])
        assert found, "Should find DN by last 9 digits"
        print("✓ Phone lookup correctly matches last 9 digits")
    
    def test_phone_lookup_excludes_locked_notes(self):
        """Phone lookup excludes already closed/locked delivery notes"""
        test_phone = "255744444444"
        
        # Create and close a delivery note
        create_resp = self._create_test_delivery_note(phone=test_phone, customer_name="TEST_LockedExclude")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Close it via public endpoint
        close_resp = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "signed",
            "receiver_name": "Test Receiver",
            "receiver_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        })
        assert close_resp.status_code == 200
        
        # Now lookup by phone - should NOT find the locked note
        public_resp = self.session.get(f"{BASE_URL}/api/public/completion/phone/{test_phone}")
        assert public_resp.status_code == 200
        
        data = public_resp.json()
        found = any(d["id"] == dn["id"] for d in data["delivery_notes"])
        assert not found, "Locked DN should not appear in phone lookup"
        print("✓ Phone lookup correctly excludes locked notes")
    
    # ─── Order Number Lookup Tests ───
    def test_order_lookup_finds_order_and_dns(self):
        """GET /api/public/completion/order/{order_number} returns order and linked delivery notes"""
        # First create an order
        order_payload = {
            "customer_name": "TEST_OrderLookup",
            "customer_email": "test@example.com",
            "customer_phone": "255755555555",
            "items": [{"product_name": "Test Item", "quantity": 1, "unit_price": 10000, "subtotal": 10000}],
            "total": 10000,
            "currency": "TZS"
        }
        order_resp = self.session.post(f"{BASE_URL}/api/orders", json=order_payload, headers=self.admin_headers)
        if order_resp.status_code not in [200, 201]:
            pytest.skip(f"Could not create order: {order_resp.text}")
        
        order = order_resp.json()
        order_number = order.get("order_number") or order.get("id")
        
        # Create a delivery note linked to this order
        dn_payload = {
            "source_type": "order",
            "source_id": order.get("id"),
            "customer_name": "TEST_OrderLookup",
            "customer_phone": "255755555555",
            "delivered_to": "Test Receiver",
            "delivery_address": "Test Address"
        }
        dn_resp = self.session.post(f"{BASE_URL}/api/admin/delivery-notes", json=dn_payload, headers=self.admin_headers)
        assert dn_resp.status_code == 200
        
        # Lookup by order number (no auth required)
        public_resp = self.session.get(f"{BASE_URL}/api/public/completion/order/{order_number}")
        assert public_resp.status_code == 200, f"Order lookup failed: {public_resp.text}"
        
        data = public_resp.json()
        assert "order" in data
        assert "delivery_notes" in data
        assert data["order"]["order_number"] == order_number or data["order"]["id"] == order.get("id")
        print(f"✓ Order lookup found order and {len(data['delivery_notes'])} delivery notes")
    
    def test_order_lookup_not_found(self):
        """GET /api/public/completion/order/{order_number} returns 404 for invalid order"""
        resp = self.session.get(f"{BASE_URL}/api/public/completion/order/INVALID-ORDER-12345")
        assert resp.status_code == 404
        assert "not found" in resp.json().get("detail", "").lower()
        print("✓ Invalid order number correctly returns 404")
    
    # ─── Public Close Endpoint Tests ───
    def test_public_close_signed_mode(self):
        """POST /api/public/completion/close/{dn_id} with closure_method=signed requires signature"""
        create_resp = self._create_test_delivery_note(phone="255766666666", customer_name="TEST_CloseSigned")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Close with signed mode
        close_resp = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "signed",
            "receiver_name": "John Doe",
            "receiver_designation": "Warehouse Manager",
            "receiver_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        })
        assert close_resp.status_code == 200, f"Close failed: {close_resp.text}"
        
        result = close_resp.json()
        assert result["status"] == "completed_signed"
        assert result["closure_locked"] == True
        assert result["receiver_name"] == "John Doe"
        assert result["closure_method"] == "signed"
        print("✓ Public close with signed mode works correctly")
    
    def test_public_close_signed_requires_signature(self):
        """POST /api/public/completion/close/{dn_id} signed mode requires signature"""
        create_resp = self._create_test_delivery_note(phone="255777777777", customer_name="TEST_NoSig")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Try to close without signature
        close_resp = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "signed",
            "receiver_name": "John Doe"
            # Missing receiver_signature
        })
        assert close_resp.status_code == 400
        assert "signature" in close_resp.json().get("detail", "").lower()
        print("✓ Signed mode correctly requires signature")
    
    def test_public_close_confirmed_mode(self):
        """POST /api/public/completion/close/{dn_id} with closure_method=confirmed_without_signature"""
        create_resp = self._create_test_delivery_note(phone="255788888888", customer_name="TEST_CloseConfirmed")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Close with confirmed mode
        close_resp = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "confirmed_without_signature",
            "receiver_name": "Jane Smith",
            "receiver_designation": "Store Manager",
            "completion_note": "Client confirmed receipt via phone call",
            "authorization_source": "phone"
        })
        assert close_resp.status_code == 200, f"Close failed: {close_resp.text}"
        
        result = close_resp.json()
        assert result["status"] == "completed_confirmed"
        assert result["closure_locked"] == True
        assert result["receiver_name"] == "Jane Smith"
        assert result["closure_method"] == "confirmed_without_signature"
        print("✓ Public close with confirmed mode works correctly")
    
    def test_public_close_confirmed_requires_note(self):
        """POST /api/public/completion/close/{dn_id} confirmed mode requires completion_note"""
        create_resp = self._create_test_delivery_note(phone="255799999999", customer_name="TEST_NoNote")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Try to close without completion note
        close_resp = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "confirmed_without_signature",
            "receiver_name": "Jane Smith"
            # Missing completion_note
        })
        assert close_resp.status_code == 400
        assert "note" in close_resp.json().get("detail", "").lower()
        print("✓ Confirmed mode correctly requires completion note")
    
    def test_public_close_requires_receiver_name(self):
        """POST /api/public/completion/close/{dn_id} requires receiver_name"""
        create_resp = self._create_test_delivery_note(phone="255700000001", customer_name="TEST_NoName")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Try to close without receiver name
        close_resp = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "signed",
            "receiver_signature": "data:image/png;base64,test"
            # Missing receiver_name
        })
        assert close_resp.status_code == 400
        assert "receiver" in close_resp.json().get("detail", "").lower() or "name" in close_resp.json().get("detail", "").lower()
        print("✓ Close correctly requires receiver name")
    
    def test_public_close_blocks_already_locked(self):
        """POST /api/public/completion/close/{dn_id} blocks already-locked delivery notes"""
        create_resp = self._create_test_delivery_note(phone="255700000002", customer_name="TEST_AlreadyLocked")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        # Close it first
        close_resp = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "signed",
            "receiver_name": "First Closer",
            "receiver_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        })
        assert close_resp.status_code == 200
        
        # Try to close again
        second_close = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "signed",
            "receiver_name": "Second Closer",
            "receiver_signature": "data:image/png;base64,test"
        })
        assert second_close.status_code == 400
        assert "locked" in second_close.json().get("detail", "").lower() or "closed" in second_close.json().get("detail", "").lower()
        print("✓ Already locked notes correctly blocked from re-closing")
    
    def test_public_close_invalid_dn_id(self):
        """POST /api/public/completion/close/{dn_id} returns 404 for invalid ID"""
        resp = self.session.post(f"{BASE_URL}/api/public/completion/close/invalid-id-123", json={
            "closure_method": "signed",
            "receiver_name": "Test",
            "receiver_signature": "data:image/png;base64,test"
        })
        assert resp.status_code == 404
        print("✓ Invalid DN ID correctly returns 404")
    
    def test_public_close_invalid_closure_method(self):
        """POST /api/public/completion/close/{dn_id} rejects invalid closure_method"""
        create_resp = self._create_test_delivery_note(phone="255700000003", customer_name="TEST_InvalidMethod")
        assert create_resp.status_code == 200
        dn = create_resp.json()
        
        resp = self.session.post(f"{BASE_URL}/api/public/completion/close/{dn['id']}", json={
            "closure_method": "invalid_method",
            "receiver_name": "Test"
        })
        assert resp.status_code == 400
        assert "closure" in resp.json().get("detail", "").lower() or "method" in resp.json().get("detail", "").lower()
        print("✓ Invalid closure method correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
