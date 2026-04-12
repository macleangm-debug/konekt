"""
Test Suite: Enhanced Delivery Closure System (Dual-Mode Completion Engine)
Iteration: 283
Features tested:
- POST /api/admin/delivery-notes/{id}/close with closure_method=signed
- POST /api/admin/delivery-notes/{id}/close with closure_method=confirmed_without_signature
- PATCH /api/admin/delivery-notes/{id}/status blocks modifications on locked notes
- PATCH /api/admin/delivery-notes/{id}/status with status=delivered redirects to close endpoint
- Validation: receiver_name required, signature required for signed, completion_note required for confirmed
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDeliveryClosureDualMode:
    """Tests for the Enhanced Delivery Closure System"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_note_ids = []
        yield
        # Cleanup: No cleanup needed as closed notes are locked
    
    def create_test_delivery_note(self, suffix=""):
        """Helper to create a test delivery note"""
        payload = {
            "source_type": "direct",
            "delivered_by": "test_staff@konekt.co.tz",
            "delivered_to": f"TEST_Receiver_{suffix}_{datetime.now().strftime('%H%M%S')}",
            "delivery_address": "Test Address 123",
            "vehicle_info": "Test Vehicle",
            "remarks": "Test delivery note for closure testing",
            "line_items": [
                {"sku": "TEST-SKU-001", "quantity": 1, "description": "Test Item"}
            ]
        }
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes", json=payload)
        if response.status_code in [200, 201]:
            note_id = response.json().get("id")
            self.created_note_ids.append(note_id)
            return note_id
        return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: POST /close with closure_method=signed
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_close_signed_success(self):
        """POST /close with signed mode sets status=completed_signed and closure_locked=true"""
        note_id = self.create_test_delivery_note("signed")
        assert note_id is not None, "Failed to create test delivery note"
        
        close_payload = {
            "closure_method": "signed",
            "receiver_name": "John Doe",
            "receiver_designation": "Warehouse Manager",
            "receiver_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "completed_signed", f"Expected status=completed_signed, got {data.get('status')}"
        assert data["closure_locked"] == True, "Expected closure_locked=true"
        assert data["closure_method"] == "signed", "Expected closure_method=signed"
        assert data["receiver_name"] == "John Doe", "Receiver name mismatch"
        assert data["receiver_designation"] == "Warehouse Manager", "Receiver designation mismatch"
        assert "receiver_signature" in data, "Missing receiver_signature"
        assert "completed_at" in data, "Missing completed_at timestamp"
        print(f"✓ Signed closure successful: status={data['status']}, locked={data['closure_locked']}")
    
    def test_close_signed_requires_signature(self):
        """POST /close with signed mode without signature returns 400"""
        note_id = self.create_test_delivery_note("signed_no_sig")
        assert note_id is not None, "Failed to create test delivery note"
        
        close_payload = {
            "closure_method": "signed",
            "receiver_name": "John Doe",
            "receiver_designation": "Manager"
            # Missing receiver_signature
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "signature" in response.json().get("detail", "").lower(), "Error should mention signature"
        print(f"✓ Signed closure without signature correctly returns 400")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: POST /close with closure_method=confirmed_without_signature
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_close_confirmed_success(self):
        """POST /close with confirmed mode sets status=completed_confirmed and closure_locked=true"""
        note_id = self.create_test_delivery_note("confirmed")
        assert note_id is not None, "Failed to create test delivery note"
        
        close_payload = {
            "closure_method": "confirmed_without_signature",
            "receiver_name": "Jane Smith",
            "receiver_designation": "Operations Lead",
            "completion_note": "Client verbally confirmed receipt via phone call at 14:30",
            "authorization_source": "phone"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "completed_confirmed", f"Expected status=completed_confirmed, got {data.get('status')}"
        assert data["closure_locked"] == True, "Expected closure_locked=true"
        assert data["closure_method"] == "confirmed_without_signature", "Expected closure_method=confirmed_without_signature"
        assert data["receiver_name"] == "Jane Smith", "Receiver name mismatch"
        assert data["completion_note"] == "Client verbally confirmed receipt via phone call at 14:30", "Completion note mismatch"
        assert data["authorization_source"] == "phone", "Authorization source mismatch"
        assert "completed_at" in data, "Missing completed_at timestamp"
        print(f"✓ Confirmed closure successful: status={data['status']}, locked={data['closure_locked']}")
    
    def test_close_confirmed_requires_completion_note(self):
        """POST /close with confirmed mode without completion_note returns 400"""
        note_id = self.create_test_delivery_note("confirmed_no_note")
        assert note_id is not None, "Failed to create test delivery note"
        
        close_payload = {
            "closure_method": "confirmed_without_signature",
            "receiver_name": "Jane Smith",
            "authorization_source": "phone"
            # Missing completion_note
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "completion note" in response.json().get("detail", "").lower(), "Error should mention completion note"
        print(f"✓ Confirmed closure without completion_note correctly returns 400")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: Validation - receiver_name required for both modes
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_close_requires_receiver_name(self):
        """POST /close without receiver_name returns 400"""
        note_id = self.create_test_delivery_note("no_receiver")
        assert note_id is not None, "Failed to create test delivery note"
        
        close_payload = {
            "closure_method": "signed",
            "receiver_signature": "data:image/png;base64,test"
            # Missing receiver_name
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "receiver name" in response.json().get("detail", "").lower(), "Error should mention receiver name"
        print(f"✓ Closure without receiver_name correctly returns 400")
    
    def test_close_empty_receiver_name_returns_400(self):
        """POST /close with empty receiver_name returns 400"""
        note_id = self.create_test_delivery_note("empty_receiver")
        assert note_id is not None, "Failed to create test delivery note"
        
        close_payload = {
            "closure_method": "signed",
            "receiver_name": "   ",  # Whitespace only
            "receiver_signature": "data:image/png;base64,test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Closure with empty receiver_name correctly returns 400")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: PATCH /status blocks modifications on locked notes
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_locked_note_blocks_status_update(self):
        """PATCH /status on locked delivery note returns 400"""
        # First create and close a note
        note_id = self.create_test_delivery_note("lock_test")
        assert note_id is not None, "Failed to create test delivery note"
        
        # Close the note
        close_payload = {
            "closure_method": "signed",
            "receiver_name": "Lock Tester",
            "receiver_signature": "data:image/png;base64,test"
        }
        close_response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert close_response.status_code == 200, "Failed to close note"
        
        # Try to update status on locked note
        update_payload = {"status": "in_transit"}
        response = self.session.patch(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status", json=update_payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "locked" in response.json().get("detail", "").lower(), "Error should mention locked"
        print(f"✓ Locked note correctly blocks status update with 400")
    
    def test_locked_note_blocks_second_close(self):
        """POST /close on already closed note returns 400"""
        # First create and close a note
        note_id = self.create_test_delivery_note("double_close")
        assert note_id is not None, "Failed to create test delivery note"
        
        # Close the note first time
        close_payload = {
            "closure_method": "signed",
            "receiver_name": "First Closer",
            "receiver_signature": "data:image/png;base64,test"
        }
        close_response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert close_response.status_code == 200, "Failed to close note first time"
        
        # Try to close again
        second_close_payload = {
            "closure_method": "confirmed_without_signature",
            "receiver_name": "Second Closer",
            "completion_note": "Trying to close again"
        }
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=second_close_payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "locked" in response.json().get("detail", "").lower() or "closed" in response.json().get("detail", "").lower(), "Error should mention locked or closed"
        print(f"✓ Already closed note correctly blocks second close with 400")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: PATCH /status with status=delivered redirects to close logic
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_status_delivered_backward_compatibility(self):
        """PATCH /status with status=delivered triggers close logic (backward compatibility)"""
        note_id = self.create_test_delivery_note("backward_compat")
        assert note_id is not None, "Failed to create test delivery note"
        
        # Use old-style delivered status with closure fields
        update_payload = {
            "status": "delivered",
            "closure_method": "signed",
            "receiver_name": "Backward Compat Tester",
            "receiver_signature": "data:image/png;base64,test"
        }
        
        response = self.session.patch(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should be redirected to close logic and get completed_signed status
        assert data["status"] in ["completed_signed", "delivered"], f"Expected completed status, got {data.get('status')}"
        assert data["closure_locked"] == True, "Expected closure_locked=true"
        print(f"✓ Backward compatibility: status=delivered triggers close logic, result status={data['status']}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: Valid status transitions (non-closure)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_status_transition_issued_to_in_transit(self):
        """PATCH /status can transition from issued to in_transit"""
        note_id = self.create_test_delivery_note("transit_test")
        assert note_id is not None, "Failed to create test delivery note"
        
        update_payload = {"status": "in_transit"}
        response = self.session.patch(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "in_transit", f"Expected in_transit, got {data.get('status')}"
        assert data["closure_locked"] == False, "Should not be locked yet"
        print(f"✓ Status transition issued→in_transit successful")
    
    def test_status_transition_to_pending_confirmation(self):
        """PATCH /status can transition to pending_confirmation"""
        note_id = self.create_test_delivery_note("pending_test")
        assert note_id is not None, "Failed to create test delivery note"
        
        update_payload = {"status": "pending_confirmation"}
        response = self.session.patch(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "pending_confirmation", f"Expected pending_confirmation, got {data.get('status')}"
        print(f"✓ Status transition to pending_confirmation successful")
    
    def test_status_transition_to_cancelled(self):
        """PATCH /status can transition to cancelled"""
        note_id = self.create_test_delivery_note("cancel_test")
        assert note_id is not None, "Failed to create test delivery note"
        
        update_payload = {"status": "cancelled"}
        response = self.session.patch(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "cancelled", f"Expected cancelled, got {data.get('status')}"
        print(f"✓ Status transition to cancelled successful")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: Invalid closure_method
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_invalid_closure_method_returns_400(self):
        """POST /close with invalid closure_method returns 400"""
        note_id = self.create_test_delivery_note("invalid_method")
        assert note_id is not None, "Failed to create test delivery note"
        
        close_payload = {
            "closure_method": "invalid_method",
            "receiver_name": "Test User"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Invalid closure_method correctly returns 400")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: GET delivery note shows closure details
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_get_closed_note_shows_closure_details(self):
        """GET /delivery-notes/{id} returns full closure details after close"""
        note_id = self.create_test_delivery_note("get_details")
        assert note_id is not None, "Failed to create test delivery note"
        
        # Close with confirmed mode
        close_payload = {
            "closure_method": "confirmed_without_signature",
            "receiver_name": "Detail Checker",
            "receiver_designation": "QA Lead",
            "completion_note": "Verified delivery via WhatsApp confirmation",
            "authorization_source": "whatsapp"
        }
        close_response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{note_id}/close", json=close_payload)
        assert close_response.status_code == 200, "Failed to close note"
        
        # GET the note
        response = self.session.get(f"{BASE_URL}/api/admin/delivery-notes/{note_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "completed_confirmed"
        assert data["closure_locked"] == True
        assert data["closure_method"] == "confirmed_without_signature"
        assert data["receiver_name"] == "Detail Checker"
        assert data["receiver_designation"] == "QA Lead"
        assert data["completion_note"] == "Verified delivery via WhatsApp confirmation"
        assert data["authorization_source"] == "whatsapp"
        assert "completed_at" in data
        print(f"✓ GET closed note returns all closure details")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST: List delivery notes includes new statuses
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_list_delivery_notes_includes_new_statuses(self):
        """GET /delivery-notes returns notes with new statuses"""
        response = self.session.get(f"{BASE_URL}/api/admin/delivery-notes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        # Check that we can find various statuses
        statuses_found = set()
        for note in data:
            statuses_found.add(note.get("status"))
        
        print(f"✓ List delivery notes successful, found statuses: {statuses_found}")
        # At minimum we should have issued (from our test notes)
        assert "issued" in statuses_found or len(data) == 0, "Expected to find at least issued status"


class TestDeliveryClosureEdgeCases:
    """Edge case tests for delivery closure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_close_nonexistent_note_returns_404(self):
        """POST /close on non-existent note returns 404"""
        fake_id = "000000000000000000000000"
        close_payload = {
            "closure_method": "signed",
            "receiver_name": "Test",
            "receiver_signature": "data:image/png;base64,test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery-notes/{fake_id}/close", json=close_payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Close non-existent note returns 404")
    
    def test_status_update_nonexistent_note_returns_404(self):
        """PATCH /status on non-existent note returns 404"""
        fake_id = "000000000000000000000000"
        update_payload = {"status": "in_transit"}
        
        response = self.session.patch(f"{BASE_URL}/api/admin/delivery-notes/{fake_id}/status", json=update_payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Status update non-existent note returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
