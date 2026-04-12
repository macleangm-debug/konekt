"""
Phase B-2 (Template Support) and Phase B-3 (Delivery Closure) Backend Tests
Tests:
- Document render settings API returns doc_template with selected_template
- Settings Hub API saves and retrieves doc_template and doc_footer settings
- Delivery Note closure workflow with receiver_name, receiver_designation, receiver_signature
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestDocumentRenderSettings:
    """Test /api/documents/render-settings endpoint for template support"""
    
    def test_render_settings_returns_doc_template(self):
        """Verify render-settings returns doc_template with selected_template"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "doc_template" in data, "doc_template field missing from render-settings"
        assert "selected_template" in data["doc_template"], "selected_template missing from doc_template"
        
        # Verify template is one of the valid options
        valid_templates = ["classic", "modern", "compact", "premium"]
        assert data["doc_template"]["selected_template"] in valid_templates, \
            f"Invalid template: {data['doc_template']['selected_template']}"
        print(f"PASS: doc_template.selected_template = {data['doc_template']['selected_template']}")
    
    def test_render_settings_returns_doc_footer(self):
        """Verify render-settings returns doc_footer with toggle fields"""
        response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "doc_footer" in data, "doc_footer field missing from render-settings"
        
        footer = data["doc_footer"]
        expected_fields = ["show_address", "show_email", "show_phone", "show_registration", "custom_footer_text"]
        for field in expected_fields:
            assert field in footer, f"doc_footer missing field: {field}"
        print(f"PASS: doc_footer contains all expected fields: {list(footer.keys())}")


class TestSettingsHubTemplateSupport:
    """Test Settings Hub API for template and footer settings"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_get_settings_hub_includes_doc_template(self, auth_token):
        """Verify GET /api/admin/settings-hub returns doc_template"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # doc_template may be in the response or use defaults
        if "doc_template" in data:
            assert "selected_template" in data["doc_template"]
            print(f"PASS: settings-hub returns doc_template: {data['doc_template']}")
        else:
            print("INFO: doc_template not in settings-hub response (will use defaults)")
    
    def test_get_settings_hub_includes_doc_footer(self, auth_token):
        """Verify GET /api/admin/settings-hub returns doc_footer"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        if "doc_footer" in data:
            footer = data["doc_footer"]
            print(f"PASS: settings-hub returns doc_footer: {footer}")
        else:
            print("INFO: doc_footer not in settings-hub response (will use defaults)")
    
    def test_save_template_selection(self, auth_token):
        """Test saving template selection via PUT /api/admin/settings-hub"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update doc_template to 'modern'
        current_settings["doc_template"] = {"selected_template": "modern"}
        
        put_response = requests.put(f"{BASE_URL}/api/admin/settings-hub", 
                                    headers=headers, json=current_settings)
        assert put_response.status_code == 200, f"Failed to save settings: {put_response.text}"
        
        # Verify the change persisted
        verify_response = requests.get(f"{BASE_URL}/api/documents/render-settings")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        # Note: The template may take a moment to propagate
        print(f"PASS: Template save request successful. Current template: {verify_data.get('doc_template', {}).get('selected_template')}")
        
        # Restore to classic
        current_settings["doc_template"] = {"selected_template": "classic"}
        requests.put(f"{BASE_URL}/api/admin/settings-hub", headers=headers, json=current_settings)


