"""
Test Settings Hub New Features:
- CustomerActivityRulesCard in Commercial Rules tab
- GeneratedStampBuilder in Invoice Branding tab
- SignaturePad with draw/upload toggle
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAuth:
    """Admin authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"Admin login successful, token length: {len(admin_token)}")


class TestSettingsHubAPI:
    """Settings Hub API tests - customer_activity_rules"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_settings_hub_returns_customer_activity_rules(self, auth_headers):
        """GET /api/admin/settings-hub should return customer_activity_rules section"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify customer_activity_rules exists
        assert "customer_activity_rules" in data, f"customer_activity_rules missing from response: {data.keys()}"
        
        rules = data["customer_activity_rules"]
        assert "active_days" in rules, "active_days missing"
        assert "at_risk_days" in rules, "at_risk_days missing"
        assert "default_new_customer_status" in rules, "default_new_customer_status missing"
        assert "signals" in rules, "signals missing"
        
        # Verify default values
        assert rules["active_days"] == 30, f"Expected active_days=30, got {rules['active_days']}"
        assert rules["at_risk_days"] == 90, f"Expected at_risk_days=90, got {rules['at_risk_days']}"
        
        # Verify signals structure
        signals = rules["signals"]
        assert "orders" in signals
        assert "invoices" in signals
        assert "quotes" in signals
        assert "requests" in signals
        assert "sales_notes" in signals
        assert "account_logins" in signals
        
        print(f"customer_activity_rules: {rules}")
    
    def test_update_settings_hub_with_customer_activity_rules(self, auth_headers):
        """PUT /api/admin/settings-hub should persist customer_activity_rules"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=auth_headers)
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Update customer_activity_rules
        current["customer_activity_rules"] = {
            "active_days": 45,
            "at_risk_days": 120,
            "default_new_customer_status": "at_risk",
            "signals": {
                "orders": True,
                "invoices": True,
                "quotes": False,
                "requests": True,
                "sales_notes": False,
                "account_logins": True
            }
        }
        
        put_response = requests.put(f"{BASE_URL}/api/admin/settings-hub", json=current, headers=auth_headers)
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=auth_headers)
        assert verify_response.status_code == 200
        verified = verify_response.json()
        
        rules = verified["customer_activity_rules"]
        assert rules["active_days"] == 45, f"active_days not persisted: {rules['active_days']}"
        assert rules["at_risk_days"] == 120, f"at_risk_days not persisted: {rules['at_risk_days']}"
        assert rules["default_new_customer_status"] == "at_risk"
        assert rules["signals"]["quotes"] == False
        assert rules["signals"]["account_logins"] == True
        
        print("customer_activity_rules update and persistence verified")
        
        # Reset to defaults
        current["customer_activity_rules"] = {
            "active_days": 30,
            "at_risk_days": 90,
            "default_new_customer_status": "active",
            "signals": {
                "orders": True,
                "invoices": True,
                "quotes": True,
                "requests": True,
                "sales_notes": True,
                "account_logins": False
            }
        }
        requests.put(f"{BASE_URL}/api/admin/settings-hub", json=current, headers=auth_headers)


class TestInvoiceBrandingAPI:
    """Invoice Branding API tests - signature_method, stamp generation"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_invoice_branding_returns_signature_method(self, auth_headers):
        """GET /api/admin/settings/invoice-branding should return signature_method field"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/invoice-branding", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify signature_method exists
        assert "signature_method" in data, f"signature_method missing: {data.keys()}"
        assert data["signature_method"] in ["upload", "pad"], f"Invalid signature_method: {data['signature_method']}"
        
        # Verify stamp fields exist
        assert "stamp_mode" in data
        assert "stamp_shape" in data
        assert "stamp_color" in data
        assert "stamp_text_primary" in data
        assert "stamp_text_secondary" in data
        assert "stamp_registration_number" in data
        assert "stamp_tax_number" in data
        assert "stamp_phrase" in data
        
        print(f"Invoice branding fields verified: signature_method={data['signature_method']}, stamp_mode={data['stamp_mode']}")
    
    def test_save_invoice_branding_with_signature_method(self, auth_headers):
        """POST /api/admin/settings/invoice-branding should persist signature_method"""
        payload = {
            "show_signature": True,
            "signature_method": "pad",
            "cfo_name": "Test CFO",
            "cfo_title": "Chief Finance Officer",
            "show_stamp": True,
            "stamp_mode": "generated",
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "Test Company Ltd",
            "stamp_text_secondary": "Test City, Country",
            "stamp_registration_number": "REG-123456",
            "stamp_tax_number": "TIN-789012",
            "stamp_phrase": "Official Test Stamp"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"POST failed: {response.text}"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/admin/settings/invoice-branding", headers=auth_headers)
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["signature_method"] == "pad", f"signature_method not persisted: {data['signature_method']}"
        assert data["cfo_name"] == "Test CFO"
        assert data["stamp_text_primary"] == "Test Company Ltd"
        
        print("Invoice branding save with signature_method verified")
    
    def test_generate_stamp_circle(self, auth_headers):
        """POST /api/admin/settings/invoice-branding/generate-stamp should return SVG for circle stamp"""
        payload = {
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "Konekt Limited",
            "stamp_text_secondary": "Dar es Salaam, Tanzania",
            "stamp_registration_number": "REG-2024-001",
            "stamp_tax_number": "TIN-123-456-789",
            "stamp_phrase": "Official Company Stamp"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Generate stamp failed: {response.text}"
        data = response.json()
        
        assert "svg" in data, f"svg missing from response: {data.keys()}"
        assert "stamp_preview_url" in data, f"stamp_preview_url missing: {data.keys()}"
        
        svg = data["svg"]
        assert "<svg" in svg, "Response is not valid SVG"
        assert "circle" in svg.lower() or "arc" in svg.lower(), "Circle stamp should contain circle elements"
        assert "KONEKT LIMITED" in svg, "Company name should be in SVG"
        
        print(f"Circle stamp generated, preview URL: {data['stamp_preview_url']}")
    
    def test_generate_stamp_square(self, auth_headers):
        """POST /api/admin/settings/invoice-branding/generate-stamp should return SVG for square stamp"""
        payload = {
            "stamp_shape": "square",
            "stamp_color": "red",
            "stamp_text_primary": "Test Company",
            "stamp_text_secondary": "Test Location",
            "stamp_registration_number": "REG-TEST",
            "stamp_tax_number": "TIN-TEST",
            "stamp_phrase": "Test Stamp"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Generate stamp failed: {response.text}"
        data = response.json()
        
        assert "svg" in data
        svg = data["svg"]
        assert "<svg" in svg
        assert "rect" in svg.lower(), "Square stamp should contain rect elements"
        assert "#b91c1c" in svg, "Red color should be in SVG"
        
        print(f"Square stamp generated with red color")
    
    def test_generate_stamp_black_color(self, auth_headers):
        """Test stamp generation with black color"""
        payload = {
            "stamp_shape": "circle",
            "stamp_color": "black",
            "stamp_text_primary": "Black Stamp Test",
            "stamp_text_secondary": "",
            "stamp_registration_number": "",
            "stamp_tax_number": "",
            "stamp_phrase": "Test"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        svg = data["svg"]
        assert "#1e293b" in svg, "Black color should be in SVG"
        print("Black color stamp verified")


class TestSettingsHubAllSections:
    """Verify all 9 tabs have their sections in settings-hub"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_all_settings_sections_present(self, auth_headers):
        """Verify all expected sections are in settings-hub response"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        expected_sections = [
            "commercial",
            "margin_rules",
            "promotions",
            "affiliate",
            "sales",
            "payments",
            "payment_accounts",
            "progress_workflows",
            "ai_assistant",
            "notifications",
            "vendors",
            "numbering_rules",
            "launch_controls",
            "customer_activity_rules"  # New section
        ]
        
        for section in expected_sections:
            assert section in data, f"Section '{section}' missing from settings-hub"
            print(f"Section '{section}' present")
        
        print(f"All {len(expected_sections)} sections verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