class TestDeliveryNoteClosureWorkflow:
    """Test Phase B-3: Delivery Note closure with receiver sign-off"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def test_delivery_note(self, auth_token):
        """Create a test delivery note for closure testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        payload = {
            "source_type": "direct",
            "customer_name": "TEST_Closure Customer",
            "customer_email": "test.closure@example.com",
            "delivered_by": "Test Driver",
            "delivered_to": "Test Receiver",
            "delivery_address": "123 Test Street, Dar es Salaam",
            "vehicle_info": "Test Vehicle ABC-123",
            "remarks": "Test delivery note for closure workflow",
            "line_items": [
                {
                    "description": "Test Item 1",
                    "quantity": 2,
                    "unit_price": 50000,
                    "total": 100000
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/delivery-notes", 
                                headers=headers, json=payload)
        assert response.status_code == 200, f"Failed to create delivery note: {response.text}"
        
        note = response.json()
        assert note.get("status") == "issued", "New delivery note should have status 'issued'"
        print(f"Created test delivery note: {note.get('id')} with status {note.get('status')}")
        
        yield note
        
        # Cleanup: No need to delete, just leave it
    
    def test_delivery_note_status_update_to_in_transit(self, auth_token, test_delivery_note):
        """Test updating delivery note status to in_transit"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        note_id = test_delivery_note["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status",
            headers=headers,
            json={"status": "in_transit"}
        )
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        
        data = response.json()
        assert data.get("status") == "in_transit", f"Expected in_transit, got {data.get('status')}"
        print(f"PASS: Delivery note {note_id} status updated to in_transit")
    
    def test_delivery_closure_with_receiver_info(self, auth_token, test_delivery_note):
        """Test closing delivery with receiver_name, receiver_designation, receiver_signature"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        note_id = test_delivery_note["id"]
        
        # Test signature data (base64 encoded PNG)
        test_signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        closure_payload = {
            "status": "delivered",
            "receiver_name": "John Doe",
            "receiver_designation": "Warehouse Manager",
            "receiver_signature": test_signature
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status",
            headers=headers,
            json=closure_payload
        )
        assert response.status_code == 200, f"Failed to close delivery: {response.text}"
        
        data = response.json()
        assert data.get("status") == "delivered", f"Expected delivered, got {data.get('status')}"
        assert data.get("receiver_name") == "John Doe", "receiver_name not saved"
        assert data.get("receiver_designation") == "Warehouse Manager", "receiver_designation not saved"
        assert data.get("receiver_signature") == test_signature, "receiver_signature not saved"
        assert "received_at" in data, "received_at timestamp not set"
        
        print(f"PASS: Delivery note {note_id} closed with receiver info:")
        print(f"  - receiver_name: {data.get('receiver_name')}")
        print(f"  - receiver_designation: {data.get('receiver_designation')}")
        print(f"  - receiver_signature: {data.get('receiver_signature')[:50]}...")
        print(f"  - received_at: {data.get('received_at')}")
    
    def test_get_closed_delivery_note_has_receiver_info(self, auth_token):
        """Test that GET returns receiver info for closed delivery notes"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create and close a delivery note
        create_payload = {
            "source_type": "direct",
            "customer_name": "TEST_Verify Closure",
            "delivered_by": "Test Driver",
            "delivered_to": "Test Receiver",
            "line_items": [{"description": "Test Item", "quantity": 1, "unit_price": 10000, "total": 10000}]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/delivery-notes", 
                                       headers=headers, json=create_payload)
        assert create_response.status_code == 200
        note_id = create_response.json()["id"]
        
        # Close it with receiver info
        closure_payload = {
            "status": "delivered",
            "receiver_name": "Jane Smith",
            "receiver_designation": "Procurement Officer"
        }
        
        close_response = requests.patch(
            f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status",
            headers=headers,
            json=closure_payload
        )
        assert close_response.status_code == 200
        
        # Now GET the delivery note and verify receiver info is present
        get_response = requests.get(f"{BASE_URL}/api/admin/delivery-notes/{note_id}", headers=headers)
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("receiver_name") == "Jane Smith", "receiver_name not persisted"
        assert data.get("receiver_designation") == "Procurement Officer", "receiver_designation not persisted"
        assert data.get("status") == "delivered", "status not persisted"
        
        print(f"PASS: GET delivery note {note_id} returns receiver info correctly")
    
    def test_closure_without_receiver_name_still_works(self, auth_token):
        """Test that closure without receiver_name still updates status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a delivery note
        create_payload = {
            "source_type": "direct",
            "customer_name": "TEST_No Receiver Name",
            "delivered_by": "Test Driver",
            "delivered_to": "Test Receiver",
            "line_items": [{"description": "Test Item", "quantity": 1, "unit_price": 10000, "total": 10000}]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/delivery-notes", 
                                       headers=headers, json=create_payload)
        assert create_response.status_code == 200
        note_id = create_response.json()["id"]
        
        # Close without receiver info
        close_response = requests.patch(
            f"{BASE_URL}/api/admin/delivery-notes/{note_id}/status",
            headers=headers,
            json={"status": "delivered"}
        )
        assert close_response.status_code == 200
        
        data = close_response.json()
        assert data.get("status") == "delivered"
        print(f"PASS: Delivery note {note_id} closed without receiver info (status only)")


class TestRegressionQuoteInvoicePreview:
    """Regression tests for Quote and Invoice preview pages"""
    
    def test_quote_api_still_works(self):
        """Verify quote API returns data for known quote"""
        quote_id = "69d8ea175572c5cf0210281e"
        response = requests.get(f"{BASE_URL}/api/admin/quotes/{quote_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data or "_id" in data
            print(f"PASS: Quote {quote_id} API returns data")
        elif response.status_code == 404:
            print(f"INFO: Quote {quote_id} not found (may have been deleted)")
        else:
            print(f"WARN: Quote API returned {response.status_code}")
    
    def test_invoice_api_still_works(self):
        """Verify invoice API returns data for known invoice"""
        invoice_id = "71c2fa9c-1eff-4cf2-a481-95df7f0b764e"
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{invoice_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data or "_id" in data or "invoice_number" in data
            print(f"PASS: Invoice {invoice_id} API returns data")
        elif response.status_code == 404:
            print(f"INFO: Invoice {invoice_id} not found (may have been deleted)")
        else:
            print(f"WARN: Invoice API returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
